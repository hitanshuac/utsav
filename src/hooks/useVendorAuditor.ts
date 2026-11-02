/**
 * Custom hook for Vendor Quote Auditor state, AI/Offline execution, and budget synchronization.
 */
import { useState, useEffect, useMemo } from "react";
import { BudgetItem, MilestoneTask, VendorAuditResult } from "../types/planner";
import { ActionDiffRow } from "../components/ActionDiffModal";
import { auditVendorQuoteOffline } from "../lib/plannerEngine";
import { logActivityEvent } from "../lib/services/event-logger";
import { TopicTabId } from "../components/TopicTabs";

interface UseVendorAuditorProps {
  sampleVendorNote: string;
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onActionTriggered?: (actionName: string, explanation: string, deltas?: ActionDiffRow[]) => void;
  onTabChange?: (tab: TopicTabId) => void;
}

export function useVendorAuditor({
  sampleVendorNote,
  budgetItems,
  milestones,
  onUpdateBudgetItem,
  onUpdateTaskStatus,
  onActionTriggered,
  onTabChange
}: UseVendorAuditorProps) {
  const [vendorNote, setVendorNote] = useState<string>(sampleVendorNote);
  const [vendorAudit, setVendorAudit] = useState<VendorAuditResult>(
    auditVendorQuoteOffline(sampleVendorNote)
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditProvenance, setAuditProvenance] = useState<"ai" | "fallback">("fallback");
  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>("");
  const [syncFeedback, setSyncFeedback] = useState<{
    vendorName: string;
    amount: number;
    categoryLabel: string;
    milestoneTitle?: string;
  } | null>(null);

  useEffect(() => {
    setVendorNote(sampleVendorNote);
    setVendorAudit(auditVendorQuoteOffline(sampleVendorNote));
    setAuditProvenance("fallback");
  }, [sampleVendorNote]);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/audit-vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorNote })
      });
      if (res.ok) {
        const data = await res.json();
        const result: VendorAuditResult = {
          vendorName: data.vendorName || "Audited Vendor",
          quotedAmount: Number(data.quotedAmount) || 0,
          detectedInclusions: data.detectedInclusions || data.inclusions || [],
          inclusions: data.inclusions || data.detectedInclusions || [],
          flaggedHiddenCosts: data.flaggedHiddenCosts || data.hiddenCostRisks || [],
          hiddenCostRisks: data.hiddenCostRisks || data.flaggedHiddenCosts || [],
          negotiationQuestions: data.negotiationQuestions || [],
          provenance: data.provenance === "ai" ? "ai" : "fallback"
        };
        setVendorAudit(result);
        const prov = data.provenance === "ai" ? "ai" : "fallback";
        setAuditProvenance(prov);
        logActivityEvent({
          taskId: "vendor-audit",
          taskTitle: `Audited Vendor Quote: ${result.vendorName}`,
          category: "venue",
          channel: "system",
          vendorName: result.vendorName,
          recipient: "Procurement Ops",
          summary: `Audited ₹${result.quotedAmount.toLocaleString("en-IN")} quote (${prov === "ai" ? "Live Gemini 3.5 AI" : "Deterministic Fallback"}). Detected ${result.flaggedHiddenCosts.length} potential hidden cost risk(s).`,
          loopStatus: "closed"
        });
        if (onActionTriggered) {
          onActionTriggered(
            `Audited Vendor Quote: ${result.vendorName}`,
            `${prov === "ai" ? "Live Gemini 3.5 AI" : "Deterministic"} quote audit identified ₹${result.quotedAmount.toLocaleString("en-IN")} base amount with ${result.flaggedHiddenCosts.length} flagged risk items.`,
            [
              {
                label: "Detected Base Amount",
                before: "—",
                after: `₹${result.quotedAmount.toLocaleString("en-IN")}`,
                diff: "Audited"
              },
              {
                label: "Flagged Hidden Costs",
                before: "0",
                after: `${result.flaggedHiddenCosts.length} items`,
                diff: result.flaggedHiddenCosts.length > 0 ? "Risks Flagged" : "Clear",
                isImprovement: result.flaggedHiddenCosts.length === 0
              }
            ]
          );
        }
        return;
      }
    } catch {
      // offline fallback
    } finally {
      setIsAuditing(false);
    }

    const result = auditVendorQuoteOffline(vendorNote);
    setVendorAudit(result);
    setAuditProvenance("fallback");
  };

  const autoDetectedItem = useMemo(() => {
    const noteOrName = `${vendorNote} ${vendorAudit.vendorName}`.toLowerCase();
    if (noteOrName.includes("cater") || noteOrName.includes("food") || noteOrName.includes("plate")) {
      return budgetItems.find((b) => b.category === "catering") || budgetItems[0];
    }
    if (noteOrName.includes("decor") || noteOrName.includes("mandap") || noteOrName.includes("flower")) {
      return budgetItems.find((b) => b.category === "decor") || budgetItems[0];
    }
    if (noteOrName.includes("photo") || noteOrName.includes("video") || noteOrName.includes("drone")) {
      return budgetItems.find((b) => b.category === "photography") || budgetItems[0];
    }
    if (noteOrName.includes("venue") || noteOrName.includes("hall") || noteOrName.includes("banquet")) {
      return budgetItems.find((b) => b.category === "venue") || budgetItems[0];
    }
    if (noteOrName.includes("sound") || noteOrName.includes("generator") || noteOrName.includes("shuttle")) {
      return budgetItems.find((b) => b.category === "logistics") || budgetItems[0];
    }
    return budgetItems.find((b) => b.isEstimate) || budgetItems[0];
  }, [vendorNote, vendorAudit, budgetItems]);

  const activeTargetItem = useMemo(() => {
    return budgetItems.find((b) => b.id === selectedTargetItemId) || autoDetectedItem;
  }, [budgetItems, selectedTargetItemId, autoDetectedItem]);

  const matchedMilestone = useMemo(() => {
    if (!activeTargetItem) return null;
    return milestones.find((m) => m.category === activeTargetItem.category);
  }, [activeTargetItem, milestones]);

  const handleStartVendorAuditForCategory = (category: string) => {
    const sampleNotes: Record<string, string> = {
      catering: "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5,000 extra. GST extra at 18%.",
      decor: "Shree Mandap Decor: ₹1,50,000 for main hall and entrance. Flowers fresh marigold and jasmine. Generator fuel ₹15,000 extra. GST extra.",
      photography: "Studio Memories: ₹90,000 for 2-day candid photo + cinematic teaser. Drone coverage ₹15,000 extra. Advance 50% non-refundable.",
      venue: "Grand Palace Banquet: ₹2,50,000 for 12 hours. Electricity billed at ₹18/unit. Cleaning deposit ₹10,000 refundable. Midnight curfew strictly enforced.",
      logistics: "City Express Shuttles: ₹45,000 for 3 tempo travellers 24 hrs. Diesel fuel at actuals. Toll taxes and parking separate.",
      miscellaneous: "Event Supplies & Sound: ₹35,000 for wireless mics and DJ system. Generator fuel charges not included."
    };
    const note = sampleNotes[category] || sampleVendorNote;
    setVendorNote(note);
    setVendorAudit(auditVendorQuoteOffline(note));
    setAuditProvenance("fallback");
    setSyncFeedback(null);
    if (onTabChange) {
      onTabChange("vendor");
    }
  };

  const handleSyncVendorQuoteToBudget = () => {
    if (!activeTargetItem || vendorAudit.quotedAmount <= 0) return;

    const oldAmount = activeTargetItem.allocatedAmount;
    const newAmount = vendorAudit.quotedAmount;

    if (onUpdateBudgetItem) {
      onUpdateBudgetItem(activeTargetItem.id, newAmount);
    }
    if (matchedMilestone && matchedMilestone.status === "pending" && onUpdateTaskStatus) {
      onUpdateTaskStatus(matchedMilestone.id, "in_progress");
    }

    logActivityEvent({
      taskId: `sync-${activeTargetItem.id}`,
      taskTitle: `Synced Vendor Quote: ${vendorAudit.vendorName}`,
      category: activeTargetItem.category,
      channel: "system",
      vendorName: vendorAudit.vendorName,
      recipient: "Budget & Contract Ledger",
      summary: `Synced verified quote of ₹${newAmount.toLocaleString("en-IN")} from ${vendorAudit.vendorName} to ${activeTargetItem.label}.`,
      loopStatus: "closed"
    });

    if (onActionTriggered) {
      onActionTriggered(
        `Integrated Quote: ${vendorAudit.vendorName}`,
        `Applied verified vendor quotation of ₹${newAmount.toLocaleString("en-IN")} into ${activeTargetItem.label}.`,
        [
          {
            label: `${activeTargetItem.label} Allocation`,
            before: `₹${oldAmount.toLocaleString("en-IN")} (Estimate)`,
            after: `₹${newAmount.toLocaleString("en-IN")} (Verified)`,
            diff: newAmount <= oldAmount ? `-₹${(oldAmount - newAmount).toLocaleString("en-IN")}` : `+₹${(newAmount - oldAmount).toLocaleString("en-IN")}`,
            isImprovement: newAmount <= oldAmount
          }
        ]
      );
    }

    setSyncFeedback({
      vendorName: vendorAudit.vendorName,
      amount: newAmount,
      categoryLabel: activeTargetItem.label,
      milestoneTitle: matchedMilestone?.title
    });
  };

  return {
    vendorNote,
    setVendorNote,
    vendorAudit,
    isAuditing,
    auditProvenance,
    handleAudit,
    activeTargetItem,
    selectedTargetItemId,
    setSelectedTargetItemId,
    syncFeedback,
    handleSyncVendorQuoteToBudget,
    handleStartVendorAuditForCategory
  };
}
