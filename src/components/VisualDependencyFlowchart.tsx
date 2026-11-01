import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  GitBranch,
  Lock,
  CheckCircle,
  Clock,
  Send,
  MessageSquare,
  Mail,
  Table as TableIcon,
  Layers,
  ChevronRight,
  ShieldAlert,
  Zap,
  Sparkles,
  Info
} from "lucide-react";
import { MilestoneTask, PersonaLens } from "../types/planner";
import { computeDelayCascade, DelayImpactSummary } from "../lib/engine/delay-cascade";
import {
  triggerWhatsAppNotification,
  triggerEmailNotification,
  resolveThirdPartyVendorEmail
} from "../lib/services/communication";
import {
  buildEditableTemplate,
  EdgeCaseTemplateType,
  logActivityEvent
} from "../lib/services/event-logger";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

interface VisualDependencyFlowchartProps {
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  daysRemaining: number;
  eventTitle: string;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onActionTriggered?: (actionName: string, details: string, deltas?: any[]) => void;
  language?: SupportedLanguage;
  persona?: PersonaLens;
}

interface StageColumn {
  stageNumber: number;
  title: string;
  subtitle: string;
  tasks: MilestoneTask[];
}

interface SvgConnectionLine {
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

export const VisualDependencyFlowchart: React.FC<VisualDependencyFlowchartProps> = ({
  milestones,
  topologicalOrder,
  bottlenecks,
  daysRemaining,
  eventTitle,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  onActionTriggered,
  language = "en",
  persona = "family_host"
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(milestones[0]?.id || null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [activeDelayImpact, setActiveDelayImpact] = useState<DelayImpactSummary | null>(null);
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [activeTemplateType, setActiveTemplateType] = useState<EdgeCaseTemplateType>("standard");
  const [customBody, setCustomBody] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"flowchart" | "table">("flowchart");
  const [focusedStageNumber, setFocusedStageNumber] = useState<number | null>(null);

  const flowContainerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<SvgConnectionLine[]>([]);

  // Map of tasks for O(1) lookup
  const taskMap = useMemo(() => {
    const map = new Map<string, MilestoneTask>();
    milestones.forEach((m) => map.set(m.id, m));
    return map;
  }, [milestones]);

  // Selected task
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) || null : null;

  // Topological Stages Partitioning (Kahn's DAG depth)
  const stages: StageColumn[] = useMemo(() => {
    const depthMap = new Map<string, number>();

    const getDepth = (id: string, visited: Set<string> = new Set()): number => {
      if (depthMap.has(id)) return depthMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);

      const task = taskMap.get(id);
      if (!task || task.dependsOn.length === 0) {
        depthMap.set(id, 0);
        return 0;
      }

      let maxParentDepth = 0;
      for (const pId of task.dependsOn) {
        maxParentDepth = Math.max(maxParentDepth, getDepth(pId, new Set(visited)) + 1);
      }
      depthMap.set(id, maxParentDepth);
      return maxParentDepth;
    };

    milestones.forEach((m) => getDepth(m.id));

    const s0: MilestoneTask[] = [];
    const s1: MilestoneTask[] = [];
    const s2: MilestoneTask[] = [];
    const s3: MilestoneTask[] = [];

    milestones.forEach((m) => {
      const d = depthMap.get(m.id) || 0;
      if (d === 0) s0.push(m);
      else if (d === 1) s1.push(m);
      else if (d === 2) s2.push(m);
      else s3.push(m);
    });

    return [
      {
        stageNumber: 1,
        title: "STAGE 1: FOUNDATION",
        subtitle: "Venue & Prerequisites",
        tasks: s0
      },
      {
        stageNumber: 2,
        title: "STAGE 2: CORE EXPERIENCE",
        subtitle: "Catering, Decor & AV",
        tasks: s1
      },
      {
        stageNumber: 3,
        title: "STAGE 3: CREW & LOGISTICS",
        subtitle: "Technical & Soundcheck",
        tasks: s2
      },
      {
        stageNumber: 4,
        title: "STAGE 4: EXECUTION",
        subtitle: "Final Handover & Event Kickoff",
        tasks: s3
      }
    ];
  }, [milestones, taskMap]);

  // Compute SVG physical node-to-node bezier connector coordinates relative to innerContainerRef
  const recalculateConnections = useCallback(() => {
    const inner = innerContainerRef.current;
    if (!inner) return;

    const iRect = inner.getBoundingClientRect();
    const lines: SvgConnectionLine[] = [];

    milestones.forEach((task) => {
      task.dependsOn.forEach((prereqId) => {
        const fromPort = inner.querySelector(`[data-port-out="${prereqId}"]`);
        const toPort = inner.querySelector(`[data-port-in="${task.id}"]`);

        if (fromPort && toPort) {
          const fRect = fromPort.getBoundingClientRect();
          const tRect = toPort.getBoundingClientRect();

          const x1 = fRect.left + fRect.width / 2 - iRect.left;
          const y1 = fRect.top + fRect.height / 2 - iRect.top;
          const x2 = tRect.left + tRect.width / 2 - iRect.left;
          const y2 = tRect.top + tRect.height / 2 - iRect.top;

          const prereqTask = taskMap.get(prereqId);
          const isCompleted = prereqTask?.status === "completed";
          const isBlocked = bottlenecks.includes(task.id) || !isCompleted;
          const isActive =
            selectedTaskId === prereqId ||
            selectedTaskId === task.id ||
            hoveredTaskId === prereqId ||
            hoveredTaskId === task.id;

          lines.push({
            id: `${prereqId}->${task.id}`,
            fromId: prereqId,
            toId: task.id,
            x1,
            y1,
            x2,
            y2,
            isCompleted,
            isBlocked,
            isActive
          });
        }
      });
    });

    setConnections(lines);
  }, [milestones, bottlenecks, selectedTaskId, hoveredTaskId, taskMap]);

  // Recalculate on mount, selection, resize
  useEffect(() => {
    recalculateConnections();
    const animId = requestAnimationFrame(recalculateConnections);
    const timer = setTimeout(recalculateConnections, 80);

    const inner = innerContainerRef.current;
    if (!inner) return () => { cancelAnimationFrame(animId); clearTimeout(timer); };

    const resizeObserver = new ResizeObserver(() => {
      recalculateConnections();
    });
    resizeObserver.observe(inner);

    window.addEventListener("resize", recalculateConnections);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalculateConnections);
    };
  }, [recalculateConnections, viewMode]);

  // Synchronize message body when selected task or template changes
  useEffect(() => {
    if (!selectedTask) return;

    const template = buildEditableTemplate(
      selectedTask,
      activeChannel,
      activeTemplateType,
      eventTitle
    );

    setCustomBody(template.body);
    setCustomSubject(template.subject);
  }, [selectedTaskId, activeTemplateType, activeChannel, selectedTask, eventTitle]);

  const handleSelectNode = (taskId: string) => {
    setSelectedTaskId(taskId);
    setActiveDelayImpact(null);
    setDispatchFeedback(null);

    const task = taskMap.get(taskId);
    if (task) {
      logActivityEvent({
        taskId: task.id,
        taskTitle: `Inspected Node: ${task.title}`,
        category: task.category,
        channel: "system",
        vendorName: task.vendorContact?.name || "Deterministic Engine",
        recipient: "Coordinator Ops",
        summary: `Inspected milestone ${task.id.toUpperCase()}: "${task.title}". Status: ${task.status}. Lead time: ${task.leadTimeDays || task.deadlineDaysBeforeEvent}d.`,
        loopStatus: "closed"
      });
    }
  };

  const handleStatusChange = (status: "pending" | "in_progress" | "completed") => {
    if (!selectedTaskId) return;
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(selectedTaskId, status);
    } else {
      onCycleTaskStatus(selectedTaskId);
    }
  };

  const handleSimulateDelay = (minutes: number) => {
    if (!selectedTaskId) return;
    const impact = computeDelayCascade(milestones, selectedTaskId, minutes);
    setActiveDelayImpact(impact);

    logActivityEvent({
      taskId: selectedTaskId,
      taskTitle: `Simulated +${minutes}m Delay Cascade`,
      category: selectedTask?.category || "logistics",
      channel: "system",
      vendorName: selectedTask?.vendorContact?.name || "Deterministic Engine",
      recipient: "Operations Bridge",
      summary: `Simulated +${minutes}m delay on ${selectedTaskId.toUpperCase()}: ${impact.downstreamAffectedTasks.length} downstream tasks affected. ${impact.criticalMuhuratAtRisk ? "CRITICAL SCHEDULE AT RISK." : "Buffer absorbed delay."}`,
      loopStatus: "closed"
    });

    if (onActionTriggered && selectedTask) {
      onActionTriggered(
        `⚡ Simulated +${minutes}m Delay Cascade`,
        impact.riskMessage || `Simulated +${minutes}m delay.`,
        [
          {
            label: "Delay Added",
            before: "0 mins",
            after: `+${minutes} mins`,
            diff: `+${minutes}m`
          },
          {
            label: "Downstream Tasks Impacted",
            before: "0",
            after: `${impact.downstreamAffectedTasks.length}`,
            diff: `${impact.downstreamAffectedTasks.length} tasks`
          },
          {
            label: "Event Schedule",
            before: "On-Track",
            after: impact.criticalMuhuratAtRisk ? "AT RISK (Schedule Delayed)" : "Safe (Buffer Absorbed)",
            diff: impact.criticalMuhuratAtRisk ? "Delayed" : "Safe"
          }
        ]
      );
    }
  };

  const handleDispatch = () => {
    if (!selectedTask) return;

    const vendorPhone = selectedTask.vendorContact?.phone || "+919876543210";
    const vendorEmail = resolveThirdPartyVendorEmail(selectedTask.vendorContact);
    const vendorName = selectedTask.vendorContact?.name || "Assigned Partner";

    if (activeChannel === "whatsapp") {
      triggerWhatsAppNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        phone: vendorPhone,
        vendorName,
        message: customBody
      });
      setDispatchFeedback(`Dispatched WhatsApp template to ${vendorName} (${vendorPhone}).`);
    } else {
      triggerEmailNotification({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        category: selectedTask.category,
        to: vendorEmail,
        vendorName,
        subject: customSubject,
        body: customBody
      });
      setDispatchFeedback(`Dispatched RFC 5322 Email template to ${vendorName} (${vendorEmail}).`);
    }

    logActivityEvent({
      taskId: selectedTask.id,
      taskTitle: `Vendor Communication: ${selectedTask.title}`,
      category: selectedTask.category,
      channel: activeChannel,
      vendorName,
      recipient: activeChannel === "whatsapp" ? vendorPhone : vendorEmail,
      summary: `Dispatched ${activeTemplateType} template via ${activeChannel.toUpperCase()} to ${vendorName}: "${customBody.slice(0, 80)}..."`,
      loopStatus: "closed"
    });

    if (onActionTriggered) {
      onActionTriggered(
        `Dispatched Vendor Outreach (${activeChannel.toUpperCase()})`,
        `Negotiation message sent to ${vendorName}. Immutable activity event logged.`,
        [
          {
            label: "Recipient",
            before: "—",
            after: `${vendorName} (${activeChannel === "whatsapp" ? vendorPhone : vendorEmail})`,
            diff: "Contacted"
          },
          {
            label: "Channel",
            before: "Draft",
            after: activeChannel.toUpperCase(),
            diff: "Sent"
          },
          {
            label: "Edge-Case Template",
            before: "—",
            after: activeTemplateType,
            diff: "Active"
          }
        ]
      );
    }
  };

  // Find downstream tasks that depend on a given task
  const getDownstreamTasks = (taskId: string): MilestoneTask[] => {
    return milestones.filter((m) => m.dependsOn.includes(taskId));
  };

  return (
    <section aria-labelledby="visual-flowchart-title" className="utsav-card">
      {/* Header with View Toggle */}
      <div className="utsav-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="visual-flowchart-title" className="utsav-card-title flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <span>{t.flowchartTitle}</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              ({t.flowchartKahnDag})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Flowchart vs Table toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setViewMode("flowchart")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "flowchart"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Flowchart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
          </div>

          {bottlenecks.length > 0 && (
            <span className="utsav-badge utsav-badge-timeline font-mono text-[10px]">
              {bottlenecks.length} Bottleneck(s)
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        {t.flowchartSubtitle}
      </p>

      {/* SOLID-SURFACE CONNECTION STATUS LEGEND BAR */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 mb-3.5 flex items-center gap-4 text-[11px] font-mono flex-wrap">
        <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">Flow Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span className="text-slate-700 font-semibold">Completed Prerequisite (Solid Green)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
          <span className="text-rose-800 font-semibold">Blocked / Bottleneck (Dashed Red)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          <span className="text-indigo-800 font-semibold">Active Node / Trace (Glowing Indigo)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
          <span className="text-slate-600">Pending Sequence (Dotted Slate)</span>
        </div>
      </div>

      {/* OVERARCHING STAGE PROGRESSION TRACK (CLICK TO FOCUS ZONE) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 mb-3 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px] gap-2">
          {stages.map((stage, idx) => {
            const allCompleted = stage.tasks.length > 0 && stage.tasks.every((t) => t.status === "completed");
            const hasBlocked = stage.tasks.some((t) => bottlenecks.includes(t.id));
            const isFocused = focusedStageNumber === stage.stageNumber;
            return (
              <React.Fragment key={stage.stageNumber}>
                <button
                  type="button"
                  onClick={() => setFocusedStageNumber(isFocused ? null : stage.stageNumber)}
                  className={`flex items-center gap-2 flex-1 min-w-0 p-1.5 rounded-lg text-left transition-all cursor-pointer ${
                    isFocused
                      ? "bg-indigo-100 border border-indigo-300 ring-2 ring-indigo-400/30"
                      : "hover:bg-slate-100"
                  }`}
                  aria-pressed={isFocused}
                  title={`Click to focus on ${stage.title}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      allCompleted
                        ? "bg-emerald-600 text-white"
                        : hasBlocked
                        ? "bg-rose-600 text-white"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    {allCompleted ? "✓" : stage.stageNumber}
                  </span>
                  <div className="truncate">
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {stage.title.replace(/^STAGE \d+:\s*/, "")}
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate font-mono">
                      {stage.tasks.length} task(s) · {stage.subtitle}
                    </span>
                  </div>
                </button>
                {idx < stages.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mx-1" aria-hidden="true" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STAGE ZONE FOCUS QUICK-ACTION BANNER (INTERACTIVE ZONE EXPANSION) */}
      {focusedStageNumber !== null && (() => {
        const fStage = stages.find((s) => s.stageNumber === focusedStageNumber);
        if (!fStage) return null;
        const stageTasks = fStage.tasks;
        const completedCount = stageTasks.filter((t) => t.status === "completed").length;
        const blockedTasks = stageTasks.filter((t) => {
          return t.status !== "completed" && t.dependsOn.some((pId) => taskMap.get(pId)?.status !== "completed");
        });
        const uncompletedPrereqIds = Array.from(
          new Set(
            stageTasks.flatMap((t) =>
              t.dependsOn.filter((pId) => taskMap.get(pId)?.status !== "completed")
            )
          )
        );

        return (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    {fStage.title} · Focused Zone
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded">
                    {completedCount}/{stageTasks.length} Completed
                  </span>
                  {blockedTasks.length > 0 && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded">
                      {blockedTasks.length} Blocked Task(s)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-900 mt-0.5">
                  {fStage.subtitle} · {blockedTasks.length > 0 ? `Waiting on prerequisite tasks: ${uncompletedPrereqIds.map((p) => p.toUpperCase()).join(", ")}.` : "All milestones in this stage are clear and on schedule."}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {uncompletedPrereqIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      uncompletedPrereqIds.forEach((pId) => {
                        if (onUpdateTaskStatus) onUpdateTaskStatus(pId, "completed");
                        else onCycleTaskStatus(pId);
                      });
                    }}
                    className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Resolve {uncompletedPrereqIds.length} Blocker(s)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="utsav-btn bg-white hover:bg-slate-100 border border-indigo-300 text-indigo-900 text-xs px-2.5 py-1.5 font-semibold cursor-pointer shadow-xs"
                >
                  📋 Open Table View
                </button>
                <button
                  type="button"
                  onClick={() => setFocusedStageNumber(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                >
                  [Clear Focus]
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* VIEW 1: INTERACTIVE VISUAL FLOWCHART WITH DYNAMIC SVG BEZIER CONNECTIONS */}
      {viewMode === "flowchart" && (
        <div className="space-y-4">
          {/* Scrollable Stage-by-Stage Graph Container */}
          <div
            ref={flowContainerRef}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-x-auto relative shadow-xs"
            style={{ minHeight: "440px" }}
          >
            <div ref={innerContainerRef} className="relative min-w-[840px] w-full">
              {/* Dynamic SVG Connection Overlay */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 1 }}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="dag-arrow-completed"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                  </marker>
                  <marker
                    id="dag-arrow-blocked"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#dc2626" />
                  </marker>
                  <marker
                    id="dag-arrow-active"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4f46e5" />
                  </marker>
                  <marker
                    id="dag-arrow-pending"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#94a3b8" />
                  </marker>
                </defs>

                {/* Render background inactive lines */}
                {connections
                  .filter((c) => !c.isActive)
                  .map((conn) => {
                    const dx = Math.max((conn.x2 - conn.x1) * 0.45, 24);
                    const pathD = `M ${conn.x1} ${conn.y1} C ${conn.x1 + dx} ${conn.y1}, ${conn.x2 - dx} ${conn.y2}, ${conn.x2} ${conn.y2}`;

                    if (conn.isBlocked) {
                      return (
                        <path
                          key={conn.id}
                          d={pathD}
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                          markerEnd="url(#dag-arrow-blocked)"
                        />
                      );
                    }

                    if (conn.isCompleted) {
                      return (
                        <path
                          key={conn.id}
                          d={pathD}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2"
                          markerEnd="url(#dag-arrow-completed)"
                        />
                      );
                    }

                    return (
                      <path
                        key={conn.id}
                        d={pathD}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        markerEnd="url(#dag-arrow-pending)"
                      />
                    );
                  })}

                {/* Render highlighted active lines on top with bold stroke and glowing halo */}
                {connections
                  .filter((c) => c.isActive)
                  .map((conn) => {
                    const dx = Math.max((conn.x2 - conn.x1) * 0.45, 24);
                    const pathD = `M ${conn.x1} ${conn.y1} C ${conn.x1 + dx} ${conn.y1}, ${conn.x2 - dx} ${conn.y2}, ${conn.x2} ${conn.y2}`;

                    return (
                      <g key={`active-${conn.id}`}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#e0e7ff"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          markerEnd="url(#dag-arrow-active)"
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* 4 Stage Columns Grid with Stage Focus Support */}
              <div className="grid grid-cols-4 gap-4 relative z-10">
                {stages.map((stage) => {
                  const isStageFocused = focusedStageNumber === stage.stageNumber;
                  return (
                    <div
                      key={stage.stageNumber}
                      className={`flex flex-col gap-3 min-w-[210px] relative transition-opacity ${
                        focusedStageNumber !== null && !isStageFocused ? "opacity-60 hover:opacity-100" : ""
                      }`}
                    >
                      {/* Stage Header */}
                      <div
                        className={`border rounded-lg p-2.5 shadow-xs transition-colors ${
                          isStageFocused
                            ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase text-slate-800 tracking-wider">
                            {stage.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {stage.tasks.length} task(s)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{stage.subtitle}</span>
                      </div>

                      {/* Nodes in this Stage */}
                      <div className="flex flex-col gap-3 flex-1">
                        {stage.tasks.length === 0 ? (
                          <div className="text-[11px] text-slate-400 py-6 text-center italic bg-white border border-dashed border-slate-200 rounded-xl">
                            No milestones in this stage
                          </div>
                        ) : (
                          stage.tasks.map((task) => {
                            const isSelected = selectedTaskId === task.id;
                            const isHovered = hoveredTaskId === task.id;
                            const isBottleneck = bottlenecks.includes(task.id);
                            const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                              const parent = taskMap.get(pId);
                              return parent && parent.status !== "completed";
                            });
                            const allPrereqsDone =
                              task.dependsOn.length > 0 &&
                              task.dependsOn.every((pId) => taskMap.get(pId)?.status === "completed");

                            const isCriticalPathAlert =
                              isBottleneck ||
                              hasUncompletedPrereq ||
                              (task.urgency === "critical" && task.status !== "completed") ||
                              ((task.leadTimeDays ?? task.deadlineDaysBeforeEvent) > daysRemaining && task.status !== "completed");

                            const downstream = getDownstreamTasks(task.id);

                            return (
                              <div
                                key={task.id}
                                data-task-id={task.id}
                                onClick={() => handleSelectNode(task.id)}
                                onMouseEnter={() => setHoveredTaskId(task.id)}
                                onMouseLeave={() => setHoveredTaskId(null)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") handleSelectNode(task.id);
                                }}
                                className={`relative z-10 cursor-pointer rounded-xl p-3 border transition-all text-left shadow-xs ${
                                  isSelected
                                    ? "border-2 border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-md"
                                    : isCriticalPathAlert
                                    ? "border-2 border-rose-400 bg-rose-50/50 hover:border-rose-500 shadow-xs"
                                    : isHovered
                                    ? "border-indigo-400 bg-white shadow-xs"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                {/* Input Port Anchor Dot (Left Terminal) */}
                                {task.dependsOn.length > 0 && (
                                  <span
                                    data-port-in={task.id}
                                    className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs z-20 ${
                                      hasUncompletedPrereq || isBottleneck
                                        ? "bg-rose-600"
                                        : allPrereqsDone
                                        ? "bg-emerald-600"
                                        : "bg-slate-400"
                                    }`}
                                    title={`Prerequisite input terminal (Requires: ${task.dependsOn.join(", ")})`}
                                  />
                                )}

                                {/* Output Port Anchor Dot (Right Terminal) */}
                                {downstream.length > 0 && (
                                  <span
                                    data-port-out={task.id}
                                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-xs z-20 ${
                                      task.status === "completed"
                                        ? "bg-emerald-600"
                                        : isSelected
                                        ? "bg-indigo-600"
                                        : "bg-indigo-400"
                                    }`}
                                    title={`Downstream output terminal (Unlocks: ${downstream.map((d) => d.id).join(", ")})`}
                                  />
                                )}

                                {/* Node Title & Badges */}
                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {isCriticalPathAlert && (
                                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
                                    )}
                                    <span className="text-[10px] font-mono font-bold text-slate-500">
                                      {task.id.toUpperCase()}
                                    </span>
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold bg-slate-100 text-slate-600">
                                  {task.category}
                                </span>

                                {/* Role Lens Tailored Badge */}
                                {persona === "family_host" && task.category === "catering" && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    👑 Host Priority: Feast
                                  </span>
                                )}
                                {persona === "family_host" && task.category === "venue" && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    👑 Host Essential
                                  </span>
                                )}
                                {persona === "wedding_coordinator" && isCriticalPathAlert && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                    ⚡ Coordinator SLA
                                  </span>
                                )}
                                {persona === "community_organizer" &&
                                  (task.category === "logistics" ||
                                    task.title.toLowerCase().includes("permit") ||
                                    task.title.toLowerCase().includes("noc")) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                      🛡️ Civic Safety
                                    </span>
                                  )}
                              </div>

                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ${
                                  task.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : task.status === "in_progress"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {task.status.replace("_", " ")}
                              </span>
                            </div>

                            <h3 className="text-xs font-bold text-slate-900 leading-snug mb-1">
                              {task.title}
                            </h3>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                              <span>Lead: {task.leadTimeDays || task.deadlineDaysBeforeEvent}d</span>
                              {hasUncompletedPrereq && (
                                <span className="text-red-700 flex items-center gap-0.5 font-sans font-bold">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Blocked</span>
                                </span>
                              )}
                            </div>

                            {/* Explicit Visual Dependency Badges */}
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1 text-[9px] font-mono">
                              {task.dependsOn.length > 0 ? (
                                <div className="flex items-center gap-1 text-slate-600 flex-wrap">
                                  <span className="text-slate-400">Requires:</span>
                                  {task.dependsOn.map((pId) => {
                                    const pTask = taskMap.get(pId);
                                    const isPrereqDone = pTask?.status === "completed";
                                    return (
                                      <span
                                        key={pId}
                                        className={`px-1 rounded font-bold ${
                                          isPrereqDone
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-red-50 text-red-700 border border-red-300"
                                        }`}
                                      >
                                        {pId.toUpperCase()} {isPrereqDone ? "✓" : "🔒"}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-slate-400">Root Milestone (No Prereqs)</div>
                              )}

                              {downstream.length > 0 && (
                                <div className="flex items-center gap-1 text-indigo-700 flex-wrap">
                                  <span className="text-slate-400">Unlocks:</span>
                                  {downstream.map((d) => (
                                    <span
                                      key={d.id}
                                      className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 rounded font-bold"
                                    >
                                      {d.id.toUpperCase()} →
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

          {/* INTERACTIVE NODE INSPECTION & EXECUTION PANEL */}
          {selectedTask && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {selectedTask.id.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedTask.title}</h3>
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      Category: {selectedTask.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Lead Time: <strong>{selectedTask.leadTimeDays || selectedTask.deadlineDaysBeforeEvent} days</strong> ·
                    Vendor: <strong>{selectedTask.vendorContact?.name || "Assigned Partner"}</strong>
                  </div>
                </div>

                {/* Status Toggle Switcher */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
                  <span className="text-[11px] font-semibold text-slate-500 px-2">Status:</span>
                  {(["pending", "in_progress", "completed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors capitalize cursor-pointer ${
                        selectedTask.status === st
                          ? st === "completed"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : st === "in_progress"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "bg-slate-800 text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* PREREQUISITE & DOWNSTREAM INTERDEPENDENCY HUB (1-CLICK BLOCKER RESOLUTION) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Dependency Sequence &amp; Execution Gate
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>View in Full Milestone Table →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Upstream Prerequisites */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                      Upstream Prerequisites:
                    </span>
                    {selectedTask.dependsOn.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Root Milestone — No upstream dependencies required.</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedTask.dependsOn.map((pId) => {
                          const pTask = taskMap.get(pId);
                          const isDone = pTask?.status === "completed";
                          return (
                            <div
                              key={pId}
                              className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isDone
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                  : "bg-rose-50 border-rose-300 text-rose-950"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {isDone ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                    <span>{pTask?.title || pId}</span>
                                    <span className="text-[10px] font-mono px-1 rounded bg-white/70 border">
                                      {pId.toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-600 block">
                                    Status: <strong>{pTask?.status.replace("_", " ") || "unknown"}</strong> · Lead: {pTask?.leadTimeDays || pTask?.deadlineDaysBeforeEvent}d
                                  </span>
                                </div>
                              </div>

                              {!isDone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateTaskStatus) {
                                      onUpdateTaskStatus(pId, "completed");
                                    } else {
                                      onCycleTaskStatus(pId);
                                    }
                                  }}
                                  className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1.5 font-bold shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>Resolve Blocker: Complete Prereq</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Downstream Unlocked Milestones */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block mb-2">
                      Downstream Unlocked Tasks:
                    </span>
                    {getDownstreamTasks(selectedTask.id).length === 0 ? (
                      <span className="text-slate-500 italic text-xs">
                        Terminal Milestone — Final stage deliverable.
                      </span>
                    ) : (
                      <div className="space-y-2">
                        {getDownstreamTasks(selectedTask.id).map((downTask) => {
                          const isDownDone = downTask.status === "completed";
                          return (
                            <div
                              key={downTask.id}
                              className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  {downTask.id.toUpperCase()}
                                </span>
                                <span className="font-semibold text-slate-800 text-xs">
                                  {downTask.title}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                  isDownDone
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {downTask.status.replace("_", " ")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedTask.status !== "completed" && getDownstreamTasks(selectedTask.id).length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("completed")}
                        className="mt-3 w-full utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 px-3 font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 whitespace-normal break-words text-center leading-snug"
                        title={`Complete '${selectedTask.title}' to unlock ${getDownstreamTasks(selectedTask.id).length} dependent milestone(s)`}
                      >
                        <CheckCircle className="w-4 h-4 shrink-0 text-white" />
                        <span>Complete Milestone &amp; Unlock {getDownstreamTasks(selectedTask.id).length} Dependent Task(s)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-Panels: Delay Cascade & Vendor Outreach (Clean Roomy Layout) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Delay Cascade Simulator */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                        <span>{t.flowchartDelayCascade}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">BFS Graph Traversal</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      Simulate schedule delays on this milestone to forecast downstream impact on event proceedings, guest arrivals, and vendor handovers.
                    </p>

                    {/* Delay Buttons with Responsive Grid and No Overflow */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(30)}
                        className="utsav-btn bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
                      >
                        {t.flowchartSimulate30m}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateDelay(60)}
                        className="utsav-btn bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs px-3 py-2 font-semibold text-center whitespace-normal leading-tight shadow-xs cursor-pointer"
                      >
                        {t.flowchartSimulate60m}
                      </button>
                    </div>

                    {/* Delay Impact Output */}
                    {activeDelayImpact && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-900 font-bold">
                            Cascade Results (+{activeDelayImpact.delayMinutes} mins):
                          </strong>
                          {activeDelayImpact.criticalMuhuratAtRisk && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded uppercase">
                              Schedule at Risk
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 leading-snug">{activeDelayImpact.riskMessage}</p>
                        {activeDelayImpact.downstreamAffectedTasks.length > 0 && (
                          <div className="text-[11px] text-slate-600 mt-1">
                            <strong>Affected Downstream:</strong>{" "}
                            {activeDelayImpact.downstreamAffectedTasks.map((t) => t.title).join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Vendor Communication & 4 Editable Templates */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>{t.flowchartVendorOutreach}</span>
                      </h4>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setActiveChannel("whatsapp")}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            activeChannel === "whatsapp"
                              ? "bg-emerald-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChannel("email")}
                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                            activeChannel === "email"
                              ? "bg-blue-600 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Email
                        </button>
                      </div>
                    </div>

                    {/* 4 Template Buttons with Clean Wrapping */}
                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                      {[
                        { id: "standard" as const, label: "Standard Lock" },
                        { id: "delay_30m" as const, label: "+30m Delay" },
                        { id: "budget_surge" as const, label: "+15% Surge Buffer" },
                        { id: "backup_sos" as const, label: "Emergency SOS" }
                      ].map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setActiveTemplateType(tmpl.id)}
                          className={`text-[10px] px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                            activeTemplateType === tmpl.id
                              ? "bg-slate-900 text-white font-semibold"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {tmpl.label}
                        </button>
                      ))}
                    </div>

                    {/* Editable Message Box */}
                    {activeChannel === "email" && (
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Email Subject"
                        className="utsav-input text-xs font-mono mb-1.5 py-1"
                        aria-label="Email Subject"
                      />
                    )}
                    <textarea
                      rows={3}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="utsav-input text-xs font-mono resize-y mb-2"
                      aria-label="Editable vendor message content"
                    />

                    {dispatchFeedback && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 mb-2">
                        {dispatchFeedback}
                      </div>
                    )}
                  </div>

                  {/* Dispatch Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleDispatch}
                      className={`utsav-btn text-xs px-3.5 py-2 font-semibold text-white shadow-xs flex items-center gap-1.5 cursor-pointer ${
                        activeChannel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {activeChannel === "whatsapp" ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.flowchartDispatchWhatsapp}</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Dispatch via 3rd-Party Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TABULAR VIEW (TOPOLOGICAL ORDER) */}
      {viewMode === "table" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Order</th>
                <th className="py-2.5 px-3">Milestone Title</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">Prerequisites</th>
                <th className="py-2.5 px-3 text-right">Status Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topologicalOrder.map((id, idx) => {
                const task = taskMap.get(id);
                if (!task) return null;
                const isBottleneck = bottlenecks.includes(task.id);
                const hasUncompletedPrereq = task.dependsOn.some((pId) => {
                  const parent = taskMap.get(pId);
                  return parent && parent.status !== "completed";
                });

                return (
                  <tr
                    key={task.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isBottleneck ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {isBottleneck && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
                        )}
                        <span>{task.title}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-slate-600">
                      {task.category}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {task.leadTimeDays || task.deadlineDaysBeforeEvent}d
                    </td>
                    <td className="py-2.5 px-3">
                      {task.dependsOn.length > 0 ? (
                        <span className="text-[11px] font-mono text-slate-600">
                          {task.dependsOn.join(", ")}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">None (Root)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onCycleTaskStatus(task.id)}
                        className={`utsav-btn text-xs px-2.5 py-1 font-semibold cursor-pointer ${
                          task.status === "completed"
                            ? "utsav-badge-ontrack border-emerald-300"
                            : task.status === "in_progress"
                            ? "utsav-badge-timeline border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {task.status === "completed" && <CheckCircle className="w-3 h-3" />}
                        {task.status === "pending" && hasUncompletedPrereq && (
                          <Lock className="w-3 h-3 text-red-600" />
                        )}
                        <span className="capitalize">{task.status.replace("_", " ")}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default VisualDependencyFlowchart;
