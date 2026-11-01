export type SupportedLanguage = "en" | "hi" | "hinglish";

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
  },
  hi: {
    appName: "उत्सव AI",
    tagline: "समारोह और कार्यक्रम आयोजन प्रबंधक",
    searchPlaceholder: "श्रेणी, कार्य या वेंडर शर्तें खोजें...",
    deterministicEngine: "गणितीय इंजन सक्रिय",
    roleLensLabel: "भूमिका (लेंस)",
    languageLabel: "भाषा",
    judgePresets: "पूर्व-निर्धारित इवेंट्स",
    activityLog: "गतिविधि लॉग",
    nextStep: "अगला चरण →",
    tabOverview: "चरण 1: विज़ुअल फ्लोचार्ट और सारांश",
    tabBudget: "चरण 2: बजट और ट्रेड-ऑफ़ समाधान",
    tabVendor: "चरण 3: वेंडर कोटेशन जांच",
    tabActivity: "चरण 4: गतिविधि और इतिहास",
    daysOut: "दिन शेष",
    confirmedGuests: "पुष्ट अतिथि",
    planCustomEvent: "+ नया इवेंट बनाएं",
    resetPreset: "रीसेट करें",
    exportCalendar: "कैलेंडर .ics डाउनलोड करें",
    templateExplainer:
      "मानक भारतीय आयोजन मॉडल। सभी राशि और कार्य पहले से तय हैं। दाईं ओर दिए स्लाइडर से बदलें या अपना नया इवेंट बनाएं।",
    flowchartTitle: "कार्यक्रम समयरेखा एवं चरणबद्ध निर्भरता फ्लोचार्ट",
    flowchartSubtitle:
      "इंटरैक्टिव माइलस्टोन निष्पादन नेटवर्क। किसी भी कार्य पर क्लिक करके उसकी निर्भरताएं देखें, 1-क्लिक में बाधाएं सुलझाएं या वेंडर को संदेश भेजें।",
    flowchartKahnDag: "कालानुक्रमिक अनुक्रम और महत्वपूर्ण पथ (Kahn's DAG)",
    flowchartLegendNormal: "सामान्य अनुक्रम",
    flowchartLegendBlocked: "अवरुद्ध महत्वपूर्ण पथ",
    flowchartRequires: "आवश्यकता",
    flowchartUnlocks: "शुरू करेगा",
    flowchartWaitingOn: "प्रतीक्षा में",
    flowchartDelayCascade: "देरी प्रभाव सिमुलेटर",
    flowchartSimulate30m: "⚡ +30 मिनट देरी का असर",
    flowchartSimulate60m: "⚡ +60 मिनट देरी का असर",
    flowchartVendorOutreach: "वेंडर बातचीत एवं संदेश",
    flowchartDispatchWhatsapp: "व्हाट्सएप पर भेजें",
    budgetLedgerTitle: "बजट आवंटन बहीखाता",
    budgetCapLabel: "कुल बजट सीमा",
    totalAllocatedLabel: "कुल आवंटित राशि",
    varianceSurplus: "बचत",
    varianceDeficit: "घाटा (अतिरिक्त खर्च)",
    scalesWithGuests: "अतिथियों की संख्या अनुसार परिवर्तनीय",
    fixedContract: "नियत अनुबंध लागत",
    verifiedQuote: "सत्यापित कोटेशन",
    unverifiedEstimate: "अनुमानित (सत्यापन बाकी)",
    tradeoffTitle: "बजट संतुलन एवं ट्रेड-ऑफ़ रणनीतियां",
    tradeoffSubtitle:
      "भोजन और आतिथ्य की गुणवत्ता बनाए रखते हुए अतिरिक्त खर्च समाप्त करने के उपाय।",
    applyStrategy: "⚡ रणनीति लागू करें",
    whatIfSimulator: "लाइव परिवर्तन सिमुलेटर",
    guestCountLabel: "अतिथि संख्या (Pax)",
    budgetCapSlider: "कुल बजट सीमा (₹)",
    daysToEventSlider: "आयोजन तक शेष दिन",
    runStressTest: "⚡ स्ट्रेस टेस्ट (+50 अतिथि, -14 दिन)",
    personaFamilyHost: "पारिवारिक मेज़बान",
    personaFamilyHostDesc: "आतिथ्य और प्रति-थाली फोकस",
    personaWeddingCoord: "वेडिंग कोऑर्डिनेटर",
    personaWeddingCoordDesc: "समय-सीमा और वेंडर अनुबंध",
    personaCommunityOrg: "सामुदायिक आयोजक",
    personaCommunityOrgDesc: "सरकारी अनुमति और जन प्रबंधन",
    lensBannerTitle: "प्राथमिकता लेंस सक्रिय",
    lensBannerDesc: "आपकी चुनी गई भूमिका के अनुसार प्राथमिकताएं और सुझाव प्रदर्शित हो रहे हैं।"
  },
  hinglish: {
    appName: "UtsavAI",
    tagline: "Event & Celebration Planning Concierge",
    searchPlaceholder: "Search karo category, milestone ya vendor clause...",
    deterministicEngine: "Deterministic Engine Active",
    roleLensLabel: "Lens / Role",
    languageLabel: "Bhasha",
    judgePresets: "Event Templates",
    activityLog: "Activity Log",
    nextStep: "Agla Step →",
    tabOverview: "Step 1: Visual Flowchart & Summary",
    tabBudget: "Step 2: Budget & Trade-Off Kharcha Fix",
    tabVendor: "Step 3: Vendor Quote Auditor",
    tabActivity: "Step 4: Activity & History",
    daysOut: "Din Baaki",
    confirmedGuests: "Confirmed Mehmaan",
    planCustomEvent: "+ Naya Custom Event",
    resetPreset: "Preset Reset",
    exportCalendar: "Calendar .ics Export",
    templateExplainer:
      "Yeh benchmark event template hai jisme amounts aur steps pehle se bhare hain. Right side ke sliders se adjust karo ya naya custom event banao.",
    flowchartTitle: "Event Timeline & Milestone Dependency Flowchart",
    flowchartSubtitle:
      "Interactive milestone execution network. Kisi bhi node pe click karke prerequisites check karo, 1-click mein blocker resolve karo ya vendor message dispatch karo.",
    flowchartKahnDag: "Chronological Sequence & Critical Path (Kahn's DAG)",
    flowchartLegendNormal: "Normal Sequence",
    flowchartLegendBlocked: "Blocked Critical Path",
    flowchartRequires: "Zaroori hai",
    flowchartUnlocks: "Unlock karega",
    flowchartWaitingOn: "Waiting on",
    flowchartDelayCascade: "Downstream Delay Cascade Simulator",
    flowchartSimulate30m: "⚡ +30m Delay Impact",
    flowchartSimulate60m: "⚡ +60m Delay Impact",
    flowchartVendorOutreach: "Vendor Message Draft",
    flowchartDispatchWhatsapp: "WhatsApp par Bhejo",
    budgetLedgerTitle: "Budget Allocation Ledger",
    budgetCapLabel: "Total Budget Cap",
    totalAllocatedLabel: "Total Allocated Kharcha",
    varianceSurplus: "Bachat",
    varianceDeficit: "Budget Overrun Deficit",
    scalesWithGuests: "Mehmaan badhne pe badhega",
    fixedContract: "Fixed Contract Cost",
    verifiedQuote: "VERIFIED QUOTE",
    unverifiedEstimate: "ESTIMATE (BAAKI HAI)",
    tradeoffTitle: "AI Trade-Off Balance Strategies",
    tradeoffSubtitle:
      "Khana-peena aur mehmaan-nawazi ko bachaate hue budget deficit khatam karne ke 3 tareeqe.",
    applyStrategy: "⚡ Yeh Strategy Lagao",
    whatIfSimulator: "Mid-Flight What-If Simulator",
    guestCountLabel: "Mehmaan Count (Headcount)",
    budgetCapSlider: "Total Budget Cap (₹)",
    daysToEventSlider: "Event mein baaki din",
    runStressTest: "⚡ Run Stress Test (+50 Pax, -14d)",
    personaFamilyHost: "Family Host",
    personaFamilyHostDesc: "Mehmaan-Nawazi & Khana Focus",
    personaWeddingCoord: "Wedding Coordinator",
    personaWeddingCoordDesc: "DAG Critical Path & Vendor SLAs",
    personaCommunityOrg: "Community Organizer",
    personaCommunityOrgDesc: "Civic Permits & Mass Rationing",
    lensBannerTitle: "Priority Lens Active",
    lensBannerDesc: "Aapke role ke mutabiq priority items aur suggestions highlight ho rahe hain."
  }
};
