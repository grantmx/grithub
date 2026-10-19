# Markdown cheat sheet

Markdown is plain text with a few symbols that turn into formatting. This page covers about 90% of what SOPs need. Tip: in VS Code, press `Ctrl+Shift+V` (`Cmd+Shift+V` on Mac) to see a formatted preview next to your text.

## Headings

```markdown
# Page title (one per page)
## Section
### Sub-section
```

## Emphasis

```markdown
**bold**   *italic*
```

Result: **bold**, *italic*.

## Lists

```markdown
- Bullet item
- Another item
  - Indent two spaces for a sub-item

1. First step
2. Second step
3. Third step
```

## Links and images

Link to other pages on this site by their address, starting with a slash and with no `.md` at the end.

```markdown
[Link text](https://example.com)
[Another SOP](/sops/general/sop-001-document-control)
![Describe the image](/images/my-image.png)
```

Put images in `apps/docs/public/images/`. Always describe the image between the square brackets, because it helps people who use screen readers.

## Tables

```markdown
| Role | Responsibility |
| --- | --- |
| Author | Writes the SOP |
| Approver | Signs it off |
```

## Callout boxes

Write the type on its own line, then a line with only `>`, then your text. The empty `>` line is required.

```markdown
> [!WARNING]
>
> Text goes here.
```

The types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`.

> [!WARNING]
>
> Text goes here.

## Diagrams

A fenced block marked `mermaid` becomes a diagram. See [Review and approval](/contributing/review-and-approval) for an example.

## Common mistakes

- **Leave a blank line** before a list, table, or heading, or it will not format.
- **Use spaces, not tabs,** to indent.
- **One `#` heading per page.** Use `##` and below for sections.
- **Do not skip heading levels.** Go from `##` to `###`, not from `##` to `####`.
- **Curly braces and angle brackets can break the build.** If you need to write a `{` or a `<` in normal text, put it inside backticks like this: `{example}`.
