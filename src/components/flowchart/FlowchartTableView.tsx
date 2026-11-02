/**
 * Flowchart Table View Component — Tabular representation of milestone DAG execution order and status.
 */
import type { FC } from "react";
import { CheckCircle, Lock } from "lucide-react";
import { MilestoneTask } from "../../types/planner";

interface FlowchartTableViewProps {
  topologicalOrder: string[];
  taskMap: Map<string, MilestoneTask>;
  bottlenecks: string[];
  onCycleTaskStatus: (taskId: string) => void;
}

export const FlowchartTableView: FC<FlowchartTableViewProps> = ({
  topologicalOrder,
  taskMap,
  bottlenecks,
  onCycleTaskStatus
}) => {
  return (
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
  );
};
