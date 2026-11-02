/**
 * Custom hook managing live Gemini AI health polling and rebalancing trade-offs.
 */
import { useState, useEffect } from "react";
import {
  TradeoffStrategy,
  PersonaLens,
  BudgetItem,
  MilestoneTask
} from "../types/planner";

export interface AiStatus {
  configured: boolean;
  model: string;
  source: "gemini-live" | "deterministic-shield";
}

export function useAiRebalance(params: {
  eventTitle: string;
  persona: PersonaLens;
  guestCount: number;
  baseGuestCount: number;
  budgetCap: number;
  daysRemaining: number;
  budgetItems: BudgetItem[];
  milestones: MilestoneTask[];
  variance: number;
}) {
  const [aiStatus, setAiStatus] = useState<AiStatus>({
    configured: true,
    model: "gemini-3.5-flash",
    source: "gemini-live"
  });
  const [aiTradeoffs, setAiTradeoffs] = useState<TradeoffStrategy[] | null>(null);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiProvenance, setAiProvenance] = useState<"ai" | "fallback">("fallback");
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.llm) {
          setAiStatus({
            configured: Boolean(data.llm.configured),
            model: data.llm.model || "gemini-3.5-flash",
            source: data.llm.source || "gemini-live"
          });
        }
      })
      .catch(() => {
        setAiStatus({
          configured: false,
          model: "none",
          source: "deterministic-shield"
        });
      });
  }, []);

  useEffect(() => {
    setAiTradeoffs(null);
    setAiNarrative(null);
    setAiProvenance("fallback");
  }, [params.guestCount, params.budgetCap, params.budgetItems, params.persona]);

  const handleConsultAiTradeoffs = async () => {
    if (params.variance >= 0) return;
    setIsRebalancing(true);
    try {
      const res = await fetch("/api/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTitle: params.eventTitle,
          personaLens: params.persona,
          guestCount: params.guestCount,
          baseGuestCount: params.baseGuestCount,
          totalBudgetCap: params.budgetCap,
          daysRemaining: params.daysRemaining,
          budgetItems: params.budgetItems,
          milestones: params.milestones
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tradeoffOptions && data.tradeoffOptions.length > 0) {
          setAiTradeoffs(data.tradeoffOptions);
          setAiNarrative(data.narrative || null);
          setAiProvenance(data.provenance || "ai");
        }
      }
    } catch {
      // Deterministic shield protects user continuity
    } finally {
      setIsRebalancing(false);
    }
  };

  return {
    aiStatus,
    aiTradeoffs,
    aiNarrative,
    aiProvenance,
    isRebalancing,
    handleConsultAiTradeoffs
  };
}
