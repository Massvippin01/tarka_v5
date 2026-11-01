export interface HaystackStats {
  total: number;
  currentStep: number;
  survivors: number[];
  activeSurvivors: number;
  isPortDropped: boolean;
  targetCount: number;
}

export interface NetworkStats {
  nodeCount: number;
  edgeCount: number;
  activeFilter: string;
  isHotspotActive: boolean;
  busCount: number;
}

export interface SankeyStats {
  totalLoss: number;
  recoverable: number;
  freezeBudgetK: number;
  isInjectClean: boolean;
  nodeCount: number;
  linkCount: number;
}

export interface TarkaVizRegistry {
  haystack?: {
    stats: () => HaystackStats;
  };
  network?: {
    stats: () => NetworkStats;
  };
  sankey?: {
    stats: () => SankeyStats;
  };
}

declare global {
  interface Window {
    __tarkaViz?: TarkaVizRegistry;
  }
}
