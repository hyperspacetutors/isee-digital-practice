// ─── Practice test visibility — edit here ───────────────────────────────────
//
// true  = test appears on the home page and can be taken
// false = test is hidden (not listed, and its /test/... link shows no questions)
//
// Names must match the tab display names in NEXT_PUBLIC_SHEET_TABS (.env.local).

export const TEST_VISIBILITY: Record<string, boolean> = {
  "Upper Level Practice Test 1": true,
  "Upper Level Practice Test 2": true,
  "Upper Level Practice Test 3": true,
  "Upper Level Practice Test 4": true,
};

// Tests in the sheet config that are NOT listed above: show them (true) or hide them (false).
export const SHOW_UNLISTED_TESTS = true;

export function isTestVisible(testId: string): boolean {
  return TEST_VISIBILITY[testId] ?? SHOW_UNLISTED_TESTS;
}
