import type { ReactNode } from "react";
import styles from "./markdown.module.css";

/**
 * Safe Markdown-subset renderer for section text (design-gate decision:
 * Markdown, no raw HTML). It builds React elements directly; nothing is ever
 * injected as HTML, so markup in the source is shown as text.
 *
 * Supported: ## / ### / #### headings (# is treated as ##, because the section
 * title is the page's h1), paragraphs, - and 1. lists, **bold**, *italic*,
 * `code`, [links](https://… or /…), images on their own line ![alt](src)
 * (alt text REQUIRED), fenced ``` code blocks, callouts > [!NOTE] / [!TIP] /
 * [!WARNING] / [!IMPORTANT] / [!CAUTION], plain > quotes, and --- rules.
 */

export type MarkdownIssue = { line: number; message: string };

const CALLOUTS = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
} as const;
type CalloutKind = keyof typeof CALLOUTS;

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; lang: string; code: string }
  | { type: "image"; alt: string; src: string; line: number }
  | { type: "callout"; kind: CalloutKind; lines: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "rule" };

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;

/** Allow only https, same-site relative and mailto URLs. */
export function safeUrl(url: string, { images = false } = {}): string | null {
  const u = url.trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^https:\/\//i.test(u)) return u;
  if (!images && /^mailto:[^\s]+$/i.test(u)) return u;
  return null;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim() === "") {
      i++;
      continue;
    }
    const fence = line.match(/^```\s*([\w-]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!))
        code.push(lines[i++]!);
      i++; // closing fence (or end of input)
      blocks.push({
        type: "code",
        lang: fence[1] ?? "",
        code: code.join("\n"),
      });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = Math.min(4, Math.max(2, heading[1]!.length)) as 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2]! });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }
    const image = line.match(IMAGE_LINE);
    if (image) {
      blocks.push({
        type: "image",
        alt: image[1]!.trim(),
        src: image[2]!,
        line: i + 1,
      });
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) {
        quoted.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      const marker = quoted[0]?.match(
        /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i,
      );
      if (marker) {
        blocks.push({
          type: "callout",
          kind: marker[1]!.toUpperCase() as CalloutKind,
          lines: quoted.slice(1),
        });
      } else {
        blocks.push({ type: "quote", lines: quoted });
      }
      continue;
    }
    const listMatch = line.match(/^(\s*)([-*]|\d+[.)])\s+/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2]!);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(/^\s*([-*]|\d+[.)])\s+(.*)$/);
        if (!m || /\d/.test(m[1]!) !== ordered) break;
        items.push(m[2]!);
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !/^(```|#{1,4}\s|>|(\s*([-*]|\d+[.)])\s))/.test(lines[i]!) &&
      !IMAGE_LINE.test(lines[i]!)
    ) {
      para.push(lines[i]!.trim());
      i++;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

/** Author-facing checks (e.g. images without alt text, unsafe links). */
export function validateMarkdown(source: string): MarkdownIssue[] {
  const issues: MarkdownIssue[] = [];
  for (const b of parseMarkdown(source)) {
    if (b.type !== "image") continue;
    if (!b.alt)
      issues.push({
        line: b.line,
        message: "Image is missing alt text (a description).",
      });
    if (!safeUrl(b.src, { images: true }))
      issues.push({
        line: b.line,
        message: "Image URL must be https:// or start with /.",
      });
  }
  return issues;
}

// Inline: `code`, **bold**, *italic*, [text](url). Everything else is text.
const INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const token = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (m[2]) {
      out.push(
        <strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>,
      );
    } else if (m[3]) {
      out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const href = safeUrl(link[2]!);
      if (href) {
        const external = href.startsWith("https://");
        out.push(
          <a
            key={key}
            href={href}
            {...(external
              ? { rel: "noopener noreferrer", target: "_blank" }
              : {})}
          >
            {renderInline(link[1]!, key)}
            {external ? (
              <span className={styles.srOnly}> (opens in a new tab)</span>
            ) : null}
          </a>,
        );
      } else {
        out.push(link[1]!); // unsafe URL: keep only the text
      }
    }
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={styles.prose}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "heading": {
            const Tag = `h${b.level}` as "h2" | "h3" | "h4";
            return (
              <Tag key={key} id={slug(b.text)}>
                {renderInline(b.text, key)}
              </Tag>
            );
          }
          case "paragraph":
            return <p key={key}>{renderInline(b.text, key)}</p>;
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={key}>
                {b.items.map((item, j) => (
                  <li key={`${key}-${j}`}>
                    {renderInline(item, `${key}-${j}`)}
                  </li>
                ))}
              </Tag>
            );
          }
          case "code":
            return (
              <pre
                key={key}
                className={styles.code}
                tabIndex={0}
                aria-label={b.lang ? `${b.lang} code` : "Code"}
              >
                <code>{b.code}</code>
              </pre>
            );
          case "image": {
            const src = safeUrl(b.src, { images: true });
            if (!b.alt || !src) {
              // Never show an image without a description (WCAG 1.1.1).
              return (
                <p key={key} className={styles.missing}>
                  [Image not shown: it needs a description.]
                </p>
              );
            }
            return (
              <figure key={key} className={styles.figure}>
                {/* eslint-disable-next-line @next/next/no-img-element -- content images, lazy-loaded */}
                <img src={src} alt={b.alt} loading="lazy" decoding="async" />
              </figure>
            );
          }
          case "callout":
            return (
              <aside
                key={key}
                className={`${styles.callout} ${styles[b.kind.toLowerCase()] ?? ""}`}
                role="note"
              >
                <p className={styles.calloutTitle}>{CALLOUTS[b.kind]}</p>
                {b.lines
                  .join("\n")
                  .split(/\n\s*\n/)
                  .filter((p) => p.trim())
                  .map((p, j) => (
                    <p key={`${key}-${j}`}>
                      {renderInline(p.replace(/\n/g, " "), `${key}-${j}`)}
                    </p>
                  ))}
              </aside>
            );
          case "quote":
            return (
              <blockquote key={key}>
                {renderInline(b.lines.join(" "), key)}
              </blockquote>
            );
          case "rule":
            return <hr key={key} />;
        }
      })}
    </div>
  );
}
