import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("customer delivery panel ownership", () => {
  it("keeps delivery.js as the only renderer of frozen/unavailable delivery state", () => {
    const app = readFileSync("public/app.js", "utf8");
    const delivery = readFileSync("public/delivery.js", "utf8");

    expect(app).toContain("window.__ACE_DELIVERY__?.refresh?.()");
    expect(app).toContain("正在读取客户交付状态");
    expect(app).not.toContain("<b>尚未冻结客户 ZIP</b>");

    expect(delivery).toContain("window.__ACE_DELIVERY__ = { refresh: refreshDeliveryPanel }");
    expect(delivery).toContain("body.dataset.deliveryTaskId = taskId");
    expect(delivery).toContain("body.dataset.deliveryStatus = 'FROZEN'");
    expect(delivery).toContain("<b>尚未冻结客户 ZIP</b>");
    expect(delivery).toContain("下载客户 ZIP");
  });
});
