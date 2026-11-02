/**
 * Custom hook managing the before-and-after action diff modal and telemetry.
 */
import { useState } from "react";
import { ActionDiffData, ActionDiffRow } from "../components/ActionDiffModal";
import { PlannerEvaluationResult } from "../types/planner";

export function useActionDiff() {
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);
  const [actionDiffData, setActionDiffData] = useState<ActionDiffData | null>(null);

  const triggerActionDiff = (params: {
    actionName: string;
    title: string;
    explanation: string;
    recommendedNextStep?: string;
    deltas: ActionDiffRow[];
    beforeEvaluation: PlannerEvaluationResult;
    afterEvaluation: PlannerEvaluationResult;
  }) => {
    setActionDiffData({
      actionName: params.actionName,
      title: params.title,
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      beforeTier: params.beforeEvaluation.triageTier,
      afterTier: params.afterEvaluation.triageTier,
      beforeScore: params.beforeEvaluation.urgencyScore,
      afterScore: params.afterEvaluation.urgencyScore,
      deltas: params.deltas,
      explanation: params.explanation,
      recommendedNextStep: params.recommendedNextStep
    });
    setIsDiffModalOpen(true);
  };

  return {
    isDiffModalOpen,
    setIsDiffModalOpen,
    actionDiffData,
    triggerActionDiff
  };
}
