import { FloatingGuestConfig } from "../types";

export interface GuestBufferCalculation {
  totalExpectedGuests: number;
  mgPlates: number; // Minimum Guaranteed plates contracted
  bufferPlates: number; // Suggested buffer plates (e.g. +15%)
  additionalBufferPlates: number; // Plates above MG
  baseTotalCost: number; // Cost for MG plates
  bufferedTotalCost: number; // Cost if buffer is booked upfront at regular plate rate
  unbufferedNightOfCost: number; // Cost if surprise guests are billed on event night at penalty rate
  projectedPenaltySavings: number; // Money saved by smart pre-buffering
  effectivePerGuestCost: number;
}

/**
 * Deterministically calculates Indian wedding catering plates, minimum guarantees,
 * and penalty-prevention buffers.
 */
export function calculateGuestBuffer(config: FloatingGuestConfig): GuestBufferCalculation {
  const totalExpectedGuests = Math.round(config.cardsInvited * config.avgPerCard);
  const mgPlates = Math.max(1, Math.round((totalExpectedGuests * config.mgPercent) / 100));
  const bufferPlates = Math.max(
    mgPlates,
    Math.round(totalExpectedGuests * (1 + config.bufferPercent / 100))
  );
  const additionalBufferPlates = Math.max(0, bufferPlates - mgPlates);

  // Upfront contracted cost
  const baseTotalCost = mgPlates * config.basePlateRate;
  const bufferedTotalCost = bufferPlates * config.basePlateRate;

  // If surprise attendees show up and must be billed on-site with penalty surcharge
  const penaltyRate = config.basePlateRate * (1 + config.lastMinutePenaltyPercent / 100);
  const unbufferedNightOfCost =
    baseTotalCost + additionalBufferPlates * penaltyRate;

  const projectedPenaltySavings = Math.max(
    0,
    Math.round(unbufferedNightOfCost - bufferedTotalCost)
  );

  const effectivePerGuestCost =
    bufferPlates > 0 ? Math.round(bufferedTotalCost / bufferPlates) : config.basePlateRate;

  return {
    totalExpectedGuests,
    mgPlates,
    bufferPlates,
    additionalBufferPlates,
    baseTotalCost,
    bufferedTotalCost,
    unbufferedNightOfCost,
    projectedPenaltySavings,
    effectivePerGuestCost
  };
}
