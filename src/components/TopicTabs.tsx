import React from "react";
import { LayoutDashboard, WalletCards, GitBranch, FileSearch } from "lucide-react";

export type TopicTabId = "overview" | "budget" | "dag" | "vendor";

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
    }
  ];

  return (
    <nav
      className="utsav-r2-tabbar overflow-x-auto"
      role="tablist"
      aria-label="Event Execution Workspaces"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
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
