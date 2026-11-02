/**
 * Flowchart Layout Helpers — Calculates topological stages and physical node-to-node SVG connection coordinates.
 */
import { MilestoneTask } from "../../types/planner";
import { SvgConnectionLine } from "./FlowchartSvgLines";

export interface StageColumn {
  stageNumber: number;
  title: string;
  subtitle: string;
  tasks: MilestoneTask[];
}

/**
 * Partitions milestones into 4 sequential stage columns based on DAG dependency depth.
 */
export function computeFlowchartStages(
  milestones: MilestoneTask[],
  taskMap: Map<string, MilestoneTask>
): StageColumn[] {
  const depthMap = new Map<string, number>();

  const getDepth = (id: string, visited: Set<string> = new Set()): number => {
    if (depthMap.has(id)) return depthMap.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const task = taskMap.get(id);
    if (!task || task.dependsOn.length === 0) {
      depthMap.set(id, 0);
      return 0;
    }

    let maxParentDepth = 0;
    for (const pId of task.dependsOn) {
      maxParentDepth = Math.max(maxParentDepth, getDepth(pId, new Set(visited)) + 1);
    }
    depthMap.set(id, maxParentDepth);
    return maxParentDepth;
  };

  milestones.forEach((m) => getDepth(m.id));

  const s0: MilestoneTask[] = [];
  const s1: MilestoneTask[] = [];
  const s2: MilestoneTask[] = [];
  const s3: MilestoneTask[] = [];

  milestones.forEach((m) => {
    const d = depthMap.get(m.id) || 0;
    if (d === 0) s0.push(m);
    else if (d === 1) s1.push(m);
    else if (d === 2) s2.push(m);
    else s3.push(m);
  });

  return [
    { stageNumber: 1, title: "STAGE 1: FOUNDATION", subtitle: "Venue & Prerequisites", tasks: s0 },
    { stageNumber: 2, title: "STAGE 2: CORE EXPERIENCE", subtitle: "Catering, Decor & AV", tasks: s1 },
    { stageNumber: 3, title: "STAGE 3: CREW & LOGISTICS", subtitle: "Technical & Soundcheck", tasks: s2 },
    { stageNumber: 4, title: "STAGE 4: EXECUTION", subtitle: "Final Handover & Kickoff", tasks: s3 }
  ];
}

/**
 * Computes exact physical SVG connection lines between input and output ports inside the container.
 */
export function computeSvgConnections(
  container: HTMLDivElement,
  milestones: MilestoneTask[],
  bottlenecks: string[],
  selectedTaskId: string | null,
  hoveredTaskId: string | null,
  taskMap: Map<string, MilestoneTask>
): SvgConnectionLine[] {
  const iRect = container.getBoundingClientRect();
  const lines: SvgConnectionLine[] = [];

  milestones.forEach((task) => {
    task.dependsOn.forEach((prereqId) => {
      const fromPort = container.querySelector(`[data-port-out="${prereqId}"]`);
      const toPort = container.querySelector(`[data-port-in="${task.id}"]`);

      if (fromPort && toPort) {
        const fRect = fromPort.getBoundingClientRect();
        const tRect = toPort.getBoundingClientRect();

        const x1 = fRect.left + fRect.width / 2 - iRect.left;
        const y1 = fRect.top + fRect.height / 2 - iRect.top;
        const x2 = tRect.left + tRect.width / 2 - iRect.left;
        const y2 = tRect.top + tRect.height / 2 - iRect.top;

        const prereqTask = taskMap.get(prereqId);
        const isCompleted = prereqTask?.status === "completed";
        const isBlocked = bottlenecks.includes(task.id) || !isCompleted;
        const isActive =
          selectedTaskId === prereqId ||
          selectedTaskId === task.id ||
          hoveredTaskId === prereqId ||
          hoveredTaskId === task.id;

        lines.push({
          id: `${prereqId}->${task.id}`,
          fromId: prereqId,
          toId: task.id,
          x1,
          y1,
          x2,
          y2,
          isCompleted,
          isBlocked,
          isActive
        });
      }
    });
  });

  return lines;
}
