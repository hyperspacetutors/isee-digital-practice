export type Section =
  | "Verbal Reasoning"
  | "Quantitative Reasoning"
  | "Reading Comprehension"
  | "Mathematics Achievement";

export interface Question {
  testId: string;
  questionNum: number;
  questionText: string;    // the actual question (optional — leave blank to just show number)
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  columnA: string;         // Quantitative Comparison: left quantity (LaTeX ok)
  columnB: string;         // Quantitative Comparison: right quantity (LaTeX ok)
  passageId: string;       // RC: value of the sheet's reading_passage column
  passageText: string;     // RC: joined from the matching "Reading Passage" row; " || " = line break
  subsection: string;      // e.g. "Synonyms", "Word Problems", "Quantitative Comparison"
  section: Section;
  difficulty: string;
  concepts: string;        // comma- or pipe-delimited tags
  correctAnswer: "A" | "B" | "C" | "D";
  solutionNotes: string;
  figureUrl: string;       // sheet column figure_url, resolved to /figures/<name> or a full URL
  optionImages: boolean;   // problem_notes contains "ANS FIG" → option_a–d are image references
}

/** Everything the test page needs for one test. */
export interface TestData {
  questions: Question[];
  source: string;          // citation from the sheet's "Source" row (blank if none)
}

/** Split a concepts cell on commas or pipes. */
export function splitConcepts(concepts: string): string[] {
  return concepts
    .split(/[|,]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export interface Response {
  questionNum: number;
  section: Section;
  selectedAnswer: "A" | "B" | "C" | "D" | null;
  correctAnswer: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  concepts: string;
  solutionNotes: string;
  subsection: string;
}

export interface SectionResult {
  section: Section;
  correct: number;
  total: number;
  responses: Response[];
}

// ISEE section time limits in seconds
export const SECTION_TIME: Record<Section, number> = {
  "Verbal Reasoning": 20 * 60,
  "Quantitative Reasoning": 35 * 60,
  "Reading Comprehension": 35 * 60,
  "Mathematics Achievement": 40 * 60,
};

export const SECTION_ORDER: Section[] = [
  "Verbal Reasoning",
  "Quantitative Reasoning",
  "Reading Comprehension",
  "Mathematics Achievement",
];
