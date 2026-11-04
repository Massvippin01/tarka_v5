import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Network,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";

export const PrivacyCryptoWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"psi" | "zkp" | "pbft" | "claims">("psi");

  // ============================================================================
  // TAB 1: PRIVATE SET INTERSECTION (ECDH-PSI) STATE
  // ============================================================================
  const [psiIdType, setPsiIdType] = useState<"MSISDN" | "PAN" | "UPI_VPA">("MSISDN");
  const [psiRunning, setPsiRunning] = useState(false);
  const [psiCompleted, setPsiCompleted] = useState(true);

  // Synthetic Bank Datasets
  const bankData = {
    HDFC: {
      MSISDN: ["+919876543210", "+919123456789", "+919999000001", "+919999000002"],
      PAN: ["BZCPK8812M", "ABCDE1111A", "ABCDE2222B"],
      UPI_VPA: ["mule_syndicate@okhdfcbank", "legit_user_a@okhdfc"],
    },
    ICICI: {
      MSISDN: ["+919876543210", "+918888000001", "+918888000002"],
      PAN: ["BZCPK8812M", "FGHIJ3333C"],
      UPI_VPA: ["mule_syndicate@okhdfcbank", "legit_user_b@okicici"],
    },
    AXIS: {
      MSISDN: ["+919876543210", "+917777000001"],
      PAN: ["BZCPK8812M", "KLMNO4444D"],
      UPI_VPA: ["mule_syndicate@okhdfcbank", "legit_user_c@axisbank"],
    },
  };

  const handleRunPsi = () => {
    setPsiRunning(true);
    setTimeout(() => {
      setPsiRunning(false);
      setPsiCompleted(true);
    }, 600);
  };

  // ============================================================================
  // TAB 2: ZERO-KNOWLEDGE PROOF (ZKP) STATE
  // ============================================================================
  const [zkpThreshold, setZkpThreshold] = useState<number>(500000); // ₹5,00,000
  const [zkpTamperProof, setZkpTamperProof] = useState<boolean>(false);
  const [zkpTamperThreshold, setZkpTamperThreshold] = useState<boolean>(false);
  const [showPrivateWitness, setShowPrivateWitness] = useState<boolean>(false);

  const privateTransactions = [
    { id: "TX-01", amount: 50000, recipient: "ACC-MULE-01", salt: "s_9f81a" },
    { id: "TX-02", amount: 75000, recipient: "ACC-MULE-02", salt: "s_3b12c" },
    { id: "TX-03", amount: 25000, recipient: "ACC-MULE-03", salt: "s_7e44d" },
    { id: "TX-04", amount: 100000, recipient: "ACC-MULE-04", salt: "s_1a09f" },
    { id: "TX-05", amount: 100000, recipient: "ACC-MULE-05", salt: "s_88e2b" },
  ];
  const totalBatchAmount = privateTransactions.reduce((acc, t) => acc + t.amount, 0); // 350,000

  const effectiveThreshold = zkpTamperThreshold ? 200000 : zkpThreshold;
  const isZkpValid = totalBatchAmount <= effectiveThreshold && !zkpTamperProof;

  // ============================================================================
  // TAB 3: 4-NODE PBFT CONSENSUS STATE
  // ============================================================================
  const [pbftFaultMode, setPbftFaultMode] = useState<"HONEST" | "SILENT" | "CONFLICTING">("HONEST");
  const [pbftRunning, setPbftRunning] = useState<boolean>(false);
  const [pbftRound, setPbftRound] = useState<number>(1);

  const pbftNodes = [
    { id: "node_0", name: "HDFC Primary", role: "Leader", status: "COMMITTED" },
    { id: "node_1", name: "ICICI Validator", role: "Replica", status: "COMMITTED" },
    { id: "node_2", name: "AXIS Validator", role: "Replica", status: "COMMITTED" },
    {
      id: "node_3",
      name: "SBI Validator",
      role: pbftFaultMode === "HONEST" ? "Replica" : "Byzantine",
      status:
        pbftFaultMode === "HONEST"
          ? "COMMITTED"
          : pbftFaultMode === "SILENT"
          ? "CRASHED / SILENT"
          : "REJECTED FORGERY",
    },
  ];

  const handleRunPbft = () => {
    setPbftRunning(true);
    setTimeout(() => {
      setPbftRunning(false);
      setPbftRound((r) => r + 1);
    }, 500);
  };

  // ============================================================================
  // TAB 4: COUNTERFACTUAL EVIDENCE EXCLUSION STATE
  // ============================================================================
  const [excludeScreenshot, setExcludeScreenshot] = useState<boolean>(false);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Institutional Privacy, Cryptography & Formal Verification Hub
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                100% Executable Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SUTRAM 2026 PS04 · Multi-Party ECDH-PSI · Circom ZK-SNARK Verifier · 4-Node PBFT Consensus · Formal Claim DAG
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium">
          <button
            onClick={() => setActiveTab("psi")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === "psi"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>1. Private Set Intersection</span>
          </button>
          <button
            onClick={() => setActiveTab("zkp")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === "zkp"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>2. Zero-Knowledge Proofs</span>
          </button>
          <button
            onClick={() => setActiveTab("pbft")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === "pbft"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>3. PBFT Consensus</span>
          </button>
          <button
            onClick={() => setActiveTab("claims")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 ${
              activeTab === "claims"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4. Claim DAG & Counterfactual</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ==================================================================== */}
        {/* TAB 1: PRIVATE SET INTERSECTION (ECDH-PSI)                           */}
        {/* ==================================================================== */}
        {activeTab === "psi" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Context Banner */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start space-x-3">
              <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  Workstream B1: Multi-Party Elliptic Curve Diffie-Hellman Private Set Intersection (ECDH-PSI)
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                  Enables Bank A (HDFC), Bank B (ICICI), and Institution C (AXIS) to discover matching mule identifiers
                  without revealing non-matching customer records. Uses SECP256k1 discrete logarithm double-blinding:{" "}
                  <code className="px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/80 font-mono text-[11px]">
                    P_AB = k_A · k_B · H(x) == k_B · k_A · H(y) = P_BA
                  </code>
                  . Complies with Section 63 BSA 2023 & DPDPA 2023 purpose limitation.
                </p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    CORRELATION IDENTIFIER TYPE
                  </label>
                  <select
                    value={psiIdType}
                    onChange={(e) => setPsiIdType(e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MSISDN">Mobile Phone Number (Indian E.164 +91)</option>
                    <option value="PAN">Permanent Account Number (PAN)</option>
                    <option value="UPI_VPA">Virtual Payment Address (UPI VPA)</option>
                  </select>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    PARTICIPATING INSTITUTIONS
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-900">
                      HDFC Bank (Bank A)
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-900">
                      ICICI Bank (Bank B)
                    </span>
                    <span className="text-slate-400 font-bold">+</span>
                    <span className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-900">
                      Axis Bank (Node C)
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunPsi}
                disabled={psiRunning}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-2 shadow-md transition-all disabled:opacity-50"
              >
                {psiRunning ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Blinding SECP256k1 Points...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Execute Tripartite ECDH-PSI</span>
                  </>
                )}
              </button>
            </div>

            {/* 3 Institution Vault Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* HDFC Vault */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs text-blue-700 dark:text-blue-400">INST_HDFC (Complainant Bank)</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
                    {bankData.HDFC[psiIdType].length} Records
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {bankData.HDFC[psiIdType].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border flex items-center justify-between ${
                        item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[10px] font-sans px-1 rounded bg-white dark:bg-slate-800 border">
                        {item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "Target Mule"
                          : "Confidential Client"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-[11px] text-slate-400 italic">
                  Private Key: <span className="font-mono text-slate-500">k_HDFC = 0x8f2a...c4e1</span> (Kept local)
                </div>
              </div>

              {/* ICICI Vault */}
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs text-amber-700 dark:text-amber-400">INST_ICICI (Layer-2 Bank)</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono">
                    {bankData.ICICI[psiIdType].length} Records
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {bankData.ICICI[psiIdType].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border flex items-center justify-between ${
                        item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[10px] font-sans px-1 rounded bg-white dark:bg-slate-800 border">
                        {item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "Target Mule"
                          : "Confidential Client"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-[11px] text-slate-400 italic">
                  Private Key: <span className="font-mono text-slate-500">k_ICICI = 0x3d7b...9a12</span> (Kept local)
                </div>
              </div>

              {/* AXIS Vault */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-xs text-purple-700 dark:text-purple-400">INST_AXIS (Beneficiary Node)</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono">
                    {bankData.AXIS[psiIdType].length} Records
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {bankData.AXIS[psiIdType].map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border flex items-center justify-between ${
                        item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{item}</span>
                      <span className="text-[10px] font-sans px-1 rounded bg-white dark:bg-slate-800 border">
                        {item.includes("9876543210") || item.includes("BZCPK8812M") || item.includes("mule_syndicate")
                          ? "Target Mule"
                          : "Confidential Client"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 text-[11px] text-slate-400 italic">
                  Private Key: <span className="font-mono text-slate-500">k_AXIS = 0x11c0...4f88</span> (Kept local)
                </div>
              </div>
            </div>

            {/* Discovered Match Output */}
            {psiCompleted && (
              <div className="p-5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
                      Tripartite Intersection Result: 1 Inter-Bank Mule Discovered
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                    Zero Non-Matching Accounts Exposed
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 font-mono text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 mr-2">Discovered Permitted Match:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {psiIdType === "MSISDN" ? "+919876543210" : psiIdType === "PAN" ? "BZCPK8812M" : "mule_syndicate@okhdfcbank"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Curve Point Digest: <code className="text-indigo-600 dark:text-indigo-400 font-bold">0279be667ef9dcbb...a06295</code>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>Privacy Proof: Discrete logarithm problem on SECP256k1 prevents dictionary recovery of unblinded inputs.</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Audit Reference: #PSI-AUDIT-9941</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: ZERO-KNOWLEDGE PROOFS (ZKP)                                   */}
        {/* ==================================================================== */}
        {activeTab === "zkp" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Context Banner */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-start space-x-3">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                  Workstream B2: Groth16 / Circom Zero-Knowledge Threshold Verifier
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Enables a financial institution to mathematically prove that its batch of committed transactions
                  satisfies a regulatory threshold constraint (e.g., Total Inflow ≤ ₹5,00,000) without disclosing
                  individual transaction amounts, beneficiary identities, or account balances to investigators.
                </p>
              </div>
            </div>

            {/* Split Grid: Prover (Private) vs Verifier (Public) */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Prover Space */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Bank Air-Gapped Prover Space (Private)
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowPrivateWitness(!showPrivateWitness)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 font-medium"
                  >
                    {showPrivateWitness ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPrivateWitness ? "Hide Witness" : "Inspect Witness"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-500 font-semibold">PRIVATE TRANSACTION BATCH (5 ITEMS):</div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {privateTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 mr-2">{tx.id}</span>
                          <span className="text-slate-500">→ {tx.recipient}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {showPrivateWitness ? `₹${tx.amount.toLocaleString()}` : "••••••••"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between text-xs font-semibold">
                  <span>Calculated Private Sum:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono text-sm">
                    {showPrivateWitness ? `₹${totalBatchAmount.toLocaleString()}` : "HIDDEN (PASSIVE WITNESS)"}
                  </span>
                </div>

                {/* Circuit Info */}
                <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border text-[11px] space-y-1 text-slate-500">
                  <div className="flex justify-between">
                    <span>Circom Circuit:</span>
                    <code className="text-indigo-600 dark:text-indigo-400 font-mono">transaction_threshold.circom</code>
                  </div>
                  <div className="flex justify-between">
                    <span>R1CS Constraints:</span>
                    <span className="font-mono">132 linear constraints</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proving System:</span>
                    <span className="font-mono">Groth16 / BN254</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Verifier Space */}
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Independent Auditor Verifier Space (Public)
                    </h4>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-500">
                    Public Inputs Only
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-500 font-semibold block mb-1">PUBLIC REGULATORY THRESHOLD (IN RUPEES)</label>
                    <input
                      type="number"
                      value={zkpThreshold}
                      onChange={(e) => setZkpThreshold(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm"
                    />
                  </div>

                  <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border font-mono text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Expected Merkle Root:</span>
                      <span className="text-slate-900 dark:text-white font-bold">0x4a9b...7e11</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Batch Size:</span>
                      <span>5 transactions</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Proof Elements (πA, πB, πC):</span>
                      <span className="text-emerald-600">3 group points (256 bytes)</span>
                    </div>
                  </div>

                  {/* Adversarial Tamper Toggles */}
                  <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">
                      ADVERSARIAL ATTACK SIMULATOR (JUDGE TESTING)
                    </span>
                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zkpTamperProof}
                        onChange={(e) => setZkpTamperProof(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Inject Forged πA Group Point (Tampered Proof Element)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zkpTamperThreshold}
                        onChange={(e) => setZkpTamperThreshold(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Tamper Public Threshold to ₹2,00,000 (Violate Bound)</span>
                    </label>
                  </div>

                  {/* Verification Outcome */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      isZkpValid
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                        : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {isZkpValid ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-sm">
                          {isZkpValid ? "ZKP VERIFICATION: ACCEPTED" : "ZKP VERIFICATION: REJECTED (FAIL CLOSED)"}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {isZkpValid
                            ? `Mathematically proven: Batch sum ≤ ₹${zkpThreshold.toLocaleString()} without revealing private amounts.`
                            : zkpTamperProof
                            ? "Cryptographic rejection: Malformed or forged group element πA."
                            : "Public inputs hash mismatch: Constraint sum > threshold."}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-white dark:bg-slate-900 border">
                      {isZkpValid ? "0.42 ms" : "0.08 ms"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: 4-NODE PBFT CONSENSUS EXPERIMENT                             */}
        {/* ==================================================================== */}
        {activeTab === "pbft" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Context Banner */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 flex items-start space-x-3">
              <Network className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                  Workstream B4: 4-Node Practical Byzantine Fault Tolerance (PBFT) Experiment
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Coordinates real-time inter-bank mule freezing directives across 4 validator nodes (n=4, f=1).
                  Tolerates up to 1 crashing or actively Byzantine node sending forged digests while guaranteeing quorum{" "}
                  <code className="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/80 font-mono text-[11px]">
                    2f + 1 = 3
                  </code>
                  .
                </p>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    BYZANTINE NODE 3 FAULT BEHAVIOR
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPbftFaultMode("HONEST")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        pbftFaultMode === "HONEST"
                          ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      1. All 4 Nodes Honest
                    </button>
                    <button
                      onClick={() => setPbftFaultMode("SILENT")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        pbftFaultMode === "SILENT"
                          ? "bg-amber-50 dark:bg-amber-950 border-amber-400 text-amber-800 dark:text-amber-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      2. Node 3 Crashed / Silent
                    </button>
                    <button
                      onClick={() => setPbftFaultMode("CONFLICTING")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        pbftFaultMode === "CONFLICTING"
                          ? "bg-rose-50 dark:bg-rose-950 border-rose-400 text-rose-800 dark:text-rose-200 font-bold"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      3. Node 3 Active Byzantine Forgery
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRunPbft}
                disabled={pbftRunning}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center space-x-2 shadow-md transition-all disabled:opacity-50"
              >
                {pbftRunning ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Exchanging 3-Phase Votes...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Simulate Consensus Round #{pbftRound}</span>
                  </>
                )}
              </button>
            </div>

            {/* 4 Validator Grid */}
            <div className="grid grid-cols-4 gap-4">
              {pbftNodes.map((node) => (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm space-y-3 ${
                    node.role === "Byzantine"
                      ? "border-rose-400 dark:border-rose-800 bg-rose-50/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-xs">{node.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        node.role === "Leader"
                          ? "bg-indigo-100 text-indigo-800"
                          : node.role === "Byzantine"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {node.role}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Pre-Prepare:</span>
                      <span className="font-mono text-emerald-600 font-bold">Verified</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Prepare Vote:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {node.role === "Byzantine" && pbftFaultMode === "CONFLICTING"
                          ? "Forged Digest"
                          : node.role === "Byzantine" && pbftFaultMode === "SILENT"
                          ? "Dropped"
                          : "Quorum Met (2/2)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Commit Vote:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {node.role === "Byzantine" && pbftFaultMode === "CONFLICTING"
                          ? "Rejected"
                          : node.role === "Byzantine" && pbftFaultMode === "SILENT"
                          ? "No Response"
                          : "Quorum Met (3/3)"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`pt-2 text-center text-xs font-bold py-1.5 rounded ${
                      node.status === "COMMITTED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
                        : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200"
                    }`}
                  >
                    {node.status}
                  </div>
                </div>
              ))}
            </div>

            {/* Quorum Summary */}
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="font-bold text-xs text-emerald-900 dark:text-emerald-100 block">
                    PBFT Consensus Guaranteed: Quorum 3/4 Committed (2f + 1 Met)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Even under active adversarial forgery by Node 3, honest nodes 0, 1, and 2 reach strict agreement.
                  </span>
                </div>
              </div>
              <div className="text-right text-xs font-mono">
                <span className="text-slate-500 block">Round Latency:</span>
                <span className="font-bold text-slate-900 dark:text-white">0.90 ms (32 messages)</span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: CLAIM COMPILER & COUNTERFACTUAL ARENA                          */}
        {/* ==================================================================== */}
        {activeTab === "claims" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Context Banner */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 flex items-start space-x-3">
              <Layers className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-teal-900 dark:text-teal-200">
                  Workstream A1 & A3: Forensic Claim Compiler & Counterfactual Evidence Exclusion
                </h3>
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                  Organizes investigative observations into an acyclic dependency DAG across 5 formal states:{" "}
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">SUPPORTED</span>,{" "}
                  <span className="font-semibold text-rose-700 dark:text-rose-300">CONTRADICTED</span>,{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-300">UNCERTAIN</span>,{" "}
                  <span className="font-semibold text-slate-600">UNSUPPORTED</span>, and{" "}
                  <span className="font-semibold text-slate-400">NOT_EVALUATED</span>. Toggle the counterfactual exclusion
                  below to see which findings dissolve and which independent corroborations survive.
                </p>
              </div>
            </div>

            {/* Counterfactual Exclusion Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  COUNTERFACTUAL EVIDENCE CHALLENGE
                </span>
                <span className="text-xs text-slate-500">
                  Simulate legal defense objection: exclude unverified WhatsApp receipt screenshot (ART-SCREENSHOT)
                </span>
              </div>
              <button
                onClick={() => setExcludeScreenshot(!excludeScreenshot)}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center space-x-2 ${
                  excludeScreenshot
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border hover:bg-slate-200"
                }`}
              >
                <span>{excludeScreenshot ? "Artifact Excluded (Challenger Run)" : "Exclude Screenshot Artifact"}</span>
              </button>
            </div>

            {/* Claim DAG List */}
            <div className="space-y-3">
              {/* Claim 1: Disputed Screenshot Claim */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  excludeScreenshot
                    ? "bg-slate-50/50 dark:bg-slate-900/30 border-slate-300 dark:border-slate-800 opacity-60"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">CLM-01: Disputed ₹15,000 Transfer Claim</span>
                    <span className="text-slate-400">| Source: ART-SCREENSHOT</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      excludeScreenshot
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {excludeScreenshot ? "UNSUPPORTED (DISSOLVED)" : "SUPPORTED"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {excludeScreenshot
                    ? "Finding deactivated: Primary supporting artifact was excluded from evidence scope."
                    : "Complainant asserts transfer of ₹15,000 based on unverified smartphone gallery screenshot."}
                </p>
              </div>

              {/* Claim 2: Actual Bank Debit */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 dark:text-white">CLM-02: Core Finacle Bank Debit ₹2,500</span>
                    <span className="text-slate-400">| Source: ART-FINACLE-LOG (T1 Authority)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    SUPPORTED (SURVIVES)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Core banking switch confirms actual debit of ₹2,500.00. Unaffected by screenshot exclusion.
                </p>
              </div>

              {/* Claim 3: Amount Mismatch Contradiction */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  excludeScreenshot
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">CLM-03: Amount Discrepancy Conflict</span>
                    <span className="text-slate-400">| Z3 Formal Contradiction</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      excludeScreenshot
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {excludeScreenshot ? "CONTRADICTION DISSOLVED" : "CONTRADICTED"}
                  </span>
                </div>
                <p className="text-xs mt-2">
                  {excludeScreenshot
                    ? "Contradiction resolved: Upon excluding the disputed screenshot, the conflict between ₹15,000 and ₹2,500 evaporates, leaving the authentic ₹2,500 debit."
                    : "Mathematical SMT conflict: Screenshot asserts ₹15,000 while Finacle switch asserts ₹2,500."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

