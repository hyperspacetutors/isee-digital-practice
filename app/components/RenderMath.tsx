"use client";

/**
 * RenderMath — renders plain text mixed with inline LaTeX.
 *
 * Convention: wrap LaTeX in \( ... \) in any sheet cell.
 *   Examples:
 *     "\(x^2\)"                    → x²
 *     "Find \(y\) when \(y = 3x^2 + 2\) and \(-3 \leq x \leq 2\)."
 *     "25% of 50"                  → plain text, no delimiters needed
 *     "$1.75"                      → plain text, dollar signs are fine
 *
 * Dollar signs in text are safe — only \(...\) triggers math rendering.
 */

import katex from "katex";

export function RenderMath({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  // Split on \( ... \) — the standard LaTeX inline-math delimiter
  const parts = text.split(/(\\[\(][\s\S]*?\\[\)])/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("\\(") && part.endsWith("\\)")) {
          const latex = part.slice(2, -2);
          const html = katex.renderToString(latex, {
            throwOnError: false,
            output: "html",
          });
          return (
            <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
