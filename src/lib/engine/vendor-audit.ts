/**
 * UtsavAI Deterministic Vendor Quote Auditor
 * Evaluates plain-text vendor quotation notes for 5 mandatory Indian event inclusions.
 */
import { VendorAuditResult } from "../../types/planner";

/**
 * Deterministic Rule-Based Vendor Pre-Auditor.
 * Scans raw vendor text notes for 5 mandatory Indian event inclusions:
 * 1. GST / taxes
 * 2. Generator / power backup
 * 3. Cleaning / porterage
 * 4. Overtime rates
 * 5. Advance deposit %
 *
 * @param vendorNote - Raw plain-text quotation, invoice breakdown, or message
 * @returns Normalized vendor audit result with inclusions, hidden costs, and negotiation questions
 */
export function auditVendorQuoteOffline(vendorNote: string): VendorAuditResult {
  const lower = vendorNote.toLowerCase();

  // Extract vendor name if present at start (e.g., "Royal Caterers: ₹650 per plate...")
  let vendorName = "Audited Vendor Quotation";
  const nameMatch = vendorNote.match(/^([A-Za-z0-9\s&'.-]{3,35})\s*[:\-\n]/);
  if (nameMatch && !nameMatch[1].toLowerCase().includes("quote") && !nameMatch[1].toLowerCase().includes("invoice")) {
    vendorName = nameMatch[1].trim();
  }

  // Check for per-plate multiplier (e.g., ₹650 per plate, minimum 180 pax)
  const perPlateMatch = vendorNote.match(/(?:rs\.?|inr|₹)\s*([\d,]+)\s*(?:per\s*plate|\/plate|per\s*pax|per\s*head|\/head)/i);
  const paxMatch = vendorNote.match(/(\d+)\s*(?:pax|guests|people|plates|attendees)/i) || vendorNote.match(/(?:min|minimum)\s*(\d+)/i);

  let quotedAmount = 0;
  if (perPlateMatch && paxMatch) {
    const rate = parseInt(perPlateMatch[1].replace(/,/g, ""), 10) || 0;
    const pax = parseInt(paxMatch[1], 10) || 0;
    if (rate > 0 && pax > 0) {
      quotedAmount = rate * pax;
    }
  }

  // Fallback to standard base amount match
  if (quotedAmount === 0) {
    const amountMatch = vendorNote.match(/(?:rs\.?|inr|₹)\s*([\d,]+)/i) || vendorNote.match(/([\d,]+)\s*(?:rs|inr|\/-)/i);
    if (amountMatch) {
      quotedAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10) || 0;
    }
  }

  const detectedInclusions: string[] = [];
  const flaggedHiddenCosts: string[] = [];
  const negotiationQuestions: string[] = [];

  // Inclusions detection
  if (
    lower.includes("food") ||
    lower.includes("plate") ||
    lower.includes("menu") ||
    lower.includes("cater") ||
    lower.includes("buffet") ||
    lower.includes("chaat")
  ) {
    detectedInclusions.push("Feast & Menu Service");
  }
  if (lower.includes("decor") || lower.includes("flower") || lower.includes("stage") || lower.includes("mandap")) {
    detectedInclusions.push("Stage & Entrance Decor");
  }
  if (lower.includes("photo") || lower.includes("video") || lower.includes("album") || lower.includes("drone")) {
    detectedInclusions.push("Photography & Videography");
  }
  if (lower.includes("sound") || lower.includes("dj") || lower.includes("mic") || lower.includes("speaker")) {
    detectedInclusions.push("Sound & Acoustic Setup");
  }
  if (lower.includes("generator") || lower.includes("genset") || lower.includes("power backup")) {
    detectedInclusions.push("Power Backup Included");
  }
  if (lower.includes("cleaning") || lower.includes("housekeeping")) {
    detectedInclusions.push("Cleaning Services Included");
  }
  if (detectedInclusions.length === 0) {
    detectedInclusions.push("Standard Service Scope");
  }

  // 1. Mandatory Check: GST / Taxes
  if (!lower.includes("gst") && !lower.includes("tax")) {
    flaggedHiddenCosts.push("GST (18%) not mentioned — potential +18% invoice surprise");
    negotiationQuestions.push("Does your quoted figure include 18% GST, or will taxes be billed additionally?");
  }

  // 2. Mandatory Check: Generator / Power Backup
  if (!lower.includes("generator") && !lower.includes("genset") && !lower.includes("diesel") && !lower.includes("power backup") && !lower.includes("dg")) {
    flaggedHiddenCosts.push("Generator/DG fuel charges unlisted (common ₹15,000–₹25,000 add-on)");
    negotiationQuestions.push("Are backup generator fuel running hours included in this quote or charged per hour?");
  }

  // 3. Mandatory Check: Cleaning / Porterage
  if (!lower.includes("cleaning") && !lower.includes("housekeeping") && !lower.includes("trash") && !lower.includes("porterage") && !lower.includes("waste")) {
    flaggedHiddenCosts.push("Post-event venue trash disposal & deep cleaning deposit omitted");
    negotiationQuestions.push("Who is responsible for post-event hall cleaning and waste clearance fees?");
  }

  // 4. Mandatory Check: Overtime Rates
  if (!lower.includes("overtime") && !lower.includes("extra hour") && !lower.includes("curfew") && !lower.includes("late night")) {
    flaggedHiddenCosts.push("Overtime/midnight curfew charges unstated (applicable after 11 PM)");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is your hourly overtime rate if celebrations extend past midnight?");
    }
  }

  // 5. Mandatory Check: Advance Deposit %
  if (!lower.includes("advance") && !lower.includes("deposit") && !lower.includes("token") && !lower.includes("payment schedule")) {
    flaggedHiddenCosts.push("Advance deposit % and milestone payment schedule not formalized");
    if (negotiationQuestions.length < 3) {
      negotiationQuestions.push("What is the advance token deposit percentage and payment milestone schedule?");
    }
  }

  // Ensure exactly 3 negotiation questions
  while (negotiationQuestions.length < 3) {
    negotiationQuestions.push("What is the refund and cancellation policy if event dates shift by 14 days?");
  }

  const finalQuestions = negotiationQuestions.slice(0, 3);

  return {
    vendorName,
    quotedAmount,
    detectedInclusions,
    inclusions: detectedInclusions,
    flaggedHiddenCosts,
    hiddenCostRisks: flaggedHiddenCosts,
    negotiationQuestions: finalQuestions,
    provenance: "fallback"
  };
}

export const preAuditVendorQuote = auditVendorQuoteOffline;
