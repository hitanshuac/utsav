import { MilestoneTask } from "../types";

export interface ScheduledMilestone extends MilestoneTask {
  targetDate: Date;
  isBlocked: boolean;
  blockingTaskTitles: string[];
}

/**
 * Performs a deterministic topological sort (Kahn's algorithm) ordered by
 * prerequisite dependencies first, then descending deadlineDaysBeforeEvent
 * (earliest calendar deadlines first).
 */
export function sortMilestonesTopologically(tasks: MilestoneTask[]): MilestoneTask[] {
  const taskMap = new Map<string, MilestoneTask>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of tasks) {
    taskMap.set(task.id, task);
    inDegree.set(task.id, 0);
    dependents.set(task.id, []);
  }

  for (const task of tasks) {
    for (const prereqId of task.dependsOn) {
      if (taskMap.has(prereqId)) {
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
        dependents.get(prereqId)?.push(task.id);
      }
    }
  }

  const compareTasks = (a: MilestoneTask, b: MilestoneTask) => {
    if (b.deadlineDaysBeforeEvent !== a.deadlineDaysBeforeEvent) {
      return b.deadlineDaysBeforeEvent - a.deadlineDaysBeforeEvent;
    }
    return a.id.localeCompare(b.id);
  };

  const readyQueue: MilestoneTask[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      const task = taskMap.get(id);
      if (task) readyQueue.push(task);
    }
  }
  readyQueue.sort(compareTasks);

  const sorted: MilestoneTask[] = [];

  while (readyQueue.length > 0) {
    const current = readyQueue.shift()!;
    sorted.push(current);

    for (const depId of dependents.get(current.id) ?? []) {
      const nextDeg = (inDegree.get(depId) ?? 1) - 1;
      inDegree.set(depId, nextDeg);
      if (nextDeg === 0) {
        const depTask = taskMap.get(depId);
        if (depTask) {
          readyQueue.push(depTask);
          readyQueue.sort(compareTasks);
        }
      }
    }
  }

  if (sorted.length !== tasks.length) {
    throw new Error("CIRCULAR_DEPENDENCY: Milestone dependency graph contains a cycle.");
  }

  return sorted;
}

export function canCompleteMilestone(task: MilestoneTask, allTasks: MilestoneTask[]): {
  allowed: boolean;
  blockingTitles: string[];
} {
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const blockingTitles: string[] = [];

  for (const prereqId of task.dependsOn) {
    const prereq = byId.get(prereqId);
    if (prereq && prereq.status !== "completed") {
      blockingTitles.push(prereq.title);
    }
  }

  return {
    allowed: blockingTitles.length === 0,
    blockingTitles
  };
}

export function computeScheduledMilestones(
  tasks: MilestoneTask[],
  eventDateIso: string
): ScheduledMilestone[] {
  const ordered = sortMilestonesTopologically(tasks);
  const eventDate = new Date(eventDateIso);
  const msPerDay = 86_400_000;

  return ordered.map((task) => {
    const targetDate = new Date(eventDate.getTime() - task.deadlineDaysBeforeEvent * msPerDay);
    const { allowed, blockingTitles } = canCompleteMilestone(task, tasks);
    return {
      ...task,
      targetDate,
      isBlocked: !allowed && task.status !== "completed",
      blockingTaskTitles: blockingTitles
    };
  });
}
