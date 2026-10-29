import React from "react";

export interface SafeNarrativeProps {
  content: string;
  className?: string;
  roleLens?: string;
}

/**
 * Parses inline formatting like **bold** and `code` into pure React nodes with zero raw HTML insertion.
 */
function parseInlineFormatting(text: string): React.ReactNode[] {
  // Regex matches `code` or **bold** or *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * SafeNarrative Component
 * Strictly complies with OWASP A03 / LLM01 by enforcing safe React DOM tree creation.
 * Parses plain-text and structured Markdown-like AI narratives into safe React elements.
 */
export const SafeNarrative: React.FC<SafeNarrativeProps> = ({
  content,
  className = "",
  roleLens
}) => {
  if (!content || typeof content !== "string") {
    return null;
  }

  // Split content into lines to handle blocks (paragraphs, lists)
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let currentListItems: React.ReactNode[] = [];
  let listIndex = 0;

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul
          key={`list-${listIndex++}`}
          className="my-2 space-y-1 pl-5 list-disc text-slate-700 text-xs"
        >
          {currentListItems}
        </ul>
      );
      currentListItems = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      return;
    }

    // Check for bullet items (starts with *, -, or numbered 1., 2.)
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch) {
      const itemContent = bulletMatch[1];
      currentListItems.push(
        <li key={`li-${idx}`} className="leading-relaxed">
          {parseInlineFormatting(itemContent)}
        </li>
      );
      return;
    }

    // Flush any pending list before handling normal paragraphs
    flushList();

    // Check for headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${idx}`} className="text-xs font-bold text-slate-900 mt-2 mb-1">
          {parseInlineFormatting(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h3-${idx}`} className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5">
          {parseInlineFormatting(line.slice(3))}
        </h3>
      );
    } else {
      elements.push(
        <p key={`p-${idx}`} className="my-1.5 text-xs text-slate-700 leading-relaxed">
          {parseInlineFormatting(line)}
        </p>
      );
    }
  });

  flushList();

  return (
    <div
      className={`safe-narrative-container ${className}`}
      data-role-lens={roleLens}
    >
      {elements}
    </div>
  );
};
