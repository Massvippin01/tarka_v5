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
  timestamp?: string;
}

export interface NetworkLayoutResult {
  width: number;
  height: number;
  nodes: NetworkNodeLayout[];
  edges: NetworkEdgeLayout[];
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
  includeCashFlowNodes: boolean = false
): NetworkLayoutResult {
  const width = Math.max(960, W);
  const height = Math.max(500, H);

  // Row Y-coordinates (fractions: .14H, .50H, .84H)
  const yRowA = Math.round(0.14 * height);
  const yRowB = Math.round(0.50 * height);
  const yRowC = Math.round(0.84 * height);

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
      label: "Sunil Kumar (Victim)",
      sublabel: "SBI A/C 30910029101 · Outflow: ₹5.00L",
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
