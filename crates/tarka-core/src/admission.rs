use sha2::{Digest, Sha256};
use std::io::{self, Read};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FileFormatCategory {
    Pdf,
    Png,
    Jpeg,
    Zip,
    Csv,
    Json,
    Unknown,
}

impl FileFormatCategory {
    pub fn mime_type(&self) -> &'static str {
        match self {
            Self::Pdf => "application/pdf",
            Self::Png => "image/png",
            Self::Jpeg => "image/jpeg",
            Self::Zip => "application/zip",
            Self::Csv => "text/csv",
            Self::Json => "application/json",
            Self::Unknown => "application/octet-stream",
        }
    }

    pub fn inspect_header(bytes: &[u8]) -> Self {
        if bytes.starts_with(b"%PDF-") {
            Self::Pdf
        } else if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            Self::Png
        } else if bytes.starts_with(b"\xff\xd8\xff") {
            Self::Jpeg
        } else if bytes.starts_with(b"PK\x03\x04") {
            Self::Zip
        } else if bytes.starts_with(b"{\n") || bytes.starts_with(b"{\"") || bytes.starts_with(b"[\n") || bytes.starts_with(b"[{\"") {
            Self::Json
        } else if bytes.iter().take(256).all(|&b| b.is_ascii()) {
            Self::Csv
        } else {
            Self::Unknown
        }
    }
}

pub struct StreamAdmissionController {
    max_bytes: u64,
    chunk_size: usize,
}

pub struct StreamAdmissionOutcome {
    pub sha256: String,
    pub bytes_read: u64,
    pub detected_format: FileFormatCategory,
}

impl StreamAdmissionController {
    pub fn new(max_bytes: u64, chunk_size: usize) -> Self {
        Self { max_bytes, chunk_size }
    }

    pub fn process_stream<R: Read>(&self, mut reader: R) -> io::Result<StreamAdmissionOutcome> {
        let mut hasher = Sha256::new();
        let mut buffer = vec![0u8; self.chunk_size];
        let mut bytes_read = 0u64;
        let mut header_sample = Vec::new();

        loop {
            let n = reader.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            bytes_read += n as u64;
            if bytes_read > self.max_bytes {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("File exceeded maximum permissible allocation of {} bytes", self.max_bytes),
                ));
            }
            if header_sample.len() < 512 {
                header_sample.extend_from_slice(&buffer[..n.min(512 - header_sample.len())]);
            }
            hasher.update(&buffer[..n]);
        }

        let detected_format = FileFormatCategory::inspect_header(&header_sample);
        let sha256 = hex::encode(hasher.finalize());

        Ok(StreamAdmissionOutcome {
            sha256,
            bytes_read,
            detected_format,
        })
    }
}
