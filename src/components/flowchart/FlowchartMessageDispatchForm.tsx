/**
 * Flowchart message template editor and dispatch form.
 */
import type { FC } from "react";
import { Send, MessageSquare, Mail } from "lucide-react";
import { EdgeCaseTemplateType } from "../../lib/services/event-logger";

interface FlowchartMessageDispatchFormProps {
  activeChannel: "whatsapp" | "email";
  activeTemplateType: EdgeCaseTemplateType;
  customSubject: string;
  customBody: string;
  dispatchFeedback: string | null;
  vendorOutreachText: string;
  dispatchWhatsappText: string;
  onChannelChange: (channel: "whatsapp" | "email") => void;
  onTemplateChange: (template: EdgeCaseTemplateType) => void;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onDispatch: () => void;
}

export const FlowchartMessageDispatchForm: FC<FlowchartMessageDispatchFormProps> = ({
  activeChannel,
  activeTemplateType,
  customSubject,
  customBody,
  dispatchFeedback,
  vendorOutreachText,
  dispatchWhatsappText,
  onChannelChange,
  onTemplateChange,
  onSubjectChange,
  onBodyChange,
  onDispatch
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>{vendorOutreachText}</span>
          </h4>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => onChannelChange("whatsapp")}
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
              onClick={() => onChannelChange("email")}
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
              onClick={() => onTemplateChange(tmpl.id)}
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

        {activeChannel === "email" && (
          <input
            type="text"
            value={customSubject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Email Subject"
            className="utsav-input text-xs font-mono mb-1.5 py-1"
            aria-label="Email Subject"
          />
        )}
        <textarea
          rows={3}
          value={customBody}
          onChange={(e) => onBodyChange(e.target.value)}
          className="utsav-input text-xs font-mono resize-y mb-2"
          aria-label="Editable vendor message content"
        />

        {dispatchFeedback && (
          <div className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 mb-2">
            {dispatchFeedback}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onDispatch}
          className={`utsav-btn text-xs px-3.5 py-2 font-semibold text-white shadow-xs flex items-center gap-1.5 cursor-pointer ${
            activeChannel === "whatsapp" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {activeChannel === "whatsapp" ? (
            <>
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{dispatchWhatsappText}</span>
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
  );
};
