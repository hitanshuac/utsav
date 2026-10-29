import { MilestoneTask } from "../types";

export interface DelayImpactSummary {
  taskId: string;
  taskTitle: string;
  delayMinutes: number;
  directlyAffectedTaskIds: string[];
  downstreamAffectedTasks: {
    id: string;
    title: string;
    category: string;
    cumulativeDelayMinutes: number;
    isMuhuratCritical: boolean;
  }[];
  criticalMuhuratAtRisk: boolean;
  riskMessage: string | null;
}

/**
 * Computes the downstream cascade effect of a delay across the dependency graph.
 * If a prerequisite task is delayed, downstream tasks inherit delay impact.
 */
export function computeDelayCascade(
  tasks: MilestoneTask[],
  delayedTaskId: string,
  delayMinutes: number
): DelayImpactSummary {
  const taskMap = new Map<string, MilestoneTask>(tasks.map((t) => [t.id, t]));
  const targetTask = taskMap.get(delayedTaskId);

  if (!targetTask || delayMinutes <= 0) {
    return {
      taskId: delayedTaskId,
      taskTitle: targetTask?.title || "Task",
      delayMinutes: 0,
      directlyAffectedTaskIds: [],
      downstreamAffectedTasks: [],
      criticalMuhuratAtRisk: false,
      riskMessage: null
    };
  }

  // Build adjacency list for downstream children (who depends on what)
  const childrenMap = new Map<string, string[]>();
  for (const t of tasks) {
    for (const parentId of t.dependsOn) {
      const existing = childrenMap.get(parentId) || [];
      existing.push(t.id);
      childrenMap.set(parentId, existing);
    }
  }

  // BFS traversal to discover all affected downstream milestones
  const downstreamAffected: DelayImpactSummary["downstreamAffectedTasks"] = [];
  const queue: { id: string; delay: number }[] = [];
  const visited = new Set<string>();

  const directChildren = childrenMap.get(delayedTaskId) || [];
  for (const childId of directChildren) {
    queue.push({ id: childId, delay: delayMinutes });
    visited.add(childId);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const childTask = taskMap.get(current.id);
    if (!childTask) continue;

    const isMuhuratCritical =
      childTask.urgency === "critical" ||
      childTask.title.toLowerCase().includes("muhurat") ||
      childTask.title.toLowerCase().includes("pheras") ||
      childTask.title.toLowerCase().includes("varmala") ||
      childTask.title.toLowerCase().includes("dinner");

    downstreamAffected.push({
      id: childTask.id,
      title: childTask.title,
      category: childTask.category,
      cumulativeDelayMinutes: current.delay,
      isMuhuratCritical
    });

    const nextChildren = childrenMap.get(current.id) || [];
    for (const nextId of nextChildren) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, delay: current.delay });
      }
    }
  }

  const criticalMuhuratAtRisk = downstreamAffected.some((t) => t.isMuhuratCritical);

  let riskMessage: string | null = null;
  if (criticalMuhuratAtRisk) {
    const atRiskTitles = downstreamAffected
      .filter((t) => t.isMuhuratCritical)
      .map((t) => t.title)
      .join(", ");
    riskMessage = `⚠️ A +${delayMinutes}m delay directly threatens key milestones: ${atRiskTitles}`;
  } else if (downstreamAffected.length > 0) {
    riskMessage = `Notice: +${delayMinutes}m delay pushes back ${downstreamAffected.length} subsequent schedule items.`;
  }

  return {
    taskId: delayedTaskId,
    taskTitle: targetTask.title,
    delayMinutes,
    directlyAffectedTaskIds: directChildren,
    downstreamAffectedTasks: downstreamAffected,
    criticalMuhuratAtRisk,
    riskMessage
  };
}

/**
 * Builds a polite, professional Indian wedding coordinator WhatsApp message URL
 */
export function buildWhatsAppReminderUrl(
  phone: string,
  vendorName: string,
  milestoneTitle: string,
  timeSlot?: string,
  delayStatus?: string
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const timeContext = timeSlot ? ` scheduled for ${timeSlot}` : "";
  const urgencyPrefix =
    delayStatus === "delayed"
      ? "URGENT UPDATE: Schedule delay alert"
      : "Event Schedule Reminder";

  const message =
    `Namaste ${vendorName || "Ji"},\n\n` +
    `Regarding the Sharma Family Celebration: ${urgencyPrefix}.\n` +
    `Item: "${milestoneTitle}"${timeContext}.\n\n` +
    `Please ensure your team is on standby and coordinates with the family coordinator immediately. Dhanyawad!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
