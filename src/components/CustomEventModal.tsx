/**
 * Custom Event Guided Intake Modal Dialog component.
 */
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
import { sanitizeTextInput } from "./custom-event/customEventOptions";
import { CustomEventFormFields } from "./custom-event/CustomEventFormFields";

export { sanitizeTextInput };

interface CustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: CustomEventResult & { eventTitle: string; guestCount: number; budgetCap: number; daysRemaining: number; priorityVibe: PriorityVibe }) => void;
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
    const sanitizedTitle = sanitizeTextInput(eventTitle) || "Custom Celebration";
    const clampedBudget = Math.max(10000, Math.min(budgetCap, 100000000));
    const clampedGuests = Math.max(10, Math.min(guestCount, 10000));
    const clampedDays = Math.max(1, Math.min(daysUntilEvent, 365));

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
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          <CustomEventFormFields
            firstFocusRef={firstFocusRef}
            eventTitle={eventTitle}
            setEventTitle={setEventTitle}
            occasionType={occasionType}
            setOccasionType={setOccasionType}
            budgetCap={budgetCap}
            setBudgetCap={setBudgetCap}
            guestCount={guestCount}
            setGuestCount={setGuestCount}
            daysUntilEvent={daysUntilEvent}
            setDaysUntilEvent={setDaysUntilEvent}
            priorityVibe={priorityVibe}
            setPriorityVibe={setPriorityVibe}
            mustHave={mustHave}
            setMustHave={setMustHave}
            dietaryProfile={dietaryProfile}
            setDietaryProfile={setDietaryProfile}
            guestAccessibility={guestAccessibility}
            setGuestAccessibility={setGuestAccessibility}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Generate Custom Plan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomEventModal;
