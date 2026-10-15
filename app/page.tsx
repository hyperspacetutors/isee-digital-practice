import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { fetchTestIds, fetchQuestionsForTest } from "@/lib/sheets";
import { SECTION_ORDER } from "@/lib/types";
import { fetchVocabListNames, fetchVocabList, VOCAB_SESSION_SIZE } from "@/lib/vocab";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">ISEE Practice</h1>
          <p className="text-gray-500 mt-1">Upper Level — Select a practice test to begin</p>
        </div>
        <Suspense fallback={<p className="text-center py-16 text-gray-400">Loading tests…</p>}>
          <TestCatalog />
        </Suspense>
      </div>
    </main>
  );
}

// Reads the live sheet on each request (see SHEET_CACHE_SECONDS), so it renders
// at request time rather than being prerendered — hence connection() + Suspense.
async function TestCatalog() {
  await connection();
  const testIds = await fetchTestIds();

  // Fetch section counts for each test for the summary cards
  const testSummaries = await Promise.all(
    testIds.map(async (id) => {
      const questions = await fetchQuestionsForTest(id);
      const bySection = SECTION_ORDER.map((s) => ({
        section: s,
        count: questions.filter((q) => q.section === s).length,
      }));
      return { id, total: questions.length, bySection };
    })
  );

  const vocabLists = await Promise.all(
    fetchVocabListNames().map(async (name) => ({ name, count: (await fetchVocabList(name)).length }))
  );

  return (
    <>
        <div className="space-y-4">
          {testSummaries.map(({ id, total, bySection }) => (
            <Link key={id} href={`/test/${id}`}>
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 capitalize">
                    {id.replace(/-/g, " ")}
                  </h2>
                  <span className="text-sm text-gray-400">{total} questions</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {bySection.map(({ section, count }) => (
                    <div key={section} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                      <span>{section}</span>
                      <span className="ml-auto text-gray-400">{count}q</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {vocabLists.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vocabulary Practice</h2>
            <div className="space-y-4">
              {vocabLists.map(({ name, count }) => (
                <Link key={name} href={`/vocab/${encodeURIComponent(name)}`}>
                  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
                    <span className="text-sm text-gray-400">
                      {Math.min(VOCAB_SESSION_SIZE, count)} random words · {count} in list
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {testIds.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No tests found.</p>
            <p className="text-sm mt-1">Check SHEET_BASE_URL and TESTS in <code>lib/sheetConfig.ts</code>.</p>
          </div>
        )}
    </>
  );
}
