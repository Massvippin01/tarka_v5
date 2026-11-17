import { describe, it, expect } from "vitest";
import {
  sha256Hex,
  sha256HexSync,
  canonicalJson,
  computeMerkleRootSync,
  computeMerkleRoot,
  hashChainSync,
} from "../sha256";

describe("Real Cryptography Engine (Prompt 3)", () => {
  it("matches NIST standard test vectors for empty string and 'hello world'", async () => {
    const emptyExpected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const helloExpected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

    expect(sha256HexSync("")).toBe(emptyExpected);
    expect(await sha256Hex("")).toBe(emptyExpected);

    expect(sha256HexSync("hello world")).toBe(helloExpected);
    expect(await sha256Hex("hello world")).toBe(helloExpected);
  });

  it("canonicalJson sorts keys deterministically", () => {
    const objA = { b: 2, a: 1, nested: { y: "test", x: 10 } };
    const objB = { nested: { x: 10, y: "test" }, a: 1, b: 2 };

    const canonA = canonicalJson(objA);
    const canonB = canonicalJson(objB);

    expect(canonA).toBe(canonB);
    expect(canonA).toBe('{"a":1,"b":2,"nested":{"x":10,"y":"test"}}');
  });

  it("computes deterministic Merkle roots over leaf hashes", async () => {
    const leaves = [
      sha256HexSync("leaf1"),
      sha256HexSync("leaf2"),
      sha256HexSync("leaf3"),
    ];

    const syncRoot = computeMerkleRootSync(leaves);
    const asyncRoot = await computeMerkleRoot(leaves);

    expect(syncRoot).toHaveLength(64);
    expect(asyncRoot).toBe(syncRoot);

    // Tampering any leaf changes the Merkle root
    const tamperedLeaves = [
      sha256HexSync("leaf1_tampered"),
      sha256HexSync("leaf2"),
      sha256HexSync("leaf3"),
    ];
    const tamperedRoot = computeMerkleRootSync(tamperedLeaves);
    expect(tamperedRoot).not.toBe(syncRoot);
  });

  it("builds a verified hash chain where each event depends on previousHash and payload", () => {
    const events = [
      { id: "EVT-1", action: "INGEST_EVIDENCE", artifact: "Finacle_CBS.csv" },
      { id: "EVT-2", action: "CONSERVATION_CHECK", passed: true },
      { id: "EVT-3", action: "PROVISIONAL_SEIZURE", section: "BNSS §106" },
    ];

    const chain = hashChainSync(events);

    expect(chain).toHaveLength(3);
    expect(chain[0].previousHash).toBe("0".repeat(64));
    expect(chain[1].previousHash).toBe(chain[0].eventHash);
    expect(chain[2].previousHash).toBe(chain[1].eventHash);

    // Verify link 1 matches manual recomputation
    const expectedLink1 = sha256HexSync(chain[0].eventHash + canonicalJson(events[1]));
    expect(chain[1].eventHash).toBe(expectedLink1);
  });
});

