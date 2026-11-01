import React, { useState, useRef, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import {
  generateCustomEventPlan,
  CustomEventInput,
  CustomEventResult,
  OccasionType,
  MustHavePriority,
  DietaryProfile,
  GuestAccessibility
} from "../lib/plannerEngine";
import { PriorityVibe } from "../types/planner";

interface CustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: CustomEventResult & { eventTitle: string; guestCount: number; budgetCap: number; daysRemaining: number; priorityVibe: PriorityVibe }) => void;
}

const OCCASION_TYPES: OccasionType[] = [
  "Wedding",
  "Milestone Birthday / Anniversary",
  "Cultural / Community Fest",
  "Corporate / Retreat"
];

const VIBE_OPTIONS: PriorityVibe[] = [
  "Experience First",
  "Budget Strict",
  "Balanced"
];

const MUST_HAVE_OPTIONS: MustHavePriority[] = [
  "Food & Catering",
  "Venue & Comfort",
  "Decor & Ambience",
  "Photography & Memories"
];

const DIETARY_OPTIONS: DietaryProfile[] = [
  "Standard Multi-Cuisine",
  "Jain (No Onion/Garlic)",
  "Vegan / Plant-Based",
  "Traditional Regional"
];

const ACCESSIBILITY_OPTIONS: GuestAccessibility[] = [
  "Standard Seating",
  "Children + Senior Citizen Friendly (Ramps & Rest Zones)",
  "Full Wheelchair & Assisted Mobility"
];

/**
 * Strips HTML tags and script payloads from user input strings for XSS prevention.
 */
export function sanitizeTextInput(raw: string): string {
  return raw
    .replace(/<[^>]*>?/gm, "")
    .replace(/[{}[\]]/g, "")
    .trim()
    .slice(0, 200);
}

export const CustomEventModal: React.FC<CustomEventModalProps> = ({
  isOpen,
  onClose,
  onApply
}) => {
  const [eventTitle, setEventTitle] = useState("My Custom Celebration");
  const [occasionType, setOccasionType] = useState<OccasionType>("Wedding");
  const [budgetCap, setBudgetCap] = useState(500000);
  const [guestCount, setGuestCount] = useState(150);
  const [daysUntilEvent, setDaysUntilEvent] = useState(60);
  const [priorityVibe, setPriorityVibe] = useState<PriorityVibe>("Balanced");
  const [mustHave, setMustHave] = useState<MustHavePriority>("Food & Catering");
  const [dietaryProfile, setDietaryProfile] = useState<DietaryProfile>("Standard Multi-Cuisine");
  const [guestAccessibility, setGuestAccessibility] = useState<GuestAccessibility>("Standard Seating");

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  // Focus trap
  useEffect(() => {
    if (isOpen && firstFocusRef.current) {
      firstFocusRef.current.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedTitle = sanitizeTextInput(eventTitle) || "Custom Event";
    const clampedBudget = Math.max(10000, Math.min(100000000, budgetCap));
    const clampedGuests = Math.max(10, Math.min(10000, guestCount));
    const clampedDays = Math.max(1, Math.min(365, daysUntilEvent));

    const input: CustomEventInput = {
      eventTitle: sanitizedTitle,
      occasionType,
      totalBudgetCap: clampedBudget,
      guestCount: clampedGuests,
      daysUntilEvent: clampedDays,
      priorityVibe,
      mustHavePriority: mustHave,
      dietaryProfile,
      guestAccessibility
    };

    const result = generateCustomEventPlan(input);
    onApply({
      ...result,
      eventTitle: sanitizedTitle,
      guestCount: clampedGuests,
      budgetCap: clampedBudget,
      daysRemaining: clampedDays,
      priorityVibe
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Plan a Custom Event"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">Plan Custom Event</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
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

          {/* Cultural Dietary Profile */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-dietary-profile" className="text-xs font-semibold text-slate-700">
              Cultural & Dietary Profile (Briefing 24:18)
            </label>
            <select
              id="custom-dietary-profile"
              value={dietaryProfile}
              onChange={(e) => setDietaryProfile(e.target.value as DietaryProfile)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {DIETARY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Guest Age-Group Accessibility */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-accessibility" className="text-xs font-semibold text-slate-700">
              Multi-Generational & Accessibility Intake (Briefing 25:15)
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

          {/* Submit */}
          <button
            type="submit"
            id="custom-event-submit"
            className="mt-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Generate Custom Plan
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomEventModal;
