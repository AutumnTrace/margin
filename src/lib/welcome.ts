export const WELCOME = String.raw`---
title: Welcome to Margin
tags: [markdown, notes, guide]
---

# Welcome to Margin

Margin is a markdown workspace that lives in your browser. Write on the left, read on the right. Everything **saves as you type**, stays on this device, and works offline.

> [!TIP]
> Press **Ctrl K** (or **⌘ K** on a Mac) to open the command palette. Every action in the app is in there.

## Writing

Plain markdown, plus the parts of GitHub's flavour you'd miss: ~~strikethrough~~, autolinks like https://github.com, tables, task lists and footnotes.[^1]

- **Bold** with Ctrl B, *italic* with Ctrl I, ` + '`inline code`' + String.raw` with Ctrl E
- Lists continue when you press Enter
- Select text and press Ctrl Shift K to turn it into a link

### Tasks you can tick

Checkboxes in the preview are live. Click one and the source updates.

- [x] Write the first draft
- [x] Add a diagram
- [ ] Share it with a link

### Tables

| Shortcut | What it does |
| --- | --- |
| Ctrl K | Command palette |
| Ctrl S | Save to a file on disk |
| Ctrl O | Open markdown files |
| Alt 1 / 2 / 3 | Write, split or read view |
| Ctrl . | Focus mode |
| ? | Every shortcut on one sheet |

## Code

Fenced blocks are highlighted for 30+ languages and have a copy button.

` + '```ts' + String.raw`
type Doc = { id: string; name: string; content: string }

export function wordCount(doc: Doc): number {
  return doc.content.match(/\S+/g)?.length ?? 0
}
` + '```' + String.raw`

## Math

Inline math like $e^{i\pi} + 1 = 0$, or a display block:

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## Diagrams

Fenced ` + '`mermaid`' + String.raw` blocks turn into diagrams:

` + '```mermaid' + String.raw`
flowchart LR
  A[Write] --> B{Happy?}
  B -- yes --> C[Share link]
  B -- not yet --> A
  C --> D[(Saved locally)]
` + '```' + String.raw`

## Callouts

> [!NOTE]
> Documents are stored in IndexedDB in this browser. Nothing is uploaded anywhere.

> [!WARNING]
> Clearing your browser's site data deletes the library. Export anything you want to keep.

## Saving and sharing

- **Library**: every document is in the sidebar, newest first.
- **Files**: open ` + '`.md`' + String.raw` files, or drop them anywhere on the window. In Chrome and Edge, Ctrl S writes straight back to the file.
- **Export**: Markdown, a standalone HTML page, or PDF through the print dialog.
- **Share link**: the whole document is compressed into the link itself, so there is no server involved.

---

Delete this document whenever you like. You can bring it back from the command palette with *Restore welcome guide*.

[^1]: Like this one. Footnotes collect at the bottom of the preview.
`
