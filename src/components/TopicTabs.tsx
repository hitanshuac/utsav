import React from "react";
import { LayoutDashboard, WalletCards, GitBranch, FileSearch, Clock } from "lucide-react";

export type TopicTabId = "overview" | "budget" | "dag" | "vendor" | "activity";

interface TopicTabsProps {
  activeTab: TopicTabId;
  onTabChange: (tab: TopicTabId) => void;
  overrunCount?: number;
  bottleneckCount?: number;
}

export const TopicTabs: React.FC<TopicTabsProps> = ({
  activeTab,
  onTabChange,
  overrunCount = 0,
  bottleneckCount = 0
}) => {
  const tabs: { id: TopicTabId; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: "overview",
      label: "Executive Overview",
      icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
    },
    {
      id: "budget",
      label: "Budget & Trade-offs",
      icon: <WalletCards className="w-4 h-4" aria-hidden="true" />,
      badge: overrunCount > 0 ? "Deficit" : undefined,
      badgeColor: "bg-rose-100 text-rose-700 border-rose-200"
    },
    {
      id: "dag",
      label: "Dependency DAG",
      icon: <GitBranch className="w-4 h-4" aria-hidden="true" />,
      badge: bottleneckCount > 0 ? `${bottleneckCount} Blocked` : undefined,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200"
    },
    {
      id: "vendor",
      label: "Vendor Quote Auditor",
      icon: <FileSearch className="w-4 h-4" aria-hidden="true" />
    },
    {
      id: "activity",
      label: "Activity & Loop History",
      icon: <Clock className="w-4 h-4" aria-hidden="true" />
    }
  ];

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
    <nav
      className="utsav-r2-tabbar overflow-x-auto"
      role="tablist"
      aria-label="Event Execution Workspaces"
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
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
            className={`utsav-tab-btn whitespace-nowrap shrink-0 ${isActive ? "active" : ""}`}
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
  );
};
