"use client";

import { useState } from "react";

type TruncatedTextProps = {
  text: string;
  maxChars: number;
  className?: string;
  /** Extra classes for the paragraph (e.g. text size). */
  textClassName?: string;
};

/**
 * Shows a preview of `text` up to `maxChars`, with Show more / Show less when longer.
 */
export function TruncatedText({
  text,
  maxChars,
  className,
  textClassName = "",
}: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  const needsTruncate = text.length > maxChars;
  const display = expanded || !needsTruncate ? text : text.slice(0, maxChars);

  return (
    <div className={className}>
      <span className={`whitespace-pre-wrap break-words ${textClassName}`}>
        {display}
        {needsTruncate && !expanded ? "…" : ""}
        {needsTruncate ? (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="inline align-baseline text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
}
