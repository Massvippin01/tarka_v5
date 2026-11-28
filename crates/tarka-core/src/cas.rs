use sha2::{Digest, Sha256};
use std::io::{self, Read};

pub struct ContentAddressedStorage {
    root_dir: String,
}

impl ContentAddressedStorage {
    pub fn new(root_dir: impl Into<String>) -> Self {
        Self {
            root_dir: root_dir.into(),
        }
    }

    pub fn compute_sha256<R: Read>(reader: &mut R) -> io::Result<(String, u64)> {
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        let mut bytes_read = 0u64;

        loop {
            let n = reader.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            bytes_read += n as u64;
            hasher.update(&buffer[..n]);
        }

        let hash_hex = hex::encode(hasher.finalize());
        Ok((hash_hex, bytes_read))
    }

    pub fn shard_path_prefix(hash: &str) -> (&str, &str) {
        if hash.len() >= 4 {
            (&hash[0..2], &hash[2..4])
        } else {
            ("00", "00")
        }
    }
}
