/**
 * TARKA Universal Semantic Element Registry & Interactive Highlighting Engine
 * Enables voice-directed element highlighting, automated scrolling, and restrained RGB-accented focus.
 * Governing Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
 */

export type SemanticCategory =
  | 'metric'
  | 'ledger_row'
  | 'graph_node'
  | 'graph_edge'
  | 'timeline_event'
  | 'claim'
  | 'exhibit'
  | 'validation_result'
  | 'report_section'
  | 'action_button';

export type HighlightTone = 'info' | 'success' | 'warning' | 'error' | 'neural';

export interface SemanticElement {
  id: string; // e.g. 'el-metric-discrepancy'
  category: SemanticCategory;
  displayName: string;
  route: string; // e.g. 'ledger'
  evidenceRef?: string; // e.g. 'ART-066FEA672A'
  description: string;
  preferredTone?: HighlightTone;
}

export const SEMANTIC_ELEMENT_REGISTRY: Record<string, SemanticElement> = {
  // Command Centre & Metrics
  'el-metric-total-loss': {
    id: 'el-metric-total-loss',
    category: 'metric',
    displayName: 'Total Disputed Loss Metric',
    route: 'workspace',
    description: 'Headline figure representing total financial fraud reported by the complainant.',
    preferredTone: 'error',
  },
  'el-metric-golden-hour': {
    id: 'el-metric-golden-hour',
    category: 'metric',
    displayName: 'Golden Hour Countdown Clock',
    route: 'workspace',
    description: 'Real-time countdown timer before funds are permanently dissipated.',
    preferredTone: 'warning',
  },
  'el-metric-recovery-potential': {
    id: 'el-metric-recovery-potential',
    category: 'metric',
    displayName: 'Recovery Potential Gauge',
    route: 'workspace',
    description: 'Estimated proportion of funds currently reachable in identified Layer-1 accounts.',
    preferredTone: 'success',
  },

  // Financial Ledger
  'el-ledger-row-rrn-402918273645': {
    id: 'el-ledger-row-rrn-402918273645',
    category: 'ledger_row',
    displayName: 'Disputed Transaction RRN 402918273645',
    route: 'ledger',
    evidenceRef: 'ART-066FEA672A',
    description: 'Primary fraudulent debit of ₹1,45,000 flagged for timestamp mismatch.',
    preferredTone: 'warning',
  },
  'el-ledger-metric-conservation': {
    id: 'el-ledger-metric-conservation',
    category: 'metric',
    displayName: 'Ledger Conservation Balance',
    route: 'ledger',
    description: 'Mathematical delta between complainant outflow and CBS institutional inflow.',
    preferredTone: 'neural',
  },

  // Evidence Locker
  'el-exhibit-bank-statement': {
    id: 'el-exhibit-bank-statement',
    category: 'exhibit',
    displayName: 'Complainant Bank Statement Exhibit (ART-066FEA672A)',
    route: 'evidence',
    evidenceRef: 'ART-066FEA672A',
    description: 'Verified digital exhibit sealed under SHA-256 with Section 63 BSA custody chain.',
    preferredTone: 'info',
  },
  'el-exhibit-cbs-core': {
    id: 'el-exhibit-cbs-core',
    category: 'exhibit',
    displayName: 'Core Banking Solution Raw Export (ART-7B1A9904CD)',
    route: 'evidence',
    evidenceRef: 'ART-7B1A9904CD',
    description: 'Institutional server record admitted via legal production order.',
    preferredTone: 'success',
  },

  // Fraud Network Graph
  'el-graph-node-mule-1': {
    id: 'el-graph-node-mule-1',
    category: 'graph_node',
    displayName: 'Layer-1 Mule Beneficiary: ACC-49102941',
    route: 'network',
    description: 'Primary aggregator account receiving 85% of complainant transfers.',
    preferredTone: 'error',
  },
  'el-graph-node-hub': {
    id: 'el-graph-node-hub',
    category: 'graph_node',
    displayName: 'Syndicate Operational Hub Node',
    route: 'network',
    description: 'Highest betweenness centrality node coordinating fund dispersion.',
    preferredTone: 'neural',
  },

  // Device & SIM Attribution
  'el-device-cgnat-funnel': {
    id: 'el-device-cgnat-funnel',
    category: 'metric',
    displayName: 'CGNAT Demultiplexing Funnel',
    route: 'device',
    description: 'Carrier NAT translation table matching source port 51092 to IMSI 40445091823.',
    preferredTone: 'info',
  },

  // Temporal Loom
  'el-timeline-event-first-debit': {
    id: 'el-timeline-event-first-debit',
    category: 'timeline_event',
    displayName: 'Initial Fraudulent Debit Event (14:02:11 IST)',
    route: 'timeline',
    description: 'Unsynchronized event timestamp normalized against NTP server clock drift.',
    preferredTone: 'warning',
  },

  // Claim Dependency Lens
  'el-claim-z3-solver-verdict': {
    id: 'el-claim-z3-solver-verdict',
    category: 'claim',
    displayName: 'Z3 Formal Satisfiability Proof Result',
    route: 'claim-lens',
    description: 'SMT solver formal proof validating non-contradiction of admitted exhibits.',
    preferredTone: 'success',
  },

  // Section 63 BSA Court Proof
  'el-court-proof-certificate': {
    id: 'el-court-proof-certificate',
    category: 'validation_result',
    displayName: 'Section 63 BSA Electronic Evidence Certificate',
    route: 'court-proof',
    description: 'Statutory electronic evidence certificate pre-formatted for judicial submission.',
    preferredTone: 'success',
  },
};

class TarkaHighlightController {
  private activeElementId: string | null = null;
  private activeTone: HighlightTone = 'neural';
  private clearTimer: number | null = null;
  private listeners: Set<(elementId: string | null, tone: HighlightTone) => void> = new Set();

  public subscribe(fn: (elementId: string | null, tone: HighlightTone) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public getActiveHighlight(): { elementId: string | null; tone: HighlightTone } {
    return { elementId: this.activeElementId, tone: this.activeTone };
  }

  /**
   * Highlight a specific semantic element by ID and automatically scroll it into view.
   */
  public highlightElement(elementId: string, tone: HighlightTone = 'neural', durationMs = 6000): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    this.activeElementId = elementId;
    this.activeTone = tone;
    this.notify();

    // Attempt DOM scroll and pulse
    if (typeof document !== 'undefined') {
      const el = document.getElementById(elementId) || document.querySelector(`[data-semantic-id="${elementId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tarka-semantic-pulse');
        setTimeout(() => el.classList.remove('tarka-semantic-pulse'), 2500);
      }
    }

    if (durationMs > 0) {
      this.clearTimer = window.setTimeout(() => {
        this.clearHighlight();
      }, durationMs);
    }
  }

  public clearHighlight(): void {
    if (this.clearTimer !== null) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }
    this.activeElementId = null;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.activeElementId, this.activeTone);
    }
  }
}

export const highlightController = new TarkaHighlightController();
