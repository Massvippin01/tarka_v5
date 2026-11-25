/**
/**
 * TARKA v9.5 Forensic Cryptographic Hashing Engine
 * Provides standard FIPS 180-4 SHA-256 via:
 * 1. Web Crypto API (crypto.subtle.digest) for asynchronous / browser verification
 * 2. Pure TypeScript synchronous FIPS 180-4 implementation for zero-delay synchronous UI state derivation
 * 3. Canonical JSON serialization (sorted keys, stable representation)
 * 4. Pairwise Merkle root tree evaluation
 * 5. Hash-chained flight recorder provenance verification
 */

/**
 * Deterministic JSON stringifier with sorted object keys.
 * Preserves canonical representation across systems regardless of key insertion order.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return "null";
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalJson(item)).join(",") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalJson(val)}`;
  });
  return "{" + entries.join(",") + "}";
}

// FIPS 180-4 Constants for synchronous SHA-256
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Standard pure TypeScript synchronous SHA-256 implementation.
 * Used for instant, zero-delay rendering in React components without async waterfall.
 */
export function sha256HexSync(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const bitLength = bytes.length * 8;

  // Pre-processing: padding
  const newLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(newLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  // Append length in bits (big-endian 64-bit integer)
  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLength >>> 0, false);
  view.setUint32(newLen - 8, Math.floor(bitLength / 0x100000000), false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
      const s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hexParts = [h0, h1, h2, h3, h4, h5, h6, h7].map((num) =>
    (num >>> 0).toString(16).padStart(8, "0")
  );
  return hexParts.join("");
}

/**
 * Standard Web Crypto API digest implementation.
 */
export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const cryptoObj = globalThis.crypto || (typeof window !== "undefined" ? window.crypto : null);
  if (cryptoObj && cryptoObj.subtle) {
    let buffer: ArrayBuffer;
    if (typeof data === "string") {
      buffer = new TextEncoder().encode(data).buffer;
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer as ArrayBuffer;
    } else {
      buffer = data;
    }
    const digestBuffer = await cryptoObj.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(digestBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fall back to pure TS synchronous implementation if Web Crypto is unavailable
  return sha256HexSync(typeof data === "string" ? data : new Uint8Array(data));
}

/**
 * Computes a deterministic Merkle root from an array of hex leaf hashes.
 */
export function computeMerkleRootSync(leafHashes: string[]): string {
  if (leafHashes.length === 0) {
    return sha256HexSync("");
  }
  let currentLevel = [...leafHashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sha256HexSync(currentLevel[i] + currentLevel[i + 1]));
      } else {
        // Duplicate the odd last node per standard RFC 6962 / Bitcoin Merkle tree
        nextLevel.push(sha256HexSync(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

export async function computeMerkleRoot(leafHashes: string[]): Promise<string> {
  if (leafHashes.length === 0) {
    return sha256Hex("");
  }
  let currentLevel = [...leafHashes];
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(await sha256Hex(currentLevel[i] + currentLevel[i + 1]));
      } else {
        nextLevel.push(await sha256Hex(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

/**
 * Builds a hash-chained flight recorder provenance sequence:
 * hash_0 = sha256(canonical(record_0))
 * hash_i = sha256(hash_{i-1} + canonical(record_i))
 */
export function hashChainSync(records: unknown[], initialPrevHash = "0".repeat(64)): { eventHash: string; previousHash: string }[] {
  const result: { eventHash: string; previousHash: string }[] = [];
  let prevHash = initialPrevHash;

  for (const record of records) {
    const canonicalStr = canonicalJson(record);
    const eventHash = sha256HexSync(prevHash + canonicalStr);
    result.push({
      eventHash,
      previousHash: prevHash,
    });
    prevHash = eventHash;
  }
  return result;
}

export async function hashChain(records: unknown[], initialPrevHash = "0".repeat(64)): Promise<{ eventHash: string; previousHash: string }[]> {
  const result: { eventHash: string; previousHash: string }[] = [];
  let prevHash = initialPrevHash;

  for (const record of records) {
    const canonicalStr = canonicalJson(record);
    const eventHash = await sha256Hex(prevHash + canonicalStr);
    result.push({
      eventHash,
      previousHash: prevHash,
    });
    prevHash = eventHash;
  }
  return result;
}

