import React, { useState } from "react";
import {
  ShieldAlert,
  Wallet,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Phone,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { usePlannerStore } from "../../lib/store/usePlannerStore";
import { LifafaCategory } from "../../lib/types";

const LIFAFA_TAGS: Record<LifafaCategory, { label: string; bg: string; text: string }> = {
  panditji: { label: "Panditji Dakshina", bg: "bg-orange-50", text: "text-orange-800" },
  dhol_band: { label: "Dhol & Band", bg: "bg-amber-50", text: "text-amber-800" },
  valet_driver: { label: "Valet & Drivers", bg: "bg-blue-50", text: "text-blue-800" },
  housekeeping: { label: "Housekeeping", bg: "bg-emerald-50", text: "text-emerald-800" },
  vendor_staff: { label: "Vendor Staff", bg: "bg-purple-50", text: "text-purple-800" },
  contingency: { label: "Emergency Float", bg: "bg-rose-50", text: "text-rose-800" }
};

export function SosCashLedger() {
  const lifafaItems = usePlannerStore((s) => s.lifafaItems);
  const addLifafaItem = usePlannerStore((s) => s.addLifafaItem);
  const toggleLifafaStatus = usePlannerStore((s) => s.toggleLifafaStatus);
  const removeLifafaItem = usePlannerStore((s) => s.removeLifafaItem);

  const emergencyChecklist = usePlannerStore((s) => s.emergencyChecklist);
  const toggleEmergencyItem = usePlannerStore((s) => s.toggleEmergencyItem);
  const addEmergencyItem = usePlannerStore((s) => s.addEmergencyItem);

  // New lifafa state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<LifafaCategory>("panditji");
  const [assignedMember, setAssignedMember] = useState("");
  const [isAddingLifafa, setIsAddingLifafa] = useState(false);

  // Calculations
  const totalPrepared = lifafaItems.reduce((sum, item) => sum + item.amount, 0);
  const totalHandedOver = lifafaItems
    .filter((item) => item.status === "handed_over")
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingCashInBag = totalPrepared - totalHandedOver;

  const readyEmergencyCount = emergencyChecklist.filter((item) => item.isReady).length;

  const handleCreateLifafa = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount);
    if (!recipient.trim() || !parsedAmount || parsedAmount <= 0) return;

    addLifafaItem({
      recipient: recipient.trim(),
      amount: parsedAmount,
      category,
      status: "prepared",
      assignedFamilyMember: assignedMember.trim() || "Coordinator Bag"
    });

    setRecipient("");
    setAmount("");
    setAssignedMember("");
    setIsAddingLifafa(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cash Float
            </span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            ₹{totalPrepared.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {lifafaItems.length} envelopes allocated
          </span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Handed Over
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2">
            ₹{totalHandedOver.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            Distributed to vendors & panditji
          </span>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Remaining in Bag
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-950 mt-2">
            ₹{remainingCashInBag.toLocaleString("en-IN")}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block">
            Safe family cash buffer
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Emergency Readiness
            </span>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {readyEmergencyCount} / {emergencyChecklist.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Critical rituals & power standby
          </span>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lifafa (Cash Envelopes) Ledger */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Lifafa & Cash Tips Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pre-drawn cash envelopes for Panditji dakshina, dhol players, drivers, and venue staff.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingLifafa(!isAddingLifafa)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lifafa
            </button>
          </div>

          {/* Add Lifafa Form */}
          {isAddingLifafa && (
            <form
              onSubmit={handleCreateLifafa}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Recipient / Group
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhol Toli Master"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LifafaCategory)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-slate-800"
                  >
                    <option value="panditji">Panditji Dakshina</option>
                    <option value="dhol_band">Dhol & Band</option>
                    <option value="valet_driver">Valet & Drivers</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="vendor_staff">Vendor Staff</option>
                    <option value="contingency">Emergency Float</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Held By (Family Member)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chachaji / Mama"
                    value={assignedMember}
                    onChange={(e) => setAssignedMember(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingLifafa(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Save Envelope
                </button>
              </div>
            </form>
          )}

          {/* List of Envelopes */}
          <div className="space-y-2.5">
            {lifafaItems.map((item) => {
              const tag = LIFAFA_TAGS[item.category];
              const isHandedOver = item.status === "handed_over";

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isHandedOver
                      ? "bg-slate-50/60 border-slate-200 opacity-70"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleLifafaStatus(item.id)}
                      className="mt-0.5"
                      title={isHandedOver ? "Mark as Prepared" : "Mark as Handed Over"}
                    >
                      {isHandedOver ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tag.bg} ${tag.text}`}
                        >
                          {tag.label}
                        </span>
                        {item.assignedFamilyMember && (
                          <span className="text-[11px] text-slate-500">
                            with <strong>{item.assignedFamilyMember}</strong>
                          </span>
                        )}
                      </div>
                      <h4
                        className={`text-sm font-semibold mt-1 ${
                          isHandedOver ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {item.recipient}
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-base font-bold ${
                        isHandedOver ? "text-slate-400" : "text-slate-900"
                      }`}
                    >
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeLifafaItem(item.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Emergency Contingency Checklist */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Last-Minute Emergency Kit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Critical Indian wedding contingency items that prevent high-stress ceremony bottlenecks.
            </p>
          </div>

          <div className="space-y-3">
            {emergencyChecklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleEmergencyItem(item.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  item.isReady
                    ? "bg-emerald-50/30 border-emerald-200"
                    : "bg-amber-50/30 border-amber-200/80 hover:border-amber-300"
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEmergencyItem(item.id);
                  }}
                >
                  {item.isReady ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-white" />
                  )}
                </button>

                <div className="flex-1">
                  <p
                    className={`text-xs font-semibold leading-snug ${
                      item.isReady ? "text-slate-700" : "text-amber-950 font-bold"
                    }`}
                  >
                    {item.label}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>Lead: <strong>{item.responsiblePerson}</strong></span>
                    {item.contactPhone && (
                      <>
                        <span className="text-slate-300">•</span>
                        <a
                          href={`tel:${item.contactPhone.replace(/\s+/g, "")}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-slate-700 font-medium hover:underline"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.contactPhone}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
