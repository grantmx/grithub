import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EMAIL_BRAND,
  digestEmail,
  invitationEmail,
  magicLinkEmail,
  notificationEmail,
  renderEmail,
} from "@/lib/server/email";
import {
  GENERATED,
  compileStandardEmail,
  generatedModule,
} from "@/scripts/build-email-template";

describe("standard email template", () => {
  it("generated HTML matches emails/standard.mjml (run `yarn workspace lms email:template`)", async () => {
    expect(readFileSync(GENERATED, "utf8")).toBe(
      generatedModule(await compileStandardEmail()),
    );
  });

  it("fills heading, lines, red button, link and current year, with nothing left over", () => {
    const { html, text } = renderEmail({
      subject: "Sign in",
      heading: "Sign in to GRIT Hub Learning",
      lines: ["First line.", "Second line."],
      link: "https://learn.example.test/auth/link/abc",
      cta: "Sign in",
      now: new Date("2031-03-01T00:00:00Z"),
    });
    expect(html).not.toMatch(/\{\{\w+\}\}/);
    expect(html).toContain("Sign in to GRIT Hub Learning</h1>");
    expect(html).toContain("<p>First line.</p>");
    expect(html).toContain('href="https://learn.example.test/auth/link/abc"');
    expect(html).toMatch(/background:#e92938/i);
    expect(html).toContain("font-size:19px");
    expect(html).toContain("&copy;2031");
    expect(html).toContain(EMAIL_BRAND.address);
    expect(html).toContain(EMAIL_BRAND.instagramUrl);
    expect(html).not.toContain("sharer"); // profile links, not share dialogs
    expect(text).toContain("Sign in: https://learn.example.test/auth/link/abc");
    expect(text).toContain("©2031");
  });

  it("escapes names and other values, and never re-substitutes placeholders", () => {
    const msg = invitationEmail(
      "a@example.test",
      '<script>x</script> {{ctaHref}}',
      "https://learn.example.test/setup/t?a=1&b=2",
    );
    expect(msg.html).not.toContain("<script>x</script>");
    expect(msg.html).toContain("&#60;script&#62;");
    expect(msg.html).toContain("{{ctaHref}}"); // left as typed, not replaced
    expect(msg.html).toContain("a=1&#38;b=2");
  });

  it("every LMS email uses the template", () => {
    for (const m of [
      magicLinkEmail("a@example.test", "https://x.test/l"),
      notificationEmail("a@example.test", "New announcement", ["A line."], "https://x.test/n"),
      digestEmail("a@example.test", ["One", "Two"], "https://x.test/d"),
    ]) {
      expect(m.html).toContain(EMAIL_BRAND.logoUrl);
      expect(m.html).not.toMatch(/\{\{\w+\}\}/);
    }
  });
});
