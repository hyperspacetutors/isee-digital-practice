import Papa from "papaparse";

// ─── Vocabulary practice — config ────────────────────────────────────────────
//
// .env.local:
//   NEXT_PUBLIC_VOCAB_TABS — comma-separated "Display Name=gid" pairs, e.g.
//     Upper Level Vocabulary=2112710087
//   Uses the same NEXT_PUBLIC_SHEET_BASE_URL as the practice tests.
//
// Sheet columns: word, option_a, option_b, option_c, option_d, definition,
//                correct_answer, flag

/** Number of words drawn at random for each practice session. */
export const VOCAB_SESSION_SIZE = 20;
/** Skip words whose `flag` column is non-empty (e.g. mark words to retire). */
export const VOCAB_EXCLUDE_FLAGGED = true;
/** Show the vocabulary practice card(s) on the home page. */
export const SHOW_VOCAB_PRACTICE = true;

export interface VocabWord {
  word: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  definition: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

const BASE_URL = process.env.NEXT_PUBLIC_SHEET_BASE_URL ?? "";
const VOCAB_TABS_RAW = process.env.NEXT_PUBLIC_VOCAB_TABS ?? "";

function parseVocabTabs(): { name: string; url: string }[] {
  if (!BASE_URL || !VOCAB_TABS_RAW) return [];
  return VOCAB_TABS_RAW.split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => {
      const i = e.lastIndexOf("=");
      return { name: e.slice(0, i).trim(), url: `${BASE_URL}&gid=${e.slice(i + 1).trim() || "0"}` };
    });
}

export function fetchVocabListNames(): string[] {
  return SHOW_VOCAB_PRACTICE ? parseVocabTabs().map((t) => t.name) : [];
}

export async function fetchVocabList(name: string): Promise<VocabWord[]> {
  if (!SHOW_VOCAB_PRACTICE) return [];
  const tab = parseVocabTabs().find((t) => t.name === name);
  if (!tab) return [];
  const res = await fetch(tab.url, { next: { revalidate: 3600 } });
  const { data } = Papa.parse<Record<string, string>>(await res.text(), {
    header: true,
    skipEmptyLines: true,
    // Keep every cell as the exact text from the sheet: never convert to numbers,
    // so values like 2.50, 0.10 or 007 display exactly as typed (no rounding/trimming).
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const c = (r: Record<string, string>, k: string) => r[k]?.trim() ?? "";
  return data
    .filter((r) => c(r, "word") && /^[ABCD]$/i.test(c(r, "correct_answer")))
    .filter((r) => !(VOCAB_EXCLUDE_FLAGGED && c(r, "flag")))
    .map((r) => ({
      word: c(r, "word"),
      optionA: c(r, "option_a"),
      optionB: c(r, "option_b"),
      optionC: c(r, "option_c"),
      optionD: c(r, "option_d"),
      definition: c(r, "definition"),
      correctAnswer: c(r, "correct_answer").toUpperCase() as VocabWord["correctAnswer"],
    }));
}
