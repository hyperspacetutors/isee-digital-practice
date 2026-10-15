"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question, Response, SectionResult, SECTION_ORDER, SECTION_TIME, Section, TestData, splitConcepts } from "@/lib/types";
import { RenderMath } from "@/app/components/RenderMath";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

// Fixed QC answer choices
const QC_OPTIONS: { label: "A" | "B" | "C" | "D"; text: string }[] = [
  { label: "A", text: "The quantity in Column A is greater." },
  { label: "B", text: "The quantity in Column B is greater." },
  { label: "C", text: "The two quantities are equal." },
  { label: "D", text: "The relationship cannot be determined from the information given." },
];

// Passage line breaks: " || " in the sheet (newlines also accepted)
const splitPassageLines = (text: string) => text.split(/\s*\|\|\s*|\r?\n/);

// ─── sub-components ──────────────────────────────────────────────────────────

function Timer({ seconds, warned }: { seconds: number; warned: boolean }) {
  return (
    <div className={`font-mono text-lg font-bold tabular-nums ${warned ? "text-red-500" : "text-gray-700"}`}>
      {fmtTime(seconds)}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function BackToTests() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/")}
      className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
    >
      ← Tests
    </button>
  );
}

function SetupScreen({
  testName,
  source,
  sections,
  clockEnabled,
  setClockEnabled,
  timeMultiplier,
  setTimeMultiplier,
  showResultsLive,
  setShowResultsLive,
  onStart,
}: {
  testName: string;
  source: string;
  sections: Section[];
  clockEnabled: boolean;
  setClockEnabled: (v: boolean) => void;
  timeMultiplier: 1 | 1.5 | 2;
  setTimeMultiplier: (v: 1 | 1.5 | 2) => void;
  showResultsLive: boolean;
  setShowResultsLive: (v: boolean) => void;
  onStart: () => void;
}) {
  const multipliers: { value: 1 | 1.5 | 2; label: string }[] = [
    { value: 1, label: "1×" },
    { value: 1.5, label: "1.5×" },
    { value: 2, label: "2×" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <BackToTests />
        <span className="text-sm font-semibold text-gray-700">Test Setup</span>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full space-y-6 shadow-sm">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {testName || "Practice Test"}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {sections.length} sections
            </p>
          </div>

          {/* Clock toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">Timer</p>
              <p className="text-xs text-gray-400">Show countdown during sections</p>
            </div>
            <button
              onClick={() => setClockEnabled(!clockEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                clockEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  clockEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Time multiplier */}
          <div className="py-3 border-b border-gray-100">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-800">Time accommodation</p>
              <p className="text-xs text-gray-400">Multiply the standard section time</p>
            </div>
            <div className="flex gap-2">
              {multipliers.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeMultiplier(value)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                    timeMultiplier === value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Show results live */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Show results live</p>
              <p className="text-xs text-gray-400">See correct answers and solution notes as you go</p>
            </div>
            <button
              onClick={() => setShowResultsLive(!showResultsLive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                showResultsLive ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  showResultsLive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button
            onClick={onStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Begin test →
          </button>
        </div>
      </div>

      {source && (
        <div className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
          {source}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onSelect,
  showPassage,
}: {
  question: Question;
  selected: string | null;
  onSelect: (a: "A" | "B" | "C" | "D") => void;
  showPassage: boolean;
}) {
  const isQC = question.subsection === "Quantitative Comparison";

  const options: { label: "A" | "B" | "C" | "D"; text: string }[] = isQC
    ? QC_OPTIONS
    : [
        { label: "A", text: question.optionA },
        { label: "B", text: question.optionB },
        { label: "C", text: question.optionC },
        { label: "D", text: question.optionD },
      ];

  const hasOptions = isQC || options.some((o) => o.text);

  return (
    <div className="space-y-4">
      {/* passage (RC) */}
      {showPassage && question.passageText && (
        <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
          <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {question.passageId ? `Passage ${question.passageId}` : "Passage"}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto bg-gray-50">
            <table className="w-full border-collapse">
              <tbody>
                {splitPassageLines(question.passageText).map((line, i) =>
                  line.trim() ? (
                    <tr key={i}>
                      <td className="text-right pr-3 pl-2 select-none text-gray-400 font-mono text-xs w-8 align-top py-0.5 leading-relaxed">
                        {i + 1}
                      </td>
                      <td className="text-gray-700 leading-relaxed py-0.5 pr-3">{line}</td>
                    </tr>
                  ) : (
                    <tr key={i}>
                      <td colSpan={2} className="py-1.5" />
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* figure / chart image */}
      {question.figureUrl && (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex justify-center p-3">
          <img
            src={question.figureUrl}
            alt={`Figure for question ${question.questionNum}`}
            className="max-w-full max-h-64 object-contain"
          />
        </div>
      )}

      {/* Quantitative Comparison two-column layout */}
      {isQC && (question.columnA || question.columnB) && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-gray-200">
            <div className="p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 underline mb-2">Column A</p>
              <RenderMath text={question.columnA} className="text-base text-gray-900" />
            </div>
            <div className="p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 underline mb-2">Column B</p>
              <RenderMath text={question.columnB} className="text-base text-gray-900" />
            </div>
          </div>
        </div>
      )}

      {/* question text */}
      {!isQC && (
        question.questionText ? (
          <RenderMath text={question.questionText} className="text-gray-900 text-base leading-relaxed" />
        ) : (
          <p className="text-gray-400 italic text-sm">
            Question {question.questionNum} — refer to the paper test
          </p>
        )
      )}

      {/* answer choices */}
      <div className="space-y-2 pt-1">
        {hasOptions
          ? options.map(({ label, text }) => (
              <button
                key={label}
                onClick={() => onSelect(label)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all
                  ${selected === label
                    ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
              >
                <span className="font-semibold mr-2">{label}.</span>
                <RenderMath text={text} />
              </button>
            ))
          : ANSWER_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => onSelect(label)}
                className={`w-24 py-3 rounded-lg border text-sm font-semibold transition-all
                  ${selected === label
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
              >
                {label}
              </button>
            ))}
      </div>
    </div>
  );
}

// ─── solution accordion ──────────────────────────────────────────────────────

function SolutionAccordion({
  question,
  selected,
  open,
  onToggle,
}: {
  question: Question;
  selected: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const isCorrect = selected !== null && selected === question.correctAnswer;
  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {selected !== null && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isCorrect
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isCorrect ? "Correct" : `Incorrect — answer: ${question.correctAnswer}`}
            </span>
          )}
          <span className="text-xs font-medium text-gray-500">Solution</span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
          {question.solutionNotes ? (
            <RenderMath text={question.solutionNotes} className="text-sm text-gray-700 leading-relaxed" />
          ) : (
            <p className="text-xs text-gray-400 italic">No solution note available.</p>
          )}
          {question.concepts && (
            <div className="flex flex-wrap gap-1 pt-1">
              {splitConcepts(question.concepts).map((c) => (
                <span key={c} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── jump panel ──────────────────────────────────────────────────────────────

function JumpPanel({
  questions,
  currentIndex,
  answers,
  answerKey,
  onJump,
  onClose,
}: {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, "A" | "B" | "C" | "D">;
  answerKey: (q: Question) => string;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-20"
        onClick={onClose}
      />
      {/* panel */}
      <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Jump to question
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pb-1">
          {questions.map((q, i) => {
            const isCurrentQ = i === currentIndex;
            const isAnswered = !!answers[answerKey(q)];
            return (
              <button
                key={q.questionNum}
                onClick={() => onJump(i)}
                className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all
                  ${isCurrentQ
                    ? "bg-blue-600 text-white border-blue-600"
                    : isAnswered
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
              >
                {q.questionNum}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded bg-blue-600" /> Current
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-300" /> Answered
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded bg-white border border-gray-200" /> Unanswered
          </span>
        </div>
      </div>
    </>
  );
}

function ResultsView({ results }: { results: SectionResult[] }) {
  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);

  const conceptCounts: Record<string, number> = {};
  results.forEach((r) =>
    r.responses
      .filter((res) => !res.isCorrect)
      .forEach((res) =>
        splitConcepts(res.concepts).forEach((key) => {
          conceptCounts[key] = (conceptCounts[key] ?? 0) + 1;
        })
      )
  );
  const topConcepts = Object.entries(conceptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Results</h2>
        <p className="text-4xl font-bold text-blue-600 mt-2">
          {totalCorrect} / {totalQuestions}
        </p>
        <p className="text-gray-500 text-sm mt-1">
          {Math.round((totalCorrect / totalQuestions) * 100)}% correct
        </p>
      </div>

      <div className="space-y-3">
        {results.map((r) => {
          const pct = Math.round((r.correct / r.total) * 100);
          const isOpen = expandedSection === r.section;
          const incorrect = r.responses.filter((res) => !res.isCorrect);
          return (
            <div key={r.section} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(isOpen ? null : r.section)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-800 text-sm">{r.section}</p>
                  <p className="text-xs text-gray-400">
                    {r.correct}/{r.total} · {pct}%
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct >= 70 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {isOpen && incorrect.length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {incorrect.map((res) => (
                    <div key={res.questionNum} className="px-4 py-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          Q{res.questionNum} · {res.subsection}
                        </span>
                        <div className="flex gap-2 text-xs">
                          <span className="text-red-500">You: {res.selectedAnswer ?? "—"}</span>
                          <span className="text-green-600">Correct: {res.correctAnswer}</span>
                        </div>
                      </div>
                      {res.solutionNotes && (
                        <RenderMath text={res.solutionNotes} className="text-xs text-gray-500 mt-1" />
                      )}
                      {res.concepts && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {splitConcepts(res.concepts).map((c) => (
                            <span key={c} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isOpen && incorrect.length === 0 && (
                <div className="px-4 py-3 bg-gray-50 text-xs text-green-600 border-t border-gray-100">
                  Perfect section! 🎉
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topConcepts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Top concepts to review</h3>
          <div className="flex flex-wrap gap-2">
            {topConcepts.map(([concept, count]) => (
              <span key={concept} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                {concept} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type Phase = "loading" | "setup" | "section-intro" | "testing" | "section-end" | "results";

function TestPageInner() {
  const { testId: rawTestId } = useParams<{ testId: string }>();
  const testId = decodeURIComponent(rawTestId);
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [source, setSource] = useState("");
  const [phase, setPhase] = useState<Phase>("loading");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<SectionResult[]>([]);
  const [showJumpPanel, setShowJumpPanel] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Setup options
  const [clockEnabled, setClockEnabled] = useState(true);
  const [timeMultiplier, setTimeMultiplier] = useState<1 | 1.5 | 2>(1);
  const [showResultsLive, setShowResultsLive] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/questions?testId=${encodeURIComponent(testId)}`)
      .then((r) => r.json())
      .then((data: TestData | Question[]) => {
        // Accept both the current { questions, source } shape and a bare array
        const qs = Array.isArray(data) ? data : data?.questions;
        setQuestions(Array.isArray(qs) ? qs : []);
        setSource(Array.isArray(data) ? "" : data?.source ?? "");
        setPhase("setup");
      })
      .catch(() => {
        setQuestions([]);
        setPhase("setup");
      });
  }, [testId]);

  const sections = SECTION_ORDER.filter((s) => questions.some((q) => q.section === s));
  const currentSection = sections[sectionIndex];
  const sectionQuestions = questions.filter((q) => q.section === currentSection);
  const currentQ = sectionQuestions[questionIndex];

  const startTimer = useCallback((section: Section, multiplier: number, clockOn: boolean) => {
    const totalTime = Math.round(SECTION_TIME[section] * multiplier);
    setTimeLeft(totalTime);
    if (timerRef.current) clearInterval(timerRef.current);
    if (!clockOn) return; // timer frozen at allocated time
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("section-end");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Reset solution accordion when question changes
  useEffect(() => {
    setSolutionOpen(false);
  }, [questionIndex, sectionIndex]);

  const answerKey = (q: Question) => `${q.section}::${q.questionNum}`;

  const handleAnswer = (answer: "A" | "B" | "C" | "D") => {
    setAnswers((prev) => ({ ...prev, [answerKey(currentQ)]: answer }));
  };

  const handleNext = () => {
    setShowJumpPanel(false);
    if (questionIndex < sectionQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("section-end");
    }
  };

  const handlePrev = () => {
    setShowJumpPanel(false);
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  const handleJump = (index: number) => {
    setQuestionIndex(index);
    setShowJumpPanel(false);
  };

  const buildResults = useCallback(() => {
    return sections.map((section) => {
      const qs = questions.filter((q) => q.section === section);
      const responses: Response[] = qs.map((q) => {
        const selected = answers[answerKey(q)] ?? null;
        return {
          questionNum: q.questionNum,
          section: q.section,
          selectedAnswer: selected,
          correctAnswer: q.correctAnswer,
          isCorrect: selected === q.correctAnswer,
          concepts: q.concepts,
          solutionNotes: q.solutionNotes,
          subsection: q.subsection,
        };
      });
      return {
        section,
        correct: responses.filter((r) => r.isCorrect).length,
        total: qs.length,
        responses,
      };
    });
  }, [sections, questions, answers]);

  const startCurrentSection = () => {
    setQuestionIndex(0);
    setShowJumpPanel(false);
    setPhase("testing");
    startTimer(currentSection, timeMultiplier, clockEnabled);
  };

  const goToNextSection = () => {
    if (sectionIndex < sections.length - 1) {
      setSectionIndex((i) => i + 1);
      setPhase("section-intro");
    } else {
      setResults(buildResults());
      setPhase("results");
    }
  };

  const showPassage = currentSection === "Reading Comprehension" && !!currentQ?.passageText;

  // Count answered questions in current section for the jump button label
  const answeredInSection = sectionQuestions.filter((q) => !!answers[answerKey(q)]).length;

  // Page footer (shown on non-loading phases)
  const sourceLabel = source || null;

  // ── render ──────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
    );
  }

  if (phase === "setup") {
    return (
      <SetupScreen
        testName={testId}
        source={source}
        sections={sections}
        clockEnabled={clockEnabled}
        setClockEnabled={setClockEnabled}
        timeMultiplier={timeMultiplier}
        setTimeMultiplier={setTimeMultiplier}
        showResultsLive={showResultsLive}
        setShowResultsLive={setShowResultsLive}
        onStart={() => setPhase("section-intro")}
      />
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <BackToTests />
        </div>
        <div className="flex-1 py-8">
          <ResultsView results={results} />
        </div>
        {sourceLabel && (
          <div className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
            {sourceLabel}
          </div>
        )}
      </div>
    );
  }

  if (phase === "section-intro") {
    const sectionTime = Math.round(SECTION_TIME[currentSection] * timeMultiplier);
    const count = sectionQuestions.length;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <BackToTests />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
              Section {sectionIndex + 1} of {sections.length}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{currentSection}</h2>
            <div className="flex justify-center gap-6 text-sm text-gray-500">
              <span>{count} questions</span>
              <span>
                {Math.round(sectionTime / 60)} min
                {timeMultiplier > 1 ? ` (${timeMultiplier}×)` : ""}
                {!clockEnabled ? " · no timer" : ""}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {currentSection === "Reading Comprehension"
                ? "Read each passage then answer the questions. You may look back at the passage."
                : "Choose the best answer for each question. There is no penalty for guessing."}
            </p>
            <button
              onClick={startCurrentSection}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start section →
            </button>
            <button onClick={() => router.push("/")} className="text-xs text-gray-400 underline">
              Exit test
            </button>
          </div>
        </div>
        {sourceLabel && (
          <div className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
            {sourceLabel}
          </div>
        )}
      </div>
    );
  }

  if (phase === "section-end") {
    const nextSection = sections[sectionIndex + 1];
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <BackToTests />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="text-3xl">✓</div>
            <h2 className="text-xl font-bold text-gray-900">Section complete</h2>
            <p className="text-sm text-gray-500">{currentSection} — {sectionQuestions.length} questions</p>
            {nextSection ? (
              <button
                onClick={goToNextSection}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continue to {nextSection} →
              </button>
            ) : (
              <button
                onClick={() => { setResults(buildResults()); setPhase("results"); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                See results →
              </button>
            )}
          </div>
        </div>
        {sourceLabel && (
          <div className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
            {sourceLabel}
          </div>
        )}
      </div>
    );
  }

  // ── testing phase ──────────────────────────────────────────────────────────
  const selected = answers[answerKey(currentQ)] ?? null;
  const warned = clockEnabled && timeLeft <= 5 * 60 && timeLeft > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackToTests />
          <span className="text-sm text-gray-300">|</span>
          <div className="text-sm text-gray-500 font-medium">{currentSection}</div>
        </div>
        {clockEnabled ? (
          <Timer seconds={timeLeft} warned={warned} />
        ) : (
          <span className="text-sm text-gray-400 font-mono">—:——</span>
        )}
        <div className="flex items-center gap-3">
          {/* show results live toggle */}
          <button
            onClick={() => setShowResultsLive((v) => !v)}
            title={showResultsLive ? "Hide live results" : "Show live results"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              showResultsLive
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{showResultsLive ? "Live" : "Live"}</span>
          </button>
          <div className="text-sm text-gray-400">
            {questionIndex + 1} / {sectionQuestions.length}
          </div>
        </div>
      </div>

      {/* progress */}
      <div className="px-4 pt-2">
        <ProgressBar current={questionIndex + 1} total={sectionQuestions.length} />
      </div>

      {/* question */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Q{currentQ.questionNum}</span>
          {currentQ.subsection && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {currentQ.subsection}
            </span>
          )}
          {currentQ.difficulty && (
            <span className="text-xs text-gray-400">{currentQ.difficulty}</span>
          )}
        </div>

        <QuestionCard
          question={currentQ}
          selected={selected}
          onSelect={handleAnswer}
          showPassage={showPassage}
        />

        {/* solution accordion — visible when showResultsLive and question is answered */}
        {showResultsLive && selected !== null && (
          <SolutionAccordion
            question={currentQ}
            selected={selected}
            open={solutionOpen}
            onToggle={() => setSolutionOpen((v) => !v)}
          />
        )}
      </div>

      {/* footer nav — relative so the jump panel can anchor to it */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0 relative">
        {/* jump panel (above footer) */}
        {showJumpPanel && (
          <JumpPanel
            questions={sectionQuestions}
            currentIndex={questionIndex}
            answers={answers}
            answerKey={answerKey}
            onJump={handleJump}
            onClose={() => setShowJumpPanel(false)}
          />
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={questionIndex === 0}
            className="text-sm text-gray-500 disabled:text-gray-300 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>

          {/* jump button */}
          <button
            onClick={() => setShowJumpPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
              ${showJumpPanel
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>{answeredInSection}/{sectionQuestions.length}</span>
          </button>

          <button
            onClick={handleNext}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors
              ${selected
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
          >
            {questionIndex === sectionQuestions.length - 1 ? "Finish section →" : "Next →"}
          </button>
        </div>
      </div>

      {/* page source footer */}
      {sourceLabel && (
        <div className="py-2 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
          {sourceLabel}
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <TestPageInner />
    </Suspense>
  );
}
