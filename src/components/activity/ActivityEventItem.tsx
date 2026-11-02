/**
 * Individual activity event item renderer with badges and loop closure button.
 */
import type { FC } from "react";
import {
  CheckCircle,
  PhoneCall,
  Mail,
  MessageSquare,
  Sliders,
  AlertCircle
} from "lucide-react";
import { ActivityLogEvent } from "../../lib/services/event-types";

interface ActivityEventItemProps {
  event: ActivityLogEvent;
  onCloseLoop: (event: ActivityLogEvent) => void;
}

export const ActivityEventItem: FC<ActivityEventItemProps> = ({ event, onCloseLoop }) => {
  const timeStr = new Date(event.timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const isOpenCall = event.loopStatus === "awaiting_call";

  const getChannelBadge = (e: ActivityLogEvent) => {
    if (e.channel === "system") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 font-mono">
          <Sliders className="w-3 h-3 text-slate-600" aria-hidden="true" />
          SYSTEM MODIFICATION
        </span>
      );
    }
    if (e.channel === "whatsapp") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
          <MessageSquare className="w-3 h-3 text-emerald-600" aria-hidden="true" />
          WHATSAPP SENT
        </span>
      );
    }
    if (e.channel === "email") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 font-mono">
          <Mail className="w-3 h-3 text-blue-600" aria-hidden="true" />
          EMAIL SENT
        </span>
      );
    }
    if (e.channel === "call" || e.channel === "loop_closed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          LOOP CLOSED (VERIFIED)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono">
        <AlertCircle className="w-3 h-3 text-amber-600" aria-hidden="true" />
        ACTION LOGGED
      </span>
    );
  };

  return (
    <div
      className={`bg-white border rounded-xl p-3.5 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isOpenCall
          ? "border-amber-300 bg-amber-50/20"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="text-[10px] font-mono text-slate-400 shrink-0 pt-0.5">
          {timeStr}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {getChannelBadge(event)}
            <span className="text-xs font-bold text-slate-900 truncate">
              {event.taskTitle}
            </span>
            {event.vendorName && event.vendorName !== "Deterministic Engine" && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                {event.vendorName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 leading-snug">{event.summary}</p>
          {event.messageBody && (
            <p className="text-[11px] font-mono text-slate-500 bg-slate-50 rounded p-1.5 mt-1 border border-slate-100 line-clamp-2">
              &quot;{event.messageBody}&quot;
            </p>
          )}
          {event.resolutionNote && (
            <p className="text-[11px] text-emerald-800 mt-1 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600 inline" aria-hidden="true" />
              <span>{event.resolutionNote}</span>
            </p>
          )}
        </div>
      </div>

      {isOpenCall && (
        <div className="shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onCloseLoop(event)}
            className="utsav-btn bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            aria-label={`Mark task ${event.taskTitle} confirmed and close loop`}
          >
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>✓ Close Loop (Mark Confirmed)</span>
          </button>
        </div>
      )}
    </div>
  );
};
