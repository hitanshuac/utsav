import React from "react";
import { ShieldCheck, Sparkles, RotateCcw } from "lucide-react";
import {
  DEFAULT_SHARMA_AUDIT,
  DEFAULT_SHARMA_TRADEOFFS,
  INITIAL_SHARMA_MILESTONES,
  ScenarioPreset,
  usePlannerStore
} from "../../lib/store/usePlannerStore";

export const EVALUATOR_PRESETS: Record<string, ScenarioPreset> = {
  weddingScenario: {
    id: "weddingScenario",
    title: "Sharma Family Wedding",
    eventDate: "2027-02-14",
    budgetCap: 800000,
    guestCount: 200,
    budget: [
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
    sampleVendorNote:
      "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5000 extra. GST extra at 18%.",
    vendorPhone: "919876543210",
    defaultAuditResult: DEFAULT_SHARMA_AUDIT,
    defaultTradeoffs: DEFAULT_SHARMA_TRADEOFFS
  },
  weddingOverrunScenario: {
    id: "weddingOverrunScenario",
    title: "Sharma Wedding — +60 Guest Surge (Overrun Stress Test)",
    eventDate: "2027-02-14",
    budgetCap: 800000,
    guestCount: 260,
    budget: [
      {
        id: "1",
        category: "venue",
        label: "Heritage Banquet Hall",
        allocatedAmount: 300000,
        actualAmount: 300000,
        isEstimate: false,
        notes: "Fixed venue rental (does not scale with guest surge)"
      },
      {
        id: "2",
        category: "catering",
        label: "Grand Buffet (260 pax)",
        allocatedAmount: 338000,
        actualAmount: 0,
        isEstimate: true,
        notes: "Dynamically scaled +30% for 260 guests"
      },
      {
        id: "3",
        category: "decor",
        label: "Floral Stage & Lighting",
        allocatedAmount: 120000,
        actualAmount: 0,
        isEstimate: true,
        notes: "Includes mandap florals; unverified generator diesel surcharge"
      },
      {
        id: "4",
        category: "photography",
        label: "Candid & Video Coverage",
        allocatedAmount: 120000,
        actualAmount: 120000,
        isEstimate: false,
        notes: "Locked studio package"
      },
      {
        id: "5",
        category: "logistics",
        label: "Outstation Guest Shuttles & Valet",
        allocatedAmount: 58500,
        actualAmount: 0,
        isEstimate: true,
        notes: "Scaled +30% for additional family arrivals"
      }
    ],
    milestones: INITIAL_SHARMA_MILESTONES,
    sampleVendorNote:
      "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5000 extra. GST extra at 18%.",
    vendorPhone: "919876543210",
    defaultAuditResult: {
      ...DEFAULT_SHARMA_AUDIT,
      quotedAmount: 169000
    },
    defaultTradeoffs: DEFAULT_SHARMA_TRADEOFFS
  },
  communityGalaScenario: {
    id: "communityGalaScenario",
    title: "Community Cultural Utsav & Samuhik Vivah",
    eventDate: "2026-12-20",
    budgetCap: 450000,
    guestCount: 350,
    budget: [
      {
        id: "g1",
        category: "venue",
        label: "Municipal Community Grounds & Pandal",
        allocatedAmount: 110000,
        actualAmount: 110000,
        isEstimate: false,
        notes: "Confirmed municipal booking permit"
      },
      {
        id: "g2",
        category: "catering",
        label: "Traditional Sit-Down Thali (350 pax)",
        allocatedAmount: 192500,
        actualAmount: 0,
        isEstimate: true,
        notes: "Estimate @ ₹550/thali; water & leaf service extra"
      },
      {
        id: "g3",
        category: "decor",
        label: "Entrance Gate, Stage & Public Address Audio",
        allocatedAmount: 75000,
        actualAmount: 0,
        isEstimate: true,
        notes: "Check municipal noise limit & generator permit"
      },
      {
        id: "g4",
        category: "logistics",
        label: "Crowd Stewards, Drinking Water & Sanitation",
        allocatedAmount: 48000,
        actualAmount: 20000,
        isEstimate: true,
        notes: "Scales with community turnout"
      }
    ],
    milestones: [
      {
        id: "gm1",
        title: "Secure Municipal Ground & Fire Safety NOC",
        deadlineDaysBeforeEvent: 45,
        category: "venue",
        dependsOn: [],
        status: "completed",
        urgency: "critical"
      },
      {
        id: "gm2",
        title: "Lock Community Halwai & Bulk Ration Procurement",
        deadlineDaysBeforeEvent: 21,
        category: "catering",
        dependsOn: ["gm1"],
        status: "in_progress",
        urgency: "critical"
      },
      {
        id: "gm3",
        title: "Assign Volunteer Traffic & Water Distribution Teams",
        deadlineDaysBeforeEvent: 7,
        category: "logistics",
        dependsOn: ["gm1", "gm2"],
        status: "pending",
        urgency: "medium"
      }
    ],
    sampleVendorNote:
      "Annapurna Community Caterers: ₹520 per thali, minimum 300 pax. Leaf service included. RO water tankers ₹6500 extra. GST 5% extra.",
    vendorPhone: "919811122333",
    defaultAuditResult: {
      vendorName: "Annapurna Community Caterers",
      quotedAmount: 182000,
      detectedInclusions: [
        "Traditional thali catering for 350 guests at ₹520/thali",
        "Eco-friendly leaf service staff included"
      ],
      flaggedHiddenCosts: [
        "RO drinking water tankers billed separately at ₹6,500",
        "Unbundled 5% GST adds ₹9,100 to total bill",
        "Municipal waste disposal clearance fee not mentioned"
      ],
      negotiationQuestions: [
        "Will you include the ₹6,500 RO water tanker charge if we confirm 350 guaranteed thalis?",
        "Is the 5% GST inclusive of service staff transport and fuel?",
        "Who handles post-event municipal wet-waste clearance from the pandal?"
      ]
    },
    defaultTradeoffs: DEFAULT_SHARMA_TRADEOFFS
  }
};

export const EvaluatorShield: React.FC = () => {
  const activeScenarioId = usePlannerStore((s) => s.activeScenarioId);
  const offlineShieldActive = usePlannerStore((s) => s.offlineShieldActive);
  const setOfflineShieldActive = usePlannerStore((s) => s.setOfflineShieldActive);
  const loadScenarioPreset = usePlannerStore((s) => s.loadScenarioPreset);

  return (
    <section
      aria-label="Evaluator Shield and Scenario Presets"
      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
        <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
        <span>Demo Scenarios</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Select Scenario Preset"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            onClick={() => loadScenarioPreset(EVALUATOR_PRESETS.weddingScenario)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeScenarioId === "weddingScenario"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sharma Wedding (Baseline ₹8L)
          </button>
          <button
            type="button"
            onClick={() => loadScenarioPreset(EVALUATOR_PRESETS.weddingOverrunScenario)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeScenarioId === "weddingOverrunScenario"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            +60 Guest Surge (Overrun Test)
          </button>
          <button
            type="button"
            onClick={() => loadScenarioPreset(EVALUATOR_PRESETS.communityGalaScenario)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeScenarioId === "communityGalaScenario"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Community Utsav (350 Pax)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOfflineShieldActive(!offlineShieldActive)}
          aria-pressed={offlineShieldActive}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
            offlineShieldActive
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{offlineShieldActive ? "Offline Shield: Active" : "Mode: Live API + Shield"}</span>
        </button>

        <button
          type="button"
          onClick={() => loadScenarioPreset(EVALUATOR_PRESETS.weddingScenario)}
          aria-label="Reset to Sharma Family Wedding Preset"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Demo</span>
        </button>
      </div>
    </section>
  );
};
