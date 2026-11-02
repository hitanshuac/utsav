/**
 * Task prerequisite and downstream dependency inspection hub.
 */
import type { FC } from "react";
import { GitBranch, Table as TableIcon, Lock, CheckCircle, Zap } from "lucide-react";
import { MilestoneTask } from "../../types/planner";

interface FlowchartTaskDependenciesHubProps {
  selectedTask: MilestoneTask;
  taskMap: Map<string, MilestoneTask>;
  downstreamTasks: MilestoneTask[];
  onSwitchToTable: () => void;
  onCompletePrerequisite: (prereqId: string) => void;
  onStatusChange: (status: "pending" | "in_progress" | "completed") => void;
}

export const FlowchartTaskDependenciesHub: FC<FlowchartTaskDependenciesHubProps> = ({
  selectedTask,
  taskMap,
  downstreamTasks,
  onSwitchToTable,
  onCompletePrerequisite,
  onStatusChange
}) => {
  return (
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
          onClick={onSwitchToTable}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Switch to Milestone Table</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Prerequisite Gate */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
              <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Prerequisites ({selectedTask.dependsOn.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Must complete first</span>
          </div>

          {selectedTask.dependsOn.length === 0 ? (
            <div className="text-emerald-700 font-medium text-xs flex items-center gap-1.5 py-1">
              <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Root milestone: Zero blocking prerequisites</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedTask.dependsOn.map((prereqId) => {
                const prereq = taskMap.get(prereqId);
                const isDone = prereq?.status === "completed";
                return (
                  <div
                    key={prereqId}
                    className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {prereqId.toUpperCase()}
                      </span>
                      <span className="font-medium text-slate-800 text-xs">
                        {prereq?.title || prereqId}
                      </span>
                    </div>

                    {!isDone ? (
                      <button
                        type="button"
                        onClick={() => onCompletePrerequisite(prereqId)}
                        className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2.5 py-1 font-bold shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Mark Done</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        ✓ Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream Unlock Gate */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                <span>Downstream Dependents ({downstreamTasks.length})</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Unlocks when completed</span>
            </div>

            {downstreamTasks.length === 0 ? (
              <div className="text-slate-500 text-xs py-1">
                Leaf milestone: No downstream tasks depend on this
              </div>
            ) : (
              <div className="space-y-1.5">
                {downstreamTasks.map((downTask) => {
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
          </div>

          {selectedTask.status !== "completed" && downstreamTasks.length > 0 && (
            <button
              type="button"
              onClick={() => onStatusChange("completed")}
              className="mt-3 w-full utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 px-3 font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2 whitespace-normal break-words text-center leading-snug"
              title={`Complete '${selectedTask.title}' to unlock ${downstreamTasks.length} dependent milestone(s)`}
            >
              <CheckCircle className="w-4 h-4 shrink-0 text-white" />
              <span>Complete Milestone &amp; Unlock {downstreamTasks.length} Dependent Task(s)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
