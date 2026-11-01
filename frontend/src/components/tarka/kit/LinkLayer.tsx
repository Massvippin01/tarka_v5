import React, { useEffect, useState, useCallback } from "react";

export interface LinkItem {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  animated?: boolean;
  opacity?: number;
  arrow?: boolean;
}

export interface LinkLayerProps {
  links: LinkItem[];
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

interface PathCoords {
  id: string;
  d: string;
  labelX: number;
  labelY: number;
  color: string;
  strokeWidth: number;
  dashed: boolean;
  animated: boolean;
  opacity: number;
  label?: string;
  arrow: boolean;
}

export const LinkLayer: React.FC<LinkLayerProps> = ({
  links,
  containerRef,
  className = "",
}) => {
  const [paths, setPaths] = useState<PathCoords[]>([]);

  const recompute = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const computed: PathCoords[] = [];

    for (const link of links) {
      const fromEl = containerRef.current.querySelector(`[data-anchor-id="${link.fromId}"]`);
      const toEl = containerRef.current.querySelector(`[data-anchor-id="${link.toId}"]`);

      if (!fromEl || !toEl) continue;

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Determine right edge of fromEl and left edge of toEl relative to container
      const x1 = fromRect.right - containerRect.left;
      const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;

      const x2 = toRect.left - containerRect.left;
      const y2 = toRect.top + toRect.height / 2 - containerRect.top;

      const dx = Math.abs(x2 - x1);
      const cpOffset = Math.max(dx * 0.5, 20);

      const d = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;

      computed.push({
        id: link.id,
        d,
        labelX: (x1 + x2) / 2,
        labelY: (y1 + y2) / 2,
        color: link.color || "#4F46E5",
        strokeWidth: link.strokeWidth || 2,
        dashed: link.dashed ?? false,
        animated: link.animated ?? false,
        opacity: link.opacity ?? 0.85,
        label: link.label,
        arrow: link.arrow ?? true,
      });
    }

    setPaths(computed);
  }, [links, containerRef]);

  useEffect(() => {
    recompute();

    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      recompute();
    });
    observer.observe(containerRef.current);

    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, containerRef]);

  return (
    <svg
      className={`link-layer ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
        overflow: "visible",
      }}
    >
      <defs>
        <style>{`
          @keyframes linkDashAnim {
            from { stroke-dashoffset: 20; }
            to { stroke-dashoffset: 0; }
          }
          .link-animated-dash {
            animation: linkDashAnim 1s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .link-animated-dash {
              animation: none !important;
            }
          }
        `}</style>
        <marker
          id="linkArrowIndigo"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 2 L 7 5 L 0 8 z" fill="#4F46E5" />
        </marker>
        <marker
          id="linkArrowEmerald"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 2 L 7 5 L 0 8 z" fill="#059669" />
        </marker>
        <marker
          id="linkArrowRose"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 2 L 7 5 L 0 8 z" fill="#E11D48" />
        </marker>
      </defs>

      {paths.map((p) => {
        const markerUrl =
          p.color === "#059669"
            ? "url(#linkArrowEmerald)"
            : p.color === "#E11D48" || p.color === "#BE123C"
            ? "url(#linkArrowRose)"
            : "url(#linkArrowIndigo)";

        return (
          <g key={p.id}>
            <path
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              strokeDasharray={p.dashed || p.animated ? "5 3" : undefined}
              className={p.animated ? "link-animated-dash" : undefined}
              opacity={p.opacity}
              markerEnd={p.arrow ? markerUrl : undefined}
              style={{ transition: "stroke 0.2s ease, opacity 0.2s ease" }}
            />
            {p.label && (
              <g transform={`translate(${p.labelX}, ${p.labelY})`}>
                <rect
                  x="-20"
                  y="-9"
                  width="40"
                  height="16"
                  rx="4"
                  fill="#FFFFFF"
                  stroke={p.color}
                  strokeWidth="1"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }}
                />
                <text
                  x="0"
                  y="2.5"
                  textAnchor="middle"
                  fill={p.color}
                  fontSize="8"
                  fontWeight="800"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {p.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

