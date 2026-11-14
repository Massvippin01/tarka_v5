import type { ReconstructedInvestigation } from "../../../utils/investigationReconstructor";

export interface CommunityHullLayout {
  id: string;
  name: string;
  path: string;
  color: string;
  labelX?: number;
  labelY?: number;
}

export interface NetworkNodeLayout {
  id: string;
  label: string;
  sublabel: string;
  role?: string;
  category: "controller" | "hero" | "hub" | "account" | "victim" | "sink";
  cx: number;
  cy: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  strength?: string;
  ports: {
    top: { x: number; y: number }[];
    bottom: { x: number; y: number }[];
    left: { x: number; y: number };
    right: { x: number; y: number };
  };
  // Prompt 11 Data-Driven Fields
  labelLine1?: string;
  labelLine2?: string;
  tooltip?: string;
  muleScore?: number;
  riskBand?: "CRITICAL" | "ELEVATED" | "MODERATE" | "LOW" | "MERCHANT" | "VICTIM";
  amountReceivedInr?: number;
  hopDistance?: number;
  crossCaseLinked?: boolean;
  crossCaseId?: string;
}

export interface NetworkEdgeLayout {
  id: string;
  type: "tether" | "ja4" | "caf" | "c2" | "tower" | "cash";
  sourceId: string;
  targetId: string;
  path: string; // SVG path d attribute
  haloPath: string;
  color: string;
  dashed: boolean;
  arrowhead: string;
  amount?: string;
  amountInr?: number;
  strokeWidth?: number;
  timestamp?: string;
  rail?: string;
}

export interface NetworkLayoutResult {
  width: number;
  height: number;
  nodes: NetworkNodeLayout[];
  edges: NetworkEdgeLayout[];
  communityHulls?: CommunityHullLayout[];
}

/**
 * Data-Driven Layered Layout (Prompt 11):
 * Computes layer by hop distance from victim(s), sets node dimensions by amount received,
 * maps colors by mule risk band, and avoids collisions across any case dataset.
 */
export function layoutDataDrivenInvestigation(
  W: number,
  H: number,
  isHotspotActive: boolean = false,
  activeFilter: string = "all",
  _includeCashFlowNodes: boolean = true,
  investigation: ReconstructedInvestigation,
  muleScores?: Record<string, any>
): NetworkLayoutResult {
  const width = Math.max(1160, W);
  const height = Math.max(780, H);

  const yRowA = Math.round(0.12 * height);
  const yRowB = Math.round(0.32 * height);
  const yRowC = Math.round(0.68 * height);

  // 1. Identify victim(s)
  const victimNode =
    investigation.nodes.find(
      (n) =>
        n.entityType === "VICTIM" ||
        n.id.includes("VICTIM") ||
        n.id.startsWith("V-") ||
        n.details?.toLowerCase().includes("victim") ||
        n.label.toLowerCase().includes("victim")
    ) || investigation.nodes[0];

  // 2. BFS Hop distance from victim
  const hopMap: Record<string, number> = {};
  if (victimNode) {
    hopMap[victimNode.id] = 0;
    const queue = [victimNode.id];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currHop = hopMap[currId];
      const outEdges = investigation.edges.filter((e) => e.sourceNodeId === currId);
      for (const e of outEdges) {
        if (hopMap[e.targetNodeId] === undefined) {
          hopMap[e.targetNodeId] = currHop + 1;
          queue.push(e.targetNodeId);
        }
      }
    }
  }

  // Fallback hops for unreached nodes based on entityType
  investigation.nodes.forEach((n) => {
    if (hopMap[n.id] === undefined) {
      if (n.entityType === "VICTIM") hopMap[n.id] = 0;
      else if (n.entityType === "LAYER_1_MULE") hopMap[n.id] = 1;
      else if (n.entityType === "LAYER_2_CONDUIT") hopMap[n.id] = 2;
      else if (n.entityType === "LAYER_3_SINK" || n.entityType === "BONA_FIDE_MERCHANT") hopMap[n.id] = 3;
      else hopMap[n.id] = 1;
    }
  });

  const maxHop = Math.max(1, ...Object.values(hopMap));
  const maxTxAmount = Math.max(...investigation.edges.map((e) => e.amount || 0), 500000);

  // 3. Construct layout nodes
  const layoutNodes: NetworkNodeLayout[] = [];
  const nodeMap: Record<string, NetworkNodeLayout> = {};

  const hops = Array.from(new Set(Object.values(hopMap))).sort((a, b) => a - b);

  hops.forEach((h) => {
    const nodesAtHop = investigation.nodes.filter((n) => hopMap[n.id] === h);
    const cx = Math.round(width * (0.11 + (h / Math.max(1, maxHop)) * 0.74));

    nodesAtHop.forEach((n, idx) => {
      const inEdges = investigation.edges.filter((e) => e.targetNodeId === n.id);
      const amountReceived = inEdges.reduce((sum, e) => sum + (e.amount || 0), 0);

      const sizeScale = maxTxAmount > 0 ? Math.min(1, amountReceived / maxTxAmount) : 0;
      const w = Math.round(204 + sizeScale * 20);
      const hNode = 92;

      let cy = yRowC;
      if (h === 0) {
        cy = yRowB;
      } else if (nodesAtHop.length === 1) {
        cy = yRowC;
      } else {
        const stepY = nodesAtHop.length >= 3 ? 124 : 138;
        const totalSpan = (nodesAtHop.length - 1) * stepY;
        const startY = yRowC - Math.round(totalSpan / 2);
        cy = startY + idx * stepY;
      }

      const isVictim = n.entityType === "VICTIM" || h === 0;
      const isMerchant = n.entityType === "BONA_FIDE_MERCHANT" || n.isHardVeto;
      const isSink = n.entityType === "LAYER_3_SINK";
      const isL1 = n.entityType === "LAYER_1_MULE" || h === 1;

      const scoreEntry =
        muleScores?.[n.id] ||
        muleScores?.[n.accountMasked] ||
        muleScores?.[n.label];
      const muleScore =
        scoreEntry?.score ??
        (isVictim ? 0 : isMerchant ? 8 : isL1 ? 94 : isSink ? 90 : 75);

      let color = "#E11D48";
      let riskBand: NetworkNodeLayout["riskBand"] = "CRITICAL";

      if (isVictim) {
        color = "#4F46E5";
        riskBand = "VICTIM";
      } else if (isMerchant) {
        color = "#059669";
        riskBand = "MERCHANT";
      } else if (muleScore >= 75) {
        color = "#E11D48";
        riskBand = "CRITICAL";
      } else if (muleScore >= 50) {
        color = "#D97706";
        riskBand = "ELEVATED";
      } else {
        color = "#2563EB";
        riskBand = "MODERATE";
      }

      const isCrossCase =
        (investigation.syndicateLinks && investigation.syndicateLinks.length > 0 && (isL1 || n.label.includes("Vikram"))) ||
        n.label.includes("Sameer") ||
        n.label.includes("Rajesh");

      const category = isVictim ? "victim" : isSink ? "sink" : "account";
      const labelLine1 = n.label;
      const labelLine2 = `${n.bank || "Nodal"} · A/C ${n.accountMasked || "XXXX"}`;

      const nodeLayout: NetworkNodeLayout = {
        id: n.id,
        label: n.label,
        sublabel: labelLine2,
        labelLine1,
        labelLine2,
        tooltip: `${n.label} | ${n.bank || "Nodal"} | Score: ${muleScore}/100 (${riskBand}) | Recv: ₹${amountReceived.toLocaleString("en-IN")}`,
        category,
        role: n.details || n.entityType,
        cx,
        cy,
        x: Math.round(cx - w / 2),
        y: Math.round(cy - hNode / 2),
        w,
        h: hNode,
        color,
        muleScore,
        riskBand,
        amountReceivedInr: amountReceived,
        hopDistance: h,
        crossCaseLinked: isCrossCase,
        crossCaseId: isCrossCase ? "CASE-2026-003" : undefined,
        ports: {
          top: [
            { x: cx - 44, y: Math.round(cy - hNode / 2) },
            { x: cx, y: Math.round(cy - hNode / 2) },
            { x: cx + 44, y: Math.round(cy - hNode / 2) },
          ],
          bottom: [
            { x: cx - 44, y: Math.round(cy + hNode / 2) },
            { x: cx, y: Math.round(cy + hNode / 2) },
            { x: cx + 44, y: Math.round(cy + hNode / 2) },
          ],
          left: { x: Math.round(cx - w / 2), y: cy },
          right: { x: Math.round(cx + w / 2), y: cy },
        },
      };

      layoutNodes.push(nodeLayout);
      nodeMap[n.id] = nodeLayout;
    });
  });

  // 4. Infrastructure Satellites in Row A
  const heroW = 280;
  const heroH = 78;
  const sideW = 168;
  const sideH = 54;
  const cxTower = Math.round(0.12 * width);
  const cxHero = Math.round(0.50 * width);
  const cxC2 = Math.round(0.88 * width);

  const heroNode: NetworkNodeLayout = {
    id: "node-hero",
    label: "Controller device cluster",
    sublabel: isHotspotActive
      ? "Poco X5 Hotspot · 74:DA:38:A2:11:BC · TTL=63"
      : "Poco X5 Hotspot · 74:DA:38:A2:11:BC · TTL=64 Direct",
    labelLine1: "Controller device cluster",
    labelLine2: "Poco X5 AP (74:DA:38:A2:11:BC) · TTL 63 Tethered",
    tooltip: "Samsung SM-M346B (867492061234564) via Accomplice Poco X5 Hotspot",
    category: "hero",
    cx: cxHero,
    cy: yRowA,
    x: Math.round(cxHero - heroW / 2),
    y: Math.round(yRowA - heroH / 2),
    w: heroW,
    h: heroH,
    color: "#E11D48",
    ports: {
      top: [{ x: cxHero, y: Math.round(yRowA - heroH / 2) }],
      bottom: [
        { x: cxHero - 100, y: Math.round(yRowA + heroH / 2) },
        { x: cxHero, y: Math.round(yRowA + heroH / 2) },
        { x: cxHero + 100, y: Math.round(yRowA + heroH / 2) },
      ],
      left: { x: Math.round(cxHero - heroW / 2), y: yRowA },
      right: { x: Math.round(cxHero + heroW / 2), y: yRowA },
    },
  };
  layoutNodes.push(heroNode);
  nodeMap["node-hero"] = heroNode;

  const towerNode: NetworkNodeLayout = {
    id: "node-tower",
    label: "Airtel DL-TWR-891",
    sublabel: "Sector 4 Rohini · Az 120° · PGW Ingress",
    labelLine1: "Airtel DL-TWR-891",
    labelLine2: "Sector 4 Rohini · Az 120°",
    category: "controller",
    cx: cxTower,
    cy: yRowA,
    x: Math.round(cxTower - sideW / 2),
    y: Math.round(yRowA - sideH / 2),
    w: sideW,
    h: sideH,
    color: "#0284C7",
    ports: {
      top: [{ x: cxTower, y: Math.round(yRowA - sideH / 2) }],
      bottom: [{ x: cxTower, y: Math.round(yRowA + sideH / 2) }],
      left: { x: Math.round(cxTower - sideW / 2), y: yRowA },
      right: { x: Math.round(cxTower + sideW / 2), y: yRowA },
    },
  };
  layoutNodes.push(towerNode);
  nodeMap["node-tower"] = towerNode;

  const c2Node: NetworkNodeLayout = {
    id: "node-c2",
    label: "Telegram C2 @c2_bot",
    sublabel: "103.21.144.92:443 · OTP Exfiltration",
    labelLine1: "Telegram C2 @c2_bot",
    labelLine2: "103.21.144.92:443 · OTP Exfil",
    category: "controller",
    cx: cxC2,
    cy: yRowA,
    x: Math.round(cxC2 - sideW / 2),
    y: Math.round(yRowA - sideH / 2),
    w: sideW,
    h: sideH,
    color: "#BE123C",
    ports: {
      top: [{ x: cxC2, y: Math.round(yRowA - sideH / 2) }],
      bottom: [{ x: cxC2, y: Math.round(yRowA + sideH / 2) }],
      left: { x: Math.round(cxC2 - sideW / 2), y: yRowA },
      right: { x: Math.round(cxC2 + sideW / 2), y: yRowA },
    },
  };
  layoutNodes.push(c2Node);
  nodeMap["node-c2"] = c2Node;

  // 5. Hubs in Row B
  const hubSize = 52;
  const cxHubTether = Math.round(0.30 * width);
  const cxHubJa4 = Math.round(0.50 * width);
  const cxHubCaf = Math.round(0.69 * width);

  const hubTether: NetworkNodeLayout = {
    id: "hub-tether",
    label: "Wi-Fi Hotspot",
    sublabel: isHotspotActive ? "TTL=63 Tethered" : "TTL=64 Direct",
    category: "hub",
    strength: "BSSID",
    cx: cxHubTether,
    cy: yRowB,
    x: Math.round(cxHubTether - hubSize / 2),
    y: Math.round(yRowB - hubSize / 2),
    w: hubSize,
    h: hubSize,
    color: "#8B5CF6",
    ports: {
      top: [{ x: cxHubTether, y: Math.round(yRowB - hubSize / 2) }],
      bottom: [{ x: cxHubTether, y: Math.round(yRowB + hubSize / 2) }],
      left: { x: Math.round(cxHubTether - hubSize / 2), y: yRowB },
      right: { x: Math.round(cxHubTether + hubSize / 2), y: yRowB },
    },
  };
  const hubJa4: NetworkNodeLayout = {
    id: "hub-ja4",
    label: "JA4 TLS Fingerprint",
    sublabel: "t13d1516h2_8daaf6",
    category: "hub",
    strength: "JA4",
    cx: cxHubJa4,
    cy: yRowB,
    x: Math.round(cxHubJa4 - hubSize / 2),
    y: Math.round(yRowB - hubSize / 2),
    w: hubSize,
    h: hubSize,
    color: "#10B981",
    ports: {
      top: [{ x: cxHubJa4, y: Math.round(yRowB - hubSize / 2) }],
      bottom: [{ x: cxHubJa4, y: Math.round(yRowB + hubSize / 2) }],
      left: { x: Math.round(cxHubJa4 - hubSize / 2), y: yRowB },
      right: { x: Math.round(cxHubJa4 + hubSize / 2), y: yRowB },
    },
  };
  const hubCaf: NetworkNodeLayout = {
    id: "hub-caf",
    label: "SIM CAF Identity",
    sublabel: "+91 98711 23941",
    category: "hub",
    strength: "CAF",
    cx: cxHubCaf,
    cy: yRowB,
    x: Math.round(cxHubCaf - hubSize / 2),
    y: Math.round(yRowB - hubSize / 2),
    w: hubSize,
    h: hubSize,
    color: "#F59E0B",
    ports: {
      top: [{ x: cxHubCaf, y: Math.round(yRowB - hubSize / 2) }],
      bottom: [{ x: cxHubCaf, y: Math.round(yRowB + hubSize / 2) }],
      left: { x: Math.round(cxHubCaf - hubSize / 2), y: yRowB },
      right: { x: Math.round(cxHubCaf + hubSize / 2), y: yRowB },
    },
  };
  layoutNodes.push(hubTether, hubJa4, hubCaf);
  nodeMap["hub-tether"] = hubTether;
  nodeMap["hub-ja4"] = hubJa4;
  nodeMap["hub-caf"] = hubCaf;

  // 6. Directed Fund Transfer Edges
  const layoutEdges: NetworkEdgeLayout[] = [];

  investigation.edges.forEach((e, idx) => {
    const src = nodeMap[e.sourceNodeId] || layoutNodes.find((n) => n.id.includes(e.sourceNodeId) || e.sourceNodeId.includes(n.id));
    const tgt = nodeMap[e.targetNodeId] || layoutNodes.find((n) => n.id.includes(e.targetNodeId) || e.targetNodeId.includes(n.id));

    if (src && tgt) {
      // Find all outgoing edges from this source for port offset
      const allOutFromSrc = investigation.edges.filter(
        (ed) => ed.sourceNodeId === e.sourceNodeId || (src.id && ed.sourceNodeId.includes(src.id))
      );
      let p1 = src.ports.right;
      if (allOutFromSrc.length > 1) {
        const outIdx = allOutFromSrc.findIndex(
          (ed) => (ed.id || ed.targetNodeId) === (e.id || e.targetNodeId)
        );
        const offset = (outIdx - (allOutFromSrc.length - 1) / 2) * 16;
        p1 = { x: src.x + src.w, y: Math.round(src.cy + offset) };
      }

      // Find all incoming edges to this target for port offset
      const allInToTgt = investigation.edges.filter(
        (ed) => ed.targetNodeId === e.targetNodeId || (tgt.id && ed.targetNodeId.includes(tgt.id))
      );
      let p2 = tgt.ports.left;
      if (allInToTgt.length > 1) {
        const inIdx = allInToTgt.findIndex(
          (ed) => (ed.id || ed.sourceNodeId) === (e.id || e.sourceNodeId)
        );
        const offset = (inIdx - (allInToTgt.length - 1) / 2) * 14;
        p2 = { x: tgt.x, y: Math.round(tgt.cy + offset) };
      }

      const dx = Math.max(36, Math.abs(p2.x - p1.x) * 0.45);
      const path = `M ${p1.x},${p1.y} C ${p1.x + dx},${p1.y} ${p2.x - dx},${p2.y} ${p2.x},${p2.y}`;

      const amtInr = e.amount || 0;
      const strokeWidth = Math.max(1.8, Math.min(6, Math.round((amtInr / maxTxAmount) * 6)));

      let edgeColor = "#D97706";
      let arrowhead = "arrow-amber";
      if (e.rail === "IMPS") {
        edgeColor = "#E11D48";
        arrowhead = "arrow-rose";
      } else if ((e.rail as string) === "RTGS" || tgt.color === "#059669") {
        edgeColor = "#059669";
        arrowhead = "arrow-emerald";
      } else if (e.rail === "ATM_CASH" || tgt.category === "sink") {
        edgeColor = "#7C3AED";
        arrowhead = "arrow-violet";
      }

      layoutEdges.push({
        id: e.id || `edge-cash-${idx + 1}`,
        type: "cash",
        sourceId: src.id,
        targetId: tgt.id,
        path,
        haloPath: path,
        color: edgeColor,
        dashed: false,
        arrowhead,
        amount: `₹${amtInr.toLocaleString("en-IN")}`,
        amountInr: amtInr,
        strokeWidth,
        timestamp: e.timestampIst,
        rail: e.rail,
      });
    }
  });

  // 7. Infrastructure links (Hero to Hubs and Hubs to Mule Accounts)
  layoutEdges.push(
    {
      id: "edge-tower-hero",
      type: "tower",
      sourceId: "node-tower",
      targetId: "node-hero",
      path: `M ${towerNode.ports.right.x},${towerNode.ports.right.y} L ${heroNode.ports.left.x},${heroNode.ports.left.y}`,
      haloPath: `M ${towerNode.ports.right.x},${towerNode.ports.right.y} L ${heroNode.ports.left.x},${heroNode.ports.left.y}`,
      color: "#0284C7",
      dashed: true,
      arrowhead: "arrow-sky",
    },
    {
      id: "edge-hero-c2",
      type: "c2",
      sourceId: "node-hero",
      targetId: "node-c2",
      path: `M ${heroNode.ports.right.x},${heroNode.ports.right.y} L ${c2Node.ports.left.x},${c2Node.ports.left.y}`,
      haloPath: `M ${heroNode.ports.right.x},${heroNode.ports.right.y} L ${c2Node.ports.left.x},${c2Node.ports.left.y}`,
      color: "#BE123C",
      dashed: true,
      arrowhead: "arrow-rose",
    }
  );

  const muleAccounts = layoutNodes.filter((n) => n.category === "account" || n.category === "sink");
  muleAccounts.forEach((mule) => {
    // Only connect JA4 to actual account mules, not physical cashout ATM kiosks
    if (mule.category === "sink") return;
    const p1 = hubJa4.ports.bottom[0];
    const p2 = mule.ports.top[1];
    const path = `M ${p1.x},${p1.y} C ${p1.x},${p1.y + 35} ${p2.x},${p2.y - 35} ${p2.x},${p2.y}`;
    layoutEdges.push({
      id: `edge-ja4-${mule.id}`,
      type: "ja4",
      sourceId: "hub-ja4",
      targetId: mule.id,
      path,
      haloPath: path,
      color: "#10B981",
      dashed: true,
      arrowhead: "arrow-emerald",
    });
  });

  // 8. Community Hulls
  const communityHulls: CommunityHullLayout[] = [];
  if (muleAccounts.length >= 2) {
    const minX = Math.min(...muleAccounts.map((m) => m.x)) - 24;
    const maxX = Math.max(...muleAccounts.map((m) => m.x + m.w)) + 24;
    const minY = Math.min(...muleAccounts.map((m) => m.y)) - 24;
    const maxY = Math.max(...muleAccounts.map((m) => m.y + m.h + (m.category === "sink" ? 30 : 18))) + 28;
    const r = 12;
    const hullPath = `M ${minX + r},${minY} H ${maxX - r} Q ${maxX},${minY} ${maxX},${minY + r} V ${maxY - r} Q ${maxX},${maxY} ${maxX - r},${maxY} H ${minX + r} Q ${minX},${maxY} ${minX},${maxY - r} V ${minY + r} Q ${minX},${minY} ${minX + r},${minY} Z`;

    communityHulls.push({
      id: "hull-syndicate-layering",
      name: "Syndicate Mule Cluster (BSSID & JA4 Anchor)",
      path: hullPath,
      color: "#6366F1",
      labelX: minX + 16,
      labelY: maxY - 14,
    });
  }

  // Edge filtering
  const filteredEdges =
    activeFilter === "all" || activeFilter === "cashflow"
      ? layoutEdges
      : layoutEdges.filter((e) => e.type === activeFilter);

  return {
    width,
    height,
    nodes: layoutNodes,
    edges: filteredEdges,
    communityHulls,
  };
}

/**
 * Pure layout function computing pixel-exact coordinates for the 3-tier Network Graph.
 * Enforces S1/S2: Zero edge labels, vertical tangent cubic beziers, dedicated 3-port offsets.
 */
export function layoutNetwork(
  W: number,
  H: number,
  isHotspotActive: boolean = false,
  activeFilter: "all" | "tether" | "ja4" | "caf" | "c2" | "cashflow" = "all",
  includeCashFlowNodes: boolean = false,
  investigation?: ReconstructedInvestigation,
  muleScores?: Record<string, any>
): NetworkLayoutResult {
  if (investigation && investigation.nodes && investigation.nodes.length > 0) {
    return layoutDataDrivenInvestigation(
      W,
      H,
      isHotspotActive,
      activeFilter,
      includeCashFlowNodes,
      investigation,
      muleScores
    );
  }

  const width = Math.max(960, W);
  const height = Math.max(500, H);

  // Row Y-coordinates (fractions: .14H, .50H, .81H) ensuring Row C has ample bottom clearance
  const yRowA = Math.round(0.14 * height);
  const yRowB = Math.round(0.50 * height);
  const yRowC = Math.round(0.81 * height);

  // 1. Row A Nodes: Tower (.12W), Hero (.50W), C2 (.88W)
  const cxTower = Math.round(0.12 * width);
  const cxHero = Math.round(0.50 * width);
  const cxC2 = Math.round(0.88 * width);

  const heroW = 280;
  const heroH = 84;
  const sideW = 144;
  const sideH = 52;

  const shouldIncludeCash = includeCashFlowNodes || activeFilter === "cashflow";

  // 2. Row B Nodes: Hubs 56px circles
  // When cash flow nodes (Victim & ATM) are included in Row B, space the 3 hubs in the center
  // (.29W, .50W, .71W) so Victim (.09W) and ATM (.91W) have 60px+ of collision-free clearance!
  const cxHubTether = shouldIncludeCash ? Math.round(0.29 * width) : Math.round(0.24 * width);
  const cxHubJa4 = Math.round(0.50 * width);
  const cxHubCaf = shouldIncludeCash ? Math.round(0.71 * width) : Math.round(0.76 * width);
  const hubSize = 56;

  // 3. Row C Nodes: 4 Accounts 164x64 (.14W, .38W, .62W, .86W)
  const cxM1 = Math.round(0.14 * width);
  const cxM2a = Math.round(0.38 * width);
  const cxM2b = Math.round(0.62 * width);
  const cxSink = Math.round(0.86 * width);
  const accW = 164;
  const accH = 64;

  const nodes: NetworkNodeLayout[] = [
    // Row A
    {
      id: "node-tower",
      label: "Airtel DL-TWR-891",
      sublabel: "Sector 4 Rohini · Az 120° · TTL 64 Direct",
      category: "controller",
      cx: cxTower,
      cy: yRowA,
      x: Math.round(cxTower - sideW / 2),
      y: Math.round(yRowA - sideH / 2),
      w: sideW,
      h: sideH,
      color: "#0284C7",
      ports: {
        top: [{ x: cxTower, y: Math.round(yRowA - sideH / 2) }],
        bottom: [{ x: cxTower, y: Math.round(yRowA + sideH / 2) }],
        left: { x: Math.round(cxTower - sideW / 2), y: yRowA },
        right: { x: Math.round(cxTower + sideW / 2), y: yRowA },
      },
    },
    {
      id: "node-hero",
      label: "Controller device cluster",
      sublabel: isHotspotActive
        ? "SM-M346B (...564) via Poco X5 AP (74:DA:38:A2:11:BC · TTL 63 Tethered)"
        : "SM-M346B (...564) via Poco X5 AP (74:DA:38:A2:11:BC · TTL 64 Direct)",
      category: "hero",
      cx: cxHero,
      cy: yRowA,
      x: Math.round(cxHero - heroW / 2),
      y: Math.round(yRowA - heroH / 2),
      w: heroW,
      h: heroH,
      color: "#E11D48",
      ports: {
        top: [{ x: cxHero, y: Math.round(yRowA - heroH / 2) }],
        bottom: [
          { x: cxHero - (shouldIncludeCash ? 110 : 80), y: Math.round(yRowA + heroH / 2) }, // Left bottom port for Tether
          { x: cxHero, y: Math.round(yRowA + heroH / 2) },                                  // Center bottom port for JA4
          { x: cxHero + (shouldIncludeCash ? 110 : 80), y: Math.round(yRowA + heroH / 2) }, // Right bottom port for CAF
        ],
        left: { x: Math.round(cxHero - heroW / 2), y: yRowA },
        right: { x: Math.round(cxHero + heroW / 2), y: yRowA },
      },
    },
    {
      id: "node-c2",
      label: "Telegram C2 @c2_bot",
      sublabel: "IP: 103.21.144.92:443 · OTP exfil",
      category: "controller",
      cx: cxC2,
      cy: yRowA,
      x: Math.round(cxC2 - sideW / 2),
      y: Math.round(yRowA - sideH / 2),
      w: sideW,
      h: sideH,
      color: "#BE123C",
      ports: {
        top: [{ x: cxC2, y: Math.round(yRowA - sideH / 2) }],
        bottom: [{ x: cxC2, y: Math.round(yRowA + sideH / 2) }],
        left: { x: Math.round(cxC2 - sideW / 2), y: yRowA },
        right: { x: Math.round(cxC2 + sideW / 2), y: yRowA },
      },
    },

    // Row B: Hubs (56px circles)
    {
      id: "hub-tether",
      label: "Wi-Fi tether",
      sublabel: "Wi-Fi tether · 4/4",
      category: "hub",
      cx: cxHubTether,
      cy: yRowB,
      x: Math.round(cxHubTether - hubSize / 2),
      y: Math.round(yRowB - hubSize / 2),
      w: hubSize,
      h: hubSize,
      color: "#8B5CF6",
      strength: "4/4",
      ports: {
        top: [{ x: cxHubTether, y: Math.round(yRowB - hubSize / 2) }],
        bottom: [{ x: cxHubTether, y: Math.round(yRowB + hubSize / 2) }],
        left: { x: Math.round(cxHubTether - hubSize / 2), y: yRowB },
        right: { x: Math.round(cxHubTether + hubSize / 2), y: yRowB },
      },
    },
    {
      id: "hub-ja4",
      label: "JA4 TLS fingerprint",
      sublabel: "JA4 TLS · 4/4",
      category: "hub",
      cx: cxHubJa4,
      cy: yRowB,
      x: Math.round(cxHubJa4 - hubSize / 2),
      y: Math.round(yRowB - hubSize / 2),
      w: hubSize,
      h: hubSize,
      color: "#10B981",
      strength: "4/4",
      ports: {
        top: [{ x: cxHubJa4, y: Math.round(yRowB - hubSize / 2) }],
        bottom: [{ x: cxHubJa4, y: Math.round(yRowB + hubSize / 2) }],
        left: { x: Math.round(cxHubJa4 - hubSize / 2), y: yRowB },
        right: { x: Math.round(cxHubJa4 + hubSize / 2), y: yRowB },
      },
    },
    {
      id: "hub-caf",
      label: "Shared CAF introducer",
      sublabel: "CAF Introducer · 2/4",
      category: "hub",
      cx: cxHubCaf,
      cy: yRowB,
      x: Math.round(cxHubCaf - hubSize / 2),
      y: Math.round(yRowB - hubSize / 2),
      w: hubSize,
      h: hubSize,
      color: "#F59E0B",
      strength: "2/4",
      ports: {
        top: [{ x: cxHubCaf, y: Math.round(yRowB - hubSize / 2) }],
        bottom: [{ x: cxHubCaf, y: Math.round(yRowB + hubSize / 2) }],
        left: { x: Math.round(cxHubCaf - hubSize / 2), y: yRowB },
        right: { x: Math.round(cxHubCaf + hubSize / 2), y: yRowB },
      },
    },

    // Row C: 4 Accounts (176x64 each, with 3 ports on top at -44, 0, +44)
    {
      id: "acc-vikram",
      label: "Vikram Shah (L1)",
      sublabel: "SBI 41088291083",
      role: "Layer-1 Inflow Receiver",
      category: "account",
      cx: cxM1,
      cy: yRowC,
      x: Math.round(cxM1 - accW / 2),
      y: Math.round(yRowC - accH / 2),
      w: accW,
      h: accH,
      color: "#6366F1",
      ports: {
        top: [
          { x: cxM1 - 44, y: Math.round(yRowC - accH / 2) }, // Port 0: Wi-Fi
          { x: cxM1, y: Math.round(yRowC - accH / 2) },      // Port 1: JA4
          { x: cxM1 + 44, y: Math.round(yRowC - accH / 2) }, // Port 2: CAF
        ],
        bottom: [{ x: cxM1, y: Math.round(yRowC + accH / 2) }],
        left: { x: Math.round(cxM1 - accW / 2), y: yRowC },
        right: { x: Math.round(cxM1 + accW / 2), y: yRowC },
      },
    },
    {
      id: "acc-rohit",
      label: "Rohit Verma (L2A)",
      sublabel: "HDFC 5010029419920",
      role: "Layer-2A Split Conduit",
      category: "account",
      cx: cxM2a,
      cy: yRowC,
      x: Math.round(cxM2a - accW / 2),
      y: Math.round(yRowC - accH / 2),
      w: accW,
      h: accH,
      color: "#8B5CF6",
      ports: {
        top: [
          { x: cxM2a - 44, y: Math.round(yRowC - accH / 2) },
          { x: cxM2a, y: Math.round(yRowC - accH / 2) },
          { x: cxM2a + 44, y: Math.round(yRowC - accH / 2) },
        ],
        bottom: [{ x: cxM2a, y: Math.round(yRowC + accH / 2) }],
        left: { x: Math.round(cxM2a - accW / 2), y: yRowC },
        right: { x: Math.round(cxM2a + accW / 2), y: yRowC },
      },
    },
    {
      id: "acc-sameer",
      label: "Sameer Khan (L2B)",
      sublabel: "AXIS 9140200410291",
      role: "Layer-2B Cashout Conduit",
      category: "account",
      cx: cxM2b,
      cy: yRowC,
      x: Math.round(cxM2b - accW / 2),
      y: Math.round(yRowC - accH / 2),
      w: accW,
      h: accH,
      color: "#F59E0B",
      ports: {
        top: [
          { x: cxM2b - 44, y: Math.round(yRowC - accH / 2) },
          { x: cxM2b, y: Math.round(yRowC - accH / 2) },
          { x: cxM2b + 44, y: Math.round(yRowC - accH / 2) },
        ],
        bottom: [{ x: cxM2b, y: Math.round(yRowC + accH / 2) }],
        left: { x: Math.round(cxM2b - accW / 2), y: yRowC },
        right: { x: Math.round(cxM2b + accW / 2), y: yRowC },
      },
    },
    {
      id: "acc-sink",
      label: "Paytm Sink #1109",
      sublabel: "Terminal Escrow Cache",
      role: "Terminal Escrow Account",
      category: "account",
      cx: cxSink,
      cy: yRowC,
      x: Math.round(cxSink - accW / 2),
      y: Math.round(yRowC - accH / 2),
      w: accW,
      h: accH,
      color: "#059669",
      ports: {
        top: [
          { x: cxSink - 44, y: Math.round(yRowC - accH / 2) },
          { x: cxSink, y: Math.round(yRowC - accH / 2) },
          { x: cxSink + 44, y: Math.round(yRowC - accH / 2) },
        ],
        bottom: [{ x: cxSink, y: Math.round(yRowC + accH / 2) }],
        left: { x: Math.round(cxSink - accW / 2), y: yRowC },
        right: { x: Math.round(cxSink + accW / 2), y: yRowC },
      },
    },
  ];

  // Helper to generate cubic Bezier path with vertical tangents:
  // M x1,y1 C x1,ym x2,ym x2,y2
  function makeVerticalBezier(x1: number, y1: number, x2: number, y2: number): string {
    const ym = Math.round((y1 + y2) / 2);
    return `M ${x1},${y1} C ${x1},${ym} ${x2},${ym} ${x2},${y2}`;
  }

  // Helper for straight horizontal edge
  function makeStraightLine(x1: number, y1: number, x2: number, y2: number): string {
    return `M ${x1},${y1} L ${x2},${y2}`;
  }

  const edges: NetworkEdgeLayout[] = [];

  // Edge 1: Tower <-> Hero (Ingress)
  if (activeFilter === "all" || activeFilter === "tether") {
    const path = makeStraightLine(
      Math.round(cxTower + sideW / 2),
      yRowA,
      Math.round(cxHero - heroW / 2),
      yRowA
    );
    edges.push({
      id: "edge-tower-hero",
      type: "tower",
      sourceId: "node-tower",
      targetId: "node-hero",
      path,
      haloPath: path,
      color: "#0284C7",
      dashed: false,
      arrowhead: "arrow-blue",
    });
  }

  // Edge 2: Hero <-> C2 (OTP exfil)
  if (activeFilter === "all" || activeFilter === "c2") {
    const path = makeStraightLine(
      Math.round(cxHero + heroW / 2),
      yRowA,
      Math.round(cxC2 - sideW / 2),
      yRowA
    );
    edges.push({
      id: "edge-hero-c2",
      type: "c2",
      sourceId: "node-hero",
      targetId: "node-c2",
      path,
      haloPath: path,
      color: "#BE123C",
      dashed: true,
      arrowhead: "arrow-rose",
    });
  }

  // Edge 3: Hero -> Wi-Fi Tether Hub (shown if tether active and filter allows)
  if ((activeFilter === "all" || activeFilter === "tether") && isHotspotActive) {
    const p1 = nodes.find((n) => n.id === "node-hero")!.ports.bottom[0];
    const p2 = nodes.find((n) => n.id === "hub-tether")!.ports.top[0];
    const path = makeVerticalBezier(p1.x, p1.y, p2.x, p2.y);
    edges.push({
      id: "edge-hero-hub-tether",
      type: "tether",
      sourceId: "node-hero",
      targetId: "hub-tether",
      path,
      haloPath: path,
      color: "#8B5CF6",
      dashed: false,
      arrowhead: "arrow-violet",
    });

    // Tether Hub -> 4 Accounts (Port 0: x - 44)
    // Reserved 40px clear zone under hub: edge starts at yRowB + hubSize/2 + 40
    const hubBot = { x: cxHubTether, y: Math.round(yRowB + hubSize / 2 + 40) };
    const accList = ["acc-vikram", "acc-rohit", "acc-sameer", "acc-sink"];
    accList.forEach((accId) => {
      const accNode = nodes.find((n) => n.id === accId)!;
      const port = accNode.ports.top[0]; // Port 0 (Wi-Fi)
      const ePath = makeVerticalBezier(hubBot.x, hubBot.y, port.x, port.y);
      edges.push({
        id: `edge-tether-${accId}`,
        type: "tether",
        sourceId: "hub-tether",
        targetId: accId,
        path: ePath,
        haloPath: ePath,
        color: "#8B5CF6",
        dashed: false,
        arrowhead: "arrow-violet",
      });
    });
  }

  // Edge 4: Hero -> JA4 TLS Hub
  if (activeFilter === "all" || activeFilter === "ja4") {
    const p1 = nodes.find((n) => n.id === "node-hero")!.ports.bottom[1];
    const p2 = nodes.find((n) => n.id === "hub-ja4")!.ports.top[0];
    const path = makeVerticalBezier(p1.x, p1.y, p2.x, p2.y);
    edges.push({
      id: "edge-hero-hub-ja4",
      type: "ja4",
      sourceId: "node-hero",
      targetId: "hub-ja4",
      path,
      haloPath: path,
      color: "#10B981",
      dashed: false,
      arrowhead: "arrow-emerald",
    });

    // JA4 Hub -> 4 Accounts (Port 1: center x + 0)
    const hubBot = { x: cxHubJa4, y: Math.round(yRowB + hubSize / 2 + 40) };
    const accList = ["acc-vikram", "acc-rohit", "acc-sameer", "acc-sink"];
    accList.forEach((accId) => {
      const accNode = nodes.find((n) => n.id === accId)!;
      const port = accNode.ports.top[1]; // Port 1 (JA4)
      const ePath = makeVerticalBezier(hubBot.x, hubBot.y, port.x, port.y);
      edges.push({
        id: `edge-ja4-${accId}`,
        type: "ja4",
        sourceId: "hub-ja4",
        targetId: accId,
        path: ePath,
        haloPath: ePath,
        color: "#10B981",
        dashed: false,
        arrowhead: "arrow-emerald",
      });
    });
  }

  // Edge 5: Hero -> Shared CAF Introducer Hub
  if (activeFilter === "all" || activeFilter === "caf") {
    const p1 = nodes.find((n) => n.id === "node-hero")!.ports.bottom[2];
    const p2 = nodes.find((n) => n.id === "hub-caf")!.ports.top[0];
    const path = makeVerticalBezier(p1.x, p1.y, p2.x, p2.y);
    edges.push({
      id: "edge-hero-hub-caf",
      type: "caf",
      sourceId: "node-hero",
      targetId: "hub-caf",
      path,
      haloPath: path,
      color: "#F59E0B",
      dashed: true,
      arrowhead: "arrow-amber",
    });

    // CAF Hub -> Sameer L2B and Paytm Sink (Port 2: x + 44)
    const hubBot = { x: cxHubCaf, y: Math.round(yRowB + hubSize / 2 + 40) };
    const cafAccList = ["acc-sameer", "acc-sink"];
    cafAccList.forEach((accId) => {
      const accNode = nodes.find((n) => n.id === accId)!;
      const port = accNode.ports.top[2]; // Port 2 (CAF)
      const ePath = makeVerticalBezier(hubBot.x, hubBot.y, port.x, port.y);
      edges.push({
        id: `edge-caf-${accId}`,
        type: "caf",
        sourceId: "hub-caf",
        targetId: accId,
        path: ePath,
        haloPath: ePath,
        color: "#F59E0B",
        dashed: true,
        arrowhead: "arrow-amber",
      });
    });
  }

  // ---------------------------------------------------------------------------
  // OPTIONAL: CASH FLOW TOPOLOGY NODES & EDGES (Only when requested)
  // ---------------------------------------------------------------------------
  if (shouldIncludeCash) {
    // 1. Victim Node (Sunil Kumar) at Row B far left (.09W) with generous clearance from Wi-Fi hub (.29W)
    const cxVictim = Math.round(0.09 * width);
    const victimW = 144;
    const victimH = 54;
    nodes.push({
      id: "node-victim",
      label: `${investigation?.complainantName || "Victim"} (Victim)`,
      sublabel: `Outflow: ₹${(investigation?.bookedLossInr || 500000).toLocaleString("en-IN")}`,
      role: "Victim Remitter Account",
      category: "victim",
      cx: cxVictim,
      cy: yRowB,
      x: Math.round(cxVictim - victimW / 2),
      y: Math.round(yRowB - victimH / 2),
      w: victimW,
      h: victimH,
      color: "#EF4444",
      ports: {
        top: [{ x: cxVictim, y: Math.round(yRowB - victimH / 2) }],
        bottom: [{ x: cxVictim, y: Math.round(yRowB + victimH / 2) }],
        left: { x: Math.round(cxVictim - victimW / 2), y: yRowB },
        right: { x: Math.round(cxVictim + victimW / 2), y: yRowB },
      },
    });

    // 2. ATM Cashout Sink Node (Rohini Sector 4 ATM DL-049) at Row B far right (.91W) with generous clearance from CAF hub (.71W)
    const cxAtm = Math.round(0.91 * width);
    const atmW = 144;
    const atmH = 54;
    nodes.push({
      id: "node-atm",
      label: "Rohini Sec-4 ATM",
      sublabel: "ATM DL-049 · Cash: ₹1.20L",
      role: "Physical Cashout Sink",
      category: "sink",
      cx: cxAtm,
      cy: yRowB,
      x: Math.round(cxAtm - atmW / 2),
      y: Math.round(yRowB - atmH / 2),
      w: atmW,
      h: atmH,
      color: "#DC2626",
      ports: {
        top: [{ x: cxAtm, y: Math.round(yRowB - atmH / 2) }],
        bottom: [{ x: cxAtm, y: Math.round(yRowB + atmH / 2) }],
        left: { x: Math.round(cxAtm - atmW / 2), y: yRowB },
        right: { x: Math.round(cxAtm + atmW / 2), y: yRowB },
      },
    });

    // Cash Edge A: Victim -> Vikram Shah (₹5,00,000)
    const pVictimBot = { x: cxVictim, y: Math.round(yRowB + victimH / 2) };
    const pVikramLeft = { x: Math.round(cxM1 - accW / 2), y: yRowC - 10 };
    const pathVictim = makeVerticalBezier(pVictimBot.x, pVictimBot.y, pVikramLeft.x, pVikramLeft.y);
    edges.push({
      id: "edge-cash-victim-vikram",
      type: "cash",
      sourceId: "node-victim",
      targetId: "acc-vikram",
      path: pathVictim,
      haloPath: pathVictim,
      color: "#059669",
      dashed: false,
      arrowhead: "arrow-emerald",
      amount: "₹5,00,000",
      timestamp: "10:00:14 IST",
    });

    // Cash Edge B: Vikram -> Rohit (₹3,00,000)
    const pVikramRight = { x: Math.round(cxM1 + accW / 2), y: yRowC - 10 };
    const pRohitLeft = { x: Math.round(cxM2a - accW / 2), y: yRowC - 10 };
    const pathVikramRohit = `M ${pVikramRight.x},${pVikramRight.y} C ${pVikramRight.x + 25},${pVikramRight.y - 20} ${pRohitLeft.x - 25},${pRohitLeft.y - 20} ${pRohitLeft.x},${pRohitLeft.y}`;
    edges.push({
      id: "edge-cash-vikram-rohit",
      type: "cash",
      sourceId: "acc-vikram",
      targetId: "acc-rohit",
      path: pathVikramRohit,
      haloPath: pathVikramRohit,
      color: "#059669",
      dashed: false,
      arrowhead: "arrow-emerald",
      amount: "₹3,00,000",
      timestamp: "10:09:45 IST",
    });

    // Cash Edge C: Vikram -> Sameer (₹2,00,000)
    const pVikramRightLow = { x: Math.round(cxM1 + accW / 2), y: yRowC + 10 };
    const pSameerLeft = { x: Math.round(cxM2b - accW / 2), y: yRowC + 10 };
    const pathVikramSameer = `M ${pVikramRightLow.x},${pVikramRightLow.y} C ${pVikramRightLow.x + 40},${pVikramRightLow.y + 35} ${pSameerLeft.x - 40},${pSameerLeft.y + 35} ${pSameerLeft.x},${pSameerLeft.y}`;
    edges.push({
      id: "edge-cash-vikram-sameer",
      type: "cash",
      sourceId: "acc-vikram",
      targetId: "acc-sameer",
      path: pathVikramSameer,
      haloPath: pathVikramSameer,
      color: "#D97706",
      dashed: false,
      arrowhead: "arrow-amber",
      amount: "₹2,00,000",
      timestamp: "10:09:50 IST",
    });

    // Cash Edge D: Sameer -> ATM (₹1,20,000 Cashout)
    const pSameerRight = { x: Math.round(cxM2b + accW / 2), y: yRowC - 10 };
    const pAtmBot = { x: cxAtm, y: Math.round(yRowB + atmH / 2) };
    const pathSameerAtm = makeVerticalBezier(pSameerRight.x, pSameerRight.y, pAtmBot.x, pAtmBot.y);
    edges.push({
      id: "edge-cash-sameer-atm",
      type: "cash",
      sourceId: "acc-sameer",
      targetId: "node-atm",
      path: pathSameerAtm,
      haloPath: pathSameerAtm,
      color: "#E11D48",
      dashed: true,
      arrowhead: "arrow-rose",
      amount: "₹1,20,000",
      timestamp: "10:18:22 IST",
    });

    // Cash Edge E: Rohit -> Paytm Sink (₹1,80,000 Merchant Settlement)
    const pRohitRight = { x: Math.round(cxM2a + accW / 2), y: yRowC };
    const pSinkLeft = { x: Math.round(cxSink - accW / 2), y: yRowC };
    const pathRohitSink = `M ${pRohitRight.x},${pRohitRight.y} C ${pRohitRight.x + 40},${pRohitRight.y - 30} ${pSinkLeft.x - 40},${pSinkLeft.y - 30} ${pSinkLeft.x},${pSinkLeft.y}`;
    edges.push({
      id: "edge-cash-rohit-sink",
      type: "cash",
      sourceId: "acc-rohit",
      targetId: "acc-sink",
      path: pathRohitSink,
      haloPath: pathRohitSink,
      color: "#7C3AED",
      dashed: false,
      arrowhead: "arrow-violet",
      amount: "₹1,80,000",
      timestamp: "10:20:10 IST",
    });
  }

  return {
    width,
    height,
    nodes,
    edges,
  };
}
