import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Markdown,
  parseMarkdown,
  safeUrl,
  validateMarkdown,
} from "@/lib/markdown";

const html = (md: string) => renderToStaticMarkup(<Markdown source={md} />);

describe("Markdown renderer", () => {
  it("renders headings (shifted below the page h1), paragraphs, lists and emphasis", () => {
    const out = html(
      "# Title\n\n## Sub\n\nSome **bold** and *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second",
    );
    expect(out).toContain('<h2 id="title">Title</h2>');
    expect(out).toContain('<h2 id="sub">Sub</h2>');
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain("<code>code</code>");
    expect(out).toMatch(/<ul><li>one<\/li><li>two<\/li><\/ul>/);
    expect(out).toMatch(/<ol><li>first<\/li><li>second<\/li><\/ol>/);
    expect(out).not.toContain("<h1");
  });

  it("renders callouts with a visible label and role=note", () => {
    const out = html("> [!TIP]\n> Remember this.");
    expect(out).toContain('role="note"');
    expect(out).toContain(">Tip</p>");
    expect(out).toContain("Remember this.");
  });

  it("renders fenced code blocks verbatim (escaped), focusable for scrolling", () => {
    const out = html("```bash\necho <b>hi</b>\n```");
    expect(out).toContain('tabindex="0"');
    expect(out).toContain("echo &lt;b&gt;hi&lt;/b&gt;");
  });

  it("renders images with alt text, lazily", () => {
    const out = html("![A router joining two networks](/content/demo/x.svg)");
    expect(out).toContain('alt="A router joining two networks"');
    expect(out).toContain('loading="lazy"');
  });

  it("never renders an image without alt text", () => {
    const out = html("![](/content/demo/x.svg)");
    expect(out).not.toContain("<img");
    expect(out).toContain("needs a description");
    expect(validateMarkdown("![](/x.svg)")).toEqual([
      { line: 1, message: "Image is missing alt text (a description)." },
    ]);
  });

  it("never passes raw HTML through", () => {
    const out = html(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("drops unsafe link and image URLs", () => {
    const out = html(
      "[click](javascript:alert(1)) and [ok](https://example.invalid)\n\n![x](javascript:alert(1))",
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://example.invalid"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(safeUrl("//evil.example")).toBeNull();
    expect(safeUrl("data:image/png;base64,AA", { images: true })).toBeNull();
  });

  it("parses the demo seed format", () => {
    const blocks = parseMarkdown("> [!NOTE]\n> Demo.\n\n## Heading\n\nText.");
    expect(blocks.map((b) => b.type)).toEqual([
      "callout",
      "heading",
      "paragraph",
    ]);
  });
});
