use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AdmissionRequest {
    pub api_version: String,
    pub artifact_id: String,
    pub case_id: String,
    pub claimed_mime_type: Option<String>,
    pub max_byte_limit: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AdmissionResponse {
    pub api_version: String,
    pub artifact_id: String,
    pub sha256_hash: String,
    pub byte_count: u64,
    pub verified_mime_type: String,
    pub is_archive: bool,
    pub archive_files_count: Option<usize>,
    pub status: String,
}
