import Papa from "papaparse";
import { Question, Section, SECTION_ORDER, TestData } from "./types";
import { TESTS, tabCsvUrl } from "./sheetConfig";
import { resolveFigureUrl } from "./figures";

// Which tabs to load (and their names/order/visibility) is set in lib/sheetConfig.ts.
//
// ─── sheet row types (by the `section` column) ───────────────────────────────
//
//   Verbal Reasoning / Quantitative Reasoning /
//   Reading Comprehension / Mathematics Achievement  → question rows
//   Reading Passage → passage rows: question_num = passage ID,
//                     question_text = passage text (" || " = line break).
//                     RC questions link to it via their reading_passage column.
//   Source          → question_text = citation shown in the test footer.
//   Anything else is ignored.

// How long (seconds) a fetched copy of the sheet is reused before re-downloading.
// Development: 0 = always fresh, so sheet edits show on the next page load.
// Production: a short cache keeps the site fast; edits appear within this window
// (Google's "Publish to web" can add up to ~5 min of its own delay).
export const SHEET_CACHE_SECONDS = process.env.NODE_ENV === "development" ? 0 : 300;

const PASSAGE_SECTION = "reading passage";
const SOURCE_SECTION = "source";

// ─── tab config ───────────────────────────────────────────────────────────────

interface TabConfig {
  name: string; // used as testId unless a row has its own test_id
  url: string;
}

function parseTabConfigs(): TabConfig[] {
  return TESTS.filter((t) => t.visible)
    .map((t) => ({ name: t.name.trim(), url: tabCsvUrl(t) }))
    // Ignore a tab listed twice (same gid) — it would double every question
    .filter((tab, i, all) => all.findIndex((t) => t.url === tab.url) === i);
}

// ─── fetch + parse ────────────────────────────────────────────────────────────

const cell = (row: Record<string, string>, key: string) => row[key]?.trim() ?? "";

// Figure paths: see lib/figures.ts

/** Normalise a passage ID so "1", "1.0" and " 1 " all match. */
const normId = (id: string) => {
  const n = Number(id);
  return id && !Number.isNaN(n) ? String(n) : id.trim().toLowerCase();
};

async function fetchTab(tab: TabConfig): Promise<Map<string, TestData>> {
  const res = await fetch(tab.url, { next: { revalidate: SHEET_CACHE_SECONDS } });
  const text = await res.text();

  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    // Keep every cell as the exact text from the sheet: never convert to numbers,
    // so values like 2.50, 0.10 or 007 display exactly as typed (no rounding/trimming).
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const tests = new Map<string, TestData>();
  const passages = new Map<string, string>(); // `${testId}::${passageId}` → text
  const getTest = (id: string) => {
    if (!tests.has(id)) tests.set(id, { questions: [], source: "" });
    return tests.get(id)!;
  };

  for (const row of data) {
    const testId = cell(row, "test_id") || tab.name;
    const sectionRaw = cell(row, "section");
    const sectionKey = sectionRaw.toLowerCase();

    if (sectionKey === PASSAGE_SECTION) {
      passages.set(`${testId}::${normId(cell(row, "question_num"))}`, cell(row, "question_text"));
      continue;
    }
    if (sectionKey === SOURCE_SECTION) {
      getTest(testId).source = cell(row, "question_text");
      continue;
    }
    if (!SECTION_ORDER.includes(sectionRaw as Section)) continue;

    getTest(testId).questions.push({
      testId,
      questionNum: parseInt(cell(row, "question_num") || "0", 10),
      questionText: cell(row, "question_text"),
      optionA: cell(row, "option_a"),
      optionB: cell(row, "option_b"),
      optionC: cell(row, "option_c"),
      optionD: cell(row, "option_d"),
      columnA: cell(row, "column_a"),
      columnB: cell(row, "column_b"),
      passageId: cell(row, "reading_passage"),
      passageText: "",
      subsection: cell(row, "subsection"),
      section: sectionRaw as Section,
      difficulty: cell(row, "difficulty"),
      concepts: cell(row, "concepts"),
      correctAnswer: cell(row, "correct_answer").toUpperCase() as "A" | "B" | "C" | "D",
      solutionNotes: cell(row, "solution_notes"),
      figureUrl: resolveFigureUrl(cell(row, "figure_url")),
    });
  }

  // Attach passage text to RC questions by reading_passage ID
  for (const [testId, test] of tests) {
    for (const q of test.questions) {
      if (q.section === "Reading Comprehension" && q.passageId) {
        q.passageText = passages.get(`${testId}::${normId(q.passageId)}`) ?? "";
      }
    }
  }

  return tests;
}

// No manual cache — Next.js dedupes and revalidates via { next: { revalidate } }.
async function fetchAllTests(): Promise<Map<string, TestData>> {
  const tabs = await Promise.all(parseTabConfigs().map(fetchTab));
  const merged = new Map<string, TestData>();
  for (const tab of tabs) {
    for (const [id, test] of tab) {
      const existing = merged.get(id);
      if (existing) {
        existing.questions.push(...test.questions);
        existing.source ||= test.source;
      } else {
        merged.set(id, test);
      }
    }
  }
  return merged;
}

const sortQuestions = (qs: Question[]) =>
  [...qs].sort((a, b) => {
    const sA = SECTION_ORDER.indexOf(a.section);
    const sB = SECTION_ORDER.indexOf(b.section);
    return sA !== sB ? sA - sB : a.questionNum - b.questionNum;
  });

/** Test names in the order listed in lib/sheetConfig.ts (extra test_id values after). */
export async function fetchTestIds(): Promise<string[]> {
  const tests = await fetchAllTests();
  const order = TESTS.map((t) => t.name.trim());
  const rank = (id: string) => (order.indexOf(id) === -1 ? order.length : order.indexOf(id));
  return [...tests.keys()].filter(Boolean).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export async function fetchTest(testId: string): Promise<TestData> {
  const tests = await fetchAllTests();
  const test = tests.get(testId);
  return test
    ? { questions: sortQuestions(test.questions), source: test.source }
    : { questions: [], source: "" };
}

export async function fetchQuestionsForTest(testId: string): Promise<Question[]> {
  return (await fetchTest(testId)).questions;
}
