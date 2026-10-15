// ─── Figure / image paths (shared by server and browser code) ────────────────
//
// A bare file name (e.g. "ulpt3_qr_14.png") is served from public/figures/.
// Full URLs (https://..., //..., or paths starting with "/") are used as-is.

export const FIGURE_BASE_PATH = "/figures/";
// A name with no extension gets ".png" added.
export const FIGURE_DEFAULT_EXT = ".png";

export function resolveFigureUrl(value: string): string {
  if (!value || /^(https?:)?\/\//i.test(value) || value.startsWith("/")) return value;
  const name = /\.[a-z0-9]{2,5}$/i.test(value) ? value : value + FIGURE_DEFAULT_EXT;
  return FIGURE_BASE_PATH + name;
}

/**
 * Answer choices are shown as images when the row's problem_notes contains "ANS FIG".
 * Each option cell then holds a figure reference, resolved like figure_url
 * (bare name → /figures/<name>, ".png" added if no extension).
 */
export const ANSWER_FIGURE_MARKER = /ANS\s*FIG/i;
