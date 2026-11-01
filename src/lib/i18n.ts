export type SupportedLanguage = "en";

export interface Translations {
  appName: string;
  tagline: string;
  searchPlaceholder: string;
  deterministicEngine: string;
  roleLensLabel: string;
  languageLabel: string;
  judgePresets: string;
  activityLog: string;
  nextStep: string;
  // Tabs
  tabOverview: string;
  tabBudget: string;
  tabVendor: string;
  tabActivity: string;
  // Header
  daysOut: string;
  confirmedGuests: string;
  planCustomEvent: string;
  resetPreset: string;
  exportCalendar: string;
  templateExplainer: string;
  // Flowchart
  flowchartTitle: string;
  flowchartSubtitle: string;
  flowchartKahnDag: string;
  flowchartLegendNormal: string;
  flowchartLegendBlocked: string;
  flowchartRequires: string;
  flowchartUnlocks: string;
  flowchartWaitingOn: string;
  flowchartDelayCascade: string;
  flowchartSimulate30m: string;
  flowchartSimulate60m: string;
  flowchartVendorOutreach: string;
  flowchartDispatchWhatsapp: string;
  // Budget
  budgetLedgerTitle: string;
  budgetCapLabel: string;
  totalAllocatedLabel: string;
  varianceSurplus: string;
  varianceDeficit: string;
  scalesWithGuests: string;
  fixedContract: string;
  verifiedQuote: string;
  unverifiedEstimate: string;
  // Trade-offs
  tradeoffTitle: string;
  tradeoffSubtitle: string;
  applyStrategy: string;
  // Sidebar
  whatIfSimulator: string;
  guestCountLabel: string;
  budgetCapSlider: string;
  daysToEventSlider: string;
  runStressTest: string;
  // Personas
  personaFamilyHost: string;
  personaFamilyHostDesc: string;
  personaWeddingCoord: string;
  personaWeddingCoordDesc: string;
  personaCommunityOrg: string;
  personaCommunityOrgDesc: string;
  // Lens Banner
  lensBannerTitle: string;
  lensBannerDesc: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  en: {
    appName: "UtsavAI",
    tagline: "Celebration & Event Execution Concierge",
    searchPlaceholder: "Search categories, milestones, or vendor clauses...",
    deterministicEngine: "Deterministic Engine Active",
    roleLensLabel: "Lens",
    languageLabel: "Language",
    judgePresets: "Judge Presets",
    activityLog: "Activity Log",
    nextStep: "Next Step →",
    tabOverview: "Step 1: Visual Flowchart & Overview",
    tabBudget: "Step 2: Budget & Trade-Offs",
    tabVendor: "Step 3: Vendor Quote Auditor",
    tabActivity: "Step 4: Activity & Loop History",
    daysOut: "Days Out",
    confirmedGuests: "Confirmed Guests",
    planCustomEvent: "+ New Custom Event",
    resetPreset: "Reset Preset",
    exportCalendar: "Export .ics Calendar",
    templateExplainer:
      "Pre-loaded standard event scenario. Amounts & milestones are benchmarked. Customize with sliders on the right or create your own custom event.",
    flowchartTitle: "Event Timeline & Milestone Dependency Flowchart",
    flowchartSubtitle:
      "Interactive milestone execution network. Click any task to inspect prerequisite locks, resolve blockers in 1 click, or dispatch vendor communications.",
    flowchartKahnDag: "Chronological Sequence & Critical Path (Kahn's DAG)",
    flowchartLegendNormal: "Topological Flow",
    flowchartLegendBlocked: "Critical Blocked Path",
    flowchartRequires: "Requires",
    flowchartUnlocks: "Unlocks",
    flowchartWaitingOn: "Waiting on",
    flowchartDelayCascade: "Downstream Delay Cascade Simulator",
    flowchartSimulate30m: "⚡ +30m Delay Cascade",
    flowchartSimulate60m: "⚡ +60m Delay Cascade",
    flowchartVendorOutreach: "Vendor Outreach & Negotiation Message",
    flowchartDispatchWhatsapp: "Dispatch via WhatsApp",
    budgetLedgerTitle: "Budget Allocation Ledger",
    budgetCapLabel: "Total Budget Cap",
    totalAllocatedLabel: "Total Allocated",
    varianceSurplus: "Surplus",
    varianceDeficit: "Deficit",
    scalesWithGuests: "Scales with Guest Count",
    fixedContract: "Fixed Contract Cost",
    verifiedQuote: "VERIFIED QUOTE",
    unverifiedEstimate: "ESTIMATE (PENDING)",
    tradeoffTitle: "AI Trade-Off Resolution Strategies",
    tradeoffSubtitle:
      "Deterministic balancing proposals that protect guest hospitality while eliminating deficits.",
    applyStrategy: "⚡ Apply Strategy",
    whatIfSimulator: "Mid-Flight What-If Simulator",
    guestCountLabel: "Guest Count (Headcount)",
    budgetCapSlider: "Total Budget Cap (₹)",
    daysToEventSlider: "Days to Event",
    runStressTest: "⚡ Run Stress Test (+50 Pax, -14d)",
    personaFamilyHost: "Family Host",
    personaFamilyHostDesc: "Hospitality & Per-Plate Focus",
    personaWeddingCoord: "Wedding Coordinator",
    personaWeddingCoordDesc: "DAG Critical Path & Vendor SLAs",
    personaCommunityOrg: "Community Organizer",
    personaCommunityOrgDesc: "Civic Permits & Mass Rationing",
    lensBannerTitle: "Priority Lens Active",
    lensBannerDesc: "Displaying priorities and recommendations tailored to your role."
  }
};
