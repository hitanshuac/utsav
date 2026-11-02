/**
 * Offline deterministic fallbacks for planner rebalance and vendor quote audit routes.
 */
import { SecureLLMClient } from "./secure-llm-client";
import {
  TradeoffResolution,
  TradeoffResolutionSchema,
  VendorAuditResult,
  VendorAuditResultSchema
} from "../../types/schemas";

export function deterministicVendorAuditFallback(
  rawNote: string,
  guestCount: number
): VendorAuditResult {
  const clean = SecureLLMClient.getInstance().sanitizeInput(rawNote, 800);
  const vendorNameMatch = clean.match(/^([^:,-]{3,40})[:,-]/);
  const vendorName = vendorNameMatch ? vendorNameMatch[1].trim() : "Quoted Event Vendor";

  let quotedAmount = 0;
  const perPlateMatch = clean.match(/(?:₹|Rs\.?|INR)?\s*(\d[\d,]*)\s*(?:per\s*plate|\/\s*plate|pp)/i);
  const minPaxMatch = clean.match(/(?:minimum|min)\s*(\d+)\s*(?:pax|guests|plates)/i);
  const effectivePax = minPaxMatch
    ? Math.max(guestCount, parseInt(minPaxMatch[1], 10))
    : guestCount;

  if (perPlateMatch) {
    const rate = parseInt(perPlateMatch[1].replace(/,/g, ""), 10);
    quotedAmount = rate * effectivePax;
  } else {
    const lumpMatch = clean.match(/(?:₹|Rs\.?|INR)\s*(\d[\d,]{3,})/i);
    if (lumpMatch) {
      quotedAmount = parseInt(lumpMatch[1].replace(/,/g, ""), 10);
    } else {
      quotedAmount = 125000;
    }
  }

  const detectedInclusions: string[] = [];
  if (/waitstaff|servers|service staff/i.test(clean)) {
    detectedInclusions.push("Uniformed waitstaff & table service included");
  }
  if (/buffet|plate|menu/i.test(clean)) {
    detectedInclusions.push(`Full catering service for ${effectivePax} guests`);
  }
  if (/lighting|sound|generator|stage/i.test(clean)) {
    detectedInclusions.push("Basic staging and ambient fixture setup");
  }
  if (detectedInclusions.length === 0) {
    detectedInclusions.push("Base vendor package per rough quotation notes");
  }

  const flaggedHiddenCosts: string[] = [];
  if (/gst|tax|18%/i.test(clean)) {
    const gstMatch = clean.match(/(\d{1,2}%)\s*gst|gst\s*(?:extra\s*at\s*)?(\d{1,2}%)/i);
    const rateStr = gstMatch ? gstMatch[1] || gstMatch[2] : "18%";
    const gstValue = Math.round(quotedAmount * (parseInt(rateStr, 10) / 100));
    flaggedHiddenCosts.push(
      `Unbundled GST (${rateStr}) adds approx. ₹${gstValue.toLocaleString("en-IN")} to base quote`
    );
  } else {
    flaggedHiddenCosts.push("Tax / GST clause unverified (confirm whether 18% GST is inclusive)");
  }

  const extraFeeMatch = clean.match(/cleaning\s*fee\s*(?:₹|Rs\.?)?\s*(\d[\d,]*)/i);
  if (extraFeeMatch) {
    flaggedHiddenCosts.push(`Mandatory cleaning surcharge of ₹${extraFeeMatch[1]} excluded from plate rate`);
  }
  if (/minimum\s*\d+\s*pax/i.test(clean)) {
    flaggedHiddenCosts.push(`Minimum guest guarantee clause enforced (${effectivePax} pax floor)`);
  }
  if (!/transport|delivery|overtime/i.test(clean)) {
    flaggedHiddenCosts.push("Late-night overtime & venue transport/offloading charges not specified");
  }

  const negotiationQuestions = [
    `Can we lock an all-inclusive cap (including GST and cleaning fees) for ${guestCount} guests?`,
    "What is the exact overtime billing rate if the ceremony extends past 11:00 PM?",
    "Are generator backup, chafing fuel, and breakage waivers included in the base quote?"
  ];

  return VendorAuditResultSchema.parse({
    vendorName,
    quotedAmount,
    detectedInclusions,
    flaggedHiddenCosts,
    negotiationQuestions
  });
}

export function deterministicTradeoffsFallback(
  budgetCap: number,
  totalAllocated: number,
  categories: { category: "venue" | "catering" | "decor" | "photography" | "logistics" | "miscellaneous"; allocatedAmount: number }[]
): TradeoffResolution[] {
  const overrun = Math.max(0, totalAllocated - budgetCap);
  const targetReduction = overrun > 0 ? overrun : Math.max(25000, Math.round(totalAllocated * 0.08));

  const getAlloc = (cat: string) => categories.find((c) => c.category === cat)?.allocatedAmount ?? 0;
  const decorAlloc = getAlloc("decor");
  const cateringAlloc = getAlloc("catering");
  const photoAlloc = getAlloc("photography");
  const venueAlloc = getAlloc("venue");

  const decorCut = -Math.min(decorAlloc, Math.round(targetReduction * 0.55));
  const cateringCut = -Math.min(cateringAlloc, Math.round(targetReduction * 0.45));

  const strategies: TradeoffResolution[] = [
    {
      strategyTitle: "Preserve Guest Hospitality, Trim Stage Florals",
      description:
        "Absorbs the budget variance by shifting from imported floral installations to seasonal marigold/drape styling and streamlining live food counters.",
      adjustments: [
        {
          category: "decor",
          delta: decorCut || -25000,
          rationale: "Switch main stage arch to locally sourced seasonal florals and warm LED uplighting."
        },
        {
          category: "catering",
          delta: cateringCut || -20000,
          rationale: "Consolidate 4 live chaat/pasta stations into 2 high-throughput signature counters."
        }
      ]
    },
    {
      strategyTitle: "Off-Peak Slot & Deliverables Optimization",
      description:
        "Rebalances fixed venue and photography packages while adding a dedicated logistics contingency buffer.",
      adjustments: [
        {
          category: "venue",
          delta: -Math.min(venueAlloc, Math.round(targetReduction * 0.6)) || -30000,
          rationale: "Negotiate bundled lawn + banquet hall package excluding external AC generator markup."
        },
        {
          category: "photography",
          delta: -Math.min(photoAlloc, Math.round(targetReduction * 0.35)) || -18000,
          rationale: "Opt for digital cinema delivery + 1 heirloom album instead of 3 printed coffee-table sets."
        },
        {
          category: "logistics",
          delta: 10000,
          rationale: "Retain dedicated guest shuttle and valet buffer for peak arrival window."
        }
      ]
    }
  ];

  return strategies.map((s) => TradeoffResolutionSchema.parse(s));
}
