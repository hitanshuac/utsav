import React, { useState } from "react";
import {
  AlertOctagon,
  Mail,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { CATEGORY_PASTEL } from "../../lib/pastel";
import { triggerEmailNotification, triggerWhatsAppNotification } from "../../lib/services/communication";
import { TMinusAlertService } from "../../lib/services/tminus-alert-service";
import { usePlannerStore } from "../../lib/store/usePlannerStore";

export function TMinusAlertBanner() {
  const milestones = usePlannerStore((s) => s.milestones);
  const eventDate = usePlannerStore((s) => s.eventDate);
  const eventTitle = usePlannerStore((s) => s.eventTitle);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sentState, setSentState] = useState<Record<string, { wa?: boolean; email?: boolean }>>({});

  const alertService = TMinusAlertService.getInstance();
  const alerts = alertService.checkApproachingDeadlines(milestones, eventDate, {
    eventTitle,
    autoTriggerCritical: false
  });

  if (alerts.length === 0 || isDismissed) {
    return null;
  }

  const safeIndex = Math.min(currentIndex, alerts.length - 1);
  const activeAlert = alerts[safeIndex];
  const colors = CATEGORY_PASTEL[activeAlert.category];
  const sent = sentState[activeAlert.taskId];

  const handleTriggerWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = triggerWhatsAppNotification({
      taskId: activeAlert.taskId,
      taskTitle: activeAlert.taskTitle,
      phone: activeAlert.whatsAppPayload.phone,
      vendorName: activeAlert.vendorContact?.name || "3rd-Party Vendor",
      message: activeAlert.whatsAppPayload.text,
      waUrl: activeAlert.whatsAppPayload.waUrl
    });
    if (res.ok) {
      setSentState((prev) => ({
        ...prev,
        [activeAlert.taskId]: { ...prev[activeAlert.taskId], wa: true }
      }));
    }
  };

  const handleTriggerEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = triggerEmailNotification({
      taskId: activeAlert.taskId,
      taskTitle: activeAlert.taskTitle,
      to: activeAlert.emailPayload.to,
      vendorName: activeAlert.vendorContact?.name || "3rd-Party Vendor",
      subject: activeAlert.emailPayload.subject,
      body: activeAlert.emailPayload.body,
      mailtoUrl: activeAlert.emailPayload.mailtoUrl,
      isThirdParty: true
    });
    if (res.ok) {
      setSentState((prev) => ({
        ...prev,
        [activeAlert.taskId]: { ...prev[activeAlert.taskId], email: true }
      }));
    }
  };

  return (
    <div
      onClick={() => setIsExpanded((prev) => !prev)}
      className="bg-rose-50/70 border border-rose-200 rounded-xl px-3.5 py-2.5 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Compact Primary Row */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="text-xs font-bold text-slate-900 truncate">
            {activeAlert.taskTitle}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-xs font-medium text-rose-800 whitespace-nowrap shrink-0">
            Needs approval
          </span>
          <span className="text-slate-400 hidden sm:inline">·</span>
          <span className="text-xs font-mono text-slate-600 tabular-nums hidden sm:inline whitespace-nowrap shrink-0">
            {activeAlert.timeSlot || `T-${activeAlert.deadlineDaysBeforeEvent}d`}
          </span>
          {sent?.wa && (
            <span className="text-[11px] font-medium text-emerald-700 whitespace-nowrap shrink-0">
              · WA Sent
            </span>
          )}
          {sent?.email && (
            <span className="text-[11px] font-medium text-sky-700 whitespace-nowrap shrink-0">
              · Email Sent
            </span>
          )}
        </div>

        {/* Small Action Icon Buttons */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handleTriggerWhatsApp}
            aria-label="WhatsApp 3rd-party vendor"
            title={`WhatsApp ${activeAlert.vendorContact?.name || "Vendor"}`}
            className="p-1.5 rounded-md bg-white border border-rose-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleTriggerEmail}
            aria-label="Email 3rd-party vendor"
            title={`Email ${activeAlert.emailPayload.to}`}
            className="p-1.5 rounded-md bg-white border border-rose-200 text-sky-700 hover:bg-sky-50 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>

          {alerts.length > 1 && (
            <div className="flex items-center gap-0.5 text-[11px] font-mono text-slate-600 px-1">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : alerts.length - 1))
                }
                aria-label="Previous alert"
                className="p-0.5 hover:text-slate-900"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="tabular-nums">
                {safeIndex + 1}/{alerts.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev < alerts.length - 1 ? prev + 1 : 0))
                }
                aria-label="Next alert"
                className="p-0.5 hover:text-slate-900"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-label="Toggle alert details"
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss alert"
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progressive Disclosure Details (Only visible when clicked) */}
      {isExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2 pt-2 border-t border-rose-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700 cursor-default"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{colors.name}</span>
            <span>·</span>
            <span>{activeAlert.message}</span>
            {activeAlert.vendorContact && (
              <>
                <span>·</span>
                <span>
                  3rd-Party: <strong>{activeAlert.vendorContact.name}</strong> ({activeAlert.emailPayload.to})
                </span>
              </>
            )}
          </div>
          <a
            href={activeAlert.whatsAppPayload.waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-800 font-semibold underline"
          >
            Open WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
