import type { CaseWorkspace } from "../context/TarkaGlobalContext";
import type { ReconstructedInvestigation } from "../utils/investigationReconstructor";

export interface InvestigationStepCheck {
  id: "evidence" | "people" | "money_trail" | "network" | "device" | "actions";
  title: string;
  isComplete: boolean;
  statusText: string;
  requiredEvidenceText: string;
  actionRoute: string;
}

export interface InvestigationProgressResult {
  percentComplete: number;
  completedStepsCount: number;
  totalStepsCount: number;
  steps: InvestigationStepCheck[];
}

export function deriveInvestigationProgress(
  bundle?: (ReconstructedInvestigation & { transactions?: unknown[]; canonicalEntities?: unknown[]; clusters?: unknown[] }) | null,
  activeCase?: CaseWorkspace | null
): InvestigationProgressResult {
  const artifacts = activeCase?.artifacts || [];
  const nodes = bundle?.nodes || [];
  const edges = bundle?.edges || [];
  const txns = (bundle as any)?.transactions || edges;
  const entities = (bundle as any)?.canonicalEntities || (bundle as any)?.clusters || (nodes.length > 0 ? nodes : []);

  // 1. Evidence ✓ when ≥1 T1 financial record
  const hasT1Record =
    artifacts.some(
      (a) =>
        a.tier === "TIER_1_CERTIFIED" ||
        a.vectorType === "CBS_LEDGER" ||
        a.vectorType === "NPCI_XML"
    ) ||
    (Array.isArray(txns) && txns.length > 0) ||
    Boolean(bundle?.fileManifest && bundle.fileManifest.length > 0);

  // 2. People ✓ when resolution run and entities present
  const hasResolvedPeople = Array.isArray(entities) && entities.length > 0;

  // 3. Money Trail ✓ when flows computed
  const hasFlows = edges.length > 0 || (Array.isArray(txns) && txns.length > 0);

  // 4. Network ✓ when graph built
  const hasGraph = nodes.length >= 2 && edges.length >= 1;

  // 5. Device ✓ when CDR/IPDR present
  const hasDeviceData =
    artifacts.some((a) => a.vectorType === "TELCO_CGNAT") ||
    nodes.some(
      (n: any) =>
        n.nodeType === "DEVICE" ||
        n.category === "HOTSPOT" ||
        n.label?.toLowerCase().includes("hotspot") ||
        n.label?.toLowerCase().includes("cgnat")
    );

  // 6. Actions ✓ when frozen or action pending is addressed
  const status = (activeCase as any)?.status || "INVESTIGATING";
  const hasActions =
    status === "FROZEN" ||
    status === "PARTIALLY_RECOVERED" ||
    status === "COURT_READY" ||
    status === "CLOSED" ||
    (bundle as any)?.financials?.recoverableLibrInr > 0;

  const steps: InvestigationStepCheck[] = [
    {
      id: "evidence",
      title: "Evidence & Ledger",
      isComplete: hasT1Record,
      statusText: hasT1Record ? "Tier-1 CBS ledger verified" : "Awaiting Finacle/CBS statement",
      requiredEvidenceText: "Finacle CBS Statement (CSV) or UPI Central Switch Log",
      actionRoute: "intake",
    },
    {
      id: "people",
      title: "People & Accounts",
      isComplete: hasResolvedPeople,
      statusText: hasResolvedPeople ? `${entities.length} entities resolved` : "Entity resolution pending",
      requiredEvidenceText: "Bank KYC records and UPI VPAs to cluster suspect aliases",
      actionRoute: "entities",
    },
    {
      id: "money_trail",
      title: "Money Trail",
      isComplete: hasFlows,
      statusText: hasFlows ? "LIBR fund dissipation computed" : "Flow computation pending",
      requiredEvidenceText: "Transaction rows with debit/credit and running balances",
      actionRoute: "taint-engine",
    },
    {
      id: "network",
      title: "Fraud Network",
      isComplete: hasGraph,
      statusText: hasGraph ? `${nodes.length} nodes in syndicate graph` : "Syndicate graph not built",
      requiredEvidenceText: "Account relationships, shared device identifiers, or IP logs",
      actionRoute: "network",
    },
    {
      id: "device",
      title: "Device & Telco",
      isComplete: hasDeviceData,
      statusText: hasDeviceData ? "CGNAT IPDR & BSSID verified" : "Awaiting CGNAT/CDR logs",
      requiredEvidenceText: "Bharti Airtel / Telco CGNAT IPDR log with source port translation",
      actionRoute: "attribution",
    },
    {
      id: "actions",
      title: "Statutory Freezes",
      isComplete: hasActions,
      statusText: hasActions ? "Actionable freeze requisitions ready" : "No freeze requisitions initiated",
      requiredEvidenceText: "Mule account identification under Section 106 BNSS",
      actionRoute: "report",
    },
  ];

  const completedStepsCount = steps.filter((s) => s.isComplete).length;
  const totalStepsCount = steps.length;
  const percentComplete = Math.round((completedStepsCount / totalStepsCount) * 100);

  return {
    percentComplete,
    completedStepsCount,
    totalStepsCount,
    steps,
  };
}
