# ISEE Digital Practice

Timed ISEE Upper Level practice tests and vocabulary drills, driven by a published Google Sheet and embedded on the Hyperspace Tutors site via iframe.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev                        # http://localhost:3000
```

## Configuration (`.env.local` locally, Environment Variables on Vercel)

| Variable | Example |
|---|---|
| `NEXT_PUBLIC_SHEET_BASE_URL` | `https://docs.google.com/spreadsheets/d/e/<ID>/pub?output=csv` |
| `NEXT_PUBLIC_SHEET_TABS` | `Upper Level Practice Test 1=450248709,Upper Level Practice Test 2=1023802230` (tab name = gid) |
| `NEXT_PUBLIC_VOCAB_TABS` | `Upper Level Vocabulary=2112710087` |

On Vercel, redeploy after changing any variable (they are read at build time).

## Adjustable settings in code

| File | Setting |
|---|---|
| `lib/testVisibility.ts` | Show/hide each practice test |
| `lib/vocab.ts` | Words per vocab session, show/hide vocab practice |
| `lib/sheets.ts` | `SHEET_CACHE_SECONDS` (how often the sheet is re-read) |
| `app/test/[testId]/page.tsx` | RC passage/question split, equation-only text size |
| `app/vocab/[listId]/page.tsx` | Check Results default, definitions on summary |

## Sheet format

- One tab per test. Columns: `question_num, question_text, option_a–d, column_a, column_b, reading_passage, subsection, section, difficulty, concepts, correct_answer, solution_notes, problem_notes, figure_url`.
- `section` = `Verbal Reasoning`, `Quantitative Reasoning`, `Reading Comprehension`, `Mathematics Achievement`, plus:
  - `Reading Passage` rows: `question_num` = passage ID, `question_text` = passage (`||` = line break). RC questions link via `reading_passage`.
  - `Source` row: `question_text` = citation shown in the footer.
- Math: wrap LaTeX in `\(...\)` (write `\#` for the `#` operator). Formatting: `<b> <i> <u> <sup> <sub> <br>`; Ctrl+Enter line breaks are kept.
- Set cells to Plain Text so values like `0.0100` keep their zeros.

## Figures

See `public/figures/README.md`. Put PNGs in `public/figures/` and the file name in `figure_url`.
