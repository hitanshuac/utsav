import { describe, it, expect, beforeEach } from "vitest";
import {
  clearDispatchLog,
  getDispatchLog,
  isInternalManagerEmail,
  resolveThirdPartyVendorEmail,
  triggerEmailNotification,
  triggerWhatsAppNotification
} from "../src/lib/services/communication";

describe("Communication Service (src/lib/services/communication.ts)", () => {
  beforeEach(() => {
    clearDispatchLog();
  });

  it("triggers mock WhatsApp notifications for vendor contacts", () => {
    const res = triggerWhatsAppNotification({
      taskId: "m8",
      taskTitle: "Baraat Assembly & Dhol Toli Procession Start",
      phone: "+91 98102 77889",
      vendorName: "Gurnam Singh",
      message: "Namaste Gurnam Singh ji, please standby for 17:30 Baraat start."
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe("sent");
    expect(res.channel).toBe("whatsapp");
    expect(res.recipient).toBe("919810277889");
    expect(res.actionUrl).toContain("https://wa.me/919810277889");
    expect(getDispatchLog("m8")).toHaveLength(1);
  });

  it("allows Email notifications to 3rd-party vendors", () => {
    const res = triggerEmailNotification({
      taskId: "m8",
      taskTitle: "Baraat Assembly & Dhol Toli Procession Start",
      to: "gurnam@punjabdhol.in",
      vendorName: "Gurnam Singh",
      subject: "[URGENT] Baraat Assembly",
      body: "Please confirm Dhol team arrival at gate."
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe("sent");
    expect(res.channel).toBe("email");
    expect(res.recipient).toBe("gurnam@punjabdhol.in");
    expect(res.actionUrl).toContain("mailto:gurnam%40punjabdhol.in");
  });

  it("blocks Email notifications addressed to internal event managers", () => {
    expect(isInternalManagerEmail("hitanshuac@gmail.com")).toBe(true);

    const res = triggerEmailNotification({
      taskId: "m2",
      taskTitle: "Finalize Royal Caterers Tasting",
      to: "hitanshuac@gmail.com",
      vendorName: "Internal Manager",
      subject: "Internal test",
      body: "Should not be sent to manager"
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe("blocked_internal_manager");
    expect(res.reason).toContain("3rd-party vendors only");
  });

  it("resolves deterministic 3rd-party vendor emails from vendorContact", () => {
    const emailFromContact = resolveThirdPartyVendorEmail({
      name: "Mukesh Yadav",
      phone: "+91 98221 44556",
      role: "Electrical Engineer"
    });
    expect(emailFromContact).toBe("mukesh.yadav@vendor.utsav.in");

    const explicitThirdParty = resolveThirdPartyVendorEmail({
      name: "Rajesh Sharma",
      email: "rajesh@royalcaterers.in"
    });
    expect(explicitThirdParty).toBe("rajesh@royalcaterers.in");
  });
});
