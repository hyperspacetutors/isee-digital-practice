import Papa from "papaparse";
import { SHEET_CACHE_SECONDS } from "./sheets";
import { VOCAB_LISTS, tabCsvUrl } from "./sheetConfig";

// ─── Vocabulary practice — config ────────────────────────────────────────────
//
// Which vocab tabs to load is set in lib/sheetConfig.ts (VOCAB_LISTS).
//
// Sheet columns: word, option_a, option_b, option_c, option_d, definition,
//                correct_answer, flag

/** Number of words drawn at random for each practice session. */
export const VOCAB_SESSION_SIZE = 20;
/** Skip words whose `flag` column is non-empty (e.g. mark words to retire). */
export const VOCAB_EXCLUDE_FLAGGED = true;

export interface VocabWord {
  word: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  definition: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

function parseVocabTabs(): { name: string; url: string }[] {
  return VOCAB_LISTS.filter((t) => t.visible).map((t) => ({ name: t.name.trim(), url: tabCsvUrl(t) }));
}

export function fetchVocabListNames(): string[] {
  return parseVocabTabs().map((t) => t.name);
}

export async function fetchVocabList(name: string): Promise<VocabWord[]> {
  const tab = parseVocabTabs().find((t) => t.name === name);
  if (!tab) return [];
  const res = await fetch(tab.url, { next: { revalidate: SHEET_CACHE_SECONDS } });
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
