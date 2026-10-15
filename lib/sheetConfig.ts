// ─── Sheet configuration — edit here, then commit + push ────────────────────
//
// Everything the app needs to find the Google Sheet lives in this file.
// No environment variables are needed (locally or on Vercel).
//
// SHEET_BASE_URL: File → Share → Publish to web → (any tab) → CSV → copy the link,
//   then remove everything from "&gid=" onward. Must end in "/pub?output=csv".
//
// gid: click the tab in Google Sheets; it's the number after "#gid=" in the address bar.
// name: shown on the home page and used in the test's link. Tests appear in this order.
// visible: false hides the test/list everywhere (home page and direct links).

export const SHEET_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSuE7XY4g0mLZ5R3Y8jdwGe8O0AWryLviSngXfqK3Sjxrbbyh6WaxeUyRhVkioNSXiWo6GJlGagSZAX/pub?output=csv";

export interface SheetTab {
  name: string;
  gid: string;
  visible: boolean;
}

export const TESTS: SheetTab[] = [
  { name: "Upper Level Practice Test 1", gid: "450248709", visible: false },
  { name: "Upper Level Practice Test 2", gid: "1023802230", visible: false },
  { name: "Upper Level Practice Test 3", gid: "0", visible: true },
  { name: "Upper Level Practice Test 4", gid: "1607191292", visible: true },
];

export const VOCAB_LISTS: SheetTab[] = [
  { name: "Upper Level Vocabulary", gid: "2112710087", visible: true },
];

export const tabCsvUrl = (tab: SheetTab) => `${SHEET_BASE_URL}&gid=${tab.gid}`;
