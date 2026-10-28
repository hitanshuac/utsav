export function generateIcsCalendar(tasks: { title: string; targetDate: Date }[]): string {
  const formatIcsDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";

  let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PromptWars//EventPlanner//EN\n";

  tasks.forEach((task) => {
    const start = formatIcsDate(task.targetDate);
    const end = formatIcsDate(new Date(task.targetDate.getTime() + 3600000));
    icsContent += `BEGIN:VEVENT\nSUMMARY:${task.title}\nDTSTART:${start}\nDTEND:${end}\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
  });

  icsContent += "END:VCALENDAR";
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
}

export function generateGoogleCalendarUrl(task: {
  title: string;
  targetDate: Date;
  details?: string;
}): string {
  const formatGCalDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";

  const start = formatGCalDate(task.targetDate);
  const end = formatGCalDate(new Date(task.targetDate.getTime() + 3600000));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.title,
    dates: `${start}/${end}`,
    details: task.details ?? "Scheduled via Celebration & Event Planner"
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
