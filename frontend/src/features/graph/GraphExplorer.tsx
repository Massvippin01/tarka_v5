import { useEffect, useState } from "react";

import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { fetchGraph } from "../../api/graph";
import type { GraphResponse } from "../../types/graph";


function getNodeLabel(
  properties: Record<string, unknown>,
  labels: string[],
): string {
  const preferredProperties = [
    "name",
    "type",
    "number",
    "title",
    "id",
  ];

  for (const propertyName of preferredProperties) {
    const value = properties[propertyName];

    if (
      typeof value === "string" ||
      typeof value === "number"
    ) {
      return String(value);
    }
  }

  return labels[0] ?? "Entity";
}


function GraphExplorer() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGraph() {
      try {
        const graphData = await fetchGraph();

        setGraph(graphData);
      } catch (requestError) {
        console.error(requestError);

        setError(
          "Unable to load the TARKA forensic intelligence graph.",
        );
      }
    }

    loadGraph();
  }, []);

  if (error) {
    return (
      <div>
        <h2>Graph unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!graph) {
    return (
      <div>
        <p>Loading intelligence graph...</p>
      </div>
    );
  }

  const flowNodes: Node[] = graph.nodes.map(
    (graphNode, index) => {
      return {
        id: graphNode.id,
        position: {
          x: (index % 2) * 350,
          y: Math.floor(index / 2) * 220,
        },
        data: {
          label: getNodeLabel(
            graphNode.properties,
            graphNode.labels,
          ),
        },
      };
    },
  );

  const flowEdges: Edge[] = graph.edges.map(
    (graphEdge) => {
      return {
        id: graphEdge.id,
        source: graphEdge.source,
        target: graphEdge.target,
        label: graphEdge.type,
      };
    },
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}


export default GraphExplorer;