import { afterEach, describe, expect, it, vi } from "vitest";

import { isEmailDryRun, plainTextToHtml, sendEmail } from "../sender";

describe("email sender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("runs in dry-run when Resend is not configured", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(isEmailDryRun()).toBe(true);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ok = await sendEmail({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("converts plain text to simple HTML", () => {
    const html = plainTextToHtml("Line one\nLine <two>");
    expect(html).toContain("Line one<br>");
    expect(html).toContain("&lt;two&gt;");
  });
});
