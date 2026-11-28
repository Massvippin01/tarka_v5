use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NormalizedTransaction {
    pub utr: String,
    pub timestamp: String,
    pub remitter_account: String,
    pub beneficiary_account: String,
    pub amount_inr: f64,
    pub is_duplicate: bool,
}

pub struct TransactionStreamingNormalizer {
    seen_utrs: HashSet<String>,
}

impl TransactionStreamingNormalizer {
    pub fn new(capacity: usize) -> Self {
        Self {
            seen_utrs: HashSet::with_capacity(capacity),
        }
    }

    pub fn parse_csv_line(&mut self, line: &str) -> Option<NormalizedTransaction> {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 5 {
            return None;
        }

        let utr = parts[1].trim().to_string();
        let is_duplicate = self.seen_utrs.contains(&utr);
        if !is_duplicate {
            self.seen_utrs.insert(utr.clone());
        }

        let amount = parts[4].trim().parse::<f64>().unwrap_or(0.0);

        Some(NormalizedTransaction {
            timestamp: parts[0].trim().to_string(),
            utr,
            remitter_account: parts[2].trim().to_string(),
            beneficiary_account: parts[3].trim().to_string(),
            amount_inr: amount,
            is_duplicate,
        })
    }
}
