use std::collections::HashSet;

pub struct MemoryBoundedDeduplicator {
    seen_hashes: HashSet<String>,
    max_entries: usize,
}

impl MemoryBoundedDeduplicator {
    pub fn new(max_entries: usize) -> Self {
        Self {
            seen_hashes: HashSet::with_capacity(max_entries.min(100_000)),
            max_entries,
        }
    }

    pub fn test_and_insert(&mut self, hash: &str) -> bool {
        if self.seen_hashes.contains(hash) {
            true // Duplicate
        } else {
            if self.seen_hashes.len() < self.max_entries {
                self.seen_hashes.insert(hash.to_string());
            }
            false // New unique entry
        }
    }

    pub fn len(&self) -> usize {
        self.seen_hashes.len()
    }
}
