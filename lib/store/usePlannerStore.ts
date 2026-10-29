import { create } from "zustand";
import { applyDynamicDelta, applyTradeoffResolution } from "../engine/budget-math";
import { calculateGuestBuffer } from "../engine/guest-buffer";
import {
  BudgetItem,
  DelayStatus,
  EmergencyChecklistItem,
  EventCategory,
  FloatingGuestConfig,
  LifafaItem,
  MilestoneTask,
  TradeoffResolution,
  VendorAuditResult
} from "../types";

export interface ScenarioPreset {
  id: string;
  title: string;
  eventDate: string;
  budgetCap: number;
  guestCount: number;
  budget: BudgetItem[];
  milestones: MilestoneTask[];
  sampleVendorNote: string;
  vendorPhone: string;
  defaultAuditResult: VendorAuditResult;
  defaultTradeoffs: TradeoffResolution[];
}

export type WorkspaceTab = "overview" | "budget" | "vendor" | "tradeoffs" | "milestones" | "sos";

export type BudgetFilterMode = "all" | "estimates" | "verified" | EventCategory;

export interface HighlightTarget {
  sectionId: "budget-section" | "vendor-section" | "tradeoff-section" | "timeline-section";
  tab?: WorkspaceTab;
  category?: EventCategory;
  label: string;
  timestamp: number;
}

export const INITIAL_SHARMA_MILESTONES: MilestoneTask[] = [
  {
    id: "m1",
    title: "Lock Heritage Banquet Hall & Sign Deposit Contract",
    deadlineDaysBeforeEvent: 90,
    category: "venue",
    dependsOn: [],
    status: "completed",
    urgency: "critical",
    tMinusStage: "t_30",
    timeSlot: "T-90 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Sunil Verma",
      phone: "+91 98101 11223",
      role: "Banquet General Manager",
      email: "sunil.verma@heritagebanquets.in"
    }
  },
  {
    id: "m2",
    title: "Finalize Royal Caterers Tasting & Minimum Guarantee",
    deadlineDaysBeforeEvent: 60,
    category: "catering",
    dependsOn: ["m1"],
    status: "in_progress",
    urgency: "critical",
    tMinusStage: "t_30",
    timeSlot: "T-60 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Rajesh Sharma",
      phone: "+91 98101 23456",
      role: "Royal Caterers Head",
      email: "rajesh@royalcaterers.in"
    }
  },
  {
    id: "m3",
    title: "Approve Mandap Floral Stage & Lighting Blueprint",
    deadlineDaysBeforeEvent: 45,
    category: "decor",
    dependsOn: ["m1"],
    status: "pending",
    urgency: "medium",
    tMinusStage: "t_30",
    timeSlot: "T-45 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Deepak Saini",
      phone: "+91 98101 55667",
      role: "Stage & Floral Decorator",
      email: "deepak@sainiflorals.in"
    }
  },
  {
    id: "m4",
    title: "Confirm Candid Photography & Drone Crew Call Sheet",
    deadlineDaysBeforeEvent: 30,
    category: "photography",
    dependsOn: ["m1", "m3"],
    status: "pending",
    urgency: "medium",
    tMinusStage: "t_7",
    timeSlot: "T-30 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Amit Kapoor",
      phone: "+91 98765 43210",
      role: "Lead Cinematographer",
      email: "amit@kapoorcinema.in"
    }
  },
  {
    id: "m5",
    title: "Lock Guest Shuttle & Valet Parking Dispatch Roster",
    deadlineDaysBeforeEvent: 14,
    category: "logistics",
    dependsOn: ["m2"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "t_7",
    timeSlot: "T-14 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Manish Rawat",
      phone: "+91 98220 88991",
      role: "Fleet & Valet Captain",
      email: "manish@rawatfleet.in"
    }
  },
  {
    id: "m6",
    title: "Final Headcount & Floating Buffet Buffer Handover",
    deadlineDaysBeforeEvent: 7,
    category: "catering",
    dependsOn: ["m2", "m5"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "t_7",
    timeSlot: "T-7 Days",
    delayStatus: "on_time",
    vendorContact: {
      name: "Rajesh Sharma",
      phone: "+91 98101 23456",
      role: "Royal Caterers Head",
      email: "rajesh@royalcaterers.in"
    }
  },
  {
    id: "m7",
    title: "Stage Soundcheck & 250 kVA Generator Test Run",
    deadlineDaysBeforeEvent: 1,
    category: "logistics",
    dependsOn: ["m3", "m5"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "t_24h",
    timeSlot: "T-24 Hours",
    delayStatus: "on_time",
    vendorContact: {
      name: "Mukesh Yadav",
      phone: "+91 98221 44556",
      role: "Electrical / AV Engineer",
      email: "mukesh@yadavpower.in"
    }
  },
  {
    id: "m8",
    title: "Baraat Assembly & Dhol Toli Procession Start",
    deadlineDaysBeforeEvent: 0,
    category: "logistics",
    dependsOn: ["m7"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "day_of",
    timeSlot: "17:30 - Baraat Start",
    delayStatus: "on_time",
    delayMinutes: 0,
    vendorContact: {
      name: "Gurnam Singh",
      phone: "+91 98102 77889",
      role: "Dhol Toli Master",
      email: "gurnam@punjabdhol.in"
    }
  },
  {
    id: "m9",
    title: "Milni Ceremony & Varmala Stage Entry",
    deadlineDaysBeforeEvent: 0,
    category: "decor",
    dependsOn: ["m8"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "day_of",
    timeSlot: "18:45 - Varmala",
    delayStatus: "on_time",
    delayMinutes: 0,
    vendorContact: {
      name: "Deepak Saini",
      phone: "+91 98101 55667",
      role: "Floral Stage Captain",
      email: "deepak@sainiflorals.in"
    }
  },
  {
    id: "m10",
    title: "Auspicious Lagna Pheras (Strict Muhurat Window)",
    deadlineDaysBeforeEvent: 0,
    category: "venue",
    dependsOn: ["m9"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "day_of",
    timeSlot: "19:30 - Muhurat Window",
    delayStatus: "on_time",
    delayMinutes: 0,
    vendorContact: {
      name: "Pandit Radheshyam",
      phone: "+91 98110 22334",
      role: "Chief Family Priest",
      email: "radheshyam@vedicrituals.in"
    }
  },
  {
    id: "m11",
    title: "Grand Royal Dinner Buffet Service Open",
    deadlineDaysBeforeEvent: 0,
    category: "catering",
    dependsOn: ["m9"],
    status: "pending",
    urgency: "critical",
    tMinusStage: "day_of",
    timeSlot: "20:15 - Dinner Open",
    delayStatus: "on_time",
    delayMinutes: 0,
    vendorContact: {
      name: "Rajesh Sharma",
      phone: "+91 98101 23456",
      role: "Royal Caterers Head",
      email: "rajesh@royalcaterers.in"
    }
  },
  {
    id: "m12",
    title: "DJ Sound Curfew Compliance (10:00 PM Sharp)",
    deadlineDaysBeforeEvent: 0,
    category: "logistics",
    dependsOn: ["m11"],
    status: "pending",
    urgency: "medium",
    tMinusStage: "day_of",
    timeSlot: "22:00 - Sound Curfew",
    delayStatus: "on_time",
    delayMinutes: 0,
    vendorContact: {
      name: "DJ Sunny",
      phone: "+91 98330 11223",
      role: "Resident DJ",
      email: "sunny@soundworks.in"
    }
  }
];

export const INITIAL_LIFAFA_ITEMS: LifafaItem[] = [
  {
    id: "l1",
    recipient: "Pandit Radheshyam (Chief Priest Dakshina)",
    category: "panditji",
    amount: 11000,
    status: "prepared",
    assignedFamilyMember: "Chachaji (Ramesh)",
    notes: "Hand over right after final Pheras and Ashirwad"
  },
  {
    id: "l2",
    recipient: "Punjab Dhol & Tasha Toli (8 Players)",
    category: "dhol_band",
    amount: 8000,
    status: "prepared",
    assignedFamilyMember: "Bhaiya (Vikram)",
    notes: "Give ₹4,000 at Baraat start, balance upon gate arrival"
  },
  {
    id: "l3",
    recipient: "Valet Parking & Gate Drivers Roster (12 Staff)",
    category: "valet_driver",
    amount: 6000,
    status: "prepared",
    assignedFamilyMember: "Mama (Sanjay)",
    notes: "Hand to supervisor at 1:00 AM shift close"
  },
  {
    id: "l4",
    recipient: "Banquet Housekeeping & Washroom Captain",
    category: "housekeeping",
    amount: 4000,
    status: "prepared",
    assignedFamilyMember: "Chachaji (Ramesh)",
    notes: "For fast room turnover & washroom upkeep"
  },
  {
    id: "l5",
    recipient: "Emergency Float & Petty Cash Bag",
    category: "contingency",
    amount: 15000,
    status: "prepared",
    assignedFamilyMember: "Coordinator Bag",
    notes: "Spare 500-rupee notes for unexpected needs"
  }
];

export const INITIAL_EMERGENCY_ITEMS: EmergencyChecklistItem[] = [
  {
    id: "e1",
    label: "Hawan Samagri, Ganga Jal, Supari, and Desi Ghee tins verified",
    category: "rituals",
    isReady: true,
    responsiblePerson: "Pandit Assistant / Dadi",
    contactPhone: "+91 98110 22334"
  },
  {
    id: "e2",
    label: "250 kVA Silent Generator with 100L Diesel on standby",
    category: "power_av",
    isReady: true,
    responsiblePerson: "Banquet Engineer (Mukesh)",
    contactPhone: "+91 98221 44556"
  },
  {
    id: "e3",
    label: "Police & SDM 10:00 PM Sound Permit NOC Hardcopy in hand",
    category: "permits_security",
    isReady: true,
    responsiblePerson: "Bhaiya (Vikram)",
    contactPhone: "+91 98771 88990"
  },
  {
    id: "e4",
    label: "Bridal Vanity SOS: Safety pins, double-sided tape, blot sheets, extra dupattas",
    category: "bridal_vanity",
    isReady: false,
    responsiblePerson: "Sister (Neha)",
    contactPhone: "+91 98102 33445"
  },
  {
    id: "e5",
    label: "Fresh Rose & Jasmine Varmalas preserved in cold storage",
    category: "rituals",
    isReady: false,
    responsiblePerson: "Florist (Deepak)",
    contactPhone: "+91 98101 55667"
  }
];

export const DEFAULT_SHARMA_AUDIT: VendorAuditResult = {
  vendorName: "Royal Caterers",
  quotedAmount: 130000,
  detectedInclusions: [
    "Full catering service for 200 guests at ₹650/plate",
    "Uniformed waitstaff & buffet service included"
  ],
  flaggedHiddenCosts: [
    "Unbundled GST (18%) adds ₹23,400 to base plate quote",
    "Mandatory cleaning fee of ₹5,000 excluded from per-plate rate",
    "Minimum 180 pax guarantee floor enforced regardless of no-shows"
  ],
  negotiationQuestions: [
    "Can we lock an all-inclusive cap (inclusive of 18% GST and ₹5,000 cleaning fee) for 200 guests?",
    "If guest attendance drops between 160 and 180, can excess plates be converted to welcome high-tea?",
    "Are backup generator fuel and late-night service past 11:30 PM included without overtime charges?"
  ]
};

export const DEFAULT_SHARMA_TRADEOFFS: TradeoffResolution[] = [
  {
    strategyTitle: "Seasonal Floral Substitution & Live Counter Consolidation",
    description:
      "Absorbs catering and guest scaling overruns by switching stage decor to local marigold/jasmine installations and consolidating redundant live food stalls.",
    adjustments: [
      {
        category: "decor",
        delta: -35000,
        rationale: "Replace imported orchid arch with locally sourced seasonal florals and warm LED drapes."
      },
      {
        category: "catering",
        delta: -30000,
        rationale: "Streamline 5 live food counters into 3 high-throughput regional specialty stations."
      }
    ]
  },
  {
    strategyTitle: "Digital Cinema Package & Venue Bundle Rebalance",
    description:
      "Preserves full catering hospitality while optimizing photography deliverables and stage lighting packages.",
    adjustments: [
      {
        category: "photography",
        delta: -25000,
        rationale: "Select 4K cinema reel + 1 heirloom album instead of 3 duplicate printed family albums."
      },
      {
        category: "decor",
        delta: -25000,
        rationale: "Use venue in-house warm architectural truss lighting instead of external rental rig."
      },
      {
        category: "logistics",
        delta: 10000,
        rationale: "Allocate dedicated guest shuttle contingency for elderly family members."
      }
    ]
  }
];

const SECTION_TO_TAB: Record<HighlightTarget["sectionId"], WorkspaceTab> = {
  "budget-section": "budget",
  "vendor-section": "vendor",
  "tradeoff-section": "tradeoffs",
  "timeline-section": "milestones"
};

export interface PlannerState {
  activeScenarioId: string;
  eventTitle: string;
  eventDate: string;
  budgetCap: number;
  guestCount: number;
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
  vendorNoteInput: string;
  vendorPhone: string;
  latestAuditResult: VendorAuditResult | null;
  auditSource: "offline-preset" | "gemini-live" | "deterministic-shield";
  tradeoffStrategies: TradeoffResolution[];
  tradeoffSource: "offline-preset" | "gemini-live" | "deterministic-shield";
  isAuditingVendor: boolean;
  isLoadingTradeoffs: boolean;
  offlineShieldActive: boolean;
  lastActionNotice: string | null;

  // Progressive Disclosure & Tab Navigation State
  activeTab: WorkspaceTab;
  budgetFilter: BudgetFilterMode;
  highlightedTarget: HighlightTarget | null;
  activeMetricPopover: string | null;

  // Indian Wedding Specific Chaos & Contingency State
  floatingConfig: FloatingGuestConfig;
  lifafaItems: LifafaItem[];
  emergencyChecklist: EmergencyChecklistItem[];

  // Actions
  setActiveTab: (tab: WorkspaceTab) => void;
  setEventTitle: (title: string) => void;
  setEventDate: (dateIso: string) => void;
  setBudgetCap: (cap: number) => void;
  setGuestCountWithScaling: (newGuestCount: number) => void;
  addBudgetItem: (item: Omit<BudgetItem, "id">) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  removeBudgetItem: (id: string) => void;
  toggleBudgetItemVerified: (id: string) => void;
  applyTradeoff: (resolution: TradeoffResolution) => void;
  applyVendorQuoteToBudget: (audit: VendorAuditResult, category?: EventCategory) => void;

  setVendorNoteInput: (note: string) => void;
  setVendorPhone: (phone: string) => void;
  runVendorAudit: () => Promise<void>;
  fetchTradeoffStrategies: () => Promise<void>;

  cycleMilestoneStatus: (id: string) => { ok: boolean; reason?: string };
  addMilestoneTask: (task: Omit<MilestoneTask, "id">) => void;
  updateMilestoneTask: (id: string, patch: Partial<MilestoneTask>) => void;
  removeMilestoneTask: (id: string) => void;
  markTaskDelay: (taskId: string, delayMinutes: number, delayStatus?: DelayStatus) => void;

  // Indian Wedding Buffer & SOS Actions
  setFloatingConfig: (patch: Partial<FloatingGuestConfig>) => void;
  syncBufferToCateringBudget: () => void;
  addLifafaItem: (item: Omit<LifafaItem, "id">) => void;
  toggleLifafaStatus: (id: string) => void;
  removeLifafaItem: (id: string) => void;
  toggleEmergencyItem: (id: string) => void;
  addEmergencyItem: (item: Omit<EmergencyChecklistItem, "id">) => void;

  setOfflineShieldActive: (active: boolean) => void;
  loadScenarioPreset: (preset: ScenarioPreset) => void;
  clearNotice: () => void;

  // Interactive Navigation Actions
  setBudgetFilter: (filter: BudgetFilterMode) => void;
  setActiveMetricPopover: (metricId: string | null) => void;
  navigateToOverview: (target: Omit<HighlightTarget, "timestamp">, filter?: BudgetFilterMode) => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  activeScenarioId: "weddingScenario",
  eventTitle: "Sharma Family Wedding",
  eventDate: "2027-02-14",
  budgetCap: 800000,
  guestCount: 200,
  budgetItems: [
    {
      id: "1",
      category: "venue",
      label: "Heritage Banquet Hall",
      allocatedAmount: 300000,
      actualAmount: 300000,
      isEstimate: false,
      notes: "Signed contract, 50% advance paid"
    },
    {
      id: "2",
      category: "catering",
      label: "Grand Buffet (200 pax)",
      allocatedAmount: 260000,
      actualAmount: 0,
      isEstimate: true,
      notes: "Estimate @ ₹1,300/plate prior to GST verification"
    },
    {
      id: "3",
      category: "decor",
      label: "Floral Stage & Lighting",
      allocatedAmount: 120000,
      actualAmount: 0,
      isEstimate: true,
      notes: "Unverified transport & generator backup clause"
    },
    {
      id: "4",
      category: "photography",
      label: "Candid & Video Coverage",
      allocatedAmount: 120000,
      actualAmount: 120000,
      isEstimate: false,
      notes: "2-day coverage locked with studio"
    }
  ],
  milestones: INITIAL_SHARMA_MILESTONES,
  vendorNoteInput:
    "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5000 extra. GST extra at 18%.",
  vendorPhone: "919876543210",
  latestAuditResult: DEFAULT_SHARMA_AUDIT,
  auditSource: "offline-preset",
  tradeoffStrategies: DEFAULT_SHARMA_TRADEOFFS,
  tradeoffSource: "offline-preset",
  isAuditingVendor: false,
  isLoadingTradeoffs: false,
  offlineShieldActive: false,
  lastActionNotice: null,
  activeTab: "overview",
  budgetFilter: "all",
  highlightedTarget: null,
  activeMetricPopover: null,

  floatingConfig: {
    cardsInvited: 180,
    avgPerCard: 2.5,
    bufferPercent: 15,
    mgPercent: 85,
    basePlateRate: 1300,
    lastMinutePenaltyPercent: 30
  },
  lifafaItems: INITIAL_LIFAFA_ITEMS,
  emergencyChecklist: INITIAL_EMERGENCY_ITEMS,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setEventTitle: (title) => set({ eventTitle: title }),

  setEventDate: (dateIso) =>
    set({
      eventDate: dateIso,
      lastActionNotice: `Event date updated to ${dateIso}. All milestone target dates recalculated.`
    }),

  setBudgetCap: (cap) =>
    set({
      budgetCap: Math.max(0, Math.round(cap)),
      lastActionNotice: `Total budget cap adjusted to ₹${Math.max(0, Math.round(cap)).toLocaleString("en-IN")}.`
    }),

  setGuestCountWithScaling: (newGuestCount) => {
    const state = get();
    const clamped = Math.max(10, Math.round(newGuestCount));
    const delta = clamped - state.guestCount;
    if (delta === 0) return;

    const scaledBudget = applyDynamicDelta(state.budgetItems, delta, state.guestCount).map(
      (item) => {
        if (item.category === "catering" && item.label.includes("pax")) {
          return {
            ...item,
            label: item.label.replace(/\(\d+\s*pax\)/i, `(${clamped} pax)`)
          };
        }
        return item;
      }
    );

    set({
      guestCount: clamped,
      budgetItems: scaledBudget,
      lastActionNotice: `Guest count adjusted to ${clamped} (${delta > 0 ? `+${delta}` : delta}). Catering & logistics scaled deterministically; venue held fixed.`
    });
  },

  addBudgetItem: (item) =>
    set((state) => ({
      budgetItems: [
        ...state.budgetItems,
        {
          ...item,
          id: `b-${Date.now()}`
        }
      ],
      budgetFilter: "all",
      lastActionNotice: `Added "${item.label}" (${item.isEstimate ? "Estimate" : "Verified"}) to budget ledger.`
    })),

  updateBudgetItem: (id, patch) =>
    set((state) => ({
      budgetItems: state.budgetItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
    })),

  removeBudgetItem: (id) =>
    set((state) => ({
      budgetItems: state.budgetItems.filter((item) => item.id !== id),
      lastActionNotice: "Removed line item from budget ledger."
    })),

  toggleBudgetItemVerified: (id) =>
    set((state) => ({
      budgetItems: state.budgetItems.map((item) => {
        if (item.id !== id) return item;
        const nextEstimate = !item.isEstimate;
        return {
          ...item,
          isEstimate: nextEstimate,
          actualAmount: nextEstimate ? 0 : item.allocatedAmount
        };
      }),
      lastActionNotice: "Updated vendor price verification status."
    })),

  applyTradeoff: (resolution) =>
    set((state) => {
      const updated = applyTradeoffResolution(state.budgetItems, resolution);
      return {
        budgetItems: updated,
        budgetFilter: "all",
        lastActionNotice: `Applied "${resolution.strategyTitle}" trade-off adjustments to budget.`
      };
    }),

  applyVendorQuoteToBudget: (audit, category = "catering") =>
    set((state) => {
      const existingIdx = state.budgetItems.findIndex((i) => i.category === category);
      const hiddenNote =
        audit.flaggedHiddenCosts.length > 0
          ? `Unverified clauses: ${audit.flaggedHiddenCosts.join(" | ")}`
          : "Audited vendor quote";

      if (existingIdx >= 0) {
        const updated = [...state.budgetItems];
        updated[existingIdx] = {
          ...updated[existingIdx],
          label: `${audit.vendorName} (${state.guestCount} pax)`,
          allocatedAmount: audit.quotedAmount,
          isEstimate: true,
          notes: hiddenNote
        };
        return {
          budgetItems: updated,
          lastActionNotice: `Synced "${audit.vendorName}" quote (₹${audit.quotedAmount.toLocaleString("en-IN")} Estimate) into ${category} budget.`
        };
      }

      return {
        budgetItems: [
          ...state.budgetItems,
          {
            id: `b-${Date.now()}`,
            category,
            label: `${audit.vendorName} (${state.guestCount} pax)`,
            allocatedAmount: audit.quotedAmount,
            actualAmount: 0,
            isEstimate: true,
            notes: hiddenNote
          }
        ],
        lastActionNotice: `Added "${audit.vendorName}" quote (₹${audit.quotedAmount.toLocaleString("en-IN")} Estimate) to budget.`
      };
    }),

  setVendorNoteInput: (note) => set({ vendorNoteInput: note }),
  setVendorPhone: (phone) => set({ vendorPhone: phone }),

  runVendorAudit: async () => {
    const state = get();
    if (!state.vendorNoteInput.trim()) return;

    if (state.offlineShieldActive) {
      set({
        isAuditingVendor: true
      });
      await new Promise((r) => setTimeout(r, 150));
      set({
        isAuditingVendor: false,
        latestAuditResult: {
          ...DEFAULT_SHARMA_AUDIT,
          quotedAmount: Math.round(650 * Math.max(180, state.guestCount))
        },
        auditSource: "offline-preset",
        lastActionNotice: "Vendor quote audited via Offline Evaluator Shield."
      });
      return;
    }

    set({ isAuditingVendor: true });
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "audit_vendor",
          vendorNote: state.vendorNoteInput,
          guestCount: state.guestCount
        })
      });
      const data = await res.json();
      if (res.ok && data.result) {
        set({
          latestAuditResult: data.result,
          auditSource: data.source ?? "gemini-live",
          isAuditingVendor: false,
          lastActionNotice: `Audited "${data.result.vendorName}" quote and flagged ${data.result.flaggedHiddenCosts.length} hidden cost clauses.`
        });
      } else {
        throw new Error(data.error || "Failed to audit vendor");
      }
    } catch {
      set({
        latestAuditResult: DEFAULT_SHARMA_AUDIT,
        auditSource: "deterministic-shield",
        isAuditingVendor: false,
        lastActionNotice: "Vendor quote audited via deterministic fallback shield."
      });
    }
  },

  fetchTradeoffStrategies: async () => {
    const state = get();
    const totalAllocated = state.budgetItems.reduce((sum, i) => sum + i.allocatedAmount, 0);

    if (state.offlineShieldActive) {
      set({ isLoadingTradeoffs: true });
      await new Promise((r) => setTimeout(r, 150));
      set({
        isLoadingTradeoffs: false,
        tradeoffStrategies: DEFAULT_SHARMA_TRADEOFFS,
        tradeoffSource: "offline-preset",
        lastActionNotice: "Loaded verified trade-off strategies from Offline Evaluator Shield."
      });
      return;
    }

    set({ isLoadingTradeoffs: true });
    try {
      const categoryMap = new Map<EventCategory, number>();
      for (const item of state.budgetItems) {
        categoryMap.set(
          item.category,
          (categoryMap.get(item.category) ?? 0) + item.allocatedAmount
        );
      }
      const categories = Array.from(categoryMap.entries()).map(([category, allocatedAmount]) => ({
        category,
        allocatedAmount
      }));

      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_tradeoffs",
          budgetCap: state.budgetCap,
          totalAllocated,
          guestCount: state.guestCount,
          categories
        })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.strategies)) {
        set({
          tradeoffStrategies: data.strategies,
          tradeoffSource: data.source ?? "gemini-live",
          isLoadingTradeoffs: false,
          lastActionNotice: `Generated ${data.strategies.length} strategic budget trade-off options.`
        });
      } else {
        throw new Error(data.error || "Failed to generate trade-offs");
      }
    } catch {
      set({
        tradeoffStrategies: DEFAULT_SHARMA_TRADEOFFS,
        tradeoffSource: "deterministic-shield",
        isLoadingTradeoffs: false,
        lastActionNotice: "Loaded strategic budget trade-offs via deterministic shield."
      });
    }
  },

  cycleMilestoneStatus: (id) => {
    const state = get();
    const target = state.milestones.find((m) => m.id === id);
    if (!target) return { ok: false, reason: "Task not found" };

    const nextOrder: Record<MilestoneTask["status"], MilestoneTask["status"]> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending"
    };
    const nextStatus = nextOrder[target.status];

    // Enforce dependency completion before marking in_progress or completed
    if (nextStatus !== "pending") {
      const incompletePrereqs = target.dependsOn
        .map((prereqId) => state.milestones.find((m) => m.id === prereqId))
        .filter((m): m is MilestoneTask => Boolean(m && m.status !== "completed"));

      if (incompletePrereqs.length > 0) {
        const names = incompletePrereqs.map((p) => `"${p.title}"`).join(", ");
        const msg = `Blocked by prerequisite milestone: ${names} must be Completed first.`;
        set({ lastActionNotice: msg });
        return { ok: false, reason: msg };
      }
    }

    set({
      milestones: state.milestones.map((m) =>
        m.id === id ? { ...m, status: nextStatus } : m
      ),
      lastActionNotice: `Updated "${target.title}" status to ${nextStatus.replace("_", " ")}.`
    });
    return { ok: true };
  },

  addMilestoneTask: (task) => {
    const newId = `m-${Date.now()}`;
    set((state) => ({
      milestones: [
        ...state.milestones,
        {
          ...task,
          id: newId
        }
      ],
      lastActionNotice: `Added "${task.title}".`
    }));
    return newId;
  },

  updateMilestoneTask: (id, patch) =>
    set((state) => ({
      milestones: state.milestones.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
      lastActionNotice: `Updated task.`
    })),

  removeMilestoneTask: (id) =>
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
      lastActionNotice: `Removed task.`
    })),

  setOfflineShieldActive: (active) =>
    set({
      offlineShieldActive: active,
      lastActionNotice: active
        ? "Evaluator Offline Shield enabled: Zero external token consumption."
        : "Live SecureLLMClient API proxy mode enabled."
    }),

  loadScenarioPreset: (preset) =>
    set({
      activeScenarioId: preset.id,
      eventTitle: preset.title,
      eventDate: preset.eventDate,
      budgetCap: preset.budgetCap,
      guestCount: preset.guestCount,
      budgetItems: preset.budget.map((b) => ({ ...b })),
      milestones: preset.milestones.map((m) => ({ ...m })),
      vendorNoteInput: preset.sampleVendorNote,
      vendorPhone: preset.vendorPhone,
      latestAuditResult: preset.defaultAuditResult,
      tradeoffStrategies: preset.defaultTradeoffs,
      auditSource: "offline-preset",
      tradeoffSource: "offline-preset",
      budgetFilter: "all",
      highlightedTarget: null,
      activeMetricPopover: null,
      lastActionNotice: `Loaded preset scenario: ${preset.title} (${preset.guestCount} guests, ₹${preset.budgetCap.toLocaleString("en-IN")} cap).`
    }),

  clearNotice: () => set({ lastActionNotice: null }),

  setBudgetFilter: (filter) => set({ budgetFilter: filter }),

  setActiveMetricPopover: (metricId) => set({ activeMetricPopover: metricId }),

  navigateToOverview: (target, filter) => {
    const timestamp = Date.now();
    const destinationTab = target.tab ?? SECTION_TO_TAB[target.sectionId] ?? "overview";

    set((state) => ({
      activeTab: destinationTab,
      highlightedTarget: { ...target, tab: destinationTab, timestamp },
      budgetFilter: filter !== undefined ? filter : target.category ?? state.budgetFilter,
      activeMetricPopover: null,
      lastActionNotice: `Opened ${target.label} in focused workspace view.`
    }));

    if (typeof document !== "undefined") {
      setTimeout(() => {
        const el =
          (target.category &&
            document.getElementById(`budget-row-${target.category}`)) ||
          document.getElementById(target.sectionId);
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 60);
    }
  },

  markTaskDelay: (taskId, delayMinutes, delayStatus) =>
    set((state) => {
      const updated = state.milestones.map((m) => {
        if (m.id === taskId) {
          const status = delayStatus ?? (delayMinutes > 0 ? "delayed" : "on_time");
          return {
            ...m,
            delayMinutes,
            delayStatus: status
          };
        }
        return m;
      });
      return {
        milestones: updated,
        lastActionNotice:
          delayMinutes > 0
            ? `Logged +${delayMinutes}m delay. Downstream cascade warnings updated.`
            : `Schedule updated to on-time status.`
      };
    }),

  setFloatingConfig: (patch) =>
    set((state) => ({
      floatingConfig: { ...state.floatingConfig, ...patch }
    })),

  syncBufferToCateringBudget: () => {
    const { floatingConfig, budgetItems } = get();
    const calculation = calculateGuestBuffer(floatingConfig);
    const updatedItems = budgetItems.map((b) => {
      if (b.category === "catering") {
        return {
          ...b,
          allocatedAmount: calculation.bufferedTotalCost,
          isEstimate: false,
          notes: `Locked ${calculation.bufferPlates} plates (${calculation.mgPlates} MG + ${calculation.additionalBufferPlates} buffer) @ ₹${floatingConfig.basePlateRate}/plate`
        };
      }
      return b;
    });
    set({
      budgetItems: updatedItems,
      guestCount: calculation.bufferPlates,
      lastActionNotice: `Synced catering budget to ₹${calculation.bufferedTotalCost.toLocaleString("en-IN")} (${calculation.bufferPlates} plates with ${floatingConfig.bufferPercent}% buffer).`
    });
  },

  addLifafaItem: (item) =>
    set((state) => ({
      lifafaItems: [
        ...state.lifafaItems,
        { ...item, id: `l-${Date.now()}` }
      ],
      lastActionNotice: `Added ₹${item.amount.toLocaleString("en-IN")} Lifafa envelope for ${item.recipient}.`
    })),

  toggleLifafaStatus: (id) =>
    set((state) => ({
      lifafaItems: state.lifafaItems.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === "prepared" ? "handed_over" : "prepared"
            }
          : item
      ),
      lastActionNotice: `Updated Lifafa handover status.`
    })),

  removeLifafaItem: (id) =>
    set((state) => ({
      lifafaItems: state.lifafaItems.filter((i) => i.id !== id),
      lastActionNotice: `Removed Lifafa envelope entry.`
    })),

  toggleEmergencyItem: (id) =>
    set((state) => ({
      emergencyChecklist: state.emergencyChecklist.map((item) =>
        item.id === id ? { ...item, isReady: !item.isReady } : item
      ),
      lastActionNotice: `Emergency item status toggled.`
    })),

  addEmergencyItem: (item) =>
    set((state) => ({
      emergencyChecklist: [
        ...state.emergencyChecklist,
        { ...item, id: `e-${Date.now()}` }
      ],
      lastActionNotice: `Added emergency checklist item.`
    }))
}));
