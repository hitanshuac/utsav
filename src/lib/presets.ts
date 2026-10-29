/**
 * UtsavAI — Judge Scenario Presets
 * Single-click loading in <10ms for Hack2Skill Evaluators.
 * Capped at 6 core budget items and 6 milestone tasks per preset.
 */

import { BudgetItem, MilestoneTask, PersonaLens } from "../types/planner";

export interface JudgePreset {
  id: string;
  name: string;
  title: string;
  eventDate: string;
  budgetCap: number;
  guestCount: number;
  daysRemaining: number;
  persona: PersonaLens;
  targetTier: "ON_TRACK" | "TIMELINE_BOTTLENECK" | "CRITICAL_OVERRUN";
  targetUrgencyScore: number;
  sampleVendorNote: string;
  vendorPhone: string;
  budget: BudgetItem[];
  milestones: MilestoneTask[];
}

export const JUDGE_PRESETS: Record<string, JudgePreset> = {
  presetA: {
    id: "presetA",
    name: "Preset A: Sharma Family Wedding",
    title: "Sharma Family Wedding",
    eventDate: "2027-02-14",
    budgetCap: 800000,
    guestCount: 200,
    daysRemaining: 120,
    persona: "family_host",
    targetTier: "ON_TRACK",
    targetUrgencyScore: 35,
    sampleVendorNote:
      "Royal Caterers: ₹650 per plate, minimum 180 pax. Waitstaff included. Cleaning fee ₹5,000 extra. GST extra at 18%.",
    vendorPhone: "+91 98101 23456",
    budget: [
      {
        id: "a1",
        category: "venue",
        label: "Heritage Banquet Hall",
        allocatedAmount: 300000,
        actualAmount: 300000,
        isEstimate: false,
        notes: "Signed contract, 50% advance confirmed"
      },
      {
        id: "a2",
        category: "catering",
        label: "Royal Feast Buffet (200 pax)",
        allocatedAmount: 260000,
        actualAmount: 260000,
        isEstimate: false,
        notes: "Verified rate @ ₹1,300/plate for 200 pax"
      },
      {
        id: "a3",
        category: "decor",
        label: "Floral Stage & Mandap Lighting",
        allocatedAmount: 120000,
        actualAmount: 120000,
        isEstimate: false,
        notes: "Traditional marigold + jasmine truss package locked"
      },
      {
        id: "a4",
        category: "photography",
        label: "Candid Cinema & Studio Coverage",
        allocatedAmount: 80000,
        actualAmount: 80000,
        isEstimate: false,
        notes: "2-day crew + drone coverage confirmed"
      },
      {
        id: "a5",
        category: "logistics",
        label: "Outstation Guest Shuttles & Valet",
        allocatedAmount: 25000,
        actualAmount: 25000,
        isEstimate: false,
        notes: "Fleet booked for airport/station pickup"
      },
      {
        id: "a6",
        category: "miscellaneous",
        label: "Ritual Puja Samagri & Emergency Buffer",
        allocatedAmount: 15000,
        actualAmount: 15000,
        isEstimate: false,
        notes: "Verified cash envelope reserve"
      }
    ],
    milestones: [
      {
        id: "am1",
        title: "Lock Banquet Venue & Sign Agreement",
        deadlineDaysBeforeEvent: 90,
        category: "venue",
        dependsOn: [],
        status: "completed",
        urgency: "critical",
        leadTimeDays: 90
      },
      {
        id: "am2",
        title: "Finalize Caterer Menu Tasting & Headcount",
        deadlineDaysBeforeEvent: 60,
        category: "catering",
        dependsOn: ["am1"],
        status: "in_progress",
        urgency: "critical",
        leadTimeDays: 60
      },
      {
        id: "am3",
        title: "Approve Mandap Floral Blueprint",
        deadlineDaysBeforeEvent: 45,
        category: "decor",
        dependsOn: ["am1"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 45
      },
      {
        id: "am4",
        title: "Confirm Photography & Drone Crew",
        deadlineDaysBeforeEvent: 30,
        category: "photography",
        dependsOn: ["am1", "am3"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 30
      },
      {
        id: "am5",
        title: "Dispatch Guest Shuttle Fleet Schedule",
        deadlineDaysBeforeEvent: 14,
        category: "logistics",
        dependsOn: ["am2"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 14
      },
      {
        id: "am6",
        title: "Finalize Headcount & Buffer Handover",
        deadlineDaysBeforeEvent: 7,
        category: "catering",
        dependsOn: ["am2", "am5"],
        status: "pending",
        urgency: "critical",
        leadTimeDays: 7
      }
    ]
  },
  presetB: {
    id: "presetB",
    name: "Preset B: 50th Milestone Anniversary",
    title: "50th Milestone Anniversary",
    eventDate: "2026-11-20",
    budgetCap: 150000,
    guestCount: 60,
    daysRemaining: 21,
    persona: "wedding_coordinator",
    targetTier: "TIMELINE_BOTTLENECK",
    targetUrgencyScore: 74,
    sampleVendorNote:
      "Silver Arch Cinema: Vintage projection & AV setup ₹18,000. Setup takes 4 weeks. Advance 50%. GST 18% extra.",
    vendorPhone: "+91 98765 43210",
    budget: [
      {
        id: "b1",
        category: "venue",
        label: "Boutique Garden Terrace",
        allocatedAmount: 50000,
        actualAmount: 50000,
        isEstimate: false,
        notes: "Intimate private terrace reserved"
      },
      {
        id: "b2",
        category: "catering",
        label: "Golden Jubilee Multi-Course Dinner",
        allocatedAmount: 60000,
        actualAmount: 60000,
        isEstimate: false,
        notes: "Fixed multi-course feast @ ₹1,000/plate for 60 pax"
      },
      {
        id: "b3",
        category: "decor",
        label: "Vintage Floral Arch & Nostalgia Photo Wall",
        allocatedAmount: 20000,
        actualAmount: 20000,
        isEstimate: false,
        notes: "Custom retro photo corridor"
      },
      {
        id: "b4",
        category: "photography",
        label: "Drone & Couple Portrait Session",
        allocatedAmount: 12000,
        actualAmount: 12000,
        isEstimate: false,
        notes: "Golden jubilee portraits + short film"
      },
      {
        id: "b5",
        category: "logistics",
        label: "Acoustic Ghazal Duo & PA Sound",
        allocatedAmount: 5000,
        actualAmount: 5000,
        isEstimate: false,
        notes: "Live unplugged music troupe"
      },
      {
        id: "b6",
        category: "miscellaneous",
        label: "Personalized Guest Mementos & Favors",
        allocatedAmount: 3000,
        actualAmount: 3000,
        isEstimate: false,
        notes: "Engraved brass souvenir lifafas"
      }
    ],
    milestones: [
      {
        id: "bm1",
        title: "Book Garden Terrace Venue",
        deadlineDaysBeforeEvent: 25,
        category: "venue",
        dependsOn: [],
        status: "completed",
        urgency: "critical",
        leadTimeDays: 25
      },
      {
        id: "bm2",
        title: "Custom Video Montage & Heritage AV Rigging",
        deadlineDaysBeforeEvent: 28,
        category: "photography",
        dependsOn: ["bm1"],
        status: "pending",
        urgency: "critical",
        leadTimeDays: 28 // 28 days > 21 days remaining -> Bottleneck!
      },
      {
        id: "bm3",
        title: "Multi-Course Tasting & Dessert Approval",
        deadlineDaysBeforeEvent: 15,
        category: "catering",
        dependsOn: ["bm1"],
        status: "in_progress",
        urgency: "critical",
        leadTimeDays: 15
      },
      {
        id: "bm4",
        title: "Ghazal Troupe & Sound Rehearsal",
        deadlineDaysBeforeEvent: 10,
        category: "logistics",
        dependsOn: ["bm1"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 10
      },
      {
        id: "bm5",
        title: "Curated Anniversary Photo Albums Binding",
        deadlineDaysBeforeEvent: 7,
        category: "photography",
        dependsOn: ["bm2"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 7
      },
      {
        id: "bm6",
        title: "VIP Welcome & Transportation Roster",
        deadlineDaysBeforeEvent: 3,
        category: "logistics",
        dependsOn: ["bm3", "bm4"],
        status: "pending",
        urgency: "low",
        leadTimeDays: 3
      }
    ]
  },
  presetC: {
    id: "presetC",
    name: "Preset C: Neighborhood Cultural Utsav",
    title: "Neighborhood Cultural Utsav",
    eventDate: "2026-12-15",
    budgetCap: 300000,
    guestCount: 350,
    daysRemaining: 45,
    persona: "community_organizer",
    targetTier: "CRITICAL_OVERRUN",
    targetUrgencyScore: 92,
    sampleVendorNote:
      "Annapurna Community Caterers: ₹550 per thali, 350 pax minimum. RO water tankers ₹6,500 extra. Cleaning ₹5,000. GST 5% extra.",
    vendorPhone: "+91 98111 22333",
    budget: [
      {
        id: "c1",
        category: "venue",
        label: "Municipal Community Grounds & Pandal Permit",
        allocatedAmount: 80000,
        actualAmount: 80000,
        isEstimate: false,
        notes: "Municipal ground reservation & civic booking"
      },
      {
        id: "c2",
        category: "catering",
        label: "Traditional Community Feast (350 pax)",
        allocatedAmount: 192500, // ₹550 * 350 pax
        actualAmount: 0,
        isEstimate: true,
        notes: "Unverified estimate: ₹550/thali base; water tankers & taxes omitted"
      },
      {
        id: "c3",
        category: "decor",
        label: "Entrance Toran, Stage & PA Sound Rig",
        allocatedAmount: 35000,
        actualAmount: 35000,
        isEstimate: false,
        notes: "Public address sound system and cultural stage"
      },
      {
        id: "c4",
        category: "logistics",
        label: "High-Output Silent Generator & Cabling",
        allocatedAmount: 25000,
        actualAmount: 0,
        isEstimate: true,
        notes: "Unverified diesel running hour surcharge"
      },
      {
        id: "c5",
        category: "logistics",
        label: "Sanitation, Waste Disposal & Water Tankers",
        allocatedAmount: 18000,
        actualAmount: 18000,
        isEstimate: false,
        notes: "Municipal trash compactor and drinking water"
      },
      {
        id: "c6",
        category: "miscellaneous",
        label: "Volunteer First-Aid & Emergency Lifafa",
        allocatedAmount: 4500,
        actualAmount: 4500,
        isEstimate: false,
        notes: "Emergency medical and community contingency"
      }
    ],
    milestones: [
      {
        id: "cm1",
        title: "Obtain Fire Safety & Municipal Ground NOC",
        deadlineDaysBeforeEvent: 40,
        category: "venue",
        dependsOn: [],
        status: "completed",
        urgency: "critical",
        leadTimeDays: 40
      },
      {
        id: "cm2",
        title: "Lock Community Halwai Bulk Ration Contract",
        deadlineDaysBeforeEvent: 25,
        category: "catering",
        dependsOn: ["cm1"],
        status: "in_progress",
        urgency: "critical",
        leadTimeDays: 25
      },
      {
        id: "cm3",
        title: "Erect Rain-Proof Pandal & Seating",
        deadlineDaysBeforeEvent: 18,
        category: "decor",
        dependsOn: ["cm1"],
        status: "pending",
        urgency: "critical",
        leadTimeDays: 18
      },
      {
        id: "cm4",
        title: "Inspect DG Generator & Power Grid",
        deadlineDaysBeforeEvent: 10,
        category: "logistics",
        dependsOn: ["cm3"],
        status: "pending",
        urgency: "critical",
        leadTimeDays: 10
      },
      {
        id: "cm5",
        title: "Assign Volunteer Crowd & Water Roster",
        deadlineDaysBeforeEvent: 7,
        category: "logistics",
        dependsOn: ["cm2", "cm3"],
        status: "pending",
        urgency: "medium",
        leadTimeDays: 7
      },
      {
        id: "cm6",
        title: "Handover Community Dining Hall",
        deadlineDaysBeforeEvent: 2,
        category: "catering",
        dependsOn: ["cm2", "cm5"],
        status: "pending",
        urgency: "critical",
        leadTimeDays: 2
      }
    ]
  }
};
