use std::io::{self, Read, Seek};
use std::path::{Path, PathBuf};
use thiserror::Error;
use zip::ZipArchive;

#[derive(Error, Debug)]
pub enum ArchiveSecurityError {
    #[error("Zip parsing error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("Zip Slip detected: Entry path '{0}' attempts directory traversal")]
    ZipSlip(String),
    #[error("Decompression bomb detected: uncompressed size ({uncompressed} bytes) exceeds limit ({max} bytes) or ratio ({ratio:.1}) exceeds threshold")]
    DecompressionBomb { uncompressed: u64, max: u64, ratio: f64 },
    #[error("Too many archive entries: {0} files found")]
    TooManyEntries(usize),
}

pub struct ArchiveSecurityPolicy {
    pub max_uncompressed_bytes: u64,
    pub max_compression_ratio: f64,
    pub max_entries: usize,
}

impl Default for ArchiveSecurityPolicy {
    fn default() -> Self {
        Self {
            max_uncompressed_bytes: 250 * 1024 * 1024, // 250 MB
            max_compression_ratio: 50.0,              // 50:1 ratio limit
            max_entries: 500,                         // 500 files max
        }
    }
}

pub struct ArchiveAuditor {
    policy: ArchiveSecurityPolicy,
}

impl ArchiveAuditor {
    pub fn new(policy: ArchiveSecurityPolicy) -> Self {
        Self { policy }
    }

    pub fn validate_archive<R: Read + Seek>(&self, reader: R, compressed_len: u64) -> Result<Vec<PathBuf>, ArchiveSecurityError> {
        let mut zip = ZipArchive::new(reader)?;
        let count = zip.len();
        if count > self.policy.max_entries {
            return Err(ArchiveSecurityError::TooManyEntries(count));
        }

        let mut safe_paths = Vec::with_capacity(count);
        let mut total_uncompressed = 0u64;

        for i in 0..count {
            let file = zip.by_index(i)?;
            let raw_path = file.name();

            // 1. Path traversal / Zip Slip validation
            let path = Path::new(raw_path);
            let has_traversal = path.components().any(|c| match c {
                std::path::Component::ParentDir => true,
                std::path::Component::RootDir => true,
                std::path::Component::Prefix(_) => true,
                _ => false,
            });
            if has_traversal || raw_path.contains("..") || raw_path.starts_with('/') || raw_path.starts_with('\\') {
                return Err(ArchiveSecurityError::ZipSlip(raw_path.to_string()));
            }

            // 2. Decompression size check
            let uncompressed = file.size();
            total_uncompressed += uncompressed;

            if total_uncompressed > self.policy.max_uncompressed_bytes {
                return Err(ArchiveSecurityError::DecompressionBomb {
                    uncompressed: total_uncompressed,
                    max: self.policy.max_uncompressed_bytes,
                    ratio: total_uncompressed as f64 / compressed_len.max(1) as f64,
                });
            }

            safe_paths.push(PathBuf::from(raw_path));
        }

        // 3. Overall ratio check
        let ratio = total_uncompressed as f64 / compressed_len.max(1) as f64;
        if ratio > self.policy.max_compression_ratio && total_uncompressed > (5 * 1024 * 1024) {
            return Err(ArchiveSecurityError::DecompressionBomb {
                uncompressed: total_uncompressed,
                max: self.policy.max_uncompressed_bytes,
                ratio,
            });
        }

        Ok(safe_paths)
    }
}
