import { EventCategory } from "./types";

export interface CategoryPastelStyle {
  name: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  borderHover: string;
  accent: string;
  dot: string;
}

export const CATEGORY_PASTEL: Record<EventCategory, CategoryPastelStyle> = {
  venue: {
    name: "Venue",
    cardBg: "bg-purple-50/50",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    border: "border-purple-200/80",
    borderHover: "hover:border-purple-300",
    accent: "#9333ea",
    dot: "bg-purple-500"
  },
  catering: {
    name: "Catering",
    cardBg: "bg-amber-50/50",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    border: "border-amber-200/80",
    borderHover: "hover:border-amber-300",
    accent: "#d97706",
    dot: "bg-amber-500"
  },
  decor: {
    name: "Decor",
    cardBg: "bg-rose-50/50",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
    border: "border-rose-200/80",
    borderHover: "hover:border-rose-300",
    accent: "#e11d48",
    dot: "bg-rose-500"
  },
  photography: {
    name: "Photography",
    cardBg: "bg-sky-50/50",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    border: "border-sky-200/80",
    borderHover: "hover:border-sky-300",
    accent: "#0284c7",
    dot: "bg-sky-500"
  },
  logistics: {
    name: "Logistics",
    cardBg: "bg-emerald-50/50",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    border: "border-emerald-200/80",
    borderHover: "hover:border-emerald-300",
    accent: "#16a34a",
    dot: "bg-emerald-500"
  },
  miscellaneous: {
    name: "Miscellaneous",
    cardBg: "bg-slate-50",
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-800",
    border: "border-slate-200",
    borderHover: "hover:border-slate-300",
    accent: "#475569",
    dot: "bg-slate-500"
  }
};
