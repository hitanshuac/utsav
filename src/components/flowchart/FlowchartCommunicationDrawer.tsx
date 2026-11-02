/**
 * Flowchart Communication Drawer Component — Interactive task inspection, delay cascade simulation, and vendor communication.
 */
import type { FC } from "react";
import { MilestoneTask } from "../../types/planner";
import { DelayImpactSummary } from "../../lib/engine/delay-cascade";
import { EdgeCaseTemplateType } from "../../lib/services/event-logger";
import { TRANSLATIONS, SupportedLanguage } from "../../lib/i18n";
import { FlowchartTaskDependenciesHub } from "./FlowchartTaskDependenciesHub";
import { FlowchartDelaySimulator } from "./FlowchartDelaySimulator";
import { FlowchartMessageDispatchForm } from "./FlowchartMessageDispatchForm";

interface FlowchartCommunicationDrawerProps {
  selectedTask: MilestoneTask;
  taskMap: Map<string, MilestoneTask>;
  downstreamTasks: MilestoneTask[];
  activeDelayImpact: DelayImpactSummary | null;
  activeChannel: "whatsapp" | "email";
  activeTemplateType: EdgeCaseTemplateType;
  customSubject: string;
  customBody: string;
  dispatchFeedback: string | null;
  language: SupportedLanguage;
  onStatusChange: (status: "pending" | "in_progress" | "completed") => void;
  onSimulateDelay: (minutes: number) => void;
  onChannelChange: (channel: "whatsapp" | "email") => void;
  onTemplateChange: (template: EdgeCaseTemplateType) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onDispatch: () => void;
  onSwitchToTable: () => void;
  onCompletePrerequisite: (prereqId: string) => void;
}

export const FlowchartCommunicationDrawer: FC<FlowchartCommunicationDrawerProps> = ({
  selectedTask,
  taskMap,
  downstreamTasks,
  activeDelayImpact,
  activeChannel,
  activeTemplateType,
  customSubject,
  customBody,
  dispatchFeedback,
  language,
  onStatusChange,
  onSimulateDelay,
  onChannelChange,
  onTemplateChange,
  onSubjectChange,
  onBodyChange,
  onDispatch,
  onSwitchToTable,
  onCompletePrerequisite
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
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
              onClick={() => onStatusChange(st)}
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

      {/* PREREQUISITE & DOWNSTREAM INTERDEPENDENCY HUB */}
      <FlowchartTaskDependenciesHub
        selectedTask={selectedTask}
        taskMap={taskMap}
        downstreamTasks={downstreamTasks}
        onSwitchToTable={onSwitchToTable}
        onCompletePrerequisite={onCompletePrerequisite}
        onStatusChange={onStatusChange}
      />

      {/* Sub-Panels: Delay Cascade & Vendor Outreach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Delay Cascade Simulator */}
        <FlowchartDelaySimulator
          activeDelayImpact={activeDelayImpact}
          flowchartDelayCascadeText={t.flowchartDelayCascade}
          simulate30mText={t.flowchartSimulate30m}
          simulate60mText={t.flowchartSimulate60m}
          onSimulateDelay={onSimulateDelay}
        />

        {/* Right: Vendor Communication */}
        <FlowchartMessageDispatchForm
          activeChannel={activeChannel}
          activeTemplateType={activeTemplateType}
          customSubject={customSubject}
          customBody={customBody}
          dispatchFeedback={dispatchFeedback}
          vendorOutreachText={t.flowchartVendorOutreach}
          dispatchWhatsappText={t.flowchartDispatchWhatsapp}
          onChannelChange={onChannelChange}
          onTemplateChange={onTemplateChange}
          onSubjectChange={onSubjectChange}
          onBodyChange={onBodyChange}
          onDispatch={onDispatch}
        />
      </div>
    </div>
  );
};
