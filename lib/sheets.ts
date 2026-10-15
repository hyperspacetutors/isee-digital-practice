import Papa from "papaparse";
import { Question, Section, SECTION_ORDER, TestData } from "./types";

// ─── env config ──────────────────────────────────────────────────────────────
//
// Multi-tab mode (recommended):
//   NEXT_PUBLIC_SHEET_BASE_URL  — published CSV base, e.g.
//     https://docs.google.com/spreadsheets/d/e/LONG_ID/pub?output=csv
//   NEXT_PUBLIC_SHEET_TABS      — comma-separated "Display Name=gid" pairs, e.g.
//     Upper Level Practice Test 3=0,Upper Level Practice Test 2=1234567890
//     The Display Name becomes the testId for each row unless the row's own
//     test_id column is non-empty (which lets one tab hold multiple tests).
//
// Legacy single-tab mode (backwards-compatible):
//   NEXT_PUBLIC_SHEET_URL       — full published CSV URL including &gid=
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

const SHEET_BASE_URL = process.env.NEXT_PUBLIC_SHEET_BASE_URL ?? "";
const SHEET_TABS_RAW = process.env.NEXT_PUBLIC_SHEET_TABS ?? "";
const SHEET_URL_LEGACY = process.env.NEXT_PUBLIC_SHEET_URL ?? "";

const PASSAGE_SECTION = "reading passage";
const SOURCE_SECTION = "source";

// ─── tab config parsing ───────────────────────────────────────────────────────

interface TabConfig {
  name: string; // used as testId fallback
  url: string;
}

function parseTabConfigs(): TabConfig[] {
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
  if (SHEET_URL_LEGACY) {
    return [{ name: "", url: SHEET_URL_LEGACY }];
  }
  return [];
}

// ─── fetch + parse ────────────────────────────────────────────────────────────

const cell = (row: Record<string, string>, key: string) => row[key]?.trim() ?? "";

/** Normalise a passage ID so "1", "1.0" and " 1 " all match. */
const normId = (id: string) => {
  const n = Number(id);
  return id && !Number.isNaN(n) ? String(n) : id.trim().toLowerCase();
};

async function fetchTab(tab: TabConfig): Promise<Map<string, TestData>> {
  const res = await fetch(tab.url, { next: { revalidate: 3600 } });
  const text = await res.text();

  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
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
      figureUrl: cell(row, "figure_url"),
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

export async function fetchTestIds(): Promise<string[]> {
  const tests = await fetchAllTests();
  return [...tests.keys()].filter(Boolean).sort();
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
