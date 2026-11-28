use std::path::{Path, PathBuf};

pub struct ArchiveSecurityPolicy {
    pub max_uncompressed_bytes: u64,
    pub max_compression_ratio: f64,
    pub max_entries: usize,
}

impl Default for ArchiveSecurityPolicy {
    fn default() -> Self {
        Self {
            max_uncompressed_bytes: 500 * 1024 * 1024, // 500 MB limit
            max_compression_ratio: 100.0,             // 100:1 ratio limit
            max_entries: 1000,                        // 1000 files limit
        }
    }
}

pub struct ArchiveGuard {
    policy: ArchiveSecurityPolicy,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ArchiveSecurityVerdict {
    Safe,
    ZipSlipDetected(String),
    CompressionBombDetected { ratio: u64, total_bytes: u64 },
    ExcessiveFileCount(usize),
}

impl ArchiveGuard {
    pub fn new(policy: ArchiveSecurityPolicy) -> Self {
        Self { policy }
    }

    pub fn inspect_entry_path(&self, raw_path: &str) -> bool {
        let path = Path::new(raw_path);
        !path.components().any(|c| match c {
            std::path::Component::ParentDir => true,
            std::path::Component::RootDir => true,
            std::path::Component::Prefix(_) => true,
            _ => false,
        }) && !raw_path.contains("..") && !raw_path.starts_with('/') && !raw_path.starts_with('\\')
    }

    pub fn evaluate_decompression(&self, compressed_bytes: u64, uncompressed_bytes: u64, entry_count: usize) -> ArchiveSecurityVerdict {
        if entry_count > self.policy.max_entries {
            return ArchiveSecurityVerdict::ExcessiveFileCount(entry_count);
        }
        if uncompressed_bytes > self.policy.max_uncompressed_bytes {
            let ratio = uncompressed_bytes / compressed_bytes.max(1);
            return ArchiveSecurityVerdict::CompressionBombDetected {
                ratio,
                total_bytes: uncompressed_bytes,
            };
        }
        let ratio = (uncompressed_bytes as f64) / (compressed_bytes.max(1) as f64);
        if ratio > self.policy.max_compression_ratio && uncompressed_bytes > (5 * 1024 * 1024) {
            return ArchiveSecurityVerdict::CompressionBombDetected {
                ratio: ratio as u64,
                total_bytes: uncompressed_bytes,
            };
        }
        ArchiveSecurityVerdict::Safe
    }
}
