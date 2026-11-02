/**
 * Form fields for custom event configuration inputs.
 */
import type { RefObject } from "react";
import type { FC } from "react";
import {
  OccasionType,
  MustHavePriority,
  DietaryProfile,
  GuestAccessibility
} from "../../lib/plannerEngine";
import { PriorityVibe } from "../../types/planner";
import {
  OCCASION_TYPES,
  VIBE_OPTIONS,
  MUST_HAVE_OPTIONS,
  DIETARY_OPTIONS,
  ACCESSIBILITY_OPTIONS
} from "./customEventOptions";

interface CustomEventFormFieldsProps {
  firstFocusRef: RefObject<HTMLInputElement | null>;
  eventTitle: string;
  setEventTitle: (t: string) => void;
  occasionType: OccasionType;
  setOccasionType: (o: OccasionType) => void;
  budgetCap: number;
  setBudgetCap: (b: number) => void;
  guestCount: number;
  setGuestCount: (g: number) => void;
  daysUntilEvent: number;
  setDaysUntilEvent: (d: number) => void;
  priorityVibe: PriorityVibe;
  setPriorityVibe: (v: PriorityVibe) => void;
  mustHave: MustHavePriority;
  setMustHave: (m: MustHavePriority) => void;
  dietaryProfile: DietaryProfile;
  setDietaryProfile: (d: DietaryProfile) => void;
  guestAccessibility: GuestAccessibility;
  setGuestAccessibility: (a: GuestAccessibility) => void;
}

export const CustomEventFormFields: FC<CustomEventFormFieldsProps> = ({
  firstFocusRef,
  eventTitle,
  setEventTitle,
  occasionType,
  setOccasionType,
  budgetCap,
  setBudgetCap,
  guestCount,
  setGuestCount,
  daysUntilEvent,
  setDaysUntilEvent,
  priorityVibe,
  setPriorityVibe,
  mustHave,
  setMustHave,
  dietaryProfile,
  setDietaryProfile,
  guestAccessibility,
  setGuestAccessibility
}) => {
  return (
    <>
      {/* Event Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-event-title" className="text-xs font-semibold text-slate-700">
          Event Title
        </label>
        <input
          ref={firstFocusRef}
          id="custom-event-title"
          type="text"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          required
          maxLength={200}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="e.g., Sharma Family Wedding"
        />
      </div>

      {/* Occasion Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-occasion-type" className="text-xs font-semibold text-slate-700">
          Occasion Type
        </label>
        <select
          id="custom-occasion-type"
          value={occasionType}
          onChange={(e) => setOccasionType(e.target.value as OccasionType)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {OCCASION_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Budget Cap */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-budget-cap" className="text-xs font-semibold text-slate-700">
          Total Budget Cap (₹)
        </label>
        <input
          id="custom-budget-cap"
          type="number"
          value={budgetCap}
          onChange={(e) => setBudgetCap(Number(e.target.value))}
          min={10000}
          max={100000000}
          required
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Guest Count */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-guest-count" className="text-xs font-semibold text-slate-700">
          Expected Guest Count
        </label>
        <input
          id="custom-guest-count"
          type="number"
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          min={10}
          max={10000}
          required
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Days Until Event */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-days-until" className="text-xs font-semibold text-slate-700">
          Days Until Event
        </label>
        <input
          id="custom-days-until"
          type="number"
          value={daysUntilEvent}
          onChange={(e) => setDaysUntilEvent(Number(e.target.value))}
          min={1}
          max={365}
          required
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Priority Vibe */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-priority-vibe" className="text-xs font-semibold text-slate-700">
          Priority Vibe
        </label>
        <select
          id="custom-priority-vibe"
          value={priorityVibe}
          onChange={(e) => setPriorityVibe(e.target.value as PriorityVibe)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {VIBE_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      {/* Must-Have Priority */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-must-have" className="text-xs font-semibold text-slate-700">
          Must-Have Priority (+10% Boost)
        </label>
        <select
          id="custom-must-have"
          value={mustHave}
          onChange={(e) => setMustHave(e.target.value as MustHavePriority)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {MUST_HAVE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Dietary Profile */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-dietary" className="text-xs font-semibold text-slate-700">
          Dietary Profile
        </label>
        <select
          id="custom-dietary"
          value={dietaryProfile}
          onChange={(e) => setDietaryProfile(e.target.value as DietaryProfile)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {DIETARY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Guest Accessibility */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-accessibility" className="text-xs font-semibold text-slate-700">
          Guest Accessibility
        </label>
        <select
          id="custom-accessibility"
          value={guestAccessibility}
          onChange={(e) => setGuestAccessibility(e.target.value as GuestAccessibility)}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {ACCESSIBILITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </>
  );
};
