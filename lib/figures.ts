// ─── Figure / image paths (shared by server and browser code) ────────────────
//
// A bare file name (e.g. "ulpt3_qr_14.png") is served from public/figures/.
// Full URLs (https://..., //..., or paths starting with "/") are used as-is.

export const FIGURE_BASE_PATH = "/figures/";
// figure_url only: a name with no extension gets ".png" added.
export const FIGURE_DEFAULT_EXT = ".png";

const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp)$/i;

export function resolveFigureUrl(value: string): string {
  if (!value || /^(https?:)?\/\//i.test(value) || value.startsWith("/")) return value;
  const name = /\.[a-z0-9]{2,5}$/i.test(value) ? value : value + FIGURE_DEFAULT_EXT;
  return FIGURE_BASE_PATH + name;
}

/**
 * Answer choices: a cell is shown as an image when its whole value is an image
 * file name or URL with an image extension, e.g. "ulpt4_qr_18a.png" or
 * "https://.../choice.png". (Unlike figure_url, the extension is required here,
 * so ordinary text answers are never mistaken for images.)
 */
export function isImageRef(value: string): boolean {
  const v = value.trim();
  return !!v && !/\s/.test(v) && IMAGE_EXT.test(v.split(/[?#]/)[0]);
}
