/**
 * Flowchart Task Card Component — Visual DAG node with status indicators, lead times and port terminals.
 */
import type { FC } from "react";
import { Lock } from "lucide-react";
import { MilestoneTask, PersonaLens } from "../../types/planner";

interface FlowchartTaskCardProps {
  task: MilestoneTask;
  isSelected: boolean;
  isHovered: boolean;
  isBottleneck: boolean;
  daysRemaining: number;
  persona: PersonaLens;
  taskMap: Map<string, MilestoneTask>;
  downstream: MilestoneTask[];
  onSelectNode: (taskId: string) => void;
  onMouseEnter: (taskId: string) => void;
  onMouseLeave: () => void;
}

export const FlowchartTaskCard: FC<FlowchartTaskCardProps> = ({
  task,
  isSelected,
  isHovered,
  isBottleneck,
  daysRemaining,
  persona,
  taskMap,
  downstream,
  onSelectNode,
  onMouseEnter,
  onMouseLeave
}) => {
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

  return (
    <div
      data-task-id={task.id}
      onClick={() => onSelectNode(task.id)}
      onMouseEnter={() => onMouseEnter(task.id)}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelectNode(task.id);
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

      <h4 className="text-xs font-bold text-slate-900 leading-snug mb-1">
        {task.title}
      </h4>

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
};
