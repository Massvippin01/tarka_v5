use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::io::{self, BufRead};

#[derive(Debug, Clone)]
pub struct TransactionRecord {
    pub utr: String,
    pub source_acc: String,
    pub dest_acc: String,
    pub amount: f64,
    pub timestamp: String,
}

pub struct StreamingDeduplicator {
    seen_utrs: HashSet<String>,
    max_capacity: usize,
}

impl StreamingDeduplicator {
    pub fn new(max_capacity: usize) -> Self {
        Self {
            seen_utrs: HashSet::with_capacity(max_capacity.min(50_000)),
            max_capacity,
        }
    }

    pub fn process_line(&mut self, utr: &str) -> bool {
        if self.seen_utrs.contains(utr) {
            false
        } else {
            if self.seen_utrs.len() < self.max_capacity {
                self.seen_utrs.insert(utr.to_string());
            }
            true
        }
    }

    pub fn count_unique(&self) -> usize {
        self.seen_utrs.len()
    }
}
