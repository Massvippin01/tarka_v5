import React, { useState } from "react";
import type { ProvenanceDAG, DAGNode } from "../../types/forensics";

interface ProvenanceDAGViewProps {
  dag: ProvenanceDAG | null;
  caseId?: string;
  embedded?: boolean;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  className?: string;
}

export const ProvenanceDAGView: React.FC<ProvenanceDAGViewProps> = ({
  dag,
  selectedNodeId,
  onSelectNode,
  className = "",
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");

  if (!dag || !dag.nodes || dag.nodes.length === 0) {
    return (
      <div className={`p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg ${className}`}>
        No Provenance DAG available for this analysis run.
      </div>
    );
  }

  const getNodeColorClass = (node: DAGNode) => {
    const status = (node.status || "").toUpperCase();

    // Specific Hard Forensic Color Token Requirements
    if (status === "CONTRADICTION" || status.includes("CONFLICT")) {
      return {
        bg: "bg-[#AF3F3A]/20",
        border: "border-[#AF3F3A]",
        text: "text-[#AF3F3A]",
        colorHex: "#AF3F3A",
      };
    }

    if (status === "SURVIVING" || status.includes("SURVIV")) {
      return {
        bg: "bg-[#26715A]/20",
        border: "border-[#26715A]",
        text: "text-[#26715A]",
        colorHex: "#26715A",
      };
    }

    if (status === "BASELINE_ONLY" || status === "REMOVED") {
      return {
        bg: "bg-[#355C8A]/20",
        border: "border-[#355C8A]",
        text: "text-[#355C8A]",
        colorHex: "#355C8A",
      };
    }

    if (status === "INACTIVE" || status.includes("EXCLUDE")) {
      return {
        bg: "bg-slate-900/60 border-dashed border-slate-600 opacity-60",
        border: "border-dashed border-slate-600",
        text: "text-slate-400 opacity-60",
        colorHex: "#64748B",
      };
    }

    if (status === "REVIEW_REQUIRED") {
      return {
        bg: "bg-amber-950/20",
        border: "border-amber-600",
        text: "text-amber-400",
        colorHex: "#D97706",
      };
    }

    return {
      bg: "bg-slate-800/40",
      border: "border-slate-700",
      text: "text-slate-300",
      colorHex: "#94A3B8",
    };
  };

  const filteredNodes = dag.nodes.filter((n) => {
    if (filterType === "ALL") return true;
    return n.node_type === filterType;
  });

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">Provenance Dependency DAG</span>
          <span className="font-mono text-slate-400 text-[11px]">
            Run: {dag.run_id} | Hash: {dag.fingerprint.slice(0, 10)}...
          </span>
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "ARTIFACT", "EVIDENCE_DNA", "CANONICAL_FACT", "FINDING"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                filterType === t
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Semantic Legend */}
      <div className="flex items-center gap-6 px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#26715A]" />
          <span className="text-slate-300">Surviving (Evidence Jade #26715A)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#355C8A]" />
          <span className="text-slate-300">Baseline Only (Evidence Indigo #355C8A)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#AF3F3A]" />
          <span className="text-slate-300">Contradiction (Conflict Crimson #AF3F3A)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-dashed border-slate-500 opacity-60" />
          <span className="text-slate-400">Inactive / Excluded (border-dashed opacity-60)</span>
        </div>
      </div>

      {/* DAG Node Graph representation */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[500px]">
        {filteredNodes.map((node) => {
          const colors = getNodeColorClass(node);
          const isSelected = selectedNodeId === node.node_id;

          return (
            <div
              key={node.node_id}
              onClick={() => onSelectNode && onSelectNode(node.node_id)}
              className={`p-3 rounded border cursor-pointer transition-all ${colors.bg} ${colors.border} ${
                isSelected ? "ring-2 ring-indigo-500 shadow-lg" : "hover:border-slate-500"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className={colors.text}>{node.node_type}</span>
                <span className="text-[10px] uppercase tracking-wide opacity-80">{node.status}</span>
              </div>
              <div className="text-sm font-medium text-slate-100 truncate">{node.label}</div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono truncate">
                ID: {node.node_id}
              </div>
              {node.rule_id && (
                <div className="mt-1 text-[10px] text-slate-300">
                  Rule: <code className="text-slate-200">{node.rule_id}</code>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edge relationship summary */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 text-[11px] text-slate-400">
        Total Lineage Edges: <strong className="text-slate-200">{dag.edges.length}</strong> | Topological Sort:{" "}
        <span className="text-emerald-400 font-semibold">Strictly Acyclic Directed Graph</span>
      </div>
    </div>
  );
};

export default ProvenanceDAGView;
