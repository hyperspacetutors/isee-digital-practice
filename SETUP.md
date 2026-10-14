# ISEE Platform — Setup

## 1. Create the Next.js project

```bash
npx create-next-app@latest isee-platform --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd isee-platform
npm install papaparse
npm install -D @types/papaparse
```

## 2. Copy scaffold files

Drop the files from this scaffold into your project root, preserving the folder structure:

```
lib/types.ts
lib/sheets.ts
app/page.tsx                        ← replace the default
app/test/[testId]/page.tsx          ← new folder + file
app/api/questions/route.ts          ← new folder + file
```

## 3. Set up the Google Sheet

Create a sheet with these exact column headers in row 1:

| Column | Notes |
|---|---|
| `test_id` | e.g. `upper-level-pt2` |
| `question_num` | integer |
| `question_text` | optional — leave blank to show just the question number |
| `option_a` | optional |
| `option_b` | optional |
| `option_c` | optional |
| `option_d` | optional |
| `passage_text` | RC only — same text for all 6 questions in a passage |
| `subsection` | e.g. `Synonyms`, `Word Problems`, `Chocolate` |
| `section` | exactly one of: `Verbal Reasoning`, `Quantitative Reasoning`, `Reading Comprehension`, `Mathematics Achievement` |
| `difficulty` | e.g. `Medium-Hard` |
| `concepts` | pipe-delimited: `Fractions | Percent | Multi-step` |
| `correct_answer` | `A`, `B`, `C`, or `D` |
| `solution_notes` | brief explanation shown after test |

Your existing CSV already has most of these — you just need to add `test_id` as the first column.

## 4. Publish the sheet

Sheet → File → Share → Publish to web → select the data sheet → CSV → Publish → copy the URL.

## 5. Add the URL to .env.local

```
cp .env.local.example .env.local
# Edit .env.local and paste your Sheet URL
```

## 6. Run locally

```bash
npm run dev
# open http://localhost:3000
```

## 7. Deploy to Vercel

```bash
npx vercel
# Add NEXT_PUBLIC_SHEET_URL as an environment variable in the Vercel dashboard
```

## Notes

- Answer choices (`option_a`–`option_d`) are **optional**. If they're blank, the app shows large A/B/C/D buttons and the student reads the choices from the paper test. This is fine for v1.
- The app has no login and stores nothing — answers live in memory for the duration of the browser session.
- Adding a new test is just adding more rows to the sheet with a new `test_id`.
