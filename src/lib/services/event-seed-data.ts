/**
 * Initial seed activity log events for demonstration and offline replay.
 */
import { ActivityLogEvent } from "./event-types";

export const INITIAL_SEED_EVENTS: ActivityLogEvent[] = [
  {
    id: "evt-seed-1",
    taskId: "m1",
    taskTitle: "Lock Heritage Banquet Hall & Sign Deposit Contract",
    category: "venue",
    channel: "loop_closed",
    vendorName: "Sunil Verma",
    recipient: "+91 98101 11223",
    summary: "Call completed · Hall deposit & 250 kVA backup clause confirmed",
    edgeCaseType: "standard",
    loopStatus: "closed",
    closedBy: "human_call",
    resolutionNote: "Signed contract & locked generator diesel rate.",
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString()
  },
  {
    id: "evt-seed-2",
    taskId: "m2",
    taskTitle: "Finalize Royal Caterers Tasting & Minimum Guarantee",
    category: "catering",
    channel: "whatsapp",
    vendorName: "Rajesh Sharma",
    recipient: "919810123456",
    summary: "WhatsApp sent · +15% floating crowd buffer & MG plate check",
    messageBody:
      "Namaste Rajesh Sharma ji, confirming 180 MG plates + 15% floating buffer for Sharma Wedding. Please confirm call time.",
    edgeCaseType: "guest_surge",
    loopStatus: "awaiting_call",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: "evt-seed-3",
    taskId: "m7",
    taskTitle: "Stage Soundcheck & 250 kVA Generator Test Run",
    category: "logistics",
    channel: "email",
    vendorName: "Mukesh Yadav",
    recipient: "mukesh@yadavpower.in",
    summary: "3rd-party Email sent · Generator load & rain backup check",
    messageBody:
      "Urgent T-24h check: Please verify 250 kVA diesel generator load test before Baraat assembly.",
    edgeCaseType: "backup_sos",
    loopStatus: "awaiting_call",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  }
];
