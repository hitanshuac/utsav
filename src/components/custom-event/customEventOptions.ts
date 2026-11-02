/**
 * Option dictionaries and text sanitizer for the custom event guided wizard.
 */
import {
  OccasionType,
  MustHavePriority,
  DietaryProfile,
  GuestAccessibility
} from "../../lib/plannerEngine";
import { PriorityVibe } from "../../types/planner";

export const OCCASION_TYPES: OccasionType[] = [
  "Wedding",
  "Milestone Birthday / Anniversary",
  "Cultural / Community Fest",
  "Corporate / Retreat"
];

export const VIBE_OPTIONS: PriorityVibe[] = [
  "Experience First",
  "Budget Strict",
  "Balanced"
];

export const MUST_HAVE_OPTIONS: MustHavePriority[] = [
  "Food & Catering",
  "Venue & Comfort",
  "Decor & Ambience",
  "Photography & Memories"
];

export const DIETARY_OPTIONS: DietaryProfile[] = [
  "Standard Multi-Cuisine",
  "Jain (No Onion/Garlic)",
  "Vegan / Plant-Based",
  "Traditional Regional"
];

export const ACCESSIBILITY_OPTIONS: GuestAccessibility[] = [
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
