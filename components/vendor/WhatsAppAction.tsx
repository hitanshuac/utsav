import React, { useState } from "react";
import { MessageSquare, ExternalLink, Copy, Check } from "lucide-react";

export function createWhatsAppDispatchLink(
  phone: string,
  vendor: string,
  questions: string[]
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const text = `Hi ${vendor}, regarding the quotation details:
${questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}

Could you please clarify these points? Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

interface WhatsAppActionProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  vendorName: string;
  questions: string[];
}

export const WhatsAppAction: React.FC<WhatsAppActionProps> = ({
  phone,
  onPhoneChange,
  vendorName,
  questions
}) => {
  const [copied, setCopied] = useState(false);
  const waUrl = createWhatsAppDispatchLink(phone, vendorName, questions);

  const handleCopyMessage = async () => {
    const messagePreview = `Hi ${vendorName}, regarding the quotation details:\n${questions
      .map((q, idx) => `${idx + 1}. ${q}`)
      .join("\n")}\n\nCould you please clarify these points? Thank you!`;
    try {
      await navigator.clipboard.writeText(messagePreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label
          htmlFor="vendor-whatsapp-phone"
          className="text-xs font-medium text-slate-600"
        >
          Vendor WhatsApp Number (with country code)
        </label>
        <input
          id="vendor-whatsapp-phone"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="919876543210"
          className="w-full sm:w-48 px-3 py-1.5 text-sm font-mono bg-white border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleCopyMessage}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Copied Text</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Questions</span>
            </>
          )}
        </button>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Send negotiation questions to ${vendorName} on WhatsApp`}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Dispatch via WhatsApp (wa.me)</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
};
