"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question, Response, SectionResult, SECTION_ORDER, SECTION_TIME, Section } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ANSWER_LABELS = ["A", "B", "C", "D"] as const;

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
  const options: { label: "A" | "B" | "C" | "D"; text: string }[] = [
    { label: "A", text: question.optionA },
    { label: "B", text: question.optionB },
    { label: "C", text: question.optionC },
    { label: "D", text: question.optionD },
  ];
  const hasOptions = options.some((o) => o.text);

  return (
    <div className="space-y-4">
      {/* passage (RC) — shown for every question in the passage group */}
      {showPassage && question.passageText && (
        <div className="border border-gray-200 rounded-lg overflow-hidden text-sm">
          <div className="bg-gray-100 border-b border-gray-200 px-3 py-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {question.subsection || "Passage"}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto bg-gray-50">
            <table className="w-full border-collapse">
              <tbody>
                {question.passageText.split(/\r?\n/).map((line, i) =>
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

      {/* question text */}
      {question.questionText ? (
        <p className="text-gray-900 text-base leading-relaxed">{question.questionText}</p>
      ) : (
        <p className="text-gray-400 italic text-sm">
          Question {question.questionNum} — refer to the paper test
        </p>
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
                <span className="font-semibold mr-2">{label}.</span> {text}
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

      {!hasOptions && (
        <div className="flex gap-2 flex-wrap">
          {ANSWER_LABELS.map((label) => (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`w-16 py-3 rounded-lg border text-sm font-semibold transition-all
                ${selected === label
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultsView({ results }: { results: SectionResult[] }) {
  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);

  // Aggregate missed concepts
  const conceptCounts: Record<string, number> = {};
  results.forEach((r) =>
    r.responses
      .filter((res) => !res.isCorrect)
      .forEach((res) =>
        res.concepts.split("|").forEach((c) => {
          const key = c.trim();
          if (key) conceptCounts[key] = (conceptCounts[key] ?? 0) + 1;
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

      {/* Section breakdown */}
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
                          <span className="text-red-500">
                            You: {res.selectedAnswer ?? "—"}
                          </span>
                          <span className="text-green-600">
                            Correct: {res.correctAnswer}
                          </span>
                        </div>
                      </div>
                      {res.solutionNotes && (
                        <p className="text-xs text-gray-500 mt-1">{res.solutionNotes}</p>
                      )}
                      {res.concepts && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {res.concepts.split("|").map((c) => (
                            <span
                              key={c}
                              className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                            >
                              {c.trim()}
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

      {/* Top missed concepts */}
      {topConcepts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Top concepts to review</h3>
          <div className="flex flex-wrap gap-2">
            {topConcepts.map(([concept, count]) => (
              <span
                key={concept}
                className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full"
              >
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

type Phase = "loading" | "section-intro" | "testing" | "section-end" | "results";

function TestPageInner() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState<SectionResult[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load questions
  useEffect(() => {
    fetch(`/api/questions?testId=${testId}`)
      .then((r) => r.json())
      .then((data: Question[]) => {
        setQuestions(data);
        setPhase("section-intro");
      });
  }, [testId]);

  // Sections and current section questions
  const sections = SECTION_ORDER.filter((s) => questions.some((q) => q.section === s));
  const currentSection = sections[sectionIndex];
  const sectionQuestions = questions.filter((q) => q.section === currentSection);
  const currentQ = sectionQuestions[questionIndex];

  // Timer
  const startTimer = useCallback((section: Section) => {
    setTimeLeft(SECTION_TIME[section]);
    if (timerRef.current) clearInterval(timerRef.current);
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

  // Key for storing an answer: "section::questionNum"
  const answerKey = (q: Question) => `${q.section}::${q.questionNum}`;

  const handleAnswer = (answer: "A" | "B" | "C" | "D") => {
    setAnswers((prev) => ({ ...prev, [answerKey(currentQ)]: answer }));
  };

  const handleNext = () => {
    if (questionIndex < sectionQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("section-end");
    }
  };

  const handlePrev = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
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
    setPhase("testing");
    startTimer(currentSection);
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

  // Show passage for every RC question that has passage text
  const showPassage = currentSection === "Reading Comprehension" && !!currentQ?.passageText;

  // ── render ──────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <ResultsView results={results} />
        <div className="text-center mt-6">
          <button onClick={() => router.push("/")} className="text-sm text-gray-400 hover:text-gray-600 underline">
            ← Back to tests
          </button>
        </div>
      </div>
    );
  }

  if (phase === "section-intro") {
    const sectionTime = SECTION_TIME[currentSection];
    const count = sectionQuestions.length;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="text-xs font-semibold text-blue-500 uppercase tracking-wider">
            Section {sectionIndex + 1} of {sections.length}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{currentSection}</h2>
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <span>{count} questions</span>
            <span>{Math.round(sectionTime / 60)} minutes</span>
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
          {sectionIndex > 0 && (
            <button onClick={() => router.push("/")} className="text-xs text-gray-400 underline">
              Exit test
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "section-end") {
    const nextSection = sections[sectionIndex + 1];
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
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
    );
  }

  // ── testing phase ──────────────────────────────────────────────────────────
  const selected = answers[answerKey(currentQ)] ?? null;
  const warned = timeLeft <= 5 * 60 && timeLeft > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="text-sm text-gray-500 font-medium">{currentSection}</div>
        <Timer seconds={timeLeft} warned={warned} />
        <div className="text-sm text-gray-400">
          {questionIndex + 1} / {sectionQuestions.length}
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
      </div>

      {/* footer nav */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between sticky bottom-0">
        <button
          onClick={handlePrev}
          disabled={questionIndex === 0}
          className="text-sm text-gray-500 disabled:text-gray-300 hover:text-gray-700 transition-colors"
        >
          ← Back
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
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <TestPageInner />
    </Suspense>
  );
}
