# ARCHITECTURAL DECISION RECORD: ADR-001
## Institutional Transport Protocols for Multi-Banking and Law Enforcement Ingestion

**Status:** APPROVED & RATIFIED  
**Date:** November 5, 2026  
**Deciders:** Principal Architect, Distributed Systems Lead (Member B), Platform Lead (Member C)  
**Consulted:** Forensic Intelligence Lead (Member A)  
**Governing Context:** TARKA SUTRAM 2026 PS04 — TAIE Integration Foundation  

---

# 1. CONTEXT & PROBLEM STATEMENT

TARKA requires reliable, tamper-evident communication with diverse external financial institutions (core banking systems, payment switches, UPI gateways), telecom operators (IPDR logs, CGNAT radius pools), and law enforcement portals (CCTNS, ICJS, NCIIPC).

These external entities span widely disparate technology stacks:
- Enterprise banks with strict DMZ firewalls, web proxies, and API gateways.
- Legacy core banking systems relying on batch SFTP or daily cleared CSV/XML exports.
- High-velocity internal TARKA micro-services requiring sub-millisecond cryptographic proof exchanges.

We must define the default external integration protocol, permitted specialized protocols, and consistency boundaries without making unfounded assumptions about external institutional approval.

---

# 2. DECISION DRIVERS

1. **Air-Gap and Firewall Friendliness:** Most public sector and private Indian banks allow outbound HTTPS/REST over port 443 through corporate proxies, but strictly block arbitrary binary TCP/UDP ports.
2. **Statutory Auditability (BSA §63):** Payloads must support cryptographic SHA-256 integrity hashing and JSON signature verification.
3. **Transport Independence:** Canonical v1 schemas must remain decoupled from the physical transport layer.
4. **Latency & Throughput:** Inter-service cryptographic exchange (PSI blinding and ZKP validation) requires efficient streaming.

---

# 3. CONSIDERED ALTERNATIVES

- **Alternative 1: Pure gRPC/Protobuf Across All Boundaries.**
  - *Pros:* High throughput, strict binary contract generation, HTTP/2 multiplexing.
  - *Cons:* Heavy firewall friction at enterprise bank DMZs; requires non-standard proxy traversal; cannot be inspected easily by law enforcement security auditors.
- **Alternative 2: Pure Apache Kafka Pub/Sub.**
  - *Pros:* Persistent log replay, consumer groups, partition scaling.
  - *Cons:* Requires substantial infrastructure footprint (ZooKeeper/KRaft broker, JVM); impossible for ad-hoc batch submissions from isolated rural police stations.
- **Alternative 3: Tiered Hybrid Architecture (REST/HTTPS Default + Internal gRPC + Batch File Exchange).**
  - *Pros:* Universal compatibility via standard HTTPS; high performance for internal nodes; supports air-gapped batch ingest.

---

# 4. DECISION OUTCOME

**We adopt Alternative 3: Tiered Hybrid Architecture.**

### Specification:
1. **Default External Interface (REST/HTTPS):**
   - All external institutional connectors (HDFC, SBI, ICICI, Airtel, Jio) default to RESTful JSON over HTTPS (TLS 1.3).
   - Endpoints implement the canonical v1 error envelopes, idempotency headers (`X-Idempotency-Key`), and SHA-256 payload commitments.
2. **Internal & Bilaterally Agreed Interface (gRPC):**
   - High-throughput inter-service communication within the TARKA cluster and between pre-agreed high-frequency institutional peers permits gRPC over HTTP/2 with mutual TLS (mTLS).
   - Protobuf definitions must map 1:1 to Canonical v1 schemas.
3. **Batch File Exchange (SFTP / S3 / Encrypted Tarball):**
   - For institutions without direct API connectivity, TARKA supports controlled batch ingestion of CSV, NDJSON, and XML files accompanied by SHA-256 custody manifests.

> [!IMPORTANT]
> **Institutional Consent Policy:** TARKA shall never assume that any financial institution or government body has pre-approved a specific protocol. All connectors must advertise their capability manifest via the TAIE Adapter SDK.

---

# 5. CONSEQUENCES & TRADE-OFFS

- **Positive:**
  - Zero deployment friction for trial evaluations and national competition demos.
  - Complete compliance with standard bank security policies (REST/HTTPS via API Gateways).
  - Preserves full auditability of JSON request/response payloads in forensic access logs.
- **Negative:**
  - JSON serialization overhead is $\sim 2.5\times$ higher than Protobuf for large transaction arrays.
  - Mitigated by streaming NDJSON parsers and gzip content-encoding.

---

# 6. UNRESOLVED QUESTIONS

1. Future hardware-token mTLS integration with Indian PKI (e-Sign / CCA India root authority) for automated police officer authentication.
2. Standardizing on AS2 (Applicability Statement 2) if mandated by specific central banking clearinghouses.

