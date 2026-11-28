//! TARKA Admission Engine — Forensic Evidence Admission & CAS Ingestion
//!
//! Enforces:
//! - Bounded-memory streaming SHA-256 calculation
//! - Strict magic-byte file signature and MIME type verification
//! - Zip bomb / path-traversal (Zip Slip) security validation
//! - O(1) high-throughput financial transaction deduplication

pub mod admission;
pub mod archive;
pub mod cas;
pub mod contracts;
pub mod dedupe;

pub use admission::*;
pub use archive::*;
pub use cas::*;
pub use contracts::*;
pub use dedupe::*;
