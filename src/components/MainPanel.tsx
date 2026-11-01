import type { FC } from "react";
import { useState, useEffect, useMemo } from "react";
import {
  AlertCircle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Shield,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Edit3,
  PlusCircle
} from "lucide-react";
import {
  BudgetItem,
  MilestoneTask,
  ScaledCategory,
  VendorAuditResult,
  TradeoffStrategy,
  PlanningTriageTier,
  PersonaLens
} from "../types/planner";
import { TopicTabId } from "./TopicTabs";
import { auditVendorQuoteOffline, generateWhatsAppLink } from "../lib/plannerEngine";
import { SafeNarrative } from "./SafeNarrative";
import { VisualDependencyFlowchart } from "./VisualDependencyFlowchart";
import { ActivityHistoryPanel } from "./ActivityHistoryPanel";
import { logActivityEvent } from "../lib/services/event-logger";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

export interface ClosedLoopNotice {
  title: string;
  message: string;
  affectedCategories?: {
    category: string;
    label: string;
    delta: number;
    newAllocated: number;
    rationale: string;
    vendorName?: string;
  }[];
  actionTab?: TopicTabId;
  actionLabel?: string;
}

interface MainPanelProps {
  activeTab: TopicTabId;
  budgetItems: BudgetItem[];
  scaledCategories: ScaledCategory[];
  milestones: MilestoneTask[];
  topologicalOrder: string[];
  bottlenecks: string[];
  guestCount: number;
  baseGuestCount: number;
  totalBudgetCap: number;
  totalAllocated: number;
  variance: number;
  triageTier: PlanningTriageTier;
  tradeoffs: TradeoffStrategy[];
  onApplyTradeoff: (strategy: TradeoffStrategy) => void;
  onToggleVerified: (itemId: string) => void;
  onCycleTaskStatus: (taskId: string) => void;
  onUpdateTaskStatus?: (taskId: string, status: "pending" | "in_progress" | "completed") => void;
  onUpdateBudgetItem?: (itemId: string, newAmount: number) => void;
  onTopUpBudget?: (amount: number) => void;
  onLogRealTimeEvent?: (description: string, category?: string) => void;
  vendorPhone: string;
  sampleVendorNote: string;
  filterQuery: string;
  onClearFilter?: () => void;
  onSearchChange?: (query: string) => void;
  daysRemaining?: number;
  eventTitle?: string;
  onActionTriggered?: (actionName: string, explanation: string, deltas?: any[]) => void;
  persona?: PersonaLens;
  language?: SupportedLanguage;
  onTabChange?: (tab: TopicTabId) => void;
  onConsultAiTradeoffs?: () => void;
  isRebalancing?: boolean;
  aiNarrative?: string | null;
  aiProvenance?: "ai" | "fallback";
  closedLoopNotice?: ClosedLoopNotice | null;
  onDismissClosedLoopNotice?: () => void;
}

export const MainPanel: FC<MainPanelProps> = ({
  activeTab,
  budgetItems,
  scaledCategories,
  milestones,
  topologicalOrder,
  bottlenecks,
  guestCount,
  baseGuestCount,
  totalBudgetCap,
  totalAllocated,
  variance,
  triageTier,
  tradeoffs,
  onApplyTradeoff,
  onToggleVerified,
  onCycleTaskStatus,
  onUpdateTaskStatus,
  onUpdateBudgetItem,
  onTopUpBudget,
  onLogRealTimeEvent,
  vendorPhone,
  sampleVendorNote,
  filterQuery,
  onClearFilter,
  onSearchChange,
  daysRemaining = 30,
  eventTitle = "Celebration",
  onActionTriggered,
  persona = "family_host",
  language = "en",
  onTabChange,
  onConsultAiTradeoffs,
  isRebalancing = false,
  aiNarrative,
  aiProvenance = "fallback",
  closedLoopNotice,
  onDismissClosedLoopNotice
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Local state for manual inline editing & real-time event logger
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState<string>("");
  const [liveEventText, setLiveEventText] = useState<string>("");
  const [liveEventCategory, setLiveEventCategory] = useState<string>("catering");

  const handleCommitLiveEvent = () => {
    if (!liveEventText.trim()) return;
    if (onLogRealTimeEvent) {
      onLogRealTimeEvent(liveEventText.trim(), liveEventCategory);
    } else {
      logActivityEvent({
        taskId: `live-${Date.now()}`,
        taskTitle: `Real-Time Event: ${liveEventText.trim().slice(0, 40)}`,
        category: liveEventCategory as any,
        channel: "system",
        vendorName: "Live Floor Ops",
        recipient: "Coordinator Team",
        summary: `[Real-Time Event Tracker]: ${liveEventText.trim()}`,
        loopStatus: "closed"
      });
    }
    setLiveEventText("");
  };

  // Vendor Auditor local state
  const [vendorNote, setVendorNote] = useState<string>(sampleVendorNote);
  const [vendorAudit, setVendorAudit] = useState<VendorAuditResult>(
    auditVendorQuoteOffline(sampleVendorNote)
  );
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditProvenance, setAuditProvenance] = useState<"ai" | "fallback">("fallback");

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
    logActivityEvent({
      taskId: "vendor-audit",
      taskTitle: `Audited Vendor Quote: ${result.vendorName}`,
      category: "miscellaneous",
      channel: "system",
      vendorName: result.vendorName,
      recipient: "Coordinator Ops",
      summary: `Audited ₹${result.quotedAmount.toLocaleString("en-IN")} quote (Deterministic Shield). Detected ${result.flaggedHiddenCosts.length} potential hidden cost risk(s).`,
      loopStatus: "closed"
    });
    if (onActionTriggered) {
      onActionTriggered(
        `Audited Vendor Quote: ${result.vendorName}`,
        `Deterministic quote audit identified ₹${result.quotedAmount.toLocaleString("en-IN")} base amount with ${result.flaggedHiddenCosts.length} flagged risk items.`,
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
  };

  // Category mapping templates for 1-click bridge from Step 2 (Budget) to Step 3 (Auditor)
  const CATEGORY_SAMPLE_NOTES: Record<string, string> = {
    catering: "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5,000 extra. GST extra at 18%.",
    decor: "Shree Mandap Decor: ₹1,50,000 for main hall and entrance. Flowers fresh marigold and jasmine. Generator fuel ₹15,000 extra. GST extra.",
    photography: "Studio Memories: ₹90,000 for 2-day candid photo + cinematic teaser. Drone coverage ₹15,000 extra. Advance 50% non-refundable.",
    venue: "Grand Palace Banquet: ₹2,50,000 for 12 hours. Electricity billed at ₹18/unit. Cleaning deposit ₹10,000 refundable. Midnight curfew strictly enforced.",
    logistics: "City Express Shuttles: ₹45,000 for 3 tempo travellers 24 hrs. Diesel fuel at actuals. Toll taxes and parking separate.",
    miscellaneous: "Event Supplies & Sound: ₹35,000 for wireless mics and DJ system. Generator fuel charges not included."
  };

  const [selectedTargetItemId, setSelectedTargetItemId] = useState<string>("");
  const [syncFeedback, setSyncFeedback] = useState<{
    vendorName: string;
    amount: number;
    categoryLabel: string;
    milestoneTitle?: string;
  } | null>(null);

  // Auto-detect which budget item corresponds to the current audited quotation
  const autoDetectedItem = useMemo(() => {
    const noteOrName = `${vendorNote} ${vendorAudit.vendorName}`.toLowerCase();
    if (
      noteOrName.includes("cater") ||
      noteOrName.includes("food") ||
      noteOrName.includes("plate") ||
      noteOrName.includes("menu") ||
      noteOrName.includes("buffet") ||
      noteOrName.includes("chaat")
    ) {
      return budgetItems.find((b) => b.category === "catering") || budgetItems[0];
    }
    if (
      noteOrName.includes("decor") ||
      noteOrName.includes("mandap") ||
      noteOrName.includes("flower") ||
      noteOrName.includes("stage")
    ) {
      return budgetItems.find((b) => b.category === "decor") || budgetItems[0];
    }
    if (
      noteOrName.includes("photo") ||
      noteOrName.includes("video") ||
      noteOrName.includes("drone") ||
      noteOrName.includes("album")
    ) {
      return budgetItems.find((b) => b.category === "photography") || budgetItems[0];
    }
    if (
      noteOrName.includes("venue") ||
      noteOrName.includes("hall") ||
      noteOrName.includes("banquet") ||
      noteOrName.includes("lawn")
    ) {
      return budgetItems.find((b) => b.category === "venue") || budgetItems[0];
    }
    if (
      noteOrName.includes("sound") ||
      noteOrName.includes("dg") ||
      noteOrName.includes("generator") ||
      noteOrName.includes("fleet") ||
      noteOrName.includes("shuttle") ||
      noteOrName.includes("transport")
    ) {
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
    const note = CATEGORY_SAMPLE_NOTES[category] || sampleVendorNote;
    setVendorNote(note);
    const offlineRes = auditVendorQuoteOffline(note);
    setVendorAudit(offlineRes);
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

    // 1. Update budget item
    if (onUpdateBudgetItem) {
      onUpdateBudgetItem(activeTargetItem.id, newAmount);
    }

    // 2. Advance matching milestone if in pending state
    if (matchedMilestone && matchedMilestone.status === "pending" && onUpdateTaskStatus) {
      onUpdateTaskStatus(matchedMilestone.id, "in_progress");
    }

    // 3. Log closed-loop event
    logActivityEvent({
      taskId: `sync-${activeTargetItem.id}`,
      taskTitle: `Synced Vendor Quote: ${vendorAudit.vendorName}`,
      category: activeTargetItem.category,
      channel: "system",
      vendorName: vendorAudit.vendorName,
      recipient: "Budget & Contract Ledger",
      summary: `Synced verified quote of ₹${newAmount.toLocaleString("en-IN")} from ${vendorAudit.vendorName} to ${activeTargetItem.label} (Previous: ₹${oldAmount.toLocaleString("en-IN")}). Removed estimate flag & updated contract baseline.`,
      loopStatus: "closed"
    });

    // 4. Action diff notification
    if (onActionTriggered) {
      onActionTriggered(
        `Integrated Quote: ${vendorAudit.vendorName}`,
        `Applied verified vendor quotation of ₹${newAmount.toLocaleString("en-IN")} into ${activeTargetItem.label}. Closed unverified estimate gap.`,
        [
          {
            label: `${activeTargetItem.label} Allocation`,
            before: `₹${oldAmount.toLocaleString("en-IN")} (Estimate)`,
            after: `₹${newAmount.toLocaleString("en-IN")} (Verified)`,
            diff:
              newAmount <= oldAmount
                ? `-₹${(oldAmount - newAmount).toLocaleString("en-IN")}`
                : `+₹${(newAmount - oldAmount).toLocaleString("en-IN")}`,
            isImprovement: newAmount <= oldAmount
          },
          {
            label: "Contract Status",
            before: "Unverified Estimate",
            after: "Audited & Verified",
            diff: "Verified Quote",
            isImprovement: true
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

  const query = (filterQuery || "").trim().toLowerCase();

  // Filter items in real time across budget and milestones
  const filteredBudget = budgetItems.filter(
    (b) =>
      b.label.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query) ||
      (b.notes && b.notes.toLowerCase().includes(query))
  );

  const filteredMilestones = milestones.filter(
    (m) =>
      m.title.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query) ||
      (m.vendorContact?.name && m.vendorContact.name.toLowerCase().includes(query)) ||
      m.id.toLowerCase().includes(query)
  );

  const matchingCount = query ? filteredBudget.length + filteredMilestones.length : 0;

  // Persona-adaptive budget sorting
  const sortedBudget: BudgetItem[] = useMemo(() => {
    const items = [...filteredBudget];
    if (persona === "family_host") {
      // Host: Catering & Venue at the top (hospitality essentials)
      const priority: Record<string, number> = { catering: 1, venue: 2, decor: 3, photography: 4, logistics: 5, miscellaneous: 6 };
      return items.sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
    } else if (persona === "wedding_coordinator") {
      // Coordinator: Unverified estimates first, then highest allocated contracts
      return items.sort((a, b) => {
        if (a.isEstimate !== b.isEstimate) return a.isEstimate ? -1 : 1;
        return b.allocatedAmount - a.allocatedAmount;
      });
    } else if (persona === "community_organizer") {
      // Organizer: Logistics (power/sound/sanitation) & Venue (ground permits) first
      const priority: Record<string, number> = { logistics: 1, venue: 2, catering: 3, decor: 4, photography: 5, miscellaneous: 6 };
      return items.sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
    }
    return items;
  }, [filteredBudget, persona]);

  // Distinct workspace modes to prevent double rendering between Step 1 & Step 2
  const showOverview = activeTab === "overview";
  const showBudget = activeTab === "budget";
  const showDag = activeTab === "dag";
  const showVendor = activeTab === "vendor";
  const showActivity = activeTab === "activity";

  // Per-plate catering cost
  const cateringItem = budgetItems.find((b) => b.category === "catering");
  const cateringPerPlate = cateringItem && guestCount > 0 ? Math.round(cateringItem.allocatedAmount / guestCount) : 0;

  // Milestone completion stats
  const completedMilestones = milestones.filter((m) => m.status === "completed").length;

  return (
    <div className="utsav-r4-main" id={`panel-${activeTab}`} role="tabpanel">
      {/* Prominent Active Search Filter Bar */}
      {query && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between shadow-xs">
          <span className="text-xs font-semibold">
            Filtering by <strong>&quot;{filterQuery}&quot;</strong> — {matchingCount} matching items found
          </span>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
            >
              [Clear]
            </button>
          )}
        </div>
      )}

      {/* PROMINENT ROLE LENS BANNER (DYNAMICALLY ADAPTED DASHBOARD) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 mb-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-5 h-5 text-indigo-700" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-xs font-bold text-slate-900">
                  {persona === "family_host" && "Viewing As: Family Host (Hospitality & Feast Protection Lens)"}
                  {persona === "wedding_coordinator" && "Viewing As: Wedding Coordinator (Contractual SLA & Critical Path Lens)"}
                  {persona === "community_organizer" && "Viewing As: Community Organizer (Civic Permits & Mass Safety Lens)"}
                </strong>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                  Active Persona
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {persona === "family_host" &&
                  `Focus: Food quality & per-plate costs (₹${cateringPerPlate.toLocaleString("en-IN")}/plate for ${guestCount} guests). Protects the feast meal; trims aesthetic decor or miscellaneous buffers first if budget overruns.`}
                {persona === "wedding_coordinator" &&
                  `Focus: Milestone deadlines & vendor contracts. Enforces timeline prerequisites and flags missing 18% GST or unverified quotes.`}
                {persona === "community_organizer" &&
                  `Focus: Municipal NOCs & crowd safety. Prioritizes Fire Safety permits (T-40d), stage permissions, and volunteer assignments for ${guestCount} attendees.`}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Role Quick Action Pills */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Role Shortcuts:</span>
          {persona === "family_host" && (
            <>
              <button
                type="button"
                onClick={() => onSearchChange?.("catering")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer transition-colors"
              >
                🍲 Focus: Feast &amp; Catering
              </button>
              <button
                type="button"
                onClick={() => onSearchChange?.("venue")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 cursor-pointer transition-colors"
              >
                🏰 Focus: Venue &amp; Hospitality
              </button>
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange("budget")}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
                >
                  ✨ Protect Feast in Trade-Offs →
                </button>
              )}
            </>
          )}

          {persona === "wedding_coordinator" && (
            <>
              <button
                type="button"
                onClick={() => onSearchChange?.("estimate")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-900 cursor-pointer transition-colors"
              >
                ⚡ Focus: Unverified Quotes
              </button>
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange("vendor")}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 cursor-pointer transition-colors"
                >
                  📜 Audit Vendor Quotes (18% GST) →
                </button>
              )}
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange("overview")}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
                >
                  ⏱️ Review Critical Path SLAs →
                </button>
              )}
            </>
          )}

          {persona === "community_organizer" && (
            <>
              <button
                type="button"
                onClick={() => onSearchChange?.("logistics")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 cursor-pointer transition-colors"
              >
                🏛️ Focus: Logistics &amp; Power
              </button>
              <button
                type="button"
                onClick={() => onSearchChange?.("permit")}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 cursor-pointer transition-colors"
              >
                📢 Municipal NOC &amp; Fire Safety
              </button>
              {onTabChange && (
                <button
                  type="button"
                  onClick={() => onTabChange("overview")}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 cursor-pointer transition-colors"
                >
                  👥 Volunteer Roster Milestones →
                </button>
              )}
            </>
          )}

          {query && onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer ml-auto"
            >
              [Clear Filter]
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: VISUAL FLOWCHART & EXECUTIVE SUMMARY (NO BUDGET DUPLICATION) */}
      {(showOverview || showDag) && (
        <div className="space-y-4">
          <VisualDependencyFlowchart
            milestones={filteredMilestones}
            topologicalOrder={topologicalOrder}
            bottlenecks={bottlenecks}
            daysRemaining={daysRemaining}
            eventTitle={eventTitle}
            onCycleTaskStatus={onCycleTaskStatus}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onActionTriggered={onActionTriggered}
            language={language}
            persona={persona}
          />

          {/* Executive Summary Card on Step 1 (Replaces duplicated budget cards) */}
          {showOverview && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span>Executive Event Execution Summary</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Step 1 Milestone Progress &amp; Core Health Indicators
                  </p>
                </div>

                {onTabChange && (
                  <button
                    type="button"
                    onClick={() => onTabChange("budget")}
                    className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Proceed to Step 2: Budget &amp; Trade-Offs</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {persona === "family_host" && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Confirmed Guests</span>
                      <strong className="text-slate-900 font-bold font-mono text-sm">
                        {guestCount} Pax ({(guestCount / baseGuestCount).toFixed(2)}x)
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Feast Cost / Plate</span>
                      <strong className="text-emerald-700 font-bold font-mono text-sm">
                        ₹{cateringPerPlate.toLocaleString("en-IN")}/plate
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Hospitality Milestones</span>
                      <strong className="text-slate-900 font-bold font-mono text-sm">
                        {milestones.filter((m) => (m.category === "catering" || m.category === "venue") && m.status === "completed").length} / {milestones.filter((m) => m.category === "catering" || m.category === "venue").length} Locked
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Feast &amp; Catering Buffer</span>
                      <strong className="text-emerald-600 font-bold font-mono text-sm">
                        Protected (Catering on track)
                      </strong>
                    </div>
                  </>
                )}

                {persona === "wedding_coordinator" && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Budget Ceiling</span>
                      <strong className="text-slate-900 font-bold font-mono text-sm">
                        ₹{totalBudgetCap.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Unverified Estimates</span>
                      <strong className="text-amber-700 font-bold font-mono text-sm">
                        {budgetItems.filter((b) => b.isEstimate).length} Quotes Pending
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Critical Path Bottlenecks</span>
                      <strong
                        className={`font-bold font-mono text-sm ${
                          bottlenecks.length > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {bottlenecks.length > 0 ? `${bottlenecks.length} Blocked` : "All Clear"}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Lead Time Deficits</span>
                      <strong className="text-indigo-700 font-bold font-mono text-sm">
                        {milestones.filter((m) => (m.leadTimeDays || m.deadlineDaysBeforeEvent) > daysRemaining && m.status !== "completed").length} Tasks Due
                      </strong>
                    </div>
                  </>
                )}

                {persona === "community_organizer" && (
                  <>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Mass Headcount</span>
                      <strong className="text-slate-900 font-bold font-mono text-sm">
                        {guestCount} Expected Attendees
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Civic Permits &amp; NOC</span>
                      <strong className="text-emerald-700 font-bold font-mono text-sm">
                        {milestones.filter((m) => m.title.toLowerCase().includes("permit") || m.title.toLowerCase().includes("noc") || m.title.toLowerCase().includes("safety")).every((m) => m.status === "completed") ? "All Cleared" : "Action Needed"}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Power &amp; Sound Grid</span>
                      <strong className="text-slate-900 font-bold font-mono text-sm">
                        {budgetItems.find((b) => b.category === "logistics")?.allocatedAmount ? `₹${budgetItems.find((b) => b.category === "logistics")!.allocatedAmount.toLocaleString("en-IN")}` : "Allocated"}
                      </strong>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <span className="text-slate-500 text-[11px] block">Logistics Tasks</span>
                      <strong className="text-indigo-700 font-bold font-mono text-sm">
                        {milestones.filter((m) => m.category === "logistics").length} Crew Milestones
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: BUDGET ALLOCATION LEDGER & TRADE-OFFS (DEDICATED STEP 2) */}
      {showBudget && (
        <section aria-labelledby="budget-ledger-title" className="utsav-card">
          <div className="utsav-card-header">
            <div>
              <h2 id="budget-ledger-title" className="utsav-card-title flex items-center gap-2">
                <span>{t.budgetLedgerTitle}</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  ({t.scalesWithGuests})
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 font-mono tabular-nums">
                Total: ₹{totalAllocated.toLocaleString("en-IN")} / ₹{totalBudgetCap.toLocaleString("en-IN")}
              </span>
              <span
                className={`utsav-badge ${
                  variance >= 0 ? "utsav-badge-ontrack" : "utsav-badge-critical"
                }`}
              >
                {variance >= 0
                  ? `₹${variance.toLocaleString("en-IN")} ${t.varianceSurplus}`
                  : `₹${Math.abs(variance).toLocaleString("en-IN")} ${t.varianceDeficit}`}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Catering and logistics scale linearly with guest headcount (ratio:{" "}
            <strong>{(guestCount / baseGuestCount).toFixed(2)}x</strong>), while venue and photography remain fixed contract costs.
          </p>

          {/* CLOSED-LOOP HUMAN TRADE-OFF RESOLUTION BANNER */}
          {closedLoopNotice && (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-4 mb-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      {closedLoopNotice.title}
                    </h3>
                    <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
                      {closedLoopNotice.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {closedLoopNotice.actionTab && onTabChange && (
                    <button
                      type="button"
                      onClick={() => onTabChange(closedLoopNotice.actionTab!)}
                      className="utsav-btn bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{closedLoopNotice.actionLabel || "Audit Vendor Quotes & Dispatch Addendums →"}</span>
                    </button>
                  )}
                  {onDismissClosedLoopNotice && (
                    <button
                      type="button"
                      onClick={onDismissClosedLoopNotice}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1 cursor-pointer"
                      title="Dismiss notice"
                    >
                      [Dismiss]
                    </button>
                  )}
                </div>
              </div>

              {closedLoopNotice.affectedCategories && closedLoopNotice.affectedCategories.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block mb-2">
                    Scope Reductions &amp; Contract Addendums Incorporated Into Vendor Ledger Notes:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {closedLoopNotice.affectedCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-emerald-200 rounded-lg p-2.5 text-xs flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <strong className="text-slate-900 font-bold">{cat.label}</strong>
                          <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded text-[11px]">
                            {cat.delta < 0 ? `-₹${Math.abs(cat.delta).toLocaleString("en-IN")}` : `+₹${cat.delta.toLocaleString("en-IN")}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 italic leading-snug">
                          &quot;{cat.rationale}&quot;
                        </p>
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>New Allocation: ₹{cat.newAllocated.toLocaleString("en-IN")}</span>
                          {onTabChange && (
                            <button
                              type="button"
                              onClick={() => {
                                onSearchChange?.(cat.category);
                                onTabChange("vendor");
                              }}
                              className="text-indigo-600 hover:underline font-bold cursor-pointer"
                            >
                              Dispatch Addendum →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
            {sortedBudget.map((item: BudgetItem) => {
              const scaledCat = scaledCategories.find((s) => s.category === item.category);
              const perPlate =
                item.category === "catering" && guestCount > 0
                  ? Math.round(item.allocatedAmount / guestCount)
                  : null;

              const isCardCritical =
                (triageTier === "CRITICAL_OVERRUN" || variance < 0) &&
                (item.isEstimate ||
                  (item.category === "catering" && guestCount > baseGuestCount) ||
                  item.allocatedAmount > totalBudgetCap * 0.35);

              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-3.5 flex flex-col justify-between transition-colors shadow-xs ${
                    isCardCritical
                      ? "border-2 border-rose-400 bg-rose-50/40 hover:border-rose-500"
                      : "bg-white border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCardCritical && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
                        )}
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>

                        {/* Dynamic Role Lens Tag */}
                        {persona === "family_host" && item.category === "catering" && (
                          <span className="utsav-badge utsav-badge-ontrack text-[10px]">
                            👑 Hospitality Focus
                          </span>
                        )}
                        {persona === "family_host" && item.category === "venue" && (
                          <span className="utsav-badge utsav-badge-vendor text-[10px]">
                            👑 Host Essential
                          </span>
                        )}
                        {persona === "wedding_coordinator" && item.isEstimate && (
                          <span className="utsav-badge utsav-badge-timeline text-[10px]">
                            ⚡ SLA Check · Unverified
                          </span>
                        )}
                        {persona === "wedding_coordinator" && !item.isEstimate && item.allocatedAmount > totalBudgetCap * 0.25 && (
                          <span className="utsav-badge utsav-badge-vendor text-[10px]">
                            ⚡ Major Contract
                          </span>
                        )}
                        {persona === "community_organizer" && item.category === "logistics" && (
                          <span className="utsav-badge utsav-badge-critical text-[10px]">
                            🛡️ Public Safety Mandate
                          </span>
                        )}
                        {persona === "community_organizer" && item.category === "venue" && (
                          <span className="utsav-badge utsav-badge-vendor text-[10px]">
                            🛡️ Municipal Ground NOC
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono uppercase text-slate-500">
                        {item.category} · {scaledCat?.isVariable ? t.scalesWithGuests : t.fixedContract}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.isEstimate && (
                        <button
                          type="button"
                          onClick={() => handleStartVendorAuditForCategory(item.category)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 cursor-pointer flex items-center gap-1 transition-colors"
                          title={`Audit quotation for ${item.label} in Step 3`}
                        >
                          <span>📜 Audit Quote →</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onToggleVerified(item.id)}
                        title="Click to toggle Verified Quote vs Estimated Assumption"
                        className="cursor-pointer"
                      >
                        {item.isEstimate ? (
                          <span className="utsav-badge utsav-badge-timeline hover:opacity-85 text-[10px]">
                            {t.unverifiedEstimate}
                          </span>
                        ) : (
                          <span className="utsav-badge utsav-badge-ontrack hover:opacity-85 text-[10px]">
                            {t.verifiedQuote}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mb-2.5">
                      <p className="text-[11px] text-slate-600 italic leading-snug">
                        &quot;{item.notes}&quot;
                      </p>
                      {item.notes.includes("[Scope Revised") && onTabChange && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            📝 Scope Revised
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onSearchChange?.(item.category);
                              onTabChange("vendor");
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                          >
                            Draft Vendor Addendum →
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      {perPlate ? `₹${perPlate.toLocaleString("en-IN")}/plate` : t.fixedContract}
                    </span>
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-mono">₹</span>
                        <input
                          type="number"
                          value={editAmountValue}
                          onChange={(e) => setEditAmountValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(editAmountValue, 10);
                              if (!isNaN(val) && val >= 0 && onUpdateBudgetItem) {
                                onUpdateBudgetItem(item.id, val);
                              }
                              setEditingItemId(null);
                            } else if (e.key === "Escape") {
                              setEditingItemId(null);
                            }
                          }}
                          className="w-24 px-1.5 py-0.5 border border-indigo-500 rounded text-xs font-mono font-bold bg-white text-slate-900 outline-none"
                          autoFocus
                          aria-label={`Edit allocated amount for ${item.label}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseInt(editAmountValue, 10);
                            if (!isNaN(val) && val >= 0 && onUpdateBudgetItem) {
                              onUpdateBudgetItem(item.id, val);
                            }
                            setEditingItemId(null);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                          title="Save amount"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItemId(null)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold tabular-nums font-mono text-sm">
                          ₹{item.allocatedAmount.toLocaleString("en-IN")}
                        </strong>
                        {onUpdateBudgetItem && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditAmountValue(item.allocatedAmount.toString());
                            }}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-1 py-0.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-0.5"
                            title={`Edit amount for ${item.label}`}
                            aria-label={`Edit amount for ${item.label}`}
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TWO-TRACK DEFICIT RESOLUTION OPTIONS (OPTION 1: TOP-UP BUDGET, OPTION 2: TRADE-OFF STRATEGIES) */}
          {variance < 0 && (
            <div
              className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-xs"
              aria-live="polite"
              aria-busy="false"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Deficit Resolution Options: Choose Your Path
                    </h3>
                    <span className="text-[11px] text-rose-700">
                      Current Deficit: <strong>₹{Math.abs(variance).toLocaleString("en-IN")}</strong>. Choose to allocate more budget, or rebalance category expenses.
                    </span>
                  </div>
                </div>
              </div>

              {/* OPTION 1: ALLOCATE MORE BUDGET (SIMPLEST REAL-WORLD FIX) */}
              {onTopUpBudget && (
                <div className="bg-white border-2 border-emerald-500 rounded-xl p-3.5 mb-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-base font-bold text-emerald-700">₹</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          Option 1: Allocate More Budget (+₹{Math.abs(variance).toLocaleString("en-IN")} Top-Up)
                        </strong>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded font-mono">
                          Direct Solution
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        Self-Fund / Family Contribution. Expand the authorized budget cap from ₹{(totalBudgetCap / 100000).toFixed(2)}L to ₹{((totalBudgetCap + Math.abs(variance)) / 100000).toFixed(2)}L to absorb the entire deficit without trimming feast menus, floral decor, or guest shuttles.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTopUpBudget(Math.abs(variance))}
                    className="utsav-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                  >
                    ⚡ Top-Up Budget (+₹{Math.abs(variance).toLocaleString("en-IN")})
                  </button>
                </div>
              )}

              {/* OPTION 2: COST-CUTTING TRADE-OFF STRATEGIES */}
              {tradeoffs.length > 0 && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                        Option 2: Rebalance Expenses via Category Trade-Offs
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          aiProvenance === "ai"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {aiProvenance === "ai"
                          ? "✨ Gemini 3.5 Live AI Proposal"
                          : "🛡️ Deterministic Heuristic"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onConsultAiTradeoffs && (
                        <button
                          type="button"
                          onClick={onConsultAiTradeoffs}
                          disabled={isRebalancing}
                          className="utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] px-3 py-1 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-200" aria-hidden="true" />
                          <span>{isRebalancing ? "Consulting Gemini 3.5..." : "✨ Consult Gemini 3.5 AI"}</span>
                        </button>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {tradeoffs.length} Strategies Available
                      </span>
                    </div>
                  </div>

                  {aiNarrative && (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-lg p-3 mb-2.5 shadow-xs text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                        <span>Gemini 3.5 Strategic Recommendation</span>
                      </div>
                      <SafeNarrative content={aiNarrative} className="text-xs leading-relaxed text-indigo-900" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    {tradeoffs.map((strategy, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-rose-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors shadow-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <strong className="text-xs font-bold text-slate-900">
                              {strategy.strategyTitle}
                            </strong>

                            {/* Dynamic Role Recommendation Badges */}
                            {idx === 0 && persona === "family_host" && (
                              <span className="utsav-badge utsav-badge-ontrack text-[10px] font-bold">
                                ★ Recommended for Family Host (Safeguards Feast &amp; Guest Comfort)
                              </span>
                            )}
                            {idx === 1 && persona === "wedding_coordinator" && (
                              <span className="utsav-badge utsav-badge-vendor text-[10px] font-bold">
                                ★ Recommended for Wedding Coordinator (Strict Contract &amp; Cost Control)
                              </span>
                            )}
                            {idx === 2 && persona === "community_organizer" && (
                              <span className="utsav-badge utsav-badge-timeline text-[10px] font-bold">
                                ★ Recommended for Community Organizer (Preserves Mass Gathering Safety)
                              </span>
                            )}
                          </div>
                          <SafeNarrative content={strategy.description} className="text-[11px] text-slate-600 mb-1" />
                          <div className="flex flex-wrap gap-1.5">
                            {strategy.adjustments.map((adj, aIdx) => (
                              <span
                                key={aIdx}
                                className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold"
                              >
                                {adj.category}: {adj.delta < 0 ? `-₹${Math.abs(adj.delta).toLocaleString("en-IN")}` : `+₹${adj.delta.toLocaleString("en-IN")}`}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApplyTradeoff(strategy)}
                          className="utsav-btn utsav-btn-primary text-xs px-3.5 py-2 font-bold shrink-0 cursor-pointer shadow-xs"
                        >
                          {t.applyStrategy}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REAL-TIME OPERATIONS TRACKER (CLOSED-LOOP VERIFICATION) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Real-Time Operations Tracker · Closed-Loop Execution
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Track live ground changes, log vendor updates, and maintain an immutable audit trail.
                  </span>
                </div>
              </div>

              {/* Loop Status Badges */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  {budgetItems.filter((b) => !b.isEstimate).length}/{budgetItems.length} Quotes Locked
                </span>
                <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-bold">
                  {milestones.filter((m) => m.status === "completed").length}/{milestones.length} Milestones Done
                </span>
              </div>
            </div>

            {/* Quick Live Event Logger Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label htmlFor="live-event-input" className="text-xs font-semibold text-slate-700 block mb-1.5">
                + Log Real-Time Ground Change / Vendor Decision:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="live-event-input"
                  type="text"
                  value={liveEventText}
                  onChange={(e) => setLiveEventText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && liveEventText.trim()) {
                      handleCommitLiveEvent();
                    }
                  }}
                  placeholder="e.g. Extra 25 chairs requested by bride's family, or Caterer confirmed arrival at 4:30 PM..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
                <select
                  value={liveEventCategory}
                  onChange={(e) => setLiveEventCategory(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 outline-none"
                >
                  <option value="catering">Catering</option>
                  <option value="decor">Decor</option>
                  <option value="venue">Venue</option>
                  <option value="photography">Photography</option>
                  <option value="logistics">Logistics</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
                <button
                  type="button"
                  onClick={handleCommitLiveEvent}
                  disabled={!liveEventText.trim()}
                  className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-bold shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  Record & Close Loop
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Every logged event is timestamped, categorized, and added to the immutable audit trail (Step 4) with <code>loopStatus: closed</code>.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: PLAIN-TEXT VENDOR QUOTE AUDITOR */}
      {showVendor && (
        <section aria-labelledby="vendor-auditor-title" className="utsav-card">
          <div className="utsav-card-header">
            <div>
              <h2 id="vendor-auditor-title" className="utsav-card-title flex items-center gap-2">
                <span>Plain-Text Vendor Quote Auditor</span>
                <span className="text-xs font-normal text-slate-500 font-mono">
                  (&lt;250 Tokens / WhatsApp Link Generator)
                </span>
              </h2>
            </div>
            <span className="utsav-badge utsav-badge-vendor">Zero OCR Lag</span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Vendor quotes are audited from plain-text WhatsApp snippets. The engine audits omitted 18% GST, generator fuel running hours, and hall cleaning deposits.
          </p>

          <div className="mb-3">
            <textarea
              rows={3}
              value={vendorNote}
              onChange={(e) => setVendorNote(e.target.value)}
              placeholder="Paste vendor WhatsApp message, invoice breakdown, or quote note here..."
              className="utsav-input text-xs font-mono resize-y"
              aria-label="Vendor Quotation Plain-Text Note"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleAudit}
                disabled={isAuditing}
                className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {isAuditing && <Sparkles className="w-3 h-3 text-amber-300 animate-spin" aria-hidden="true" />}
                <span>{isAuditing ? "Auditing with Gemini 3.5..." : "Audit Vendor Note"}</span>
              </button>
            </div>
          </div>

          {/* Audit Results Card */}
          <div
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs"
            aria-live="polite"
            aria-busy={isAuditing}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3 mb-3">
              <div>
                <strong className="text-xs font-bold text-slate-900 block">
                  {vendorAudit.vendorName}
                </strong>
                <span className="text-[11px] text-slate-500">
                  Detected Base Amount:{" "}
                  <strong className="text-slate-800 tabular-nums">
                    ₹{vendorAudit.quotedAmount.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
              <span
                className={`utsav-badge text-[10px] font-semibold border ${
                  auditProvenance === "ai"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "utsav-badge-ontrack"
                }`}
              >
                {auditProvenance === "ai" ? "✨ Gemini 3.5 Live AI Audit" : "🛡️ Deterministic Guard Active"}
              </span>
            </div>

            {/* INTEGRATION & CLOSED-LOOP BUDGET SYNC CARD */}
            <div className="bg-white border-2 border-indigo-200 rounded-xl p-3.5 mb-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Integrate Quote with Event Budget &amp; Milestones</span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                        Closed Loop
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Directly apply this audited ₹{vendorAudit.quotedAmount.toLocaleString("en-IN")} quote into your budget allocation ledger and advance dependent milestones.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="target-budget-item-select" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Target Category:
                  </label>
                  <select
                    id="target-budget-item-select"
                    value={activeTargetItem?.id || ""}
                    onChange={(e) => setSelectedTargetItemId(e.target.value)}
                    className="utsav-select text-xs font-semibold py-1 px-2 border-slate-300 rounded bg-slate-50"
                    aria-label="Select target budget category to apply quote"
                  >
                    {budgetItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} (Current: ₹{b.allocatedAmount.toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {syncFeedback ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-emerald-950">
                      Applied <strong>₹{syncFeedback.amount.toLocaleString("en-IN")}</strong> to <strong>{syncFeedback.categoryLabel}</strong> (Verified Quote Locked).
                      {syncFeedback.milestoneTitle && (
                        <span className="text-emerald-800 font-normal"> Linked milestone <em>&quot;{syncFeedback.milestoneTitle}&quot;</em> progressed.</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {onTabChange && (
                      <button
                        type="button"
                        onClick={() => onTabChange("budget")}
                        className="utsav-btn bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] px-2.5 py-1 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <span>View in Step 2: Budget</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Target Line: <strong className="text-slate-900">{activeTargetItem?.label}</strong>
                    </span>
                    <span>
                      Current: <span className="font-mono font-bold text-slate-800">₹{activeTargetItem?.allocatedAmount.toLocaleString("en-IN")}</span>
                      {activeTargetItem?.isEstimate && <span className="text-amber-700 font-bold ml-1">(Unverified)</span>}
                    </span>
                    <span>
                      Audited Quote: <span className="font-mono font-bold text-indigo-700">₹{vendorAudit.quotedAmount.toLocaleString("en-IN")}</span>
                    </span>
                    {activeTargetItem && (
                      <span className="font-mono text-[11px] font-bold">
                        {vendorAudit.quotedAmount <= activeTargetItem.allocatedAmount ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Saves ₹{(activeTargetItem.allocatedAmount - vendorAudit.quotedAmount).toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Deficit +₹{(vendorAudit.quotedAmount - activeTargetItem.allocatedAmount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncVendorQuoteToBudget}
                    className="utsav-btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>⚡ Apply to Budget &amp; Lock Verified</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Flagged Hidden Costs with High-Contrast Solid Indicator */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" aria-hidden="true" />
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                <span>Flagged Potential Hidden Costs:</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5">
                {vendorAudit.flaggedHiddenCosts.map((cost, cIdx) => (
                  <li
                    key={cIdx}
                    className="border-2 border-rose-300 bg-rose-50 rounded-lg p-2 text-[11px] leading-snug flex items-start gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" aria-hidden="true" />
                    <span>{cost}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3 Negotiation Questions with WhatsApp Dispatch */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>Contextual Negotiation Prompts (1-Click WhatsApp):</span>
              </div>
              <div className="flex flex-col gap-2">
                {vendorAudit.negotiationQuestions.map((q, qIdx) => {
                  const waUrl = generateWhatsAppLink(
                    vendorPhone,
                    `Namaste! Regarding the quotation for our celebration: ${q}`
                  );
                  return (
                    <div
                      key={qIdx}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <span className="text-slate-700 text-[11px] leading-snug">&quot;{q}&quot;</span>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          logActivityEvent({
                            taskId: "vendor-question",
                            taskTitle: `Dispatched Negotiation Question #${qIdx + 1}`,
                            category: "miscellaneous",
                            channel: "whatsapp",
                            vendorName: vendorAudit.vendorName,
                            recipient: vendorPhone,
                            summary: `Dispatched question on WhatsApp: "${q}"`,
                            loopStatus: "awaiting_call"
                          });
                        }}
                        className="utsav-btn bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1 font-semibold shrink-0 flex items-center gap-1 cursor-pointer"
                        aria-label={`Send question ${qIdx + 1} to vendor on WhatsApp`}
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: LIVE ACTIVITY & LOOP-CLOSURE AUDIT HISTORY */}
      {showActivity && (
        <ActivityHistoryPanel isEmbedded={true} />
      )}
    </div>
  );
};

export default MainPanel;
