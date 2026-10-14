import Link from "next/link";
import { fetchTestIds, fetchQuestionsForTest } from "@/lib/sheets";
import { SECTION_ORDER } from "@/lib/types";

export default async function Home() {
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">ISEE Practice</h1>
          <p className="text-gray-500 mt-1">Upper Level — Select a practice test to begin</p>
        </div>

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

        {testIds.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No tests found.</p>
            <p className="text-sm mt-1">Make sure your Google Sheet URL is set in <code>.env.local</code>.</p>
          </div>
        )}
      </div>
    </main>
  );
}
