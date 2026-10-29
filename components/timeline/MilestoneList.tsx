import React, { useState } from "react";
import {
  Lock,
  CheckCircle2,
  Clock,
  Circle,
  Plus,
  ArrowUpRight
} from "lucide-react";
import { computeScheduledMilestones, ScheduledMilestone } from "../../lib/engine/dependency-graph";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { EventCategory, MilestoneTask } from "../../lib/types";
import { CalendarExport } from "./CalendarExport";

export const MilestoneList: React.FC = () => {
  const eventTitle = usePlannerStore((s) => s.eventTitle);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const milestones = usePlannerStore((s) => s.milestones);
  const highlightedTarget = usePlannerStore((s) => s.highlightedTarget);
  const cycleMilestoneStatus = usePlannerStore((s) => s.cycleMilestoneStatus);
  const addMilestoneTask = usePlannerStore((s) => s.addMilestoneTask);
  const navigateToOverview = usePlannerStore((s) => s.navigateToOverview);

  const [newTitle, setNewTitle] = useState("");
  const [newDaysBefore, setNewDaysBefore] = useState("21");
  const [newCategory, setNewCategory] = useState<EventCategory>("logistics");
  const [newUrgency, setNewUrgency] = useState<MilestoneTask["urgency"]>("medium");
  const [newDependsOn, setNewDependsOn] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  const scheduled = computeScheduledMilestones(milestones, eventDate);
  const visibleTasks = scheduled.filter((t) => {
    if (statusFilter === "pending") return t.status !== "completed";
    if (statusFilter === "completed") return t.status === "completed";
    return true;
  });

  const isSectionHighlighted = highlightedTarget?.sectionId === "timeline-section";

  const handleJumpFromTask = (task: ScheduledMilestone) => {
    const sectionId = task.category === "catering" ? "vendor-section" : "budget-section";
    navigateToOverview(
      {
        sectionId,
        category: task.category,
        label: `${task.category} overview`
      },
      task.category
    );
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newTitle.trim();
    const days = parseInt(newDaysBefore, 10);

    if (!cleanTitle) {
      setFormError("Enter task title");
      return;
    }
    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      setFormError("Lead days must be 1 to 365");
      return;
    }

    setFormError(null);
    addMilestoneTask({
      title: cleanTitle,
      deadlineDaysBeforeEvent: days,
      category: newCategory,
      dependsOn: newDependsOn ? [newDependsOn] : [],
      status: "pending",
      urgency: newUrgency
    });
    setNewTitle("");
    setNewDependsOn("");
  };

  return (
    <section
      aria-labelledby="milestone-tracker-heading"
      className={`bg-white border rounded-xl p-5 flex flex-col gap-4 transition-all shadow-xs ${
        isSectionHighlighted
          ? "border-slate-900 ring-2 ring-slate-900/10"
          : "border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 id="milestone-tracker-heading" className="text-base font-bold text-slate-900">
            Full Milestone Schedule
          </h2>
          <p className="text-xs text-slate-500">
            Chronological dependencies leading up to {eventDate}.
          </p>
        </div>

        <CalendarExport
          eventTitle={eventTitle}
          tasks={scheduled.map((s) => ({ title: s.title, targetDate: s.targetDate }))}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            statusFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All ({scheduled.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            statusFilter === "pending"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Pending ({scheduled.filter((m) => m.status !== "completed").length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("completed")}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            statusFilter === "completed"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Completed ({scheduled.filter((m) => m.status === "completed").length})
        </button>
      </div>

      {/* Milestone List */}
      <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        {visibleTasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No milestones in this view.
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isInProgress = task.status === "in_progress";
            const pastel = CATEGORY_PASTEL[task.category] || CATEGORY_PASTEL.miscellaneous;
            const targetDateStr = task.targetDate instanceof Date ? task.targetDate.toISOString().slice(0, 10) : String(task.targetDate);

            return (
              <div
                key={task.id}
                className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isCompleted ? "bg-slate-50/50" : "hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => cycleMilestoneStatus(task.id)}
                    aria-label={`Toggle status for ${task.title}`}
                    className="shrink-0 text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isInProgress ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.isBlocked && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          Blocked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${pastel.badgeBg} ${pastel.badgeText}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pastel.dot}`} />
                        {pastel.name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Due {targetDateStr} ({task.deadlineDaysBeforeEvent}d before)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJumpFromTask(task)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{task.category === "catering" ? "Vendors" : "Budget"}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Milestone Form */}
      <form
        onSubmit={handleAddMilestone}
        aria-label="Add milestone"
        className="pt-2 border-t border-slate-100 flex flex-col gap-2"
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Milestone title (e.g., Finalize DJ Playlist)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as EventCategory)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="logistics">Logistics</option>
              <option value="venue">Venue</option>
              <option value="catering">Catering</option>
              <option value="decor">Decor</option>
              <option value="photography">Photo</option>
              <option value="miscellaneous">Misc</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="number"
              min={1}
              max={365}
              placeholder="Lead days"
              value={newDaysBefore}
              onChange={(e) => setNewDaysBefore(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap h-full"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Milestone</span>
            </button>
          </div>
        </div>

        {formError && (
          <p role="alert" className="text-xs text-rose-600 font-medium">
            {formError}
          </p>
        )}
      </form>
    </section>
  );
};
