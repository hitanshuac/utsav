import React from "react";
import { WalletCards, GitBranch, FileSearch, Clock, ArrowRight } from "lucide-react";
import { SupportedLanguage, TRANSLATIONS } from "../lib/i18n";

export type TopicTabId = "overview" | "budget" | "dag" | "vendor" | "activity";

interface TopicTabsProps {
  activeTab: TopicTabId;
  onTabChange: (tab: TopicTabId) => void;
  overrunCount?: number;
  bottleneckCount?: number;
  language?: SupportedLanguage;
}

export const TopicTabs: React.FC<TopicTabsProps> = ({
  activeTab,
  onTabChange,
  overrunCount = 0,
  bottleneckCount = 0,
  language = "en"
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const tabs: { id: TopicTabId; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: "overview",
      label: "Step 1: Visual Flowchart",
      icon: <GitBranch className="w-4 h-4 shrink-0" aria-hidden="true" />,
      badge: bottleneckCount > 0 ? `${bottleneckCount} Blocked` : undefined,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
    },
    {
      id: "budget",
      label: "Step 2: Budget & Trade-Offs",
      icon: <WalletCards className="w-4 h-4 shrink-0" aria-hidden="true" />,
      badge: overrunCount > 0 ? "Deficit" : undefined,
      badgeColor: "bg-rose-100 text-rose-700 border-rose-200"
    },
    {
      id: "vendor",
      label: "Step 3: Vendor Quotes",
      icon: <FileSearch className="w-4 h-4 shrink-0" aria-hidden="true" />
    },
    {
      id: "activity",
      label: "Step 4: Activity Log",
      icon: <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
    }
  ];

  const stepOrder: TopicTabId[] = ["overview", "budget", "vendor", "activity"];

  const handleNextStep = () => {
    const currentKey = activeTab === "dag" ? "overview" : activeTab;
    const currentIdx = stepOrder.indexOf(currentKey);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % stepOrder.length : 0;
    onTabChange(stepOrder[nextIdx]);
  };

  const tips: Record<string, string> = {
    overview: "Step 1: Visual Dependency Flowchart maps prerequisite sequences. High-contrast solid borders highlight blocked items with 1-click resolution.",
    budget: "Step 2: Variable catering scales with guest headcount; fixed costs remain locked. 1-click trade-offs resolve deficits.",
    vendor: "Step 3: Paste plain-text WhatsApp quotes to audit hidden costs (18% GST, generator fuel) and dispatch prompts.",
    activity: "Step 4: Immutable audit trail records every status transition, simulation, and closed communication loop."
  };

  const activeKey = activeTab === "dag" ? "overview" : activeTab;
  const currentTip = tips[activeKey] || tips.overview;

  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onTabChange(nextTab.id);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs overflow-hidden">
      {/* 4-Step Guided Bar Container with NO scrollbars */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 overflow-hidden">
        <nav
          className="utsav-r2-tabbar flex items-center gap-1.5 flex-1 overflow-hidden border-b-0 py-0"
          role="tablist"
          aria-label="Event Execution Workspaces"
        >
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id || (tab.id === "overview" && activeTab === "dag");
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[idx] = el; }}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                title={isActive ? currentTip : undefined}
                className={`utsav-tab-btn whitespace-nowrap shrink-0 flex items-center gap-1.5 text-xs py-2 px-3 ${isActive ? "active font-bold text-slate-900 border-b-2 border-orange-600" : "text-slate-600 hover:text-slate-900"}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side: Single Clean Next Step Button with tooltip in title */}
        <button
          type="button"
          onClick={handleNextStep}
          title={currentTip}
          className="utsav-btn utsav-btn-primary text-xs px-3.5 py-1.5 font-bold shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
          aria-label="Advance to next step"
        >
          <span>{t.nextStep}</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
