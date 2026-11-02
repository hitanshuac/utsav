/**
 * Custom hook managing Judge Presets, event scope parameters, and item ledger states.
 */
import { useState } from "react";
import { JUDGE_PRESETS, JudgePreset } from "../lib/presets";
import { PersonaLens, BudgetItem, MilestoneTask } from "../types/planner";
import { logActivityEvent } from "../lib/services/event-logger";

export function usePresetState() {
  const [activePreset, setActivePreset] = useState<JudgePreset>(JUDGE_PRESETS.presetC);
  const [persona, setPersona] = useState<PersonaLens>(JUDGE_PRESETS.presetC.persona);
  const [eventTitle, setEventTitle] = useState<string>(JUDGE_PRESETS.presetC.title);
  const [eventDate, setEventDate] = useState<string>(JUDGE_PRESETS.presetC.eventDate);
  const [budgetCap, setBudgetCap] = useState<number>(JUDGE_PRESETS.presetC.budgetCap);
  const [guestCount, setGuestCount] = useState<number>(JUDGE_PRESETS.presetC.guestCount);
  const [baseGuestCount, setBaseGuestCount] = useState<number>(JUDGE_PRESETS.presetC.guestCount);
  const [daysRemaining, setDaysRemaining] = useState<number>(JUDGE_PRESETS.presetC.daysRemaining);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(JUDGE_PRESETS.presetC.budget);
  const [milestones, setMilestones] = useState<MilestoneTask[]>(JUDGE_PRESETS.presetC.milestones);
  const [vendorPhone, setVendorPhone] = useState<string>(JUDGE_PRESETS.presetC.vendorPhone);
  const [sampleVendorNote, setSampleVendorNote] = useState<string>(
    JUDGE_PRESETS.presetC.sampleVendorNote
  );

  const handleSelectPersona = (nextPersona: PersonaLens) => {
    setPersona(nextPersona);
    logActivityEvent({
      taskId: `lens-${nextPersona}`,
      taskTitle: `Switched Lens: ${nextPersona}`,
      category: "logistics",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Coordinator Ops",
      summary: `Active persona lens switched to ${nextPersona}.`,
      loopStatus: "closed"
    });
  };

  const handleSelectPreset = (preset: JudgePreset) => {
    setActivePreset(preset);
    setPersona(preset.persona);
    setEventTitle(preset.title);
    setEventDate(preset.eventDate);
    setBudgetCap(preset.budgetCap);
    setGuestCount(preset.guestCount);
    setBaseGuestCount(preset.guestCount);
    setDaysRemaining(preset.daysRemaining);
    setBudgetItems(preset.budget);
    setMilestones(preset.milestones);
    setVendorPhone(preset.vendorPhone);
    setSampleVendorNote(preset.sampleVendorNote);

    logActivityEvent({
      taskId: `preset-${preset.id}`,
      taskTitle: `Switched Preset: ${preset.name}`,
      category: "logistics",
      channel: "system",
      vendorName: "Deterministic Engine",
      recipient: "Executive Operations",
      summary: `Preset ${preset.name} loaded with ₹${(preset.budgetCap / 100000).toFixed(1)}L budget cap and ${preset.guestCount} guests.`,
      loopStatus: "closed"
    });
  };

  const handleResetPreset = () => {
    handleSelectPreset(activePreset);
  };

  const handleToggleVerified = (itemId: string) => {
    const updatedItems = budgetItems.map((item) =>
      item.id === itemId ? { ...item, isEstimate: !item.isEstimate } : item
    );
    setBudgetItems(updatedItems);
  };

  const handleUpdateBudgetItemAmount = (itemId: string, newAmount: number) => {
    const updatedItems = budgetItems.map((item) =>
      item.id === itemId ? { ...item, allocatedAmount: newAmount, isEstimate: false } : item
    );
    setBudgetItems(updatedItems);
  };

  const handleUpdateTaskStatus = (taskId: string, status: "pending" | "in_progress" | "completed") => {
    const updatedMilestones = milestones.map((m) =>
      m.id === taskId ? { ...m, status } : m
    );
    setMilestones(updatedMilestones);
  };

  const handleCycleTaskStatus = (taskId: string) => {
    const target = milestones.find((m) => m.id === taskId);
    if (!target) return;
    const nextStatus =
      target.status === "pending"
        ? "in_progress"
        : target.status === "in_progress"
        ? "completed"
        : "pending";
    handleUpdateTaskStatus(taskId, nextStatus);
  };

  return {
    activePreset,
    persona,
    eventTitle,
    eventDate,
    budgetCap,
    guestCount,
    baseGuestCount,
    daysRemaining,
    budgetItems,
    milestones,
    vendorPhone,
    sampleVendorNote,
    setPersona,
    setEventTitle,
    setBudgetCap,
    setGuestCount,
    setBaseGuestCount,
    setDaysRemaining,
    setBudgetItems,
    setMilestones,
    handleSelectPersona,
    handleSelectPreset,
    handleResetPreset,
    handleToggleVerified,
    handleUpdateBudgetItemAmount,
    handleUpdateTaskStatus,
    handleCycleTaskStatus
  };
}
