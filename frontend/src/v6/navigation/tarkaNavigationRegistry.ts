/**
 * TARKA Autonomous Navigation Registry
 * Canonical route definitions, aliases, natural language intent resolution, and permission governance.
 * Governing Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
 */

export interface TarkaRouteDefinition {
  id: string;
  canonicalView: string;
  displayName: string;
  category: 'primary' | 'investigation' | 'laboratory' | 'system';
  description: string;
  voiceAliases: string[];
  intentKeywords: string[];
  requiredClearance: 'INVESTIGATOR' | 'ANALYST' | 'SUPERVISOR' | 'SYSTEM_ADMIN';
  availableActions: string[];
  associatedTools: string[];
}

export const TARKA_NAVIGATION_REGISTRY: Record<string, TarkaRouteDefinition> = {
  home: {
    id: 'home',
    canonicalView: 'home',
    displayName: 'Autonomous Particle Intelligence',
    category: 'primary',
    description: 'Immersive voice-first particle intelligence field, real-time VAD visualizer and multimodal command center.',
    voiceAliases: ['home', 'go home', 'back to home', 'main screen', 'particle sphere', 'particle home', 'reset interface'],
    intentKeywords: ['home', 'start', 'main', 'landing', 'orb', 'particles', 'listen'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['voice_interaction', 'hands_free_listening', 'intent_routing'],
    associatedTools: ['TarkaVoiceEngine', 'TarkaParticleOrb', 'AudioAnalyser'],
  },
  workspace: {
    id: 'workspace',
    canonicalView: 'workspace',
    displayName: 'Tactical Command Centre',
    category: 'primary',
    description: 'Operational investigation command centre displaying active case vitals, golden hour countdown, and forensic priority feeds.',
    voiceAliases: ['workspace', 'command center', 'command centre', 'investigation overview', 'case overview', 'return to investigation overview'],
    intentKeywords: ['workspace', 'overview', 'dashboard', 'summary', 'status', 'countdown', 'vitals'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['view_case_vitals', 'execute_priority_action', 'switch_case'],
    associatedTools: ['CaseWorkspace', 'GoldenHourTimer', 'VitalsInspector'],
  },
  cases: {
    id: 'cases',
    canonicalView: 'cases',
    displayName: 'Investigation Registry',
    category: 'primary',
    description: 'Central registry of cyber fraud FIRs, jurisdiction allocations, and evidentiary lock statuses.',
    voiceAliases: ['cases', 'case registry', 'all cases', 'show investigations', 'switch case', 'open cases'],
    intentKeywords: ['cases', 'fir', 'registry', 'switch', 'investigations', 'all cases'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['create_case', 'select_case', 'archive_case'],
    associatedTools: ['CaseRegistry', 'NewCaseModal'],
  },
  evidence: {
    id: 'evidence',
    canonicalView: 'evidence',
    displayName: 'Evidence Locker & Intake',
    category: 'investigation',
    description: 'Cryptographic evidence admission portal with SHA-256 chunked hashing, BSA §63 custody chain, and format signatures.',
    voiceAliases: ['evidence', 'evidence locker', 'take me to the evidence locker', 'evidence intake', 'admit evidence', 'exhibits'],
    intentKeywords: ['evidence', 'locker', 'intake', 'exhibits', 'sha256', 'hash', 'custody', 'upload', 'files'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['upload_evidence', 'verify_hash', 'inspect_chain_of_custody', 'quarantine_check'],
    associatedTools: ['EvidenceLocker', 'MassiveEvidenceIntake', 'SignatureValidator'],
  },
  ledger: {
    id: 'ledger',
    canonicalView: 'ledger',
    displayName: 'Financial Transaction Ledger',
    category: 'investigation',
    description: 'Deterministic financial reconciliation ledger comparing complainant statements against core banking CBS exports.',
    voiceAliases: ['ledger', 'financial ledger', 'explain the current ledger', 'transactions', 'show ledger', 'banking statements'],
    intentKeywords: ['ledger', 'transactions', 'rrn', 'cbs', 'bank', 'discrepancy', 'reconcile', 'upi', 'imps'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['reconcile_statement', 'flag_discrepancy', 'filter_rrn', 'export_ledger'],
    associatedTools: ['LedgerReconciler', 'RrnAnalyzer', 'DiscrepancyDetector'],
  },
  people: {
    id: 'people',
    canonicalView: 'people',
    displayName: 'People & Entity Resolution',
    category: 'investigation',
    description: 'Deterministic entity resolution and mule account clustering with identity split/merge provenance.',
    voiceAliases: ['people', 'accounts', 'entity resolution', 'show suspects', 'mule accounts', 'who is involved'],
    intentKeywords: ['people', 'entities', 'mules', 'suspects', 'beneficiary', 'identity', 'kyc', 'pan', 'aadhaar'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['cluster_entities', 'confirm_identity', 'flag_mule', 'resolve_beneficiary'],
    associatedTools: ['EntityResolver', 'IdentityClusterer', 'MuleRiskScorer'],
  },
  money: {
    id: 'money',
    canonicalView: 'money',
    displayName: 'Money Trail & Waterfall',
    category: 'investigation',
    description: 'Multi-hop fund dissipation analysis, Layer-1 to Layer-5 mule laundering Sankey flow, and cross-state jurisdiction hops.',
    voiceAliases: ['money', 'money trail', 'show the financial reconstruction', 'fund flow', 'sankey', 'waterfall', 'where did the money go'],
    intentKeywords: ['money', 'funds', 'trail', 'sankey', 'waterfall', 'flow', 'layers', 'cashout', 'dissipation'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['trace_funds', 'highlight_cashout', 'inspect_jurisdiction_hop', 'freeze_request'],
    associatedTools: ['MoneyTrailSankey', 'WaterfallEngine', 'InterstateJurisdictionTracker'],
  },
  network: {
    id: 'network',
    canonicalView: 'network',
    displayName: 'Fraud Network Graph',
    category: 'investigation',
    description: 'Interactive topological graph revealing mule syndicates, device co-locations, and cashout sinks.',
    voiceAliases: ['network', 'fraud network', 'show the fraud network', 'graph', 'syndicate graph', 'mule ring'],
    intentKeywords: ['network', 'graph', 'topology', 'syndicate', 'ring', 'nodes', 'edges', 'hub'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['detect_communities', 'calculate_centrality', 'filter_mule_layer', 'isolate_hub'],
    associatedTools: ['FraudNetworkGraph', 'LouvainDetector', 'TopologyEngine'],
  },
  device: {
    id: 'device',
    canonicalView: 'device',
    displayName: 'Device & SIM Attribution',
    category: 'investigation',
    description: 'Carrier CGNAT port demultiplexing, IMEI/IMSI pairing timeline, and cellular tower geolocation attribution.',
    voiceAliases: ['device', 'sim', 'device attribution', 'cgnat', 'show device sim', 'telecom records', 'cdr'],
    intentKeywords: ['device', 'sim', 'imei', 'imsi', 'cgnat', 'ip', 'port', 'cdr', 'tower', 'attribution'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['demultiplex_cgnat', 'correlate_cdr', 'locate_cell_tower', 'bind_device_profile'],
    associatedTools: ['CgnatDemuxEngine', 'CdrAnalyzer', 'DeviceFingerprinter'],
  },
  timeline: {
    id: 'timeline',
    canonicalView: 'timeline',
    displayName: 'Temporal Evidence Loom',
    category: 'investigation',
    description: 'Sub-millisecond chronological event sequence synchronization and clock drift normalization across disparate logs.',
    voiceAliases: ['timeline', 'temporal analysis', 'open the temporal analysis', 'evidence loom', 'chronology', 'event sequence'],
    intentKeywords: ['timeline', 'temporal', 'loom', 'chronology', 'clock', 'drift', 'timestamps', 'sequence'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['align_timestamps', 'detect_clock_drift', 'reconstruct_sequence', 'zoom_golden_hour'],
    associatedTools: ['TemporalLoom', 'DriftNormalizer', 'ChronologyValidator'],
  },
  claims: {
    id: 'claims',
    canonicalView: 'claims',
    displayName: 'Claim Compiler & Contradictions',
    category: 'investigation',
    description: 'Forensic Claim Compiler extracting factual assertions and verifying evidentiary support and contradictions.',
    voiceAliases: ['claims', 'claim compiler', 'show contradictory evidence', 'contradictions', 'factual assertions'],
    intentKeywords: ['claims', 'assertions', 'contradictions', 'conflict', 'verify', 'compiler', 'facts'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['compile_claims', 'detect_contradictions', 'link_fact_to_evidence', 'evaluate_uncertainty'],
    associatedTools: ['ClaimCompiler', 'ContradictionDetector', 'EvidenceLinker'],
  },
  'claim-lens': {
    id: 'claim-lens',
    canonicalView: 'claim-lens',
    displayName: 'Claim Dependency Lens (Z3 Solver)',
    category: 'investigation',
    description: 'Formal mathematical proof DAG with Z3 SMT solver proving satisfiability and detecting logical deadlocks.',
    voiceAliases: ['claim lens', 'claim dependency graph', 'explain the claim dependency graph', 'z3 solver', 'formal verification'],
    intentKeywords: ['z3', 'solver', 'dependency', 'lens', 'smt', 'formal', 'proof', 'sat', 'unsat', 'deadlock'],
    requiredClearance: 'ANALYST',
    availableActions: ['run_z3_verification', 'inspect_proof_tree', 'isolate_unsat_core', 'export_formal_proof'],
    associatedTools: ['Z3SolverBridge', 'DependencyDAG', 'ProofTreeViewer'],
  },
  provenance: {
    id: 'provenance',
    canonicalView: 'provenance',
    displayName: 'Provenance DAG',
    category: 'investigation',
    description: 'Immutable cryptographic directed acyclic graph mapping every analytical conclusion back to raw evidence bitstreams.',
    voiceAliases: ['provenance', 'provenance dag', 'evidence lineage', 'data lineage', 'trace evidence'],
    intentKeywords: ['provenance', 'dag', 'lineage', 'derivation', 'bitstream', 'chain', 'root'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['trace_upstream_source', 'verify_hash_chain', 'export_provenance_graph'],
    associatedTools: ['ProvenanceGraph', 'LineageTracker', 'MerkleTreeValidator'],
  },
  'flight-recorder': {
    id: 'flight-recorder',
    canonicalView: 'flight-recorder',
    displayName: 'Investigation Flight Recorder',
    category: 'investigation',
    description: 'Continuous black-box telemetry recording every keystroke, filter change, query, and tool execution with SHA-256 state sealing.',
    voiceAliases: ['flight recorder', 'audit log', 'recorder', 'black box', 'telemetry'],
    intentKeywords: ['flight', 'recorder', 'blackbox', 'audit', 'telemetry', 'replay', 'tamper'],
    requiredClearance: 'ANALYST',
    availableActions: ['replay_session', 'verify_audit_seal', 'export_investigation_telemetry'],
    associatedTools: ['FlightRecorder', 'AuditSealer', 'SessionReplayer'],
  },
  'court-proof': {
    id: 'court-proof',
    canonicalView: 'court-proof',
    displayName: 'Section 63 BSA Court Certificate',
    category: 'investigation',
    description: 'Automated statutory electronic evidence certificate compiler strictly compliant with Bharatiya Sakshya Adhiniyam 2023 §63.',
    voiceAliases: ['court proof', 'bsa 63', 'section 63', 'court certificate', 'explain why this validation failed', 'legal certificate'],
    intentKeywords: ['bsa', 'section 63', 'certificate', 'court', 'legal', 'admissibility', 'affidavit', 'hash lockdown'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['generate_bsa63_certificate', 'verify_custody_lockdown', 'sign_affidavit'],
    associatedTools: ['Bsa63Compiler', 'CryptographicSealer', 'CourtProofGenerator'],
  },
  actions: {
    id: 'actions',
    canonicalView: 'actions',
    displayName: 'Investigation Actions & Directives',
    category: 'investigation',
    description: 'Statutory notices under BNSS §94, LEA freeze directives to NPCI/banks, and judicial priority queue.',
    voiceAliases: ['actions', 'directives', 'notices', 'bnss 94', 'freeze notices', 'investigation actions'],
    intentKeywords: ['actions', 'freeze', 'notice', 'bnss', 'bank notice', 'directives', 'leas'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['issue_bnss94_notice', 'dispatch_bank_freeze', 'track_compliance'],
    associatedTools: ['DirectiveDispatcher', 'NoticeGenerator', 'ComplianceTracker'],
  },
  comparator: {
    id: 'comparator',
    canonicalView: 'comparator',
    displayName: 'Cross-Case Comparator',
    category: 'laboratory',
    description: 'Cross-jurisdictional similarity and duplicate exhibit comparison across active and closed cases.',
    voiceAliases: ['comparator', 'compare exhibits', 'compare these two exhibits', 'cross case comparison'],
    intentKeywords: ['compare', 'comparator', 'similarity', 'overlap', 'cross case', 'duplicate'],
    requiredClearance: 'ANALYST',
    availableActions: ['compare_cases', 'match_mule_identities', 'compute_jaccard_distance'],
    associatedTools: ['CaseComparator', 'ExhibitMatcher'],
  },
  taint: {
    id: 'taint',
    canonicalView: 'taint',
    displayName: 'Taint Analysis Engine',
    category: 'laboratory',
    description: 'Mathematical taint propagation models (FIFO, proportional, highest-density) tracking dirty funds through commingled accounts.',
    voiceAliases: ['taint', 'taint engine', 'taint analysis', 'dirty money tracing', 'fund taint'],
    intentKeywords: ['taint', 'propagation', 'fifo', 'proportional', 'commingled', 'dirty money'],
    requiredClearance: 'ANALYST',
    availableActions: ['simulate_fifo_taint', 'simulate_proportional_taint', 'export_taint_manifest'],
    associatedTools: ['TaintEngine', 'CommingleSeparator'],
  },
  lab: {
    id: 'lab',
    canonicalView: 'lab',
    displayName: 'Forensic Benchmark Lab',
    category: 'laboratory',
    description: 'Adversarial torture testing against IBM AML and PaySim synthetic datasets with precision/recall/F1 ROC analysis.',
    voiceAliases: ['lab', 'benchmark lab', 'benchmarks', 'open benchmark lab', 'adversarial tests'],
    intentKeywords: ['lab', 'benchmark', 'adversarial', 'paysim', 'ibm aml', 'roc', 'precision', 'recall'],
    requiredClearance: 'ANALYST',
    availableActions: ['run_paysim_benchmark', 'run_ibm_aml_benchmark', 'calibrate_detection_thresholds'],
    associatedTools: ['BenchmarkRunner', 'ConfusionMatrixViewer', 'StatisticalCalibrator'],
  },
  report: {
    id: 'report',
    canonicalView: 'report',
    displayName: 'Forensic Report Generator',
    category: 'primary',
    description: 'Comprehensive, court-admissible forensic dossier compilation with embedded SHA-256 evidence citations.',
    voiceAliases: ['report', 'open the forensic report', 'generate report', 'forensic dossier', 'download report'],
    intentKeywords: ['report', 'dossier', 'export', 'pdf', 'judicial', 'summary report'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['compile_dossier', 'export_pdf', 'sign_digital_evidence_brief'],
    associatedTools: ['ReportCompiler', 'PdfExporter', 'BriefingGenerator'],
  },
  settings: {
    id: 'settings',
    canonicalView: 'settings',
    displayName: 'Platform Configuration',
    category: 'system',
    description: 'Acoustic AEC settings, Sarvam vs Offline voice providers, Indic speech models, and API keys.',
    voiceAliases: ['settings', 'platform configuration', 'system settings', 'audio settings', 'language settings'],
    intentKeywords: ['settings', 'config', 'provider', 'keys', 'models', 'language', 'voice settings'],
    requiredClearance: 'INVESTIGATOR',
    availableActions: ['toggle_voice_provider', 'change_indic_language', 'test_audio_device'],
    associatedTools: ['SettingsManager', 'AudioConfigurator'],
  },
  health: {
    id: 'health',
    canonicalView: 'health',
    displayName: 'System Diagnostics & Hardware',
    category: 'system',
    description: 'Physical RAM headroom, CPU allocation, Faster-Whisper VRAM telemetry, and storage integrity status.',
    voiceAliases: ['health', 'system health', 'diagnostics', 'hardware status', 'memory headroom'],
    intentKeywords: ['health', 'diagnostics', 'ram', 'cpu', 'memory', 'vram', 'telemetry', 'system status'],
    requiredClearance: 'SYSTEM_ADMIN',
    availableActions: ['check_memory_headroom', 'ping_fastapi_backend', 'verify_sqlite_wal'],
    associatedTools: ['HealthChecker', 'ResourceTelemetry'],
  },
};

/**
 * Match a transcribed voice utterance or natural language query against the Navigation Registry.
 * Returns the matching TarkaRouteDefinition and confidence score (0.0 to 1.0).
 */
export function resolveNavigationIntent(
  utterance: string
): { route: TarkaRouteDefinition; confidence: number; matchedAlias?: string } | null {
  if (!utterance || typeof utterance !== 'string') return null;

  const normalized = utterance.trim().toLowerCase();

  // 1. Direct exact alias match (confidence = 1.0)
  for (const route of Object.values(TARKA_NAVIGATION_REGISTRY)) {
    for (const alias of route.voiceAliases) {
      if (normalized === alias.toLowerCase()) {
        return { route, confidence: 1.0, matchedAlias: alias };
      }
    }
  }

  // 2. Phrase containment match (e.g. "please take me to the evidence locker now")
  for (const route of Object.values(TARKA_NAVIGATION_REGISTRY)) {
    for (const alias of route.voiceAliases) {
      if (normalized.includes(alias.toLowerCase())) {
        return { route, confidence: 0.95, matchedAlias: alias };
      }
    }
  }

  // 3. Keyword intersection scoring
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  let bestRoute: TarkaRouteDefinition | null = null;
  let highestScore = 0;

  for (const route of Object.values(TARKA_NAVIGATION_REGISTRY)) {
    let matches = 0;
    for (const kw of route.intentKeywords) {
      if (words.some((w) => w.includes(kw) || kw.includes(w))) {
        matches += 1;
      }
    }
    const score = matches / Math.max(route.intentKeywords.length, 1);
    if (score > highestScore && matches >= 1) {
      highestScore = score;
      bestRoute = route;
    }
  }

  if (bestRoute && highestScore >= 0.25) {
    return { route: bestRoute, confidence: Math.min(0.85, 0.4 + highestScore * 0.5) };
  }

  return null;
}

