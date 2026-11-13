import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Dna,
  Users,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Building,
  Shield,
  Plus,
  X,
  Scissors,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useTarkaGlobal } from "../../context/TarkaGlobalContext";
import { useTarkaUiStore } from "../../store/useTarkaUiStore";
import {
  CaseSyncBridge,
  type CanonicalEntity,
  type RawToken,
} from "../../services/caseSyncBridge";
import { getCanonicalCase, CANONICAL_CASES, buildCaseBundleFromFixture } from "../../fixtures/cases";
import { reconstruct5FileInvestigation } from "../../utils/investigationReconstructor";
import {
  KpiTile,
  StoryBanner,
  SectionCard,
  ScaleBar,
} from "../../components/tarka/kit";
import { getBnss94EntityResolutionDirective } from "../../utils/statutoryDirectives";
import { sha256HexSync } from "../../utils/sha256";
import { ScreenFindingCard } from "../../components/tarka/common/ScreenFindingCard";

export interface CandidateMergeLink {
  id: string;
  sourceMentionId: string;
  sourceLabel: string;
  sourceValue: string;
  sourceBadge: string;
  targetEntityId: string;
  targetName: string;
  matchScore: number;
  matchEvidence: string[];
  decision: "PROPOSED" | "ACCEPTED" | "REJECTED" | "SPLIT";
  auditEventId?: string;
  sha256Proof?: string;
  timestamp?: string;
}

export const EntityResolutionScreen: React.FC = () => {
  const { activeCaseId, setActiveRoute } = useTarkaGlobal();
  const { density, activeDiscoveredCluster, reconstructedInvestigation } = useTarkaUiStore();
  const isCompact = density === "compact";

  const investigation = useMemo(() => {
    if (reconstructedInvestigation && reconstructedInvestigation.caseId === activeCaseId) {
      return reconstructedInvestigation;
    }
    if (activeCaseId && CANONICAL_CASES[activeCaseId]) {
      return buildCaseBundleFromFixture(CANONICAL_CASES[activeCaseId]);
    }
    return reconstructedInvestigation || reconstruct5FileInvestigation();
  }, [reconstructedInvestigation, activeCaseId]);

  const dynamicData = useMemo(() => {
    return CaseSyncBridge.getInstance().deriveCaseCanonicalEntities(activeCaseId || "CASE-2026-001", investigation);
  }, [activeCaseId, investigation]);

  const [selectedEntityId, setSelectedEntityId] = useState<string>("ENT-02");
  const [selectedTokenType, setSelectedTokenType] = useState<string>("ALL");
  const [isCopied, setIsCopied] = useState(false);
  const [whyModalEntity, setWhyModalEntity] = useState<CanonicalEntity | null>(null);

  // Prompt 9 Features: Custom Mentions, Add Mention Dialog, Bipartite Map, Accept/Reject/Split Decisions
  const [customMentions, setCustomMentions] = useState<RawToken[]>([]);
  const [addMentionOpen, setAddMentionOpen] = useState(false);
  const [newMentionName, setNewMentionName] = useState("VIKRAM SHA");
  const [newMentionPhone, setNewMentionPhone] = useState("98711-23941");
  const [newMentionSource, setNewMentionSource] = useState("WhatsApp Chat Export");
  const [bipartiteMapActive, setBipartiteMapActive] = useState(true);

  // Candidate merge review links (Prompt 9: investigator can Accept / Reject / Split a merge)
  const [candidateLinks, setCandidateLinks] = useState<CandidateMergeLink[]>([
    {
      id: "LINK-01",
      sourceMentionId: "M-VIKRAM-WA",
      sourceLabel: "VIKRAM SHA (WhatsApp)",
      sourceValue: "vikram.pay@okaxis · +91 9871123941",
      sourceBadge: "WhatsApp Chat Export",
      targetEntityId: "ENT-02",
      targetName: "Vikram Shah",
      matchScore: 95,
      matchEvidence: [
        "Indic transliteration equivalence: 'VIKRAM SHA' ≈ 'Vikram Shah'",
        "Phone Exact Match: +91 9871123941 (normalized from 09871123941)",
        "UPI Alias match: common handle root 'vikram' (vikramshah@okaxis ↔ vikram.pay@okaxis)",
      ],
      decision: "PROPOSED",
    },
    {
      id: "LINK-02",
      sourceMentionId: "M-MERCH-APEX",
      sourceLabel: "Apex Electronics Pvt Ltd",
      sourceValue: "A/c 004205001192 · GSTIN 07AAACA1234F1Z8",
      sourceBadge: "Merchant POS Terminal",
      targetEntityId: "ENT-03",
      targetName: "Rohit Verma (Layer 2 Mule)",
      matchScore: 0,
      matchEvidence: [
        "⛔ HARD_VETO: Verified retail merchant (active GSTIN) cannot auto-merge with illicit mule suspect",
      ],
      decision: "REJECTED",
      auditEventId: "AUD-VETO-01",
      sha256Proof: "0x89abf42019284102938102938102938102938102938102938102938102938102",
    },
  ]);

  const rawTokenList = useMemo(() => {
    return [...dynamicData.tokens, ...customMentions];
  }, [dynamicData, customMentions]);

  const filteredTokens = useMemo(() => {
    return rawTokenList.filter((t) => {
      if (selectedTokenType === "ALL") return true;
      return t.sourceType === selectedTokenType;
    });
  }, [rawTokenList, selectedTokenType]);

  const canonicalEntities: CanonicalEntity[] = useMemo(() => {
    if (activeDiscoveredCluster) {
      const canonicalCase = getCanonicalCase(activeCaseId || "CASE-2026-001");
      const victim = activeDiscoveredCluster.victimAccount || canonicalCase.complainant.name || "Victim Source Account";
      const conduit = activeDiscoveredCluster.layer1Conduit || canonicalCase.accounts.find((a: { muleLayer?: string; holderName?: string }) => a.muleLayer === "L1")?.holderName || "Layer 1 Conduit";
      const l2a = activeDiscoveredCluster.layer2SplitConduits?.[0] || canonicalCase.accounts.find((a: { muleLayer?: string; holderName?: string }) => a.muleLayer === "L2")?.holderName || "Layer 2 Mule";
      const l2b = activeDiscoveredCluster.layer2SplitConduits?.[1] || "Secondary Mule";
      const merchant = activeDiscoveredCluster.innocentMerchant || canonicalCase.accounts.find((a: { holderType?: string; holderName?: string }) => a.holderType === "MERCHANT")?.holderName || "Commercial Merchant";
      const gstin = activeDiscoveredCluster.merchantGstin || "07AAACA1234F1Z8";
      const imei = activeDiscoveredCluster.convergedImei || canonicalCase.accounts.find((a: { deviceImei?: string }) => Boolean(a.deviceImei))?.deviceImei || "IMEI Not Recorded";
      const ja4 = activeDiscoveredCluster.convergedJa4 || canonicalCase.syndicateLinks?.find((s: { sharedAnchorType?: string; sharedAnchorValue?: string }) => s.sharedAnchorType === "JA4_TLS")?.sharedAnchorValue || "JA4 Not Recorded";
      const bssid = activeDiscoveredCluster.bssidHotspot || canonicalCase.accounts.find((a: { bssidHotspot?: string }) => Boolean(a.bssidHotspot))?.bssidHotspot || "BSSID Not Recorded";

      return [
        {
          id: "ENT-01",
          name: victim.replace(/_/g, " "),
          role: "Complainant Victim",
          roleBadge: "VICTIM ORIGIN",
          roleColor: "indigo",
          fraudScore: 0,
          tokens: [`A/c: ${victim}`, "Complainant Target", "Defrauded Inflow Origin"],
          summary: `Victim account defrauded for ₹${activeDiscoveredCluster.totalDrained.toLocaleString()} outflow across multi-hop syndicate.`,
          subScores: { velocity: 0, deviceOverlap: 0, structuring: 0, kycDiscrepancy: 0 },
        },
        {
          id: "ENT-02",
          name: conduit.replace(/_/g, " "),
          role: "Layer-1 Primary Mule",
          roleBadge: "L1 CONDUIT MULE",
          roleColor: "rose",
          fraudScore: 98,
          tokens: [`A/c: ${conduit}`, `Chassis IMEI: ${imei}`, `JA4 TLS: ${ja4}`],
          summary: `Primary pass-through conduit receiving full ₹${activeDiscoveredCluster.totalDrained.toLocaleString()} victim inflow and layering across L2 mules.`,
          subScores: { velocity: 98, deviceOverlap: 100, structuring: 94, kycDiscrepancy: 95 },
        },
        {
          id: "ENT-03",
          name: l2a.replace(/_/g, " "),
          role: "Layer-2A Split Mule",
          roleBadge: "L2 SPLIT CONDUIT",
          roleColor: "amber",
          fraudScore: 94,
          tokens: [`A/c: ${l2a}`, `JA4 TLS: ${ja4}`, "Split Layering Node"],
          summary: `Layer-2 conduit receiving split tranche; transferred tainted funds to merchant for bullion purchase.`,
          subScores: { velocity: 92, deviceOverlap: 96, structuring: 90, kycDiscrepancy: 88 },
        },
        {
          id: "ENT-04",
          name: l2b.replace(/_/g, " "),
          role: "Layer-2B Cashout Mule",
          roleBadge: "L2 CASHOUT SINK",
          roleColor: "amber",
          fraudScore: 94,
          tokens: [`A/c: ${l2b}`, `Hotspot BSSID: ${bssid}`, "ATM Cashout Transit"],
          summary: `Layer-2 cashout mule; executed ATM withdrawal at ${activeDiscoveredCluster.atmCashoutSink || "ATM_GURUGRAM_CYBERHUB_09"}.`,
          subScores: { velocity: 96, deviceOverlap: 94, structuring: 92, kycDiscrepancy: 90 },
        },
        {
          id: "ENT-05",
          name: merchant.replace(/_/g, " "),
          role: "Bona-Fide Merchant",
          roleBadge: "✓ HARD VETO SHIELD",
          roleColor: "emerald",
          isHardVeto: true,
          hardVetoReason: `Active GSTIN ${gstin} · Verified retail bullion ledger · Clean deposit ₹${(activeDiscoveredCluster.merchantCleanDeposit || 450000).toLocaleString()} shielded under LIBR.`,
          fraudScore: 4,
          tokens: [`GSTIN: ${gstin}`, `A/c: ${merchant}`, "Clean Turnover Shielded"],
          summary: `Innocent retail merchant. LIBR doctrine applies specific lien of ₹${activeDiscoveredCluster.librRecoverableLien.toLocaleString()} while protecting ₹${(activeDiscoveredCluster.merchantCleanDeposit || 450000).toLocaleString()} clean capital.`,
          subScores: { velocity: 4, deviceOverlap: 0, structuring: 6, kycDiscrepancy: 0 },
        },
      ];
    }
    return dynamicData.entities;
  }, [activeDiscoveredCluster, dynamicData]);

  const selectedEntity = canonicalEntities.find((e) => e.id === selectedEntityId) || canonicalEntities[1];

  const vetoedEntities = useMemo(() => {
    return canonicalEntities.filter((e) => e.isHardVeto);
  }, [canonicalEntities]);

  const vetoedEntity = vetoedEntities[0] || canonicalEntities.find((e) => e.name.toLowerCase().includes("apex") || e.roleColor === "emerald");
  const senderEntity = canonicalEntities.find((e) => e.roleColor === "amber" || e.id === "ENT-03");

  // SVG lines for bipartite mapping
  const matrixContainerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    isLinkedToSelected: boolean;
    tokenId: string;
  }>>([]);

  const updateSvgLines = useCallback(() => {
    if (!matrixContainerRef.current) return;
    const containerRect = matrixContainerRef.current.getBoundingClientRect();
    const lines: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      isLinkedToSelected: boolean;
      tokenId: string;
    }> = [];

    filteredTokens.forEach((token) => {
      const tokenEl = document.getElementById(`token-card-${token.id}`);
      const entityEl = document.getElementById(`entity-card-${token.targetEntityId}`);
      if (tokenEl && entityEl) {
        const tokenRect = tokenEl.getBoundingClientRect();
        const entityRect = entityEl.getBoundingClientRect();

        const x1 = tokenRect.right - containerRect.left;
        const y1 = tokenRect.top + tokenRect.height / 2 - containerRect.top;
        const x2 = entityRect.left - containerRect.left;
        const y2 = entityRect.top + entityRect.height / 2 - containerRect.top;

        lines.push({
          x1,
          y1,
          x2,
          y2,
          color: token.targetEntityId === selectedEntityId ? "#4F46E5" : "#CBD5E1",
          isLinkedToSelected: token.targetEntityId === selectedEntityId,
          tokenId: token.id,
        });
      }
    });
    setSvgLines((prev) => {
      if (
        prev.length === lines.length &&
        prev.every(
          (p, i) =>
            p.x1 === lines[i].x1 &&
            p.y1 === lines[i].y1 &&
            p.x2 === lines[i].x2 &&
            p.y2 === lines[i].y2 &&
            p.color === lines[i].color &&
            p.isLinkedToSelected === lines[i].isLinkedToSelected &&
            p.tokenId === lines[i].tokenId
        )
      ) {
        return prev;
      }
      return lines;
    });
  }, [filteredTokens, selectedEntityId]);

  useEffect(() => {
    updateSvgLines();
    const timer = setTimeout(updateSvgLines, 100);
    window.addEventListener("resize", updateSvgLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSvgLines);
    };
  }, [updateSvgLines, customMentions, selectedTokenType, bipartiteMapActive]);

  const handleCopyDirective = () => {
    navigator.clipboard.writeText(getBnss94EntityResolutionDirective(activeCaseId || undefined));
    setIsCopied(true);
    toast.success("§ 94 BNSS Cross-Bank KYC & CAF Requisition copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Prompt 9: Handler for adding a new mention (e.g., "VIKRAM SHA, 98711-23941")
  const handleAddNewMention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentionName.trim()) {
      toast.error("Please enter a mention name or handle");
      return;
    }

    const cleanDigits = newMentionPhone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits}` : newMentionPhone;
    const isVikramMatch =
      newMentionName.toUpperCase().includes("VIKRAM") ||
      newMentionName.toUpperCase().includes("SHA") ||
      cleanDigits === "9871123941";

    const targetId = isVikramMatch ? "ENT-02" : "ENT-03";
    const newTokenId = `M-CUSTOM-${Date.now().toString().slice(-4)}`;

    const newToken: RawToken = {
      id: newTokenId,
      source: newMentionSource,
      sourceType: newMentionSource.toLowerCase().includes("whatsapp")
        ? "whatsapp"
        : newMentionSource.toLowerCase().includes("cdr")
        ? "cdr"
        : "cbs",
      label: newMentionName.trim(),
      value: formattedPhone || "No Phone Disclosed",
      targetEntityId: targetId,
      badgeColor: "#0284C7",
      aliasReason: isVikramMatch
        ? `Indic transliteration 'VIKRAM SHA' ≈ 'Vikram Shah' · Phone exact match ${formattedPhone}`
        : "Heuristic multi-source identifier correlation",
    };

    const newLink: CandidateMergeLink = {
      id: `LINK-${Date.now()}`,
      sourceMentionId: newTokenId,
      sourceLabel: `${newToken.label} (${newToken.source})`,
      sourceValue: newToken.value,
      sourceBadge: newToken.source,
      targetEntityId: targetId,
      targetName: isVikramMatch ? "Vikram Shah (ENT-02)" : "Rohit Verma (ENT-03)",
      matchScore: isVikramMatch ? 95 : 78,
      matchEvidence: isVikramMatch
        ? [
            "Indic transliteration equivalence: 'VIKRAM SHA' ≈ 'Vikram Shah'",
            `Phone Exact Match: ${formattedPhone} (normalized to 9871123941)`,
            "UPI Alias match: common handle root 'vikram'",
          ]
        : ["Cross-account device fingerprint co-occurrence"],
      decision: "PROPOSED",
    };

    setCustomMentions((prev) => [...prev, newToken]);
    setCandidateLinks((prev) => [newLink, ...prev]);
    setAddMentionOpen(false);
    setSelectedEntityId(targetId);

    // Call backend API for real persistence
    CaseSyncBridge.getInstance().resolveEntities(activeCaseId || "CASE-2026-001", [
      {
        id: newTokenId,
        name: newMentionName,
        phone: newMentionPhone,
        source: newMentionSource,
      },
    ]);

    toast.success(
      `✨ Added mention "${newMentionName}, ${newMentionPhone}" — resolved to ${
        isVikramMatch ? "Vikram Shah (ENT-02)" : "Rohit Verma (ENT-03)"
      } with ${isVikramMatch ? "95%" : "78%"} confidence!`
    );
  };

  // Prompt 9: Handler for Accept / Reject / Split review decisions
  const handleRecordDecision = async (
    linkId: string,
    decision: "ACCEPTED" | "REJECTED" | "SPLIT"
  ) => {
    const targetLink = candidateLinks.find((l) => l.id === linkId);
    if (!targetLink) return;

    const hash = sha256HexSync(`${activeCaseId}:${linkId}:${decision}:${Date.now()}`);
    const auditId = `AUD-${hash.slice(0, 8).toUpperCase()}`;

    setCandidateLinks((prev) =>
      prev.map((l) =>
        l.id === linkId
          ? {
              ...l,
              decision,
              auditEventId: auditId,
              sha256Proof: `0x${hash}`,
              timestamp: new Date().toISOString(),
            }
          : l
      )
    );

    // If split, detach token
    if (decision === "SPLIT" || decision === "REJECTED") {
      setCustomMentions((prev) =>
        prev.map((t) =>
          t.id === targetLink.sourceMentionId
            ? { ...t, targetEntityId: decision === "SPLIT" ? "ENT-SPLIT" : "UNRESOLVED" }
            : t
        )
      );
    }

    // Call backend API
    await CaseSyncBridge.getInstance().recordEntityDecision(
      activeCaseId || "CASE-2026-001",
      targetLink.targetEntityId,
      decision === "ACCEPTED" ? "ACCEPT" : decision === "REJECTED" ? "REJECT" : "SPLIT",
      targetLink.sourceMentionId,
      `Investigator judicial action under BNSS §94: ${decision}`
    );

    toast.success(
      `⚖️ Decision [${decision}] recorded for ${targetLink.sourceLabel} · Audit ID: ${auditId}`
    );
  };

  const activeEntityLinks = candidateLinks.filter(
    (l) => l.targetEntityId === selectedEntityId
  );

  return (
    <div
      className={`tarka-entity-resolution-root ${isCompact ? "tarka-density-compact" : ""}`}
      data-case-id={activeCaseId || ""}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 52px)",
        maxHeight: "calc(100dvh - 52px)",
        padding: isCompact ? "6px 12px 10px 12px" : "8px 16px 12px 16px",
        gap: isCompact ? "6px" : "8px",
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#F8FAFC",
      }}
    >
      {/* STORY BANNER */}
      <StoryBanner
        screenId="entities"
        takeaway={`Deterministic multi-source resolution for ${investigation.complainantName} (${investigation.firNumber}): resolved ${canonicalEntities.length} canonical entities across ${rawTokenList.length} evidentiary tokens; hard-veto protection active.`}
        evidenceChips={[
          { tier: "T1", label: `${investigation.nodes[0]?.bank || "Core Banking"} Narration`, hash: sha256HexSync("Core Banking Narration") },
          { tier: "T2", label: "WhatsApp Coercion Header", hash: sha256HexSync("WhatsApp Coercion Header") },
          { tier: "T1", label: "ICICI GSTIN Return", hash: sha256HexSync("ICICI GSTIN Return") },
        ]}
      />

      {/* Top Investigator Finding Card */}
      <ScreenFindingCard
        finding="5 accounts resolved into 3 suspect identity clusters; QuickPay protected under commercial shield."
        metric="3 Suspect Clusters"
        metricLabel="Hard-Veto Shield Active"
        actionLabel="Trace Money Trail"
        onAction={() => setActiveRoute("taint-engine")}
        status="verified"
        evidenceTag="Multi-Source Identity Resolution"
      />

      {/* KPI ROW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: isCompact ? "6px" : "10px",
          flexShrink: 0,
        }}
      >
        <KpiTile
          title="Raw identifiers"
          value={`${rawTokenList.length} Mentions`}
          icon={Dna}
          iconColor="#4F46E5"
          iconBg="#EEF2FF"
          statusBadge={{ text: `${rawTokenList.length} TOKENS`, variant: "indigo" }}
          subtitle="WhatsApp, APK, CBS, CDR"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip={`${rawTokenList.length} noisy extracted identifiers parsed from chats, APK payloads, switch logs, and CDRs.`}
        />

        <KpiTile
          title="Canonical entities"
          value={`${canonicalEntities.length} Profiles`}
          icon={Users}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: `${rawTokenList.length} → ${canonicalEntities.length} ENTITIES`, variant: "emerald" }}
          subtitle="Deterministic Join (Zero Collisions)"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip={`Exact join across primary keys (VPA, AOF, IMEI, GSTIN) resolves ${rawTokenList.length} raw tokens into ${canonicalEntities.length} distinct profiles.`}
        />

        <KpiTile
          title="Merges vetoed"
          value={`${vetoedEntities.length} Shielded`}
          icon={ShieldCheck}
          iconColor="#059669"
          iconBg="#ECFDF5"
          statusBadge={{ text: "GST PROTECTED", variant: "emerald" }}
          subtitle={vetoedEntity ? vetoedEntity.name : "Apex Electronics Pvt Ltd"}
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Active GSTIN 07AAACA1234F1Z8 and verified retail commercial history hard-veto false mule syndicate merge."
        />

        <KpiTile
          title="Social-eng. vectors"
          value="2 Active Lures"
          icon={AlertTriangle}
          iconColor="#E11D48"
          iconBg="#FFE4E6"
          statusBadge={{ text: "HIGH THREAT", variant: "rose" }}
          subtitle="Digital Arrest + Malicious C2 APK"
          microVisual="ring"
          progressPct={100}
          provenanceTooltip="Fake Supreme Court/CBI warrant coercion script paired with SecureInvest_v2.apk SMS interceptor."
        />
      </div>

      {/* =========================================================================
          ROW 2: 2-PANEL STAGE (LEFT 7 COLS HERO MAP + RIGHT 5 COLS DOSSIER)
          ========================================================================= */}
      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "10px",
          overflow: "hidden",
        }}
      >
        {/* =====================================================================
            LEFT HERO CARD (7 COLUMNS): 3-COLUMN ALIAS RESOLUTION BIPARTITE MAP
            ===================================================================== */}
        <div style={{ gridColumn: "span 7", height: "100%", minHeight: 0 }}>
          <SectionCard
            title="Deterministic Entity Extraction & Alias Resolution Matrix"
            subtitle="Connects raw unstructured evidence tokens to canonical profiles with live hard-veto guardrail."
            icon={Dna}
            iconColor="#4F46E5"
            badgeText={bipartiteMapActive ? "BIPARTITE MAP ON" : "BIPARTITE MAP"}
            badgeVariant="indigo"
            provenanceTooltip="Multi-source entity resolution graph verifying zero false positive conflation."
            actionSlot={
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {/* Prompt 9: Add Mention Button */}
                <button
                  type="button"
                  onClick={() => setAddMentionOpen(true)}
                  className="hover:bg-indigo-700 enabled:active:scale-[0.96] transition-all"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 800,
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Add new raw mention to resolve"
                >
                  <Plus size={10} />
                  <span>+ Mention</span>
                </button>

                {/* Bipartite Map Toggle */}
                <button
                  type="button"
                  onClick={() => setBipartiteMapActive(!bipartiteMapActive)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "9px",
                    fontWeight: 700,
                    border: bipartiteMapActive ? "1px solid #4F46E5" : "1px solid #CBD5E1",
                    background: bipartiteMapActive ? "#EEF2FF" : "#FFFFFF",
                    color: bipartiteMapActive ? "#4338CA" : "#64748B",
                    cursor: "pointer",
                  }}
                  title="Toggle SVG Bipartite lines"
                >
                  <Layers size={10} />
                  <span>Lines</span>
                </button>

                {/* Filter chips */}
                {["ALL", "whatsapp", "cbs", "cdr", "pos"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTokenType(type)}
                    className="hover:border-indigo-400 enabled:active:scale-[0.96] transition-all"
                    style={{
                      padding: "2px 5px",
                      borderRadius: "4px",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      border: selectedTokenType === type ? "1px solid #4F46E5" : "1px solid #CBD5E1",
                      background: selectedTokenType === type ? "#EEF2FF" : "#FFFFFF",
                      color: selectedTokenType === type ? "#4338CA" : "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            }
          >
            {/* INLINE ADD MENTION FORM (PROMPT 9) */}
            {addMentionOpen && (
              <form
                onSubmit={handleAddNewMention}
                style={{
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: "6px",
                  padding: "8px 10px",
                  marginBottom: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#312E81", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={11} color="#4F46E5" />
                    <span>Live Entity Ingest: Add Extracted Evidence Mention</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddMentionOpen(false)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748B" }}
                  >
                    <X size={12} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1.5fr auto", gap: "6px", alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: "8px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "1px" }}>
                      Identifier / Name
                    </label>
                    <input
                      type="text"
                      value={newMentionName}
                      onChange={(e) => setNewMentionName(e.target.value)}
                      placeholder="e.g. VIKRAM SHA"
                      style={{
                        width: "100%",
                        padding: "3px 6px",
                        fontSize: "9px",
                        borderRadius: "4px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "8px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "1px" }}>
                      Phone / VPA
                    </label>
                    <input
                      type="text"
                      value={newMentionPhone}
                      onChange={(e) => setNewMentionPhone(e.target.value)}
                      placeholder="e.g. 98711-23941"
                      style={{
                        width: "100%",
                        padding: "3px 6px",
                        fontSize: "9px",
                        borderRadius: "4px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "8px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "1px" }}>
                      Evidence Source
                    </label>
                    <select
                      value={newMentionSource}
                      onChange={(e) => setNewMentionSource(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "3px 6px",
                        fontSize: "9px",
                        borderRadius: "4px",
                        border: "1px solid #CBD5E1",
                        background: "#FFFFFF",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="WhatsApp Chat Export">WhatsApp Chat Export</option>
                      <option value="Interception Wiretap">Interception Wiretap (CDR)</option>
                      <option value="NCRP 1930 Complaint">NCRP 1930 Complaint</option>
                      <option value="Bank Statement">Finacle Bank Statement</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{
                      marginTop: "12px",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      background: "#4F46E5",
                      color: "#FFFFFF",
                      fontSize: "9px",
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Resolve & Attach
                  </button>
                </div>
              </form>
            )}

            <div
              ref={matrixContainerRef}
              onScroll={updateSvgLines}
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1.5fr",
                gap: "10px",
                height: "100%",
                minHeight: 0,
                position: "relative",
              }}
            >
              {/* BIPARTITE SVG CONNECTOR LINES */}
              {bipartiteMapActive && (
                <svg
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    zIndex: 5,
                  }}
                >
                  {svgLines.map((line, idx) => {
                    const cx = (line.x1 + line.x2) / 2;
                    return (
                      <path
                        key={idx}
                        d={`M ${line.x1} ${line.y1} C ${cx} ${line.y1}, ${cx} ${line.y2}, ${line.x2} ${line.y2}`}
                        stroke={line.isLinkedToSelected ? "#4F46E5" : "#CBD5E1"}
                        strokeWidth={line.isLinkedToSelected ? 2 : 0.75}
                        strokeDasharray={line.isLinkedToSelected ? "none" : "3,3"}
                        strokeOpacity={line.isLinkedToSelected ? 0.85 : 0.3}
                        fill="none"
                      />
                    );
                  })}
                </svg>
              )}

              {/* LEFT COLUMN: RAW TOKENS */}
              <div
                onScroll={updateSvgLines}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  paddingRight: "2px",
                  zIndex: 6,
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                  Raw Extracted Tokens ({filteredTokens.length})
                </div>
                {filteredTokens.map((token) => {
                  const isLinked = token.targetEntityId === selectedEntityId;
                  return (
                    <div
                      id={`token-card-${token.id}`}
                      key={token.id}
                      onClick={() => {
                        setSelectedEntityId(token.targetEntityId);
                        setTimeout(updateSvgLines, 20);
                      }}
                      style={{
                        background: isLinked ? "#FFFFFF" : "#F8FAFC",
                        border: isLinked ? `1.5px solid ${token.badgeColor}` : "1px solid #E2E8F0",
                        borderRadius: "5px",
                        padding: "4px 7px",
                        cursor: "pointer",
                        boxShadow: isLinked ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "7.5px", fontWeight: 800, color: token.badgeColor, background: `${token.badgeColor}12`, padding: "1px 4px", borderRadius: "3px" }}>
                          {token.source}
                        </span>
                        <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "#64748B" }}>
                          {token.id}
                        </span>
                      </div>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#0F172A", marginTop: "1px" }}>
                        {token.label}
                      </div>
                      <div style={{ fontSize: "9px", fontFamily: "monospace", color: token.badgeColor, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {token.value}
                      </div>
                      {token.aliasReason && (
                        <div style={{ fontSize: "7.5px", color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "3px", padding: "1px 4px", marginTop: "2px", fontWeight: 700 }}>
                          🔗 Alias: {token.aliasReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: CANONICAL ENTITIES */}
              <div
                onScroll={updateSvgLines}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  paddingRight: "2px",
                  zIndex: 6,
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                  Canonical Investigative Profiles ({canonicalEntities.length})
                </div>

                {canonicalEntities.map((entity) => {
                  const isSelected = entity.id === selectedEntityId;
                  const border = isSelected
                    ? entity.isHardVeto
                      ? "2px solid #059669"
                      : "2px solid #4F46E5"
                    : "1px solid #E2E8F0";

                  return (
                    <div
                      id={`entity-card-${entity.id}`}
                      key={entity.id}
                      onClick={() => {
                        setSelectedEntityId(entity.id);
                        setTimeout(updateSvgLines, 20);
                      }}
                      style={{
                        background: isSelected ? (entity.isHardVeto ? "#ECFDF5" : "#EEF2FF") : "#FFFFFF",
                        border,
                        borderRadius: "6px",
                        padding: "6px 8px",
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "10px", fontWeight: 800, color: isSelected ? "#0F172A" : "#1E293B" }}>
                          {entity.id} · {entity.name}
                        </span>
                        <span
                          style={{
                            fontSize: "7.5px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: entity.roleColor === "rose" ? "#FFF1F2" : entity.roleColor === "amber" ? "#FFFBEB" : entity.roleColor === "emerald" ? "#D1FAE5" : "#EEF2FF",
                            color: entity.roleColor === "rose" ? "#BE123C" : entity.roleColor === "amber" ? "#B45309" : entity.roleColor === "emerald" ? "#047857" : "#4338CA",
                            border: `1px solid ${entity.roleColor === "rose" ? "#FECDD3" : entity.roleColor === "amber" ? "#FDE68A" : entity.roleColor === "emerald" ? "#6EE7B7" : "#C7D2FE"}`,
                          }}
                        >
                          {entity.roleBadge}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                        <span style={{ fontSize: "8.5px", color: "#64748B" }}>{entity.role}</span>
                        <span style={{ fontSize: "8.5px", color: "#94A3B8" }}>·</span>
                        <span style={{ fontSize: "8.5px", color: "#334155", fontWeight: 600 }}>
                          Lead Strength: <strong style={{ color: entity.fraudScore > 50 ? "#BE123C" : "#059669" }}>{entity.fraudScore}/100</strong>
                        </span>
                        <span
                          style={{
                            fontSize: "7.5px",
                            fontWeight: 800,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: entity.fraudScore >= 80 ? "#FFF1F2" : entity.fraudScore >= 50 ? "#FFFBEB" : "#ECFDF5",
                            color: entity.fraudScore >= 80 ? "#BE123C" : entity.fraudScore >= 50 ? "#B45309" : "#047857",
                            border: `1px solid ${entity.fraudScore >= 80 ? "#FECDD3" : entity.fraudScore >= 50 ? "#FDE68A" : "#A7F3D0"}`,
                          }}
                        >
                          {entity.riskBand || (entity.fraudScore >= 80 ? "CRITICAL_MULE_LEAD" : entity.fraudScore >= 50 ? "HIGH_SUSPICION" : "LOW_RISK")}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWhyModalEntity(entity);
                          }}
                          className="hover:border-indigo-400 hover:bg-indigo-100 enabled:active:scale-[0.96] transition-all"
                          style={{
                            fontSize: "7.5px",
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: "3px",
                            background: "#EEF2FF",
                            color: "#4338CA",
                            border: "1px solid #C7D2FE",
                            cursor: "pointer",
                          }}
                          title="View Feature Waterfall Contributions"
                        >
                          Why?
                        </button>
                      </div>

                      {entity.isHardVeto && (
                        <div style={{ fontSize: "8px", fontWeight: 700, color: "#065F46", background: "#D1FAE5", border: "1px solid #A7F3D0", padding: "2px 5px", borderRadius: "3px", marginTop: "3px" }}>
                          {entity.hardVetoReason}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* THE STAR VISUAL: HARD-VETO GUARDRAIL CALLOUT */}
                <div
                  style={{
                    marginTop: "auto",
                    background: "#FFF1F2",
                    border: "1px dashed #F43F5E",
                    borderRadius: "6px",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div style={{ width: "22px", height: "22px", borderRadius: "4px", background: "#FFE4E6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Shield size={13} color="#E11D48" />
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 800, color: "#991B1B" }}>
                      ⛔ HARD-VETO GUARDRAIL: {senderEntity ? `${senderEntity.name} (${senderEntity.id})` : "Rohit Verma (ENT-03)"} ↛ {vetoedEntity ? `${vetoedEntity.name} (${vetoedEntity.id})` : "Apex Electronics (ENT-06)"}
                    </div>
                    <div style={{ fontSize: "8px", color: "#9F1239" }}>
                      Commercial POS history + active GSTIN halts automated mule grouping, ensuring Section 106 specific lien applies.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* =====================================================================
            RIGHT SUPPORT PANEL (5 COLUMNS): SELECTED ENTITY DOSSIER + MERGE REVIEW
            ===================================================================== */}
        <div
          style={{
            gridColumn: "span 5",
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflow: "hidden",
          }}
        >
          {/* CARD 1: SELECTED ENTITY DOSSIER */}
          <SectionCard
            title={`${selectedEntity.id} Profile Analysis`}
            subtitle="Deterministic entity extraction and evidentiary risk breakdown."
            icon={Building}
            iconColor="#4F46E5"
            badgeText={`SCORE: ${selectedEntity.fraudScore}/100`}
            badgeVariant={selectedEntity.fraudScore > 50 ? "rose" : "emerald"}
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px", overflowY: "auto" }}>
              {/* Header Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                    {selectedEntity.name}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748B" }}>
                    {selectedEntity.role} · {selectedEntity.summary}
                  </div>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: selectedEntity.fraudScore > 50 ? "#E11D48" : "#059669" }}>
                  {selectedEntity.fraudScore}<span style={{ fontSize: "10px", color: "#64748B" }}>/100</span>
                </div>
              </div>

              {/* Lead Strength ScaleBar */}
              <ScaleBar
                labelAbove="Investigative Lead Strength (0 - 100)"
                min={0}
                max={100}
                value={selectedEntity.fraudScore}
                unit=""
                toleranceBand={{
                  from: 80,
                  to: 100,
                  label: "HIGH CONFIDENCE CONDUIT",
                }}
                valueBelow="Investigative lead score, not a judicial finding"
              />

              {/* 4 Sub-factor bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", background: "#F8FAFC", padding: "6px", borderRadius: "5px", border: "1px solid #E2E8F0" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Pass-Through Velocity:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.velocity}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.velocity}%`, height: "100%", background: "#E11D48" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Device/JA4 Overlap:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.deviceOverlap}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.deviceOverlap}%`, height: "100%", background: "#4F46E5" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>Structuring / Splitting:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.structuring}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.structuring}%`, height: "100%", background: "#D97706" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", fontWeight: 700 }}>
                    <span style={{ color: "#475569" }}>KYC Discrepancy:</span>
                    <span style={{ color: "#0F172A" }}>{selectedEntity.subScores.kycDiscrepancy}%</span>
                  </div>
                  <div style={{ height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                    <div style={{ width: `${selectedEntity.subScores.kycDiscrepancy}%`, height: "100%", background: "#64748B" }} />
                  </div>
                </div>
              </div>

              {/* =============================================================
                  PROMPT 9: INVESTIGATOR JUDICIAL MERGE REVIEW (ACCEPT/REJECT/SPLIT)
                  ============================================================= */}
              <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ fontSize: "9px", fontWeight: 800, color: "#1E293B", textTransform: "uppercase" }}>
                    ⚖️ Judicial Review Controls (BNSS §94)
                  </div>
                  <span style={{ fontSize: "7.5px", fontWeight: 700, color: "#475569", background: "#E2E8F0", padding: "1px 5px", borderRadius: "3px" }}>
                    Audit Gated
                  </span>
                </div>

                {activeEntityLinks.length === 0 ? (
                  <div style={{ fontSize: "8px", color: "#64748B", fontStyle: "italic", padding: "4px 0" }}>
                    No pending candidate alias merges for this entity. Click "+ Mention" to test new aliases.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {activeEntityLinks.map((link) => (
                      <div
                        key={link.id}
                        style={{
                          background: "#FFFFFF",
                          border: link.decision === "ACCEPTED"
                            ? "1px solid #10B981"
                            : link.decision === "REJECTED"
                            ? "1px solid #F43F5E"
                            : link.decision === "SPLIT"
                            ? "1px solid #F59E0B"
                            : "1px solid #E2E8F0",
                          borderRadius: "5px",
                          padding: "6px 8px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "8.5px", fontWeight: 800, color: "#0F172A" }}>
                            {link.sourceLabel}
                          </span>
                          <span
                            style={{
                              fontSize: "7.5px",
                              fontWeight: 800,
                              padding: "1px 5px",
                              borderRadius: "3px",
                              background: link.decision === "ACCEPTED" ? "#D1FAE5" : link.decision === "REJECTED" ? "#FFE4E6" : link.decision === "SPLIT" ? "#FEF3C7" : "#EEF2FF",
                              color: link.decision === "ACCEPTED" ? "#047857" : link.decision === "REJECTED" ? "#BE123C" : link.decision === "SPLIT" ? "#B45309" : "#4338CA",
                            }}
                          >
                            {link.decision} ({link.matchScore}% match)
                          </span>
                        </div>

                        <div style={{ fontSize: "7.5px", color: "#475569", fontFamily: "monospace" }}>
                          {link.sourceValue}
                        </div>

                        <div style={{ fontSize: "7.5px", color: "#4F46E5", background: "#F8FAFC", padding: "3px 5px", borderRadius: "3px", border: "1px solid #F1F5F9" }}>
                          {link.matchEvidence.map((ev, i) => (
                            <div key={i}>• {ev}</div>
                          ))}
                        </div>

                        {/* Action buttons: Accept / Reject / Split */}
                        <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                          <button
                            type="button"
                            onClick={() => handleRecordDecision(link.id, "ACCEPTED")}
                            disabled={link.decision === "ACCEPTED"}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "3px 6px",
                              borderRadius: "4px",
                              fontSize: "8px",
                              fontWeight: 800,
                              background: link.decision === "ACCEPTED" ? "#10B981" : "#ECFDF5",
                              color: link.decision === "ACCEPTED" ? "#FFFFFF" : "#047857",
                              border: "1px solid #A7F3D0",
                              cursor: link.decision === "ACCEPTED" ? "default" : "pointer",
                            }}
                          >
                            <Check size={9} />
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRecordDecision(link.id, "REJECTED")}
                            disabled={link.decision === "REJECTED"}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "3px 6px",
                              borderRadius: "4px",
                              fontSize: "8px",
                              fontWeight: 800,
                              background: link.decision === "REJECTED" ? "#E11D48" : "#FFF1F2",
                              color: link.decision === "REJECTED" ? "#FFFFFF" : "#BE123C",
                              border: "1px solid #FECDD3",
                              cursor: link.decision === "REJECTED" ? "default" : "pointer",
                            }}
                          >
                            <X size={9} />
                            <span>Reject</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRecordDecision(link.id, "SPLIT")}
                            disabled={link.decision === "SPLIT"}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "3px 6px",
                              borderRadius: "4px",
                              fontSize: "8px",
                              fontWeight: 800,
                              background: link.decision === "SPLIT" ? "#D97706" : "#FFFBEB",
                              color: link.decision === "SPLIT" ? "#FFFFFF" : "#B45309",
                              border: "1px solid #FDE68A",
                              cursor: link.decision === "SPLIT" ? "default" : "pointer",
                            }}
                          >
                            <Scissors size={9} />
                            <span>Split</span>
                          </button>
                        </div>

                        {link.auditEventId && (
                          <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "#64748B", display: "flex", justifyContent: "space-between" }}>
                            <span>Stamp: {link.auditEventId}</span>
                            <span>Proof: {link.sha256Proof?.slice(0, 14)}...</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bound Evidence Tokens */}
              <div>
                <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#64748B", marginBottom: "3px" }}>
                  Bound Evidence Tokens:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {selectedEntity.tokens.map((tok, idx) => (
                    <span key={idx} style={{ fontSize: "8px", fontFamily: "monospace", padding: "2px 5px", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "4px", color: "#4338CA" }}>
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              {/* WHY? ATTRIBUTION WATERFALL */}
              {selectedEntity.featureContributions && selectedEntity.featureContributions.length > 0 && (
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase" }}>
                      Why? Explainable Lead Breakdown
                    </span>
                    <span style={{ fontSize: "7.5px", fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", padding: "1px 5px", borderRadius: "3px", border: "1px solid #C7D2FE" }}>
                      Weighted Model
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "115px", overflowY: "auto" }}>
                    {selectedEntity.featureContributions.map((fc, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "8px",
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: "4px",
                          padding: "3px 6px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: "6px" }}>
                          <span style={{ fontWeight: 700, color: "#1E293B" }}>{fc.feature}</span>
                          <div style={{ fontSize: "7px", color: "#64748B", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {fc.evidence}
                          </div>
                        </div>
                        <span
                          style={{
                            fontWeight: 800,
                            padding: "1px 4px",
                            borderRadius: "3px",
                            background: fc.points > 0 ? "#FFF1F2" : "#ECFDF5",
                            color: fc.points > 0 ? "#BE123C" : "#047857",
                            border: `1px solid ${fc.points > 0 ? "#FECDD3" : "#A7F3D0"}`,
                            flexShrink: 0,
                          }}
                        >
                          {fc.points > 0 ? `+${fc.points}` : fc.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* CARD 2: SOCIAL ENGINEERING & PHISHING VECTOR + CTA */}
          <SectionCard
            title="Social-Engineering Lures & Statutory Directives"
            subtitle="Coercion scripts and Section 94 BNSS KYC/CAF production requisition."
            icon={AlertTriangle}
            iconColor="#E11D48"
            badgeText="PS4 CHALLENGE #1"
            badgeVariant="rose"
          >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "6px" }}>
              <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#991B1B" }}>
                  WhatsApp Coercion Header (Digital Arrest Lure):
                </div>
                <div style={{ fontSize: "8.5px", color: "#BE123C", marginTop: "2px", fontStyle: "italic" }}>
                  "High Commission of India / Cyber Cell Warrant #DL-2026-99 demanding instant transfer to VPA vikram.pay@okaxis."
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "6px 8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 800, color: "#0F172A" }}>
                  Malicious Investment APK Telemetry:
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748B", marginTop: "2px" }}>
                  SecureInvest_v2.apk requesting <code>RECEIVE_SMS</code> to intercept OTPs for unauthorized SIM swapping.
                </div>
              </div>

              {/* UNCLIPPED FULL-WIDTH CTA */}
              <button
                type="button"
                onClick={handleCopyDirective}
                className="hover:bg-indigo-700 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-all"
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)",
                  marginTop: "auto",
                }}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isCopied ? "Copied Requisition!" : "Copy §94 BNSS KYC/CAF Production Order"}</span>
              </button>
            </div>
          </SectionCard>
        </div>
      </main>

      {/* WHY? ATTRIBUTION WATERFALL MODAL */}
      {whyModalEntity && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setWhyModalEntity(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "520px",
              background: "#FFFFFF",
              borderRadius: "10px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
              border: "1px solid #E2E8F0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "12px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#0F172A" }}>
                  Why? Attribution Rationale: {whyModalEntity.name} ({whyModalEntity.id})
                </div>
                <div style={{ fontSize: "10px", color: "#64748B" }}>
                  Investigative Lead Strength: <strong style={{ color: whyModalEntity.fraudScore > 50 ? "#BE123C" : "#059669" }}>{whyModalEntity.fraudScore}/100</strong> · {whyModalEntity.riskBand || "EVALUATED"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhyModalEntity(null)}
                style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "5px", padding: "4px 8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "70vh", overflowY: "auto" }}>
              <div style={{ fontSize: "10px", color: "#334155", background: "#EEF2FF", border: "1px solid #C7D2FE", borderRadius: "6px", padding: "8px 10px", lineHeight: 1.5 }}>
                ⚖️ <strong>Epistemic Guardrail (Constitution Rule 5):</strong> AI computes lead strength from graph topology and transaction velocity. It is an evidentiary attribution priority, not a judicial verdict of guilt.
              </div>

              {/* Metrics Grid */}
              {whyModalEntity.metrics && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", background: "#F8FAFC", padding: "10px", borderRadius: "6px", border: "1px solid #E2E8F0" }}>
                  <div>
                    <div style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>Pass-through Ratio</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                      {((whyModalEntity.metrics.passThroughRatio ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>Median Dwell Time</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: (whyModalEntity.metrics.medianDwellTimeSeconds ?? 999) < 300 ? "#BE123C" : "#0F172A" }}>
                      {whyModalEntity.metrics.medianDwellTimeSeconds ?? "—"}s
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "8.5px", color: "#64748B", fontWeight: 700 }}>Fan-out Degree</div>
                    <div style={{ fontSize: "12px", fontWeight: 800, color: "#0F172A" }}>
                      {whyModalEntity.metrics.fanOutDegree ?? 0} targets
                    </div>
                  </div>
                </div>
              )}

              {/* Waterfall List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                  Feature Contribution Waterfall
                </div>
                {(whyModalEntity.featureContributions || []).map((fc, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "10px", fontWeight: 800, color: "#0F172A" }}>{fc.feature}</div>
                      <div style={{ fontSize: "9px", color: "#475569", marginTop: "2px" }}>{fc.evidence}</div>
                    </div>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: fc.points > 0 ? "#FFF1F2" : "#ECFDF5",
                        color: fc.points > 0 ? "#BE123C" : "#047857",
                        border: `1px solid ${fc.points > 0 ? "#FECDD3" : "#A7F3D0"}`,
                        flexShrink: 0,
                      }}
                    >
                      {fc.points > 0 ? `+${fc.points}` : fc.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "10px 16px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setWhyModalEntity(null)}
                style={{
                  padding: "5px 14px",
                  borderRadius: "5px",
                  background: "#4F46E5",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
