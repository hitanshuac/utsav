import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Mail,
  MessageCircle,
  X
} from "lucide-react";
import { computeScheduledMilestones, ScheduledMilestone } from "../../lib/engine/dependency-graph";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { resolveThirdPartyVendorEmail } from "../../lib/services/communication";
import { TMinusAlertService } from "../../lib/services/tminus-alert-service";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { VendorActivityFrequencyChart } from "./VendorActivityFrequencyChart";

interface GraphNode {
  task: ScheduledMilestone;
  colIndex: number;
  rowIndex: number;
  x: number;
  y: number;
}

const STAGE_COLUMNS = [
  { id: "foundation", label: "Foundation", range: "T-90d to T-45d" },
  { id: "lockin", label: "Lock-In", range: "T-30d to T-14d" },
  { id: "prep", label: "Final Prep", range: "T-7d to T-1d" },
  { id: "dayof", label: "Muhurat Day", range: "T-0d" }
];

function getStageColIndex(days: number): number {
  if (days >= 45) return 0;
  if (days >= 14) return 1;
  if (days >= 1) return 2;
  return 3;
}

function getConciseStatus(task: ScheduledMilestone): string {
  if (task.status === "completed") return "Done";
  if (task.isBlocked) return "Blocked";
  if (task.status === "in_progress") return "Needs finalization";
  return "Needs approval";
}

export const TaskDependencyGraph: React.FC = () => {
  const milestones = usePlannerStore((s) => s.milestones);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const eventTitle = usePlannerStore((s) => s.eventTitle);
  const cycleMilestoneStatus = usePlannerStore((s) => s.cycleMilestoneStatus);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<Record<string, { wa?: boolean; email?: boolean }>>({});

  const scheduled = useMemo(
    () => computeScheduledMilestones(milestones, eventDate),
    [milestones, eventDate]
  );

  // Organize nodes into 4 horizontal T-Minus stage columns with deterministic coordinates
  const { nodes, nodeMap, edges, svgHeight } = useMemo(() => {
    const cols: ScheduledMilestone[][] = [[], [], [], []];
    for (const t of scheduled) {
      cols[getStageColIndex(t.deadlineDaysBeforeEvent)].push(t);
    }

    const colCenters = [125, 365, 605, 845];
    const rowGap = 68;
    const topOffset = 56;
    const maxRows = Math.max(1, ...cols.map((c) => c.length));
    const calculatedHeight = Math.max(260, topOffset + maxRows * rowGap + 24);

    const computedNodes: GraphNode[] = [];
    const map = new Map<string, GraphNode>();

    cols.forEach((colTasks, colIdx) => {
      colTasks.forEach((task, rowIdx) => {
        const node: GraphNode = {
          task,
          colIndex: colIdx,
          rowIndex: rowIdx,
          x: colCenters[colIdx],
          y: topOffset + rowIdx * rowGap
        };
        computedNodes.push(node);
        map.set(task.id, node);
      });
    });

    const computedEdges: {
      id: string;
      from: GraphNode;
      to: GraphNode;
      isCompleted: boolean;
      isCritical: boolean;
    }[] = [];

    for (const node of computedNodes) {
      for (const depId of node.task.dependsOn) {
        const source = map.get(depId);
        if (source) {
          computedEdges.push({
            id: `${source.task.id}->${node.task.id}`,
            from: source,
            to: node,
            isCompleted: source.task.status === "completed",
            isCritical: node.task.urgency === "critical" || (node.task.delayMinutes ?? 0) > 0
          });
        }
      }
    }

    return {
      nodes: computedNodes,
      nodeMap: map,
      edges: computedEdges,
      svgHeight: calculatedHeight
    };
  }, [scheduled]);

  const selectedNode = selectedTaskId ? nodeMap.get(selectedTaskId) ?? null : null;

  // Determine connected IDs when a node is selected
  const connectedIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedTaskId) return set;
    set.add(selectedTaskId);
    for (const edge of edges) {
      if (edge.from.task.id === selectedTaskId) set.add(edge.to.task.id);
      if (edge.to.task.id === selectedTaskId) set.add(edge.from.task.id);
    }
    return set;
  }, [selectedTaskId, edges]);

  const handleTriggerWhatsApp = (task: ScheduledMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = TMinusAlertService.getInstance().triggerTaskWhatsApp(task, eventTitle);
    if (res.ok) {
      setSentFeedback((prev) => ({
        ...prev,
        [task.id]: { ...prev[task.id], wa: true }
      }));
    }
  };

  const handleTriggerEmail = (task: ScheduledMilestone, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = TMinusAlertService.getInstance().triggerTaskEmail(task, eventTitle);
    if (res.ok) {
      setSentFeedback((prev) => ({
        ...prev,
        [task.id]: { ...prev[task.id], email: true }
      }));
    }
  };

  const NODE_W = 196;
  const NODE_H = 48;

  return (
    <section
      aria-label="Task Dependency Graph"
      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3"
    >
      {/* Minimal Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Task Flow</h2>
          <span className="text-xs text-slate-500">
            {scheduled.length} connected · click any node for details
          </span>
        </div>

        {/* Concise Pastel Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          {(["venue", "catering", "decor", "photography", "logistics"] as const).map((cat) => {
            const p = CATEGORY_PASTEL[cat];
            return (
              <span key={cat} className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-xs ${p.badgeBg} border ${p.border}`} />
                <span>{p.name}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Horizontal SVG + Node Graph Canvas */}
      <div className="w-full overflow-x-auto border border-slate-100 rounded-lg bg-slate-50/50">
        <div className="min-w-[920px] relative">
          <svg
            viewBox={`0 0 970 ${svgHeight}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label="Interconnected wedding task dependency graph"
          >
            <defs>
              <marker
                id="arrow-done"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
              </marker>
              <marker
                id="arrow-pending"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Stage Column Headers */}
            {STAGE_COLUMNS.map((col, idx) => {
              const cx = [125, 365, 605, 845][idx];
              return (
                <g key={col.id}>
                  <line
                    x1={cx}
                    y1={36}
                    x2={cx}
                    y2={svgHeight - 12}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={18}
                    textAnchor="middle"
                    className="fill-slate-800 text-[11px] font-bold"
                  >
                    {col.label}
                  </text>
                  <text
                    x={cx}
                    y={31}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {col.range}
                  </text>
                </g>
              );
            })}

            {/* Dependency Bezier Edges */}
            {edges.map((edge) => {
              const isHighlighted =
                selectedTaskId &&
                (edge.from.task.id === selectedTaskId || edge.to.task.id === selectedTaskId);
              const isDimmed = selectedTaskId && !isHighlighted;

              const sameCol = edge.from.colIndex === edge.to.colIndex;
              let d = "";
              if (sameCol) {
                const startX = edge.from.x + NODE_W / 2;
                const startY = edge.from.y;
                const endX = edge.to.x + NODE_W / 2;
                const endY = edge.to.y;
                const curveOut = startX + 26;
                d = `M ${startX} ${startY} C ${curveOut} ${startY}, ${curveOut} ${endY}, ${endX} ${endY}`;
              } else {
                const startX = edge.from.x + NODE_W / 2;
                const startY = edge.from.y;
                const endX = edge.to.x - NODE_W / 2;
                const endY = edge.to.y;
                const midX = (startX + endX) / 2;
                d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
              }

              const strokeColor = isHighlighted
                ? "#0f172a"
                : edge.isCompleted
                ? "#10b981"
                : "#cbd5e1";

              const marker = isHighlighted
                ? "url(#arrow-active)"
                : edge.isCompleted
                ? "url(#arrow-done)"
                : "url(#arrow-pending)";

              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isHighlighted ? 2 : 1.4}
                  strokeOpacity={isDimmed ? 0.25 : 0.9}
                  markerEnd={marker}
                />
              );
            })}

            {/* Task Nodes */}
            {nodes.map((node) => {
              const { task, x, y } = node;
              const isSelected = selectedTaskId === task.id;
              const isConnected = connectedIds.has(task.id);
              const isDimmed = selectedTaskId && !isConnected;
              const statusText = getConciseStatus(task);
              const pastel = CATEGORY_PASTEL[task.category];

              // Map category to subtle SVG pastel fills
              const fillMap: Record<ScheduledMilestone["category"], { bg: string; stroke: string }> = {
                venue: { bg: "#f5f3ff", stroke: "#ddd6fe" },
                catering: { bg: "#fffbeb", stroke: "#fde68a" },
                decor: { bg: "#fdf2f8", stroke: "#fbcfe8" },
                photography: { bg: "#f0f9ff", stroke: "#bae6fd" },
                logistics: { bg: "#ecfdf5", stroke: "#a7f3d0" },
                miscellaneous: { bg: "#f8fafc", stroke: "#e2e8f0" }
              };
              const colors = fillMap[task.category];

              return (
                <g
                  key={task.id}
                  transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}
                  onClick={() =>
                    setSelectedTaskId((prev) => (prev === task.id ? null : task.id))
                  }
                  className="cursor-pointer transition-opacity"
                  style={{ opacity: isDimmed ? 0.35 : 1 }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={10}
                    fill={colors.bg}
                    stroke={isSelected ? "#0f172a" : colors.stroke}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  {/* Short Title */}
                  <text
                    x={10}
                    y={19}
                    className={`text-[11px] font-semibold ${
                      task.status === "completed" ? "fill-slate-500 line-through" : "fill-slate-900"
                    }`}
                  >
                    {task.title.length > 25 ? `${task.title.slice(0, 24)}…` : task.title}
                  </text>

                  {/* Concise Status + Timing */}
                  <text x={10} y={36} className="text-[10px] fill-slate-600">
                    {statusText} · T-{task.deadlineDaysBeforeEvent}d
                  </text>

                  {/* Category label on right */}
                  <text
                    x={NODE_W - 10}
                    y={36}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-slate-500"
                  >
                    {pastel.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Progressive Disclosure Detail Bar (Visible ONLY when a node is clicked) */}
      {selectedNode && (
        <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => cycleMilestoneStatus(selectedNode.task.id)}
                className="p-1 rounded border border-slate-300 bg-white text-slate-700 hover:border-slate-900"
                title="Toggle task status"
              >
                {selectedNode.task.status === "completed" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : selectedNode.task.isBlocked ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : selectedNode.task.status === "in_progress" ? (
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
              <span className="font-bold text-slate-900">{selectedNode.task.title}</span>
              <span className="text-slate-400">·</span>
              <span className="font-medium text-slate-700">
                {getConciseStatus(selectedNode.task)}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-600 tabular-nums">
                {selectedNode.task.timeSlot || `T-${selectedNode.task.deadlineDaysBeforeEvent}d`}
              </span>
              {selectedNode.task.vendorContact && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">
                    3rd-Party: <strong>{selectedNode.task.vendorContact.name}</strong> (
                    {resolveThirdPartyVendorEmail(
                      selectedNode.task.vendorContact,
                      selectedNode.task.category
                    )}
                    )
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {sentFeedback[selectedNode.task.id]?.wa && (
                <span className="text-[11px] font-medium text-emerald-700">WA Sent</span>
              )}
              {sentFeedback[selectedNode.task.id]?.email && (
                <span className="text-[11px] font-medium text-sky-700">Email Sent</span>
              )}

              <button
                type="button"
                onClick={(e) => handleTriggerWhatsApp(selectedNode.task, e)}
                aria-label={`WhatsApp vendor for ${selectedNode.task.title}`}
                title="Trigger 3rd-party WhatsApp notification"
                className="p-1.5 rounded-md bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleTriggerEmail(selectedNode.task, e)}
                aria-label={`Email 3rd-party vendor for ${selectedNode.task.title}`}
                title="Trigger 3rd-party vendor Email notification"
                className="p-1.5 rounded-md bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                aria-label="Close task details"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Vendor Communication Frequency & Activity Effectiveness Visualization */}
          <VendorActivityFrequencyChart
            vendorName={selectedNode.task.vendorContact?.name || `${selectedNode.task.category} Partner`}
            taskId={selectedNode.task.id}
          />
        </div>
      )}
    </section>
  );
};
