"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { VOCAB_SESSION_SIZE, type VocabWord } from "@/lib/vocab";

// ─── Vocabulary practice — adjust here ───────────────────────────────────────
// Words per session is VOCAB_SESSION_SIZE in lib/vocab.ts.
const SESSION_SIZE = VOCAB_SESSION_SIZE;
// "Check Results" on by default when a session starts?
const CHECK_RESULTS_DEFAULT = false;
// Show correct answers + definitions for missed words on the end-of-session summary.
const SHOW_DEFINITIONS_IN_SUMMARY = true;

type Letter = "A" | "B" | "C" | "D";
const LETTERS: Letter[] = ["A", "B", "C", "D"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const optionText = (w: VocabWord, l: Letter) =>
  ({ A: w.optionA, B: w.optionB, C: w.optionC, D: w.optionD })[l];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-blue-600" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function BackToHome() {
  const router = useRouter();
  return (
    <button onClick={() => router.push("/")} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
      ← Home
    </button>
  );
}

type Phase = "loading" | "setup" | "practice" | "summary" | "error";

function VocabPracticeInner() {
  const { listId: rawListId } = useParams<{ listId: string }>();
  const listName = decodeURIComponent(rawListId);

  const [pool, setPool] = useState<VocabWord[]>([]);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [answers, setAnswers] = useState<Record<number, Letter>>({});
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [checkResults, setCheckResults] = useState(CHECK_RESULTS_DEFAULT);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    fetch(`/api/vocab?list=${encodeURIComponent(listName)}`)
      .then((r) => r.json())
      .then((data: VocabWord[]) => {
        setPool(Array.isArray(data) ? data : []);
        setPhase(Array.isArray(data) && data.length ? "setup" : "error");
      })
      .catch(() => setPhase("error"));
  }, [listName]);

  const startSession = () => {
    setWords(shuffle(pool).slice(0, SESSION_SIZE));
    setAnswers({});
    setIndex(0);
    setShowJump(false);
    setPhase("practice");
  };

  // ── loading / error ──
  if (phase === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  }
  if (phase === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 text-gray-500">
        <p>No vocabulary words found for “{listName}”.</p>
        <p className="text-xs text-gray-400">Check NEXT_PUBLIC_VOCAB_TABS in .env.local.</p>
        <BackToHome />
      </div>
    );
  }

  // ── setup ──
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <BackToHome />
          <span className="text-sm font-semibold text-gray-700">Vocabulary Practice</span>
          <div className="w-12" />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full space-y-6 shadow-sm">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">{listName}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {Math.min(SESSION_SIZE, pool.length)} random words from {pool.length}
              </p>
            </div>
            <div className="flex items-center justify-between py-3 border-y border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Check Results</p>
                <p className="text-xs text-gray-400">Show the correct answer and definition after answering</p>
              </div>
              <Toggle on={checkResults} onClick={() => setCheckResults((v) => !v)} />
            </div>
            <button
              onClick={startSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Start practice →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── summary ──
  if (phase === "summary") {
    const correct = words.filter((w, i) => answers[i] === w.correctAnswer).length;
    const missed = words.map((w, i) => ({ w, i })).filter(({ w, i }) => answers[i] !== w.correctAnswer);
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
          <BackToHome />
        </div>
        <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Vocabulary Results</h2>
            <p className="text-4xl font-bold text-blue-600 mt-2">
              {correct} / {words.length}
            </p>
            <p className="text-gray-500 text-sm mt-1">{Math.round((correct / words.length) * 100)}% correct</p>
          </div>

          {missed.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
              {missed.map(({ w, i }) => (
                <div key={`${w.word}-${i}`} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 tracking-wide text-sm">{w.word.toUpperCase()}</span>
                    <div className="flex gap-3 text-xs">
                      <span className="text-red-500">
                        You: {answers[i] ? `${answers[i]}. ${optionText(w, answers[i])}` : "—"}
                      </span>
                      <span className="text-green-600">
                        Correct: {w.correctAnswer}. {optionText(w, w.correctAnswer)}
                      </span>
                    </div>
                  </div>
                  {SHOW_DEFINITIONS_IN_SUMMARY && w.definition && (
                    <p className="text-xs text-gray-500 mt-1">{w.definition}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-green-600 text-sm">Perfect set! 🎉</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={startSession}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              New set of {Math.min(SESSION_SIZE, pool.length)} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── practice ──
  const w = words[index];
  const selected = answers[index] ?? null;
  const answeredCount = Object.keys(answers).length;
  const revealed = checkResults && selected !== null; // definitions only when Check Results is on AND answered
  const isCorrect = selected === w.correctAnswer;
  const isLast = index === words.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackToHome />
          <span className="text-sm text-gray-300">|</span>
          <span className="text-sm text-gray-500 font-medium">Vocabulary</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCheckResults((v) => !v)}
            title={checkResults ? "Hide answer checking" : "Check answers as you go"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              checkResults
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Check Results</span>
          </button>
          <span className="text-sm text-gray-400">
            {index + 1} / {words.length}
          </span>
        </div>
      </div>

      {/* progress */}
      <div className="px-4 pt-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${Math.round(((index + 1) / words.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* question — styled like the VR synonym questions */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Q{index + 1}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Synonyms</span>
        </div>
        <p className="text-gray-900 text-base font-semibold tracking-wide mb-4">{w.word.toUpperCase()}</p>
        <div className="space-y-2 pt-1">
          {LETTERS.map((l) => {
            const isSel = selected === l;
            const showRight = revealed && l === w.correctAnswer;
            const showWrong = revealed && isSel && !isCorrect;
            return (
              <button
                key={l}
                onClick={() => setAnswers((prev) => ({ ...prev, [index]: l }))}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                  showRight
                    ? "border-green-500 bg-green-50 text-green-800 font-medium"
                    : showWrong
                    ? "border-red-400 bg-red-50 text-red-700"
                    : isSel
                    ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <span className="font-semibold mr-2">{l}.</span>
                {optionText(w, l)}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-4 border border-gray-200 rounded-xl px-4 py-3 bg-white">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {isCorrect ? "Correct" : `Incorrect — answer: ${w.correctAnswer}`}
            </span>
            {w.definition && <p className="text-sm text-gray-700 leading-relaxed mt-2">{w.definition}</p>}
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 sticky bottom-0 relative">
        {showJump && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowJump(false)} />
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30 px-4 pt-3 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {words.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIndex(i);
                      setShowJump(false);
                    }}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                      i === index
                        ? "bg-blue-600 text-white border-blue-600"
                        : answers[i]
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="text-sm text-gray-500 disabled:text-gray-300 hover:text-gray-700 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowJump((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              showJump ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400"
            }`}
          >
            {answeredCount}/{words.length}
          </button>
          <button
            onClick={() => (isLast ? setPhase("summary") : setIndex((i) => i + 1))}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
              selected ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VocabPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <VocabPracticeInner />
    </Suspense>
  );
}
