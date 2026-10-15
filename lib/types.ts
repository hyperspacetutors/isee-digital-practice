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
  passageText: string;     // RC passages — same text shared across 6 questions
  subsection: string;      // e.g. "Synonyms", "Word Problems", "Quantitative Comparison"
  section: Section;
  difficulty: string;
  concepts: string;        // pipe-delimited: "Fractions | Percent | Multi-step"
  correctAnswer: "A" | "B" | "C" | "D";
  solutionNotes: string;
  imageUrl: string;         // optional figure/chart image (jsDelivr URL); blank if no figure
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
