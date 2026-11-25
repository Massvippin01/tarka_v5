/**
 * TARKA Contextual Forensic Guide Registry
 * Continuous intelligent assistant guidance across all 22 operational areas.
 * Provides dual-depth explanations: Investigator Operational Briefing & Technical Algorithmic Deep-Dive.
 * Governing Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
 */

export interface MetricExplanation {
  label: string;
  unit: string;
  normalRange: string;
  investigativeMeaning: string;
}

export interface ScreenGuide {
  screenId: string;
  title: string;
  purpose: string;
  investigatorExplanation: string;
  technicalExplanation: string;
  abbreviations: Record<string, string>;
  metrics: MetricExplanation[];
  availableOperations: string[];
  limitations: string[];
  recommendedNextSteps: string[];
}

export const TARKA_CONTEXTUAL_GUIDES: Record<string, ScreenGuide> = {
  home: {
    screenId: 'home',
    title: 'Autonomous Particle Intelligence Station',
    purpose: 'Zero-clutter, hands-free conversational interface powered by a real-time audio-reactive 3D particle sphere.',
    investigatorExplanation:
      'Speak naturally to TARKA to navigate investigations, examine evidence, request fund flow reconstructions, or initiate formal forensic verification. In connected mode, Sarvam AI provides natural spoken voice responses across Indic languages; in offline mode, commands are understood and executed locally with clean visual presentations and zero spoken audio.',
    technicalExplanation:
      'Utilizes Web Audio API AnalyserNode with 64/256-point FFT binning for real-time speech intensity and spectral centroid extraction. Directs a 6,800-10,000 point Fibonacci spherical lattice with 4-octave surface perturbations and outer turbulent corona flaring. Audio processing executes locally or routes through the backend VoiceGateway to Sarvam Saaras/Bulbul or local Faster-Whisper neural pipelines.',
    abbreviations: {
      VAD: 'Voice Activity Detection (spectral energy classification)',
      FFT: 'Fast Fourier Transform (audio frequency spectrum analysis)',
      ASR: 'Automated Speech Recognition',
      TTS: 'Text-to-Speech synthesis',
      RMS: 'Root Mean Square (acoustic energy measurement)',
    },
    metrics: [
      {
        label: 'Acoustic Energy',
        unit: 'RMS (0.0 - 1.0)',
        normalRange: '0.15 - 0.70',
        investigativeMeaning: 'Measures human vocal intensity to drive dynamic sphere perturbation and silence turn detection.',
      },
      {
        label: 'Latency',
        unit: 'ms',
        normalRange: '< 250ms',
        investigativeMeaning: 'Local offline intent classification latency before initiating forensic routing.',
      },
    ],
    availableOperations: ['Voice command navigation', 'Case query summarization', 'Language switching', 'Mic muting/unmuting'],
    limitations: ['Requires browser microphone permission', 'Background noise above 70dB may require manual push-to-talk'],
    recommendedNextSteps: [
      'Say "Open the current investigation" to view the case workspace',
      'Say "Show the financial reconstruction" to examine the transaction ledger',
    ],
  },
  workspace: {
    screenId: 'workspace',
    title: 'Tactical Command Centre',
    purpose: 'Primary investigative dashboard providing real-time case vitals, golden hour countdown, and priority actions.',
    investigatorExplanation:
      'Provides a high-level operational pulse of the active cyber fraud case. Monitor the critical Golden Hour recovery countdown, total disputed amount, immediate freeze targets, and pending judicial authorizations.',
    technicalExplanation:
      'Aggregates transactional telemetry from the SQLite/PostgreSQL transactional authority, calculating recovery window decay using an exponential dissipation model derived from NPCI circular guidelines. Feeds priority alerts from the rule-based CasePrioritization engine.',
    abbreviations: {
      FIR: 'First Information Report (Statutory police complaint under BNSS §173)',
      IO: 'Investigating Officer',
      LEA: 'Law Enforcement Agency',
      NPCI: 'National Payments Corporation of India',
      GoldenHour: 'First 2-4 hours post-fraud critical window for bank account lien placement',
    },
    metrics: [
      {
        label: 'Disputed Loss',
        unit: 'INR (₹)',
        normalRange: 'Case specific',
        investigativeMeaning: 'Total reported financial loss across all admitted complainant statements.',
      },
      {
        label: 'Recovery Potential',
        unit: 'Percentage (%)',
        normalRange: '40% - 90%',
        investigativeMeaning: 'Estimated recoverable balance currently held in frozen or reachable Layer-1/2 mule accounts.',
      },
      {
        label: 'Golden Hour Remaining',
        unit: 'HH:MM:SS',
        normalRange: '> 00:00:00',
        investigativeMeaning: 'Time remaining before high-velocity funds are typically withdrawn at ATMs or crypto off-ramps.',
      },
    ],
    availableOperations: ['Review case vitals', 'Dispatch urgent freeze notice', 'Switch active workspace'],
    limitations: ['Recovery estimation assumes static account balances until updated by CBS response'],
    recommendedNextSteps: ['Inspect the financial transaction ledger to confirm disputed RRNs', 'Examine the fraud network graph for Layer-1 hubs'],
  },
  cases: {
    screenId: 'cases',
    title: 'Investigation Registry',
    purpose: 'Comprehensive multi-case management portal with evidentiary locking and jurisdiction allocation.',
    investigatorExplanation:
      'Enables officers to switch between active cyber fraud investigations, register new FIRs, and review case status from draft to judicial archiving.',
    technicalExplanation:
      'Manages case tenancy across the database with role-based access control (RBAC) enforced by AuthService. Enforces immutable case directory isolation under data/cases/{case_id}.',
    abbreviations: {
      FIR: 'First Information Report',
      PS: 'Police Station / Special Cyber Cell',
      BSA: 'Bharatiya Sakshya Adhiniyam 2023',
    },
    metrics: [
      {
        label: 'Active Cases',
        unit: 'Count',
        normalRange: '1 - 100',
        investigativeMeaning: 'Number of open investigations assigned to the current investigative unit.',
      },
    ],
    availableOperations: ['Create new investigation', 'Lock case custody', 'Archive completed docket'],
    limitations: ['Archived cases become strictly read-only to preserve evidentiary integrity'],
    recommendedNextSteps: ['Select an active case to load its evidence into memory'],
  },
  evidence: {
    screenId: 'evidence',
    title: 'Evidence Locker & Intake',
    purpose: 'Cryptographic admission station for raw digital exhibits with streaming SHA-256 chunked hashing and BSA §63 chain of custody.',
    investigatorExplanation:
      'Every file uploaded here is treated as raw evidentiary data. TARKA calculates an immutable SHA-256 hash across 64KB blocks, validates file signatures, screens against zip bombs, and generates a tamper-evident digital custody receipt.',
    technicalExplanation:
      'Enforces append-only storage in data/ingestion/evidence/. Applies FormatSignatureValidator magic byte verification and StreamingChunkedHasher before admitting exhibits. Generates Section 63 BSA audit metadata.',
    abbreviations: {
      SHA256: 'Secure Hash Algorithm (256-bit cryptographic digest)',
      BSA63: 'Bharatiya Sakshya Adhiniyam 2023 Section 63 (Admissibility of electronic records)',
      CBS: 'Core Banking Solution (e.g. Finacle, BaNCS)',
    },
    metrics: [
      {
        label: 'Admitted Exhibits',
        unit: 'Count',
        normalRange: '1 - 50 per case',
        investigativeMeaning: 'Total cryptographically admitted evidence files in the case vault.',
      },
      {
        label: 'Bitstream Verification',
        unit: 'Boolean',
        normalRange: '100% VERIFIED',
        investigativeMeaning: 'Confirms disk bytes match original acquisition SHA-256 digest with zero bit rot.',
      },
    ],
    availableOperations: ['Upload new digital exhibit', 'Verify exhibit integrity hash', 'Download chain of custody manifest'],
    limitations: ['Evidence files cannot be edited or deleted once admitted into the vault'],
    recommendedNextSteps: ['Proceed to the Financial Transaction Ledger to reconcile admitted bank statements'],
  },
  ledger: {
    screenId: 'ledger',
    title: 'Financial Transaction Ledger',
    purpose: 'Deterministic cross-source reconciliation between complainant bank statements and institutional CBS core banking records.',
    investigatorExplanation:
      'Compares what the victim reported against what the bank core banking system recorded. Discrepancies in amounts, timestamps, or RRNs are automatically flagged with clear mathematical deltas.',
    technicalExplanation:
      'Executes LedgerConservation and DiscrepancyDetector algorithms. Performs strict string and numeric reconciliation across Retrieval Reference Numbers (RRN) and Universal Transaction References (UTR). Calculates net conservation delta.',
    abbreviations: {
      RRN: 'Retrieval Reference Number (12-digit unique UPI payment identifier)',
      UTR: 'Unique Transaction Reference (NEFT/RTGS institutional identifier)',
      CBS: 'Core Banking Solution statement extract',
      VPA: 'Virtual Payment Address (UPI ID)',
    },
    metrics: [
      {
        label: 'Reconciliation Match Rate',
        unit: 'Percentage (%)',
        normalRange: '95% - 100%',
        investigativeMeaning: 'Proportion of transactions independently corroborated across both complainant and bank sources.',
      },
      {
        label: 'Discrepancy Delta',
        unit: 'INR (₹)',
        normalRange: '₹0.00 (in non-fraudulent items)',
        investigativeMeaning: 'Unreconciled difference between debited amounts and credited recipient funds.',
      },
    ],
    availableOperations: ['Filter by suspicious RRN', 'Flag discrepancy for judicial review', 'Export reconciled CSV'],
    limitations: ['Cannot verify cash withdrawals conducted outside networked banking channels'],
    recommendedNextSteps: ['Examine the Money Trail to follow fund dissipation beyond the initial debit'],
  },
  people: {
    screenId: 'people',
    title: 'People & Entity Resolution',
    purpose: 'Deterministic identity resolution, entity clustering, and mule beneficiary risk classification.',
    investigatorExplanation:
      'Disentangles fictitious and real identities across bank accounts, phone numbers, VPAs, and IP addresses. Highlights known mule patterns and beneficiary clusters without speculative inferences.',
    technicalExplanation:
      'Uses deterministic identity graph clustering with strict identity merge provenance. Does not perform speculative fuzzy merges without explicit KYC, PAN, or bank corroboration. Complies with Constitution Rule 5 (Never classify a person as GUILTY or INNOCENT).',
    abbreviations: {
      KYC: 'Know Your Customer verification records',
      PAN: 'Permanent Account Number (Indian Income Tax ID)',
      Aadhaar: '12-digit Indian biometric unique identity number',
      Mule: 'Account utilized by fraudsters to receive and rapidly disperse stolen proceeds',
    },
    metrics: [
      {
        label: 'Resolved Entities',
        unit: 'Count',
        normalRange: 'Case specific',
        investigativeMeaning: 'Unique individuals or shell corporate entities linked across admitted exhibits.',
      },
      {
        label: 'Layer-1 Mule Count',
        unit: 'Count',
        normalRange: '1 - 10',
        investigativeMeaning: 'Direct first-hop beneficiary accounts that received funds straight from the complainant.',
      },
    ],
    availableOperations: ['Inspect entity profile', 'Confirm identity link', 'Flag mule account tier'],
    limitations: ['Fictitious KYC profiles require physical field verification by local law enforcement'],
    recommendedNextSteps: ['Open the Fraud Network Graph to visualize entity interconnectivity'],
  },
  money: {
    screenId: 'money',
    title: 'Money Trail & Fund Waterfall',
    purpose: 'Multi-hop fund flow analysis tracking stolen proceeds through layered mule accounts to cashout sinks.',
    investigatorExplanation:
      'Visualizes how the stolen money was partitioned, transferred through intermediary accounts (Layer-1 to Layer-5), and withdrawn at ATMs, POS terminals, or crypto exchanges across state borders.',
    technicalExplanation:
      'Constructs directed acyclic cash flow representations using Sankey and hierarchical waterfall models. Incorporates FIFO and proportional fund dissipation algorithms to distinguish clean funds from tainted proceeds.',
    abbreviations: {
      Layer1: 'First hop beneficiary account directly credited from victim',
      Layer2: 'Intermediary consolidation account dispersing funds across multiple branches',
      ATM: 'Automated Teller Machine cashout terminal',
      POS: 'Point of Sale terminal merchant withdrawal',
    },
    metrics: [
      {
        label: 'Total Inflow',
        unit: 'INR (₹)',
        normalRange: 'Equals disputed loss',
        investigativeMeaning: 'Aggregate funds entering the fraud network from the complainant.',
      },
      {
        label: 'Cashout Sink Volume',
        unit: 'INR (₹)',
        normalRange: '₹0 to Total Inflow',
        investigativeMeaning: 'Stolen funds successfully withdrawn as physical cash or converted into untraceable assets.',
      },
    ],
    availableOperations: ['Highlight layer hops', 'Filter cashout terminals', 'Generate freeze directive schedule'],
    limitations: ['ATM withdrawals require CCTV footage acquisition under BNSS §94 for suspect face attribution'],
    recommendedNextSteps: ['Inspect the Device & SIM Attribution screen to locate terminals used for mobile banking'],
  },
  network: {
    screenId: 'network',
    title: 'Fraud Network Graph',
    purpose: 'Topological analysis of fraud syndicates, co-located device rings, and transactional hubs.',
    investigatorExplanation:
      'Examines the structural connections between suspects, accounts, phones, and IP addresses. Hub nodes with high connectivity represent syndicate organizers or primary aggregator mules.',
    technicalExplanation:
      'Projected into a high-performance Canvas/ECharts graph using force-directed layout with dynamic shrink-to-fit auto-scaling. Computes degree centrality, betweenness centrality, and Louvain community partitions.',
    abbreviations: {
      Hub: 'Node with disproportionately high degree centrality in the fraud ring',
      Hull: 'Visual boundary enclosing closely coupled criminal sub-syndicates',
    },
    metrics: [
      {
        label: 'Graph Density',
        unit: 'Ratio (0.0 - 1.0)',
        normalRange: '0.05 - 0.35',
        investigativeMeaning: 'Tightness of interconnection among members of the syndicate.',
      },
      {
        label: 'Identified Clusters',
        unit: 'Count',
        normalRange: '1 - 5',
        investigativeMeaning: 'Separate operational cells operating within the broader fraud syndicate.',
      },
    ],
    availableOperations: ['Filter by community cluster', 'Isolate hub suspect', 'Inspect relationship evidence'],
    limitations: ['Association does not establish mens rea (criminal intent) under judicial standards'],
    recommendedNextSteps: ['Open the Device & SIM screen to corroborate network links with cellular tower records'],
  },
  device: {
    screenId: 'device',
    title: 'Device & SIM Attribution',
    purpose: 'Carrier CGNAT demultiplexing, IMEI/IMSI pairing timeline, and cellular tower geolocation attribution.',
    investigatorExplanation:
      'Pinpoints the physical handset and SIM card used to log into fraudulent banking sessions. Demultiplexes shared public IP addresses using precise source port matching against telecom carrier NAT logs.',
    technicalExplanation:
      'Executes deterministic CGNAT attribution by performing exact 5-tuple matching: (Source IP, Source Port, Destination IP, Destination Port, Timestamp). Correlates Call Detail Records (CDR) and Subscriber Details (SDR).',
    abbreviations: {
      CGNAT: 'Carrier-Grade Network Address Translation (Shared IPv4 translation)',
      IMEI: 'International Mobile Equipment Identity (15-digit handset serial)',
      IMSI: 'International Mobile Subscriber Identity (SIM card identifier)',
      CDR: 'Call Detail Record provided by telecom service provider',
      BTS: 'Base Transceiver Station (Cellular tower location)',
    },
    metrics: [
      {
        label: 'Attribution Confidence',
        unit: 'Percentage (%)',
        normalRange: '90% - 100%',
        investigativeMeaning: 'Mathematical certainty that the specific handset conducted the online banking session.',
      },
    ],
    availableOperations: ['Demultiplex CGNAT port', 'Map tower triangulation', 'Correlate IMEI swaps'],
    limitations: ['Requires carrier-certified NAT logs matching exact second-level timestamps'],
    recommendedNextSteps: ['Check Temporal Evidence Loom to synchronize device events with bank transactions'],
  },
  timeline: {
    screenId: 'timeline',
    title: 'Temporal Evidence Loom',
    purpose: 'Sub-millisecond chronological event sequence synchronization and clock drift normalization across disparate logs.',
    investigatorExplanation:
      'Arranges every event—phishing SMS received, malicious APK installed, bank account login, OTP generated, and fund transfer—onto one unified timeline, correcting for server clock offsets.',
    technicalExplanation:
      'Executes ChronologyValidator and DriftNormalizer algorithms. Compensates for asynchronous server NTP clock drift across bank, telecom, and phone timestamps.',
    abbreviations: {
      NTP: 'Network Time Protocol',
      Drift: 'Time deviation between unsynchronized server clocks',
      GoldenHour: 'Immediate period following fraudulent debit',
    },
    metrics: [
      {
        label: 'Synchronized Events',
        unit: 'Count',
        normalRange: '10 - 500',
        investigativeMeaning: 'Total timeline events aligned into canonical chronological order.',
      },
      {
        label: 'Max Clock Offset',
        unit: 'Milliseconds (ms)',
        normalRange: '0 - 5000ms',
        investigativeMeaning: 'Estimated clock drift corrected across reporting systems.',
      },
    ],
    availableOperations: ['Filter timeline by Golden Hour', 'Inspect clock drift proof', 'Export chronological sequence'],
    limitations: ['Logs lacking microsecond resolution may yield concurrent ordering ambiguity'],
    recommendedNextSteps: ['Open Claim Dependency Lens to formally verify causality across the timeline'],
  },
  claims: {
    screenId: 'claims',
    title: 'Claim Compiler & Contradictions',
    purpose: 'Forensic Claim Compiler extracting factual assertions and verifying evidentiary support and contradictions.',
    investigatorExplanation:
      'Extracts investigative claims (e.g., "Suspect X received funds at 14:02") and checks whether admitted exhibits verify or contradict each assertion. Contradictions are explicitly preserved and surfaced for human judicial review.',
    technicalExplanation:
      'Implements ClaimCompiler with formal contradiction tracking. Strictly adheres to Constitution Rule 5: Never silently resolve contradictory evidence; preserve uncertainty explicitly.',
    abbreviations: {
      Claim: 'Investigative proposition asserting a factual occurrence',
      Contradiction: 'Mutually exclusive assertions supported by conflicting evidence exhibits',
    },
    metrics: [
      {
        label: 'Verified Claims',
        unit: 'Count',
        normalRange: 'Case specific',
        investigativeMeaning: 'Assertions backed by verified, tamper-evident cryptographic exhibits.',
      },
      {
        label: 'Active Contradictions',
        unit: 'Count',
        normalRange: '0 - 5',
        investigativeMeaning: 'Points of friction between evidence sources requiring judicial clarification.',
      },
    ],
    availableOperations: ['Inspect claim evidence citations', 'Filter unresolved contradictions', 'Compile claim manifest'],
    limitations: ['AI proposes hypotheses; claims require evidentiary verification before court submission'],
    recommendedNextSteps: ['Use Claim Dependency Lens (Z3) to formally test whether contradictions cause logical unsat'],
  },
  'claim-lens': {
    screenId: 'claim-lens',
    title: 'Claim Dependency Lens (Z3 Solver)',
    purpose: 'Formal mathematical proof DAG with Z3 SMT solver proving satisfiability and detecting logical deadlocks.',
    investigatorExplanation:
      'Applies rigorous formal logic (the same technology used in aerospace software verification) to mathematically verify that the case narrative is logically consistent and free of contradictions.',
    technicalExplanation:
      'Compiles claims into First-Order Logic constraints evaluated by the Z3 SMT (Satisfiability Modulo Theories) solver. Produces formal SAT (Satisfiable) or UNSAT (Unsatisfiable) verdicts with minimal unsat cores.',
    abbreviations: {
      SMT: 'Satisfiability Modulo Theories',
      SAT: 'Satisfiable (A mathematically consistent interpretation exists)',
      UNSAT: 'Unsatisfiable (A formal contradiction exists that makes the claim set impossible)',
      Z3: 'Microsoft Research theorem prover / formal verification solver',
    },
    metrics: [
      {
        label: 'Solver Status',
        unit: 'Status',
        normalRange: 'SATISFIABLE',
        investigativeMeaning: 'Indicates whether the entire chain of custody and claim set is mathematically sound.',
      },
      {
        label: 'Unsat Core Size',
        unit: 'Count',
        normalRange: '0',
        investigativeMeaning: 'Number of conflicting claims preventing logical consistency.',
      },
    ],
    availableOperations: ['Execute Z3 solver proof', 'Isolate unsatisfiable claim core', 'Export formal proof certificate'],
    limitations: ['Complex non-linear temporal relationships may require bounded horizon evaluation'],
    recommendedNextSteps: ['Proceed to Section 63 BSA Court Certificate to generate the legal dossier'],
  },
  provenance: {
    screenId: 'provenance',
    title: 'Provenance DAG',
    purpose: 'Immutable cryptographic directed acyclic graph mapping every analytical conclusion back to raw evidence bitstreams.',
    investigatorExplanation:
      'Visualizes the complete evidentiary lineage of every conclusion. From the final charge sheet assertion, trace back through hypotheses, correlations, entities, events, facts, observations, and raw exhibit SHA-256 hashes.',
    technicalExplanation:
      'Implements the 13-stage canonical lineage pipeline: conclusion -> hypothesis -> reasoning -> correlation -> relationship -> entity -> event -> fact -> observation -> artifact -> hash -> provenance -> custody.',
    abbreviations: {
      DAG: 'Directed Acyclic Graph',
      Lineage: 'Traceable derivation path from raw exhibit to final conclusion',
    },
    metrics: [
      {
        label: 'Lineage Depth',
        unit: 'Levels',
        normalRange: '10 - 13 levels',
        investigativeMeaning: 'Completeness of traceable derivation from source bitstream to judicial finding.',
      },
    ],
    availableOperations: ['Trace conclusion upstream', 'Inspect node hash', 'Verify Merkle consistency'],
    limitations: ['Any break in lineage flags the conclusion as unverified for court presentation'],
    recommendedNextSteps: ['Open Investigation Flight Recorder to inspect the execution history of this case'],
  },
  'flight-recorder': {
    screenId: 'flight-recorder',
    title: 'Investigation Flight Recorder',
    purpose: 'Continuous black-box telemetry recording every keystroke, filter change, query, and tool execution with SHA-256 state sealing.',
    investigatorExplanation:
      'Like an aircraft flight data recorder, this records every investigative action taken in the platform. Proves that the investigator did not tamper with evidence or use unauthorized analytical tools.',
    technicalExplanation:
      'Stores append-only event records sealed with chained SHA-256 hashes ($H_n = \text{SHA256}(H_{n-1} \parallel \text{Event}_n)$). Fails validation immediately if any historical event record is altered.',
    abbreviations: {
      BlackBox: 'Tamper-evident audit recording system',
      AuditSeal: 'Cryptographic hash binding event sequence',
    },
    metrics: [
      {
        label: 'Recorded Events',
        unit: 'Count',
        normalRange: '50 - 5,000',
        investigativeMeaning: 'Total user and system actions logged in this investigative session.',
      },
      {
        label: 'Chain Integrity',
        unit: 'Status',
        normalRange: 'INTACT (100%)',
        investigativeMeaning: 'Confirms cryptographic hash chain has zero modifications or deletions.',
      },
    ],
    availableOperations: ['Replay investigation timeline', 'Verify cryptographic seal', 'Export court audit log'],
    limitations: ['Flight recorder cannot be disabled or cleared by any user role'],
    recommendedNextSteps: ['Proceed to Section 63 BSA Court Certificate for legal filing'],
  },
  'court-proof': {
    screenId: 'court-proof',
    title: 'Section 63 BSA Court Certificate',
    purpose: 'Automated statutory electronic evidence certificate compiler strictly compliant with Bharatiya Sakshya Adhiniyam 2023 §63.',
    investigatorExplanation:
      'Generates the formal court certificate mandated under Indian law for electronic evidence admissibility. Documents device custody, cryptographic hash lockdown, software validation, and officer affidavit.',
    technicalExplanation:
      'Validates all statutory directives under BSA 2023 Section 63 (replacing Indian Evidence Act §65B). Enforces SHA-256 hash lockdown, hardware environment declaration, and system integrity verification before issuing the certificate.',
    abbreviations: {
      BSA: 'Bharatiya Sakshya Adhiniyam 2023 (Indian Evidence Act replacement)',
      Section63: 'Statutory mandate governing electronic record certificate admissibility',
      HashLock: 'Permanent cryptographic lockdown of evidence bytes prior to judicial submission',
    },
    metrics: [
      {
        label: 'Statutory Compliance',
        unit: 'Percentage (%)',
        normalRange: '100% COMPLIANT',
        investigativeMeaning: 'Adherence to all Section 63 subsections (custody, integrity, non-tampering).',
      },
    ],
    availableOperations: ['Generate Section 63 certificate', 'Sign officer affidavit', 'Export PDF docket'],
    limitations: ['Requires officer biometric/digital signature to achieve final court admissibility'],
    recommendedNextSteps: ['Open Investigation Actions to dispatch statutory notices to banks'],
  },
  actions: {
    screenId: 'actions',
    title: 'Investigation Actions & Directives',
    purpose: 'Statutory notices under BNSS §94, LEA freeze directives to NPCI/banks, and judicial priority queue.',
    investigatorExplanation:
      'Prepares and tracks formal legal notices issued to core banking institutions, payment gateways, and telecom providers to freeze accounts and compel production of subscriber records.',
    technicalExplanation:
      'Generates legally standardized BNSS 2023 §94 (replacing CrPC §91) notices. Pre-populates victim FIR details, disputed amounts, and suspect account numbers with SHA-256 exhibit references.',
    abbreviations: {
      BNSS: 'Bharatiya Nagarik Suraksha Sanhita 2023 (Criminal Procedure Code replacement)',
      Section94: 'Statutory notice to compel production of documents or electronic records',
      Lien: 'Legal freeze placed on disputed bank account balances',
    },
    metrics: [
      {
        label: 'Issued Directives',
        unit: 'Count',
        normalRange: '1 - 20',
        investigativeMeaning: 'Formal notices dispatched to financial and telecom entities.',
      },
      {
        label: 'Compliance Rate',
        unit: 'Percentage (%)',
        normalRange: '70% - 100%',
        investigativeMeaning: 'Proportion of recipient institutions that have executed freeze requests.',
      },
    ],
    availableOperations: ['Generate BNSS §94 notice', 'Record bank compliance response', 'Escalate unresponsive entity'],
    limitations: ['Bank execution speed depends on nodal officer availability at recipient institutions'],
    recommendedNextSteps: ['Open Forensic Report to compile the comprehensive investigation docket'],
  },
  comparator: {
    screenId: 'comparator',
    title: 'Cross-Case Comparator',
    purpose: 'Cross-jurisdictional similarity and duplicate exhibit comparison across active and closed cases.',
    investigatorExplanation:
      'Discovers whether the suspects, mule accounts, or devices in your case have appeared in cases handled by other police stations or cyber cells across India.',
    technicalExplanation:
      'Executes Jaccard similarity and MinHash LSH across entity feature vectors (VPAs, phone numbers, IMEI, PAN). Computes exact SHA-256 bitstream collision detection across admitted exhibits.',
    abbreviations: {
      LSH: 'Locality-Sensitive Hashing (fast multi-case similarity search)',
      Jaccard: 'Mathematical measure of overlap between two investigative entity sets',
    },
    metrics: [
      {
        label: 'Cross-Case Matches',
        unit: 'Count',
        normalRange: '0 - 15',
        investigativeMeaning: 'Other investigations sharing identical accounts, phone numbers, or devices.',
      },
    ],
    availableOperations: ['Compare with state database', 'Link related FIRs', 'Export syndicate similarity score'],
    limitations: ['Access to external state dockets requires multi-agency data sharing clearance'],
    recommendedNextSteps: ['Inspect Fraud Network Graph to visualize multi-case syndicate overlaps'],
  },
  taint: {
    screenId: 'taint',
    title: 'Taint Analysis Engine',
    purpose: 'Mathematical taint propagation models (FIFO, proportional, highest-density) tracking dirty funds through commingled accounts.',
    investigatorExplanation:
      'When stolen money is mixed with legitimate funds in a mule account, this mathematical engine calculates exactly what percentage of outgoing transfers consists of victim funds versus clean deposits.',
    technicalExplanation:
      'Implements three standard forensic taint algorithms: First-In-First-Out (FIFO), Proportional Haircut, and Highest-Concentration-First. Produces deterministic taint percentage coefficients per transaction hop.',
    abbreviations: {
      FIFO: 'First In, First Out taint propagation model',
      Haircut: 'Proportional distribution of tainted versus legitimate balances',
      Commingling: 'Mixing of stolen fraud funds with existing legitimate deposits',
    },
    metrics: [
      {
        label: 'Taint Coefficient',
        unit: 'Percentage (%)',
        normalRange: '0% - 100%',
        investigativeMeaning: 'Fraction of an outgoing transfer that is mathematically attributable to the fraud proceeds.',
      },
    ],
    availableOperations: ['Run FIFO simulation', 'Run proportional haircut simulation', 'Export taint distribution table'],
    limitations: ['Judicial interpretation of taint models varies across trial court jurisdictions'],
    recommendedNextSteps: ['Use Money Trail to review visual flow of tainted funds'],
  },
  lab: {
    screenId: 'lab',
    title: 'Forensic Benchmark Lab',
    purpose: 'Adversarial torture testing against IBM AML and PaySim synthetic datasets with precision/recall/F1 ROC analysis.',
    investigatorExplanation:
      'Demonstrates the empirical scientific reliability of TARKA algorithms. Tests detection precision and false-positive rates against millions of synthetic fraud transactions to prove reliability in court.',
    technicalExplanation:
      'Processes streaming benchmarks against verified public datasets (PaySim 100k/500k, IBM AML 10k/50k). Calculates Confusion Matrix, Precision, Recall, F1-Score, and ROC-AUC curve. Validates deterministic reproducibility under zero random seeds.',
    abbreviations: {
      PaySim: 'Standard financial fraud simulator dataset based on real mobile money transactions',
      AML: 'Anti-Money Laundering transaction dataset',
      ROC: 'Receiver Operating Characteristic curve',
      F1: 'Harmonic mean of precision and recall',
    },
    metrics: [
      {
        label: 'Benchmark Precision',
        unit: 'Percentage (%)',
        normalRange: '98.5% - 100%',
        investigativeMeaning: 'Proportion of flagged suspicious transactions that are genuine frauds.',
      },
      {
        label: 'False Positive Rate',
        unit: 'Percentage (%)',
        normalRange: '< 0.5%',
        investigativeMeaning: 'Innocent transactions incorrectly flagged as suspicious by the algorithms.',
      },
    ],
    availableOperations: ['Run 10,000-row PaySim benchmark', 'Run IBM AML test', 'Export ROC curve'],
    limitations: ['Synthetic datasets may not capture emerging evasion tactics like crypto bridging'],
    recommendedNextSteps: ['Proceed to Forensic Report to attach benchmark credentials to the case dossier'],
  },
  report: {
    screenId: 'report',
    title: 'Forensic Report Generator',
    purpose: 'Comprehensive, court-admissible forensic dossier compilation with embedded SHA-256 evidence citations.',
    investigatorExplanation:
      'Compiles the entire investigation into a polished, print-ready forensic brief. Includes executive summary, admitted evidence table, financial loss reconciliation, suspect profiles, network graphs, and Section 63 BSA certificates.',
    technicalExplanation:
      'Assembles structured data into a deterministic PDF layout. Every finding is directly linked to an exhibit artifact ID, SHA-256 digest, and custody timestamp. Meets Supreme Court of India standards for digital evidence dockets.',
    abbreviations: {
      Dossier: 'Complete bound evidentiary package submitted to public prosecutor and trial court',
      Citations: 'Direct cryptographic references linking claims to raw evidence files',
    },
    metrics: [
      {
        label: 'Citations Included',
        unit: 'Count',
        normalRange: '10 - 100',
        investigativeMeaning: 'Total evidence bitstreams cryptographically cited in the report body.',
      },
    ],
    availableOperations: ['Generate full PDF report', 'Export executive summary', 'Sign digital evidence docket'],
    limitations: ['Requires judicial authorization before disclosure to non-law-enforcement parties'],
    recommendedNextSteps: ['Review Section 63 BSA certificate to ensure digital signature is attached'],
  },
  settings: {
    screenId: 'settings',
    title: 'Platform Configuration & Settings',
    purpose: 'Acoustic AEC settings, Sarvam vs Offline voice providers, Indic speech models, and API keys.',
    investigatorExplanation:
      'Configure voice recognition preferences, change your primary spoken language, toggle between connected Sarvam AI and 100% offline local processing, and test audio hardware.',
    technicalExplanation:
      'Manages client-side preferences and connects to backend configuration. Enforces strict credential isolation: Sarvam API keys reside solely on the backend server and are never delivered to the client.',
    abbreviations: {
      AEC: 'Acoustic Echo Cancellation (prevents assistant voice from feeding back into microphone)',
      VAD: 'Voice Activity Detection threshold calibration',
    },
    metrics: [
      {
        label: 'Active Voice Provider',
        unit: 'Mode',
        normalRange: 'SARVAM_CLOUD or OFFLINE_LOCAL',
        investigativeMeaning: 'Determines whether speech is processed via sovereign cloud or local neural models.',
      },
    ],
    availableOperations: ['Toggle voice provider mode', 'Select Indic language', 'Calibrate microphone VAD sensitivity'],
    limitations: ['Offline mode requires local Faster-Whisper weights installed on the backend host'],
    recommendedNextSteps: ['Return to Home to test the voice configuration'],
  },
  health: {
    screenId: 'health',
    title: 'System Diagnostics & Hardware Telemetry',
    purpose: 'Physical RAM headroom, CPU allocation, Faster-Whisper VRAM telemetry, and storage integrity status.',
    investigatorExplanation:
      'Monitors the operational health of the TARKA platform: free RAM, CPU utilization, database latency, and storage integrity across the evidence vault.',
    technicalExplanation:
      'Queries psutil on the host system to compute physical memory headroom, dynamic OS reservations (15% headroom rule), Uvicorn worker thread status, and SQLite WAL database journal integrity.',
    abbreviations: {
      VRAM: 'Video Random Access Memory (GPU memory for neural models)',
      WAL: 'Write-Ahead Logging (SQLite crash-resilient journal mode)',
      OOM: 'Out of Memory prevention safeguard',
    },
    metrics: [
      {
        label: 'Available Memory',
        unit: 'MB / GB',
        normalRange: '> 256 MB',
        investigativeMeaning: 'Physical memory remaining for evidence parsing and graph rendering.',
      },
      {
        label: 'Backend Status',
        unit: 'Status',
        normalRange: 'ONLINE (200 OK)',
        investigativeMeaning: 'FastAPI core forensic service connectivity.',
      },
    ],
    availableOperations: ['Run hardware health check', 'Verify database integrity', 'Flush temporary cache'],
    limitations: ['Hardware metrics reflect the execution host machine capacity'],
    recommendedNextSteps: ['Return to Tactical Command Centre to resume investigation'],
  },
};

/**
 * Retrieve the contextual guide for a given view/screen id.
 * Defaults to Tactical Command Centre if route is not specifically found.
 */
export function getContextualGuide(viewId: string): ScreenGuide {
  return TARKA_CONTEXTUAL_GUIDES[viewId] || TARKA_CONTEXTUAL_GUIDES.workspace;
}

