"use client";

/**
 * RenderMath — renders sheet text with inline LaTeX and simple formatting tags.
 *
 * Math: wrap LaTeX in \( ... \)   e.g. "Find \(y\) when \(y = 3x^2 + 2\)."
 *   Dollar signs are plain text — only \(...\) triggers math.
 *
 * Formatting tags allowed in any sheet cell (everything else shows as literal text):
 *   <b> <strong>  bold        <i> <em>  italic       <u>  underline
 *   <sup> <sub>   super/sub   <br>      line break
 * Line breaks typed inside a cell (Ctrl+Enter in Google Sheets) are kept too.
 *   Tags may wrap math:  "<b>\(x = 2\)</b>"
 */

import katex from "katex";

const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "sup", "sub"];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escape text, then re-enable only the allowed formatting tags (no attributes). */
export function formatInline(text: string): string {
  const tagRe = new RegExp(`&lt;(\\/?)(${ALLOWED_TAGS.join("|")})\\s*&gt;`, "gi");
  return escapeHtml(text)
    .replace(tagRe, (_, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`)
    .replace(/&lt;br\s*\/?\s*&gt;/gi, "<br/>")
    // Line breaks typed inside a sheet cell (Ctrl+Enter / Alt+Enter) display as line breaks
    .replace(/\r?\n/g, "<br/>");
}

/**
 * Small fixes applied to the LaTeX inside \(...\) before rendering:
 *  - a bare "#" (e.g. the ISEE "#x" operator) is a reserved LaTeX character and makes
 *    KaTeX show the raw source in red, so it is escaped to "\#". Already-escaped "\#" is left alone.
 */
function fixLatex(latex: string): string {
  return latex.replace(/(?<!\\)#/g, "\\#");
}

/** Text + \(...\) math + allowed tags → one HTML string. */
export function renderRich(text: string): string {
  return text
    .split(/(\\[\(][\s\S]*?\\[\)])/g)
    .map((part) =>
      part.startsWith("\\(") && part.endsWith("\\)")
        ? katex.renderToString(fixLatex(part.slice(2, -2)), { throwOnError: false, output: "html" })
        : formatInline(part)
    )
    .join("");
}

export function RenderMath({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderRich(text) }} />;
}
