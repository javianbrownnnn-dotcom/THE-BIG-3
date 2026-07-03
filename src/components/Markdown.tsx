import * as React from "react";

// Minimal, dependency-free markdown renderer for AI answers and reports.
// Supports: #/##/### headings, **bold**, unordered/ordered lists, paragraphs.
// Deliberately no raw-HTML passthrough — content renders as text.

function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function Markdown({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key++} className="ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key++} className="ml-5 list-disc space-y-1">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(trimmed.slice(2));
      continue;
    }
    if (olMatch) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(olMatch[2]);
      continue;
    }
    flushList();
    if (!trimmed) continue;
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h4 key={key++} className="pt-1 text-sm font-semibold text-foreground">
          {inline(trimmed.slice(4))}
        </h4>,
      );
    } else if (trimmed.startsWith("## ")) {
      blocks.push(
        <h3 key={key++} className="pt-2 text-base font-semibold text-foreground">
          {inline(trimmed.slice(3))}
        </h3>,
      );
    } else if (trimmed.startsWith("# ")) {
      blocks.push(
        <h2 key={key++} className="text-lg font-semibold text-foreground">
          {inline(trimmed.slice(2))}
        </h2>,
      );
    } else {
      blocks.push(<p key={key++}>{inline(trimmed)}</p>);
    }
  }
  flushList();

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">{blocks}</div>
  );
}
