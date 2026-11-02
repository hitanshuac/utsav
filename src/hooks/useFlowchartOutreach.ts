/**
 * Custom hook managing flowchart vendor outreach state, templates, and delay cascade simulations.
 */
import { useState, useEffect } from "react";
import { MilestoneTask } from "../types/planner";
import { computeDelayCascade, DelayImpactSummary } from "../lib/engine/delay-cascade";
import {
  triggerWhatsAppNotification,
  triggerEmailNotification,
  resolveThirdPartyVendorEmail
} from "../lib/services/communication";
import {
  buildEditableTemplate,
  EdgeCaseTemplateType,
  logActivityEvent
} from "../lib/services/event-logger";

export function useFlowchartOutreach(params: {
  selectedTask: MilestoneTask | null;
  milestones: MilestoneTask[];
  eventTitle: string;
}) {
  const [activeDelayImpact, setActiveDelayImpact] = useState<DelayImpactSummary | null>(null);
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [activeTemplateType, setActiveTemplateType] = useState<EdgeCaseTemplateType>("standard");
  const [customBody, setCustomBody] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [dispatchFeedback, setDispatchFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!params.selectedTask) return;
    const template = buildEditableTemplate(
      params.selectedTask,
      activeChannel,
      activeTemplateType,
      params.eventTitle
    );
    setCustomBody(template.body);
    setCustomSubject(template.subject);
  }, [params.selectedTask?.id, activeTemplateType, activeChannel, params.selectedTask, params.eventTitle]);

  const handleSimulateDelay = (minutes: number) => {
    if (!params.selectedTask) return;
    const impact = computeDelayCascade(params.milestones, params.selectedTask.id, minutes);
    setActiveDelayImpact(impact);

    logActivityEvent({
      taskId: params.selectedTask.id,
      taskTitle: `Simulated Delay Cascade: ${params.selectedTask.title}`,
      category: params.selectedTask.category,
      channel: "system",
      vendorName: params.selectedTask.vendorContact?.name || "Assigned Partner",
      recipient: "All Downstream Vendors",
      summary: `Simulated +${minutes}m delay on ${params.selectedTask.title}. Affected ${impact.downstreamAffectedTasks.length} downstream milestones.`,
      loopStatus: "closed"
    });
  };

  const handleDispatch = () => {
    if (!params.selectedTask) return;
    const vendorPhone = params.selectedTask.vendorContact?.phone || "+919876543210";
    const vendorEmail = resolveThirdPartyVendorEmail(params.selectedTask.vendorContact);
    const vendorName = params.selectedTask.vendorContact?.name || "Assigned Partner";

    if (activeChannel === "whatsapp") {
      triggerWhatsAppNotification({
        phone: vendorPhone,
        message: customBody,
        vendorName,
        taskTitle: params.selectedTask.title,
        taskId: params.selectedTask.id,
        category: params.selectedTask.category,
        edgeCaseType: activeTemplateType
      });
      setDispatchFeedback(`✓ WhatsApp dispatch link opened for ${vendorName} (${vendorPhone}).`);
    } else {
      triggerEmailNotification({
        to: vendorEmail,
        subject: customSubject,
        body: customBody,
        vendorName,
        taskTitle: params.selectedTask.title,
        taskId: params.selectedTask.id,
        category: params.selectedTask.category,
        edgeCaseType: activeTemplateType
      });
      setDispatchFeedback(`✓ 3rd-Party Email client dispatched for ${vendorName} (${vendorEmail}).`);
    }

    setTimeout(() => setDispatchFeedback(null), 5000);
  };

  return {
    activeDelayImpact,
    activeChannel,
    activeTemplateType,
    customBody,
    customSubject,
    dispatchFeedback,
    setActiveChannel,
    setActiveTemplateType,
    setCustomBody,
    setCustomSubject,
    handleSimulateDelay,
    handleDispatch
  };
}
