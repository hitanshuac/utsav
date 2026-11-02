/**
 * Visual Dependency Flowchart Component — Interactive SVG DAG with delay cascades and vendor outreach.
 */
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { GitBranch, Table as TableIcon, Layers } from "lucide-react";
import { MilestoneTask, PersonaLens } from "../types/planner";
import { SupportedLanguage } from "../lib/i18n";
import { ActionDiffRow } from "./ActionDiffModal";
import { FlowchartSvgLines, SvgConnectionLine } from "./flowchart/FlowchartSvgLines";
import { FlowchartStageColumn } from "./flowchart/FlowchartStageColumn";
import { FlowchartCommunicationDrawer } from "./flowchart/FlowchartCommunicationDrawer";
import { FlowchartTableView } from "./flowchart/FlowchartTableView";
import { computeFlowchartStages, computeSvgConnections } from "./flowchart/flowchartLayout";
import { useFlowchartOutreach } from "../hooks/useFlowchartOutreach";

interface VisualDependencyFlowchartProps {
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  daysRemaining: number;
  eventTitle: string;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onActionTriggered?: (actionName: string, details: string, deltas?: ActionDiffRow[]) => void;
  language?: SupportedLanguage;
  persona?: PersonaLens;
}

export const VisualDependencyFlowchart: React.FC<VisualDependencyFlowchartProps> = ({
  milestones,
  topologicalOrder,
  bottlenecks,
  daysRemaining,
  eventTitle,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  language = "en",
  persona = "family_host"
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(milestones[0]?.id || null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"flowchart" | "table">("flowchart");
  const [focusedStageNumber, setFocusedStageNumber] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<SvgConnectionLine[]>([]);

  const taskMap = useMemo(() => {
    return new Map(milestones.map((m) => [m.id, m]));
  }, [milestones]);

  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) || null : null;

  const outreach = useFlowchartOutreach({
    selectedTask,
    milestones,
    eventTitle
  });

  const getDownstreamTasks = useCallback((taskId: string): MilestoneTask[] => {
    return milestones.filter((m) => m.dependsOn.includes(taskId));
  }, [milestones]);

  const stages = useMemo(() => {
    return computeFlowchartStages(milestones, taskMap);
  }, [milestones, taskMap]);

  const recalculateConnections = useCallback(() => {
    if (!innerContainerRef.current) return;
    const lines = computeSvgConnections(
      innerContainerRef.current,
      milestones,
      bottlenecks,
      selectedTaskId,
      hoveredTaskId,
      taskMap
    );
    setConnections(lines);
  }, [milestones, bottlenecks, selectedTaskId, hoveredTaskId, taskMap]);

  useEffect(() => {
    recalculateConnections();
    const animId = requestAnimationFrame(recalculateConnections);
    const timer = setTimeout(recalculateConnections, 80);

    const inner = innerContainerRef.current;
    if (!inner) return () => { cancelAnimationFrame(animId); clearTimeout(timer); };

    const resizeObserver = new ResizeObserver(() => recalculateConnections());
    resizeObserver.observe(inner);
    window.addEventListener("resize", recalculateConnections);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalculateConnections);
    };
  }, [recalculateConnections, viewMode]);

  const handleStatusChange = (newStatus: "pending" | "in_progress" | "completed") => {
    if (!selectedTask) return;
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(selectedTask.id, newStatus);
    } else {
      onCycleTaskStatus(selectedTask.id);
    }
  };

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progressPercent = Math.round((completedCount / (milestones.length || 1)) * 100);

  return (
    <section aria-labelledby="flowchart-heading" className="utsav-card">
      {/* Header Bar */}
      <div className="utsav-card-header">
        <div>
          <h2 id="flowchart-heading" className="utsav-card-title flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <span>Interactive Dependency Flowchart</span>
            <span className="text-xs font-normal text-slate-500 font-mono">
              (Kahn&apos;s Algorithm DAG)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Milestones ordered strictly by prerequisite dependencies. Click any node to inspect constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("flowchart")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Table</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
              {completedCount}/{milestones.length} Done ({progressPercent}%)
            </span>
            <span
              className={`utsav-badge ${
                bottlenecks.length > 0 ? "utsav-badge-critical" : "utsav-badge-ontrack"
              }`}
            >
              {bottlenecks.length > 0 ? `${bottlenecks.length} Bottlenecks` : "DAG Aligned"}
            </span>
          </div>
        </div>
      </div>

      {viewMode === "table" ? (
        <FlowchartTableView
          topologicalOrder={topologicalOrder}
          taskMap={taskMap}
          bottlenecks={bottlenecks}
          onCycleTaskStatus={onCycleTaskStatus}
        />
      ) : (
        <div
          ref={containerRef}
          tabIndex={0}
          aria-label="Interactive Milestone Dependency Graph"
          className="relative border border-slate-200 rounded-xl bg-slate-50 p-4 mb-4 overflow-x-auto min-h-[360px] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        >
          <div
            ref={innerContainerRef}
            className="relative flex gap-8 items-start min-w-[700px] pb-4"
          >
            <FlowchartSvgLines connections={connections} />

            {stages.map((stage) => (
              <FlowchartStageColumn
                key={stage.stageNumber}
                stage={stage}
                isStageFocused={focusedStageNumber === stage.stageNumber}
                focusedStageNumber={focusedStageNumber}
                bottlenecks={bottlenecks}
                selectedTaskId={selectedTaskId}
                hoveredTaskId={hoveredTaskId}
                daysRemaining={daysRemaining}
                persona={persona}
                taskMap={taskMap}
                getDownstreamTasks={getDownstreamTasks}
                onSelectNode={setSelectedTaskId}
                onHoverNode={setHoveredTaskId}
              />
            ))}
          </div>
        </div>
      )}

      {/* INSPECTOR & COMMUNICATION DRAWER */}
      {selectedTask && (
        <FlowchartCommunicationDrawer
          selectedTask={selectedTask}
          taskMap={taskMap}
          downstreamTasks={getDownstreamTasks(selectedTask.id)}
          activeDelayImpact={outreach.activeDelayImpact}
          activeChannel={outreach.activeChannel}
          activeTemplateType={outreach.activeTemplateType}
          customSubject={outreach.customSubject}
          customBody={outreach.customBody}
          dispatchFeedback={outreach.dispatchFeedback}
          language={language}
          onStatusChange={handleStatusChange}
          onSimulateDelay={outreach.handleSimulateDelay}
          onChannelChange={outreach.setActiveChannel}
          onTemplateChange={outreach.setActiveTemplateType}
          onSubjectChange={outreach.setCustomSubject}
          onBodyChange={outreach.setCustomBody}
          onDispatch={outreach.handleDispatch}
          onSwitchToTable={() => setViewMode("table")}
          onCompletePrerequisite={(prereqId) => {
            if (onUpdateTaskStatus) onUpdateTaskStatus(prereqId, "completed");
            else onCycleTaskStatus(prereqId);
          }}
        />
      )}
    </section>
  );
};
