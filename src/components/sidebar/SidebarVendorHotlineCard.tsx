/**
 * Sidebar Verified Vendor Hotline Card component.
 */
import type { FC } from "react";
import { PhoneCall, ExternalLink } from "lucide-react";
import { generateWhatsAppLink } from "../../lib/plannerEngine";

interface SidebarVendorHotlineCardProps {
  vendorPhone: string;
}

export const SidebarVendorHotlineCard: FC<SidebarVendorHotlineCardProps> = ({ vendorPhone }) => {
  const verifiedVendors = [
    {
      role: "Royal Banquet Manager",
      name: "Sunil Verma",
      phone: "+91 98101 11223",
      tag: "Venue Locked"
    },
    {
      role: "Head Caterer",
      name: "Rajesh Sharma",
      phone: vendorPhone || "+91 98101 23456",
      tag: "Live Tasting"
    },
    {
      role: "Floral & Stage Lead",
      name: "Deepak Saini",
      phone: "+91 98101 55667",
      tag: "Blueprint Approved"
    }
  ];

  return (
    <div className="utsav-card shadow-xs">
      <div className="utsav-card-header">
        <h2 className="utsav-card-title flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>Verified Vendor Shortlist</span>
        </h2>
        <span className="utsav-badge utsav-badge-ontrack text-[10px]">Active</span>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Direct 1-click WhatsApp channels to locked venue, catering, and decor captains.
      </p>

      <div className="flex flex-col gap-2.5">
        {verifiedVendors.map((vendor, idx) => {
          const waLink = generateWhatsAppLink(
            vendor.phone,
            `Namaste ${vendor.name}! Checking in regarding milestone updates for our celebration.`
          );
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <strong className="text-xs text-slate-900">{vendor.name}</strong>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-mono">
                    {vendor.tag}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{vendor.role}</div>
              </div>

              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="utsav-btn bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] px-2.5 py-1 font-semibold flex items-center gap-1 shrink-0"
                aria-label={`WhatsApp ${vendor.name}`}
              >
                <span>Chat</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
