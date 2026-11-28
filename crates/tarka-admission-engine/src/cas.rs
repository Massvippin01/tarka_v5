use sha2::{Digest, Sha256};
use std::io::{self, Read};

pub struct CasChunker {
    chunk_size: usize,
}

impl CasChunker {
    pub fn new(chunk_size: usize) -> Self {
        Self { chunk_size }
    }

    pub fn compute_content_address<R: Read>(&self, mut reader: R) -> io::Result<(String, Vec<String>, u64)> {
        let mut overall_hasher = Sha256::new();
        let mut chunk_hashes = Vec::new();
        let mut buffer = vec![0u8; self.chunk_size];
        let mut total_bytes = 0u64;

        loop {
            let n = reader.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            total_bytes += n as u64;

            overall_hasher.update(&buffer[..n]);

            let mut chunk_hasher = Sha256::new();
            chunk_hasher.update(&buffer[..n]);
            chunk_hashes.push(hex::encode(chunk_hasher.finalize()));
        }

        let root_hash = hex::encode(overall_hasher.finalize());
        Ok((root_hash, chunk_hashes, total_bytes))
    }
}
