import axios from "axios";

export interface GraphProjectionParams {
  case_id?: string;
  root_entity_id?: string;
  jurisdiction?: string;
  max_hops?: number;
  min_confidence?: number;
  max_nodes?: number;
  max_edges?: number;
  entity_types?: string[];
  relationship_types?: string[];
}

export interface GraphNodePayload {
  id: string;
  label: string;
  properties: Record<string, any>;
  cluster_id: string;
  level_of_detail: number;
  x: number;
  y: number;
}

export interface GraphEdgePayload {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
}

export interface GraphProjectionResponseData {
  query_id: string;
  requested_scope: Record<string, any>;
  applied_scope: Record<string, any>;
  nodes: GraphNodePayload[];
  edges: GraphEdgePayload[];
  clusters: Array<{ cluster_id: string; label: string; node_count: number }>;
  truncation: {
    is_truncated: boolean;
    total_available_nodes: number;
    returned_nodes: number;
    total_available_edges: number;
    returned_edges: number;
    truncation_reason?: string;
  };
  freshness: {
    timestamp: string;
    data_status: string;
    synthetic: boolean;
  };
  telemetry: {
    query_id: string;
    query_duration_ms: number;
    serialization_duration_ms: number;
    memory_used_mb: number;
  };
}

class GraphProjectionAdapter {
  private activeController: AbortController | null = null;
  private sequenceCounter = 0;

  async fetchProjection(params: GraphProjectionParams): Promise<GraphProjectionResponseData | null> {
    // Cancel previous pending request
    if (this.activeController) {
      this.activeController.abort();
    }

    const controller = new AbortController();
    this.activeController = controller;
    const currentSeq = ++this.sequenceCounter;

    try {
      const res = await axios.post<GraphProjectionResponseData>(
        "/api/v1/investigation/graph/projection",
        {
          case_id: params.case_id || "C102",
          root_entity_id: params.root_entity_id || null,
          max_hops: params.max_hops || 2,
          min_confidence: params.min_confidence || 0.0,
          max_nodes: params.max_nodes || 500,
          max_edges: params.max_edges || 1000,
          entity_types: params.entity_types || [],
          relationship_types: params.relationship_types || [],
        },
        { signal: controller.signal }
      );

      // Stale response protection
      if (currentSeq !== this.sequenceCounter) {
        console.warn(`[GraphProjectionAdapter] Rejected stale response #${currentSeq}`);
        return null;
      }

      return res.data;
    } catch (err: any) {
      if (axios.isCancel(err)) {
        console.log("[GraphProjectionAdapter] Cancelled previous graph query.");
      } else {
        console.error("[GraphProjectionAdapter] Query failed:", err);
      }
      return null;
    }
  }
}

export const graphProjectionAdapter = new GraphProjectionAdapter();
