import { describe, it, expect } from "vitest";
import { calculateGuestBuffer } from "../lib/engine/guest-buffer";
import { FloatingGuestConfig } from "../lib/types";

describe("Floating Guest & Catering Buffer Math", () => {
  const config: FloatingGuestConfig = {
    cardsInvited: 180,
    avgPerCard: 2.5, // 180 * 2.5 = 450 guests
    bufferPercent: 15, // 450 * 1.15 = 518 plates
    mgPercent: 85, // 450 * 0.85 = 383 plates
    basePlateRate: 1300,
    lastMinutePenaltyPercent: 30 // 1300 * 1.30 = 1690
  };

  it("calculates exact deterministic headcounts and Minimum Guarantee floor", () => {
    const res = calculateGuestBuffer(config);

    expect(res.totalExpectedGuests).toBe(450);
    expect(res.mgPlates).toBe(383);
    expect(res.bufferPlates).toBe(518);
    expect(res.additionalBufferPlates).toBe(135);
  });

  it("calculates cost savings from pre-buffering versus paying on-site penalty surcharges", () => {
    const res = calculateGuestBuffer(config);

    // Upfront buffered cost: 518 * 1300 = 673,400
    expect(res.bufferedTotalCost).toBe(673400);

    // If only MG booked (383 * 1300 = 497,900) + 135 penal plates (135 * 1690 = 228,150) = 726,050
    expect(res.unbufferedNightOfCost).toBe(726050);

    // Direct savings: 726,050 - 673,400 = 52,650
    expect(res.projectedPenaltySavings).toBe(52650);
  });

  it("handles extreme bounds safely without negative numbers or NaN", () => {
    const zeroConfig: FloatingGuestConfig = {
      cardsInvited: 1,
      avgPerCard: 1,
      bufferPercent: 0,
      mgPercent: 100,
      basePlateRate: 500,
      lastMinutePenaltyPercent: 20
    };

    const res = calculateGuestBuffer(zeroConfig);
    expect(res.totalExpectedGuests).toBe(1);
    expect(res.mgPlates).toBe(1);
    expect(res.bufferPlates).toBe(1);
    expect(res.additionalBufferPlates).toBe(0);
    expect(res.projectedPenaltySavings).toBe(0);
  });
});
