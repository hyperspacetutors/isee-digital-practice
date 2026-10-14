import Papa from "papaparse";
import { Question, Section } from "./types";

// ─── env config ──────────────────────────────────────────────────────────────
//
// Multi-tab mode (recommended):
//   NEXT_PUBLIC_SHEET_BASE_URL  — spreadsheet export base, e.g.
//     https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv
//   NEXT_PUBLIC_SHEET_TABS      — comma-separated "Display Name=gid" pairs, e.g.
//     Upper Level Practice Test 3=0,Upper Level Practice Test 2=1234567890
//     (The gid is the number after &gid= in the sheet's browser URL.)
//     The Display Name becomes the testId for each row unless the row's own
//     test_id column is non-empty (which lets one tab hold multiple tests).
//
// Legacy single-tab mode (backwards-compatible):
//   NEXT_PUBLIC_SHEET_URL       — full published CSV URL including &gid=

const SHEET_BASE_URL = process.env.NEXT_PUBLIC_SHEET_BASE_URL ?? "";
const SHEET_TABS_RAW = process.env.NEXT_PUBLIC_SHEET_TABS ?? "";
const SHEET_URL_LEGACY = process.env.NEXT_PUBLIC_SHEET_URL ?? "";

// ─── tab config parsing ───────────────────────────────────────────────────────

interface TabConfig {
  name: string; // used as testId fallback
  url: string;
}

function parseTabConfigs(): TabConfig[] {
  // New multi-tab mode
  if (SHEET_BASE_URL && SHEET_TABS_RAW) {
    return SHEET_TABS_RAW.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const eqIdx = entry.lastIndexOf("=");
        const name = entry.slice(0, eqIdx).trim();
        const gid = entry.slice(eqIdx + 1).trim() || "0";
        return { name, url: `${SHEET_BASE_URL}&gid=${gid}` };
      });
  }
  // Legacy single-URL mode
  if (SHEET_URL_LEGACY) {
    return [{ name: "", url: SHEET_URL_LEGACY }];
  }
  return [];
}

// ─── fetch helpers ────────────────────────────────────────────────────────────

async function fetchTabQuestions(tab: TabConfig): Promise<Question[]> {
  const res = await fetch(tab.url, { next: { revalidate: 3600 } });
  const text = await res.text();

  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return data.map((row) => ({
    // Row's own test_id takes priority; fall back to the tab's display name
    testId: row["test_id"]?.trim() || tab.name,
    questionNum: parseInt(row["question_num"] ?? "0", 10),
    questionText: row["question_text"]?.trim() ?? "",
    optionA: row["option_a"]?.trim() ?? "",
    optionB: row["option_b"]?.trim() ?? "",
    optionC: row["option_c"]?.trim() ?? "",
    optionD: row["option_d"]?.trim() ?? "",
    passageText: row["passage_text"]?.trim() ?? "",
    subsection: row["subsection"]?.trim() ?? "",
    section: row["section"]?.trim() as Section,
    difficulty: row["difficulty"]?.trim() ?? "",
    concepts: row["concepts"]?.trim() ?? "",
    correctAnswer: row["correct_answer"]?.trim().toUpperCase() as "A" | "B" | "C" | "D",
    solutionNotes: row["solution_notes"]?.trim() ?? "",
  }));
}

// ─── fetch ────────────────────────────────────────────────────────────────────
// No manual cache here — Next.js deduplicates and revalidates via the
// { next: { revalidate } } option passed to each fetch() call in fetchTabQuestions.

export async function fetchQuestions(): Promise<Question[]> {
  const tabs = parseTabConfigs();
  const results = await Promise.all(tabs.map(fetchTabQuestions));
  return results.flat();
}

export async function fetchTestIds(): Promise<string[]> {
  const questions = await fetchQuestions();
  return [...new Set(questions.map((q) => q.testId))].filter(Boolean).sort();
}

export async function fetchQuestionsForTest(testId: string): Promise<Question[]> {
  const questions = await fetchQuestions();
  return questions
    .filter((q) => q.testId === testId)
    .sort((a, b) => {
      const sectionOrder = [
        "Verbal Reasoning",
        "Quantitative Reasoning",
        "Reading Comprehension",
        "Mathematics Achievement",
      ];
      const sA = sectionOrder.indexOf(a.section);
      const sB = sectionOrder.indexOf(b.section);
      return sA !== sB ? sA - sB : a.questionNum - b.questionNum;
    });
}
