/**
 * Flowchart Stage Column Component — Renders a single stage header and its task cards.
 */
import type { FC } from "react";
import { MilestoneTask, PersonaLens } from "../../types/planner";
import { StageColumn } from "./flowchartLayout";
import { FlowchartTaskCard } from "./FlowchartTaskCard";

interface FlowchartStageColumnProps {
  stage: StageColumn;
  isStageFocused: boolean;
  focusedStageNumber: number | null;
  selectedTaskId: string | null;
  hoveredTaskId: string | null;
  bottlenecks: string[];
  daysRemaining: number;
  persona: PersonaLens;
  taskMap: Map<string, MilestoneTask>;
  getDownstreamTasks: (id: string) => MilestoneTask[];
  onSelectNode: (id: string) => void;
  onHoverNode: (id: string | null) => void;
}

export const FlowchartStageColumn: FC<FlowchartStageColumnProps> = ({
  stage,
  isStageFocused,
  focusedStageNumber,
  selectedTaskId,
  hoveredTaskId,
  bottlenecks,
  daysRemaining,
  persona,
  taskMap,
  getDownstreamTasks,
  onSelectNode,
  onHoverNode
}) => {
  return (
    <div
      className={`flex flex-col gap-3 min-w-[210px] relative transition-opacity ${
        focusedStageNumber !== null && !isStageFocused ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
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

      <div className="flex flex-col gap-3 flex-1">
        {stage.tasks.map((task) => (
          <FlowchartTaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            isHovered={hoveredTaskId === task.id}
            isBottleneck={bottlenecks.includes(task.id)}
            daysRemaining={daysRemaining}
            persona={persona}
            taskMap={taskMap}
            downstream={getDownstreamTasks(task.id)}
            onSelectNode={onSelectNode}
            onMouseEnter={onHoverNode}
            onMouseLeave={() => onHoverNode(null)}
          />
        ))}
      </div>
    </div>
  );
};
