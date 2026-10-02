import { describe, expect, it } from "vitest";

import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml report viewer", () => {
  it("keeps safe report markup", () => {
    const dirty =
      '<div class="metric"><strong>Fase</strong></div><script>alert(1)</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("Fase");
    expect(clean).not.toContain("script");
  });
});
