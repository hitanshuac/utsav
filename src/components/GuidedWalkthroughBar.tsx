import React from "react";
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  FileSearch,
  Sliders,
  Users,
  Utensils,
  Accessibility
} from "lucide-react";
import { TopicTabId } from "./TopicTabs";

interface GuidedWalkthroughBarProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  eventTitle: string;
  onEventTitleChange: (title: string) => void;
  budgetCap: number;
  onBudgetCapChange: (cap: number) => void;
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  daysRemaining: number;
  onDaysRemainingChange: (days: number) => void;
  dietaryProfile: string;
  onDietaryProfileChange: (diet: string) => void;
  guestAccessibility: string;
  onGuestAccessibilityChange: (acc: string) => void;
  overrunAmount: number;
  variance: number;
  bottleneckCount: number;
  tradeoffsCount: number;
  onApplyFirstTradeoff?: () => void;
  onOpenCustomEvent: () => void;
  onOpenActivityHistory: () => void;
  onSwitchTab: (tab: TopicTabId) => void;
}

export const GuidedWalkthroughBar: React.FC<GuidedWalkthroughBarProps> = ({
  currentStep,
  onStepChange,
  eventTitle,
  onEventTitleChange,
  budgetCap,
  onBudgetCapChange,
  guestCount,
  onGuestCountChange,
  daysRemaining,
  onDaysRemainingChange,
  dietaryProfile,
  onDietaryProfileChange,
  guestAccessibility,
  onGuestAccessibilityChange,
  overrunAmount,
  variance,
  bottleneckCount,
  tradeoffsCount,
  onApplyFirstTradeoff,
  onOpenCustomEvent,
  onOpenActivityHistory,
  onSwitchTab
}) => {
  const steps = [
    {
      num: 1,
      id: "intake",
      title: "Step 1: Event Intake & Constraints",
      short: "1. Intake",
      desc: "Title, Budget, Guest Count, Days Left & Dietary Profile"
    },
    {
      num: 2,
      id: "budget",
      title: "Step 2: Budget & Overrun Resolution",
      short: "2. Budget Fix",
      desc: "Per-plate scaling & 1-click deterministic trade-off elimination"
    },
    {
      num: 3,
      id: "dag",
      title: "Step 3: Dependency Flowchart & Delays",
      short: "3. Flowchart & Delays",
      desc: "Topological node graph, +30m delay cascade & vendor dispatch"
    },
    {
      num: 4,
      id: "vendor",
      title: "Step 4: Vendor Audit & Loop Closure",
      short: "4. Audit & History",
      desc: "Hidden GST audit, WhatsApp clarification & activity history log"
    }
  ];

  const handleStepClick = (stepNum: number) => {
    onStepChange(stepNum);
    if (stepNum === 1) onSwitchTab("overview");
    else if (stepNum === 2) onSwitchTab("budget");
    else if (stepNum === 3) onSwitchTab("dag");
    else if (stepNum === 4) onSwitchTab("vendor");
  };

  const handleNextStep = () => {
    const next = currentStep < 4 ? currentStep + 1 : 1;
    handleStepClick(next);
  };

  return (
    <div
      role="region"
      aria-label="4-Step Guided Walkthrough Bar"
      className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 shadow-xs"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col gap-3">
        {/* Step Navigation Pill Strip */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {steps.map((st) => {
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => handleStepClick(st.num)}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : isPast
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                      isActive
                        ? "bg-white text-slate-900"
                        : isPast
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-300 text-slate-700"
                    }`}
                  >
                    {isPast ? "✓" : st.num}
                  </span>
                  <span>{st.short}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-bold shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>{currentStep === 4 ? "Restart Walkthrough ↺" : "Complete & Next Step →"}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Active Step Interactive Guidance Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 text-xs">
          {/* STEP 1: EVENT INTAKE & CONSTRAINTS */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" aria-hidden="true" />
                  <strong className="text-slate-900 font-bold">
                    Step 1: Event Intake &amp; Multi-Generational Constraints
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenCustomEvent}
                    className="utsav-btn bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] px-2.5 py-1 font-semibold"
                  >
                    + Custom Event Guided Wizard
                  </button>
                </div>
              </div>

              {/* Inline Guided Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div className="lg:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => onEventTitleChange(e.target.value)}
                    className="utsav-input text-xs py-1.5"
                    aria-label="Event Title"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Budget Cap (₹)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    value={budgetCap}
                    onChange={(e) => onBudgetCapChange(Number(e.target.value))}
                    className="utsav-input text-xs py-1.5 font-mono"
                    aria-label="Total Budget Cap"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Guest Count (Pax)
                  </label>
                  <input
                    type="number"
                    step={10}
                    value={guestCount}
                    onChange={(e) => onGuestCountChange(Number(e.target.value))}
                    className="utsav-input text-xs py-1.5 font-mono"
                    aria-label="Guest Count"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Dietary Profile
                  </label>
                  <select
                    value={dietaryProfile}
                    onChange={(e) => onDietaryProfileChange(e.target.value)}
                    className="utsav-input text-xs py-1.5"
                    aria-label="Dietary Profile Selection"
                  >
                    <option value="Jain Pure Veg">Jain Pure Veg (No Onion/Garlic)</option>
                    <option value="Vegan Friendly">Vegan &amp; Satvik Buffet</option>
                    <option value="Multi-Cuisine Feast">Multi-Cuisine Feast</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Accessibility Needs
                  </label>
                  <select
                    value={guestAccessibility}
                    onChange={(e) => onGuestAccessibilityChange(e.target.value)}
                    className="utsav-input text-xs py-1.5"
                    aria-label="Guest Accessibility Selection"
                  >
                    <option value="Children + Seniors">Children &amp; Seniors Focus</option>
                    <option value="Wheelchair Accessible">Wheelchair &amp; Ramp Access</option>
                    <option value="Standard Multi-Gen">Standard Multi-Gen</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BUDGET & OVERRUN RESOLUTION */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-rose-600" aria-hidden="true" />
                  <strong className="text-slate-900 font-bold">
                    Step 2: Budget &amp; Overrun Resolution (Linear Plate Scaling)
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => onSwitchTab("budget")}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  View Full Budget Ledger →
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">
                <div>
                  {overrunAmount > 0 ? (
                    <div>
                      <span className="text-rose-700 font-bold flex items-center gap-1.5">
                        <span className="critical-pulse-dot" />
                        <span>
                          Active Overrun Detected: ₹{overrunAmount.toLocaleString("en-IN")} deficit
                        </span>
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Guest headcount scaling expanded variable catering and logistics. Apply a
                        deterministic trade-off below to balance allocations instantly.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Budget is 100% Balanced (Zero Deficit)</span>
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Allocated expenses are within the ₹{budgetCap.toLocaleString("en-IN")} cap. Surplus buffer: ₹
                        {variance.toLocaleString("en-IN")}.
                      </p>
                    </div>
                  )}
                </div>

                {overrunAmount > 0 && onApplyFirstTradeoff && (
                  <button
                    type="button"
                    onClick={onApplyFirstTradeoff}
                    className="utsav-btn bg-rose-600 hover:bg-rose-700 text-white text-xs px-3.5 py-1.5 font-bold shadow-xs shrink-0 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>⚡ 1-Click Rebalance Trade-Off</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: VISUAL DEPENDENCY FLOWCHART & DELAYS */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                  <strong className="text-slate-900 font-bold">
                    Step 3: Visual Dependency Flowchart &amp; Ceremony Delay Cascade
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => onSwitchTab("dag")}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Open Interactive Flowchart →
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">
                <div>
                  <span className="text-slate-800 font-bold block mb-0.5">
                    Topological Milestone Schedule Active
                  </span>
                  <p className="text-[11px] text-slate-600">
                    {bottleneckCount > 0
                      ? `${bottleneckCount} critical milestone bottleneck(s) require action. Click any blocked node in the flowchart to unlock prerequisites or simulate delay cascades.`
                      : "All prerequisite dependencies are currently aligned. Click any node in the flowchart to simulate timing shifts (+30m) or dispatch vendor edge-case templates."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSwitchTab("dag")}
                  className="utsav-btn utsav-btn-primary text-xs px-3 py-1.5 font-semibold shrink-0"
                >
                  Inspect Flowchart Nodes
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: VENDOR QUOTE AUDIT & LOOP CLOSURE HISTORY */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <strong className="text-slate-900 font-bold">
                    Step 4: Vendor Quote Audit &amp; Activity History Log
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => onSwitchTab("vendor")}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Open Vendor Quote Auditor →
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3">
                <div>
                  <span className="text-slate-800 font-bold block mb-0.5">
                    Audit Plain-Text WhatsApp Quotes &amp; Close Communication Loops
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Audit vendor notes for hidden costs (18% GST, generator fuel), dispatch WhatsApp
                    negotiations, and click <strong>&quot;✓ Close Loop&quot;</strong> in the Activity History Log
                    to verify vendor readiness.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenActivityHistory}
                  className="utsav-btn bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5 font-semibold shrink-0 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Inspect Activity History Log</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuidedWalkthroughBar;
