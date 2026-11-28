use sha2::{Digest, Sha256};
use std::io::{self, Read};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AdmissionError {
    #[error("I/O error during evidence streaming: {0}")]
    Io(#[from] io::Error),
    #[error("File exceeds maximum admission byte limit: {0} bytes")]
    FileTooLarge(u64),
    #[error("MIME type spoofing detected: header indicates '{detected}', but claims '{claimed}'")]
    MimeSpoofing { claimed: String, detected: String },
    #[error("Unsupported or malformed file signature")]
    UnsupportedFormat,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ForensicMimeType {
    Pdf,
    Png,
    Jpeg,
    Zip,
    Csv,
    Json,
    Unknown,
}

impl ForensicMimeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ForensicMimeType::Pdf => "application/pdf",
            ForensicMimeType::Png => "image/png",
            ForensicMimeType::Jpeg => "image/jpeg",
            ForensicMimeType::Zip => "application/zip",
            ForensicMimeType::Csv => "text/csv",
            ForensicMimeType::Json => "application/json",
            ForensicMimeType::Unknown => "application/octet-stream",
        }
    }

    pub fn detect_from_header(header: &[u8]) -> Self {
        if header.starts_with(b"%PDF-") {
            ForensicMimeType::Pdf
        } else if header.starts_with(b"\x89PNG\r\n\x1a\n") {
            ForensicMimeType::Png
        } else if header.starts_with(b"\xff\xd8\xff") {
            ForensicMimeType::Jpeg
        } else if header.starts_with(b"PK\x03\x04") {
            ForensicMimeType::Zip
        } else if header.starts_with(b"{\n") || header.starts_with(b"{\"") || header.starts_with(b"[\n") || header.starts_with(b"[{\"") {
            ForensicMimeType::Json
        } else if header.iter().take(256).all(|&b| b.is_ascii()) {
            ForensicMimeType::Csv
        } else {
            ForensicMimeType::Unknown
        }
    }
}

pub struct AdmissionPipeline {
    max_bytes: u64,
    chunk_size: usize,
}

pub struct AdmissionResult {
    pub sha256_hash: String,
    pub total_bytes: u64,
    pub detected_mime: ForensicMimeType,
}

impl AdmissionPipeline {
    pub fn new(max_bytes: u64, chunk_size: usize) -> Self {
        Self { max_bytes, chunk_size }
    }

    pub fn stream_admit<R: Read>(&self, mut reader: R, claimed_mime: Option<&str>) -> Result<AdmissionResult, AdmissionError> {
        let mut hasher = Sha256::new();
        let mut buffer = vec![0u8; self.chunk_size];
        let mut total_bytes = 0u64;
        let mut header_buf = Vec::new();
        let mut first_chunk = true;

        loop {
            let n = reader.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            total_bytes += n as u64;
            if total_bytes > self.max_bytes {
                return Err(AdmissionError::FileTooLarge(self.max_bytes));
            }

            if first_chunk {
                header_buf.extend_from_slice(&buffer[..n.min(512)]);
                first_chunk = false;
            }

            hasher.update(&buffer[..n]);
        }

        let detected_mime = ForensicMimeType::detect_from_header(&header_buf);
        if let Some(claimed) = claimed_mime {
            if claimed != "application/octet-stream" && detected_mime != ForensicMimeType::Unknown {
                if claimed != detected_mime.as_str() {
                    return Err(AdmissionError::MimeSpoofing {
                        claimed: claimed.to_string(),
                        detected: detected_mime.as_str().to_string(),
                    });
                }
            }
        }

        let sha256_hash = hex::encode(hasher.finalize());
        Ok(AdmissionResult {
            sha256_hash,
            total_bytes,
            detected_mime,
        })
    }
}
