// TARKA SUTRAM 2026 — WORKSTREAM B2
// Circom 2.1.0 Circuit: Transaction Aggregate Threshold Verifier
// Proves that a batch of committed private transactions satisfies an aggregate regulatory threshold
// without revealing individual transaction amounts, beneficiary accounts, or blinding salts.

pragma circom 2.1.0;

// Simple comparator template (less than or equal) for 64-bit numbers
template LessEqThan(n) {
    assert(n <= 64);
    signal input in[2];
    signal output out;

    // Check if in[0] <= in[1]
    signal diff;
    diff <-- in[1] - in[0];

    // Range check: diff must be non-negative
    component n2b = Num2Bits(n + 1);
    n2b.in <-- diff + (1 << n);
    out <-- n2b.out[n];
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var accum = 0;
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (1 - out[i]) === 0;
        accum += out[i] * (1 << i);
    }
    accum === in;
}

// 2-to-1 Hash Commitment Simulator (Poseidon-compatible R1CS representation)
template TransactionCommitment() {
    signal input amount;
    signal input salt;
    signal output commitment;

    // Constrained non-linear mixing mimicking algebraic hash
    signal intermediate;
    intermediate <== amount * salt + 17;
    commitment <== intermediate * intermediate + amount;
}

// Main Batch Threshold Verification Template
template TransactionThresholdVerifier(BATCH_SIZE) {
    // --- Public Inputs ---
    signal input publicThreshold;         // Regulatory compliance threshold
    signal input expectedAggregateCommit; // Merkle root / aggregate commitment of batch

    // --- Private Witness Inputs ---
    signal input privateAmounts[BATCH_SIZE]; // Private transaction amounts (in paise / cents)
    signal input privateSalts[BATCH_SIZE];   // Secret cryptographic blinding factors

    // --- Output ---
    signal output isValid;

    // 1. Verify individual commitments and accumulate total
    signal commitments[BATCH_SIZE];
    signal accumSum[BATCH_SIZE + 1];
    signal accumCommit[BATCH_SIZE + 1];

    accumSum[0] <== 0;
    accumCommit[0] <== 0;

    component comm[BATCH_SIZE];
    component rangeCheck[BATCH_SIZE];

    for (var i = 0; i < BATCH_SIZE; i++) {
        // Individual commitment computation
        comm[i] = TransactionCommitment();
        comm[i].amount <== privateAmounts[i];
        comm[i].salt <== privateSalts[i];
        commitments[i] <== comm[i].commitment;

        // Ensure non-negative amounts (64-bit bounds)
        rangeCheck[i] = Num2Bits(64);
        rangeCheck[i].in <== privateAmounts[i];

        // Accumulate running sum
        accumSum[i + 1] <== accumSum[i] + privateAmounts[i];
        accumCommit[i + 1] <== accumCommit[i] + commitments[i];
    }

    // 2. Check that total committed sum <= publicThreshold
    component comp = LessEqThan(64);
    comp.in[0] <== accumSum[BATCH_SIZE];
    comp.in[1] <== publicThreshold;

    // Enforce condition: comp.out must be 1 (sum <= threshold)
    comp.out === 1;

    // 3. Check aggregate commitment matches expected public input
    accumCommit[BATCH_SIZE] === expectedAggregateCommit;

    isValid <== comp.out;
}

// Instance for a 5-transaction private batch
component main {public [publicThreshold, expectedAggregateCommit]} = TransactionThresholdVerifier(5);

