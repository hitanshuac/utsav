import React from "react";
import { Download, CalendarPlus } from "lucide-react";
import {
  generateGoogleCalendarUrl,
  generateIcsCalendar
} from "../../lib/engine/calendar-utils";

interface CalendarExportProps {
  eventTitle: string;
  tasks: { title: string; targetDate: Date }[];
}

export const CalendarExport: React.FC<CalendarExportProps> = ({
  eventTitle,
  tasks
}) => {
  const icsDataUri = generateIcsCalendar(tasks);
  const nextMilestone = tasks[0] ?? {
    title: `${eventTitle} Milestone`,
    targetDate: new Date()
  };
  const googleCalUrl = generateGoogleCalendarUrl({
    title: `${eventTitle}: ${nextMilestone.title}`,
    targetDate: nextMilestone.targetDate,
    details: `Milestone schedule exported from Celebration & Event Planner (${tasks.length} total tasks)`
  });

  const safeFilename =
    eventTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "celebration-schedule";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={icsDataUri}
        download={`${safeFilename}.ics`}
        aria-label="Download RFC 5545 .ics calendar file for all milestones"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Export .ics Calendar ({tasks.length})</span>
      </a>

      <a
        href={googleCalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Add next milestone to Google Calendar"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
      >
        <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Google Calendar Link</span>
      </a>
    </div>
  );
};
