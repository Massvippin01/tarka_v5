use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AdmissionRequestV1 {
    pub api_version: String,
    pub artifact_id: String,
    pub case_id: String,
    pub claimed_mime: Option<String>,
    pub max_byte_limit: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AdmissionResponseV1 {
    pub api_version: String,
    pub artifact_id: String,
    pub sha256_hash: String,
    pub total_bytes: u64,
    pub verified_mime: String,
    pub is_archive: bool,
    pub archive_security_passed: bool,
    pub status: String,
}
