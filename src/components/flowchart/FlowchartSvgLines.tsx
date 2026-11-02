/**
 * Flowchart SVG Lines Component — Renders bezier curve connections between milestone DAG nodes.
 */
import type { FC } from "react";

export interface SvgConnectionLine {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isCompleted: boolean;
  isBlocked: boolean;
  isActive: boolean;
}

interface FlowchartSvgLinesProps {
  connections: SvgConnectionLine[];
}

export const FlowchartSvgLines: FC<FlowchartSvgLinesProps> = ({ connections }) => {
  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10"
      style={{ minWidth: "100%", minHeight: "100%" }}
      aria-hidden="true"
    >
      <defs>
        <marker
          id="flow-arrow-gray"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#94A3B8" />
        </marker>
        <marker
          id="flow-arrow-green"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#059669" />
        </marker>
        <marker
          id="flow-arrow-red"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#DC2626" />
        </marker>
        <marker
          id="flow-arrow-indigo"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#4F46E5" />
        </marker>
      </defs>

      {connections.map((c) => {
        const dx = Math.abs(c.x2 - c.x1);
        const curvature = Math.max(30, dx * 0.45);
        const pathData = `M ${c.x1} ${c.y1} C ${c.x1 + curvature} ${c.y1}, ${c.x2 - curvature} ${c.y2}, ${c.x2} ${c.y2}`;

        let strokeColor = "#94A3B8";
        let markerEnd = "url(#flow-arrow-gray)";
        let strokeDasharray = "none";
        let strokeWidth = 2;

        if (c.isActive) {
          strokeColor = "#4F46E5";
          markerEnd = "url(#flow-arrow-indigo)";
          strokeWidth = 3;
        } else if (c.isBlocked) {
          strokeColor = "#DC2626";
          markerEnd = "url(#flow-arrow-red)";
          strokeDasharray = "5,4";
          strokeWidth = 2.5;
        } else if (c.isCompleted) {
          strokeColor = "#059669";
          markerEnd = "url(#flow-arrow-green)";
          strokeWidth = 2;
        }

        return (
          <path
            key={c.id}
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            markerEnd={markerEnd}
            className="transition-all duration-200"
          />
        );
      })}
    </svg>
  );
};
