//! TARKA Core Engine — High-Performance Forensic Processing (Rust)
//!
//! Subsystems:
//! - Evidence Admission & Magic Byte Validation
//! - Content Addressed Storage (CAS) Hash Lineage
//! - Archive Safety & Decompression Bomb Quarantine
//! - High-Throughput Financial Record Normalization & Deduplication

pub mod admission;
pub mod archive_guard;
pub mod cas;
pub mod contracts;
pub mod deduplication;
pub mod transaction_normalizer;

pub use admission::*;
pub use archive_guard::*;
pub use cas::*;
pub use contracts::*;
pub use deduplication::*;
pub use transaction_normalizer::*;
