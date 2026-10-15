# ISEE Digital Practice

Timed ISEE Upper Level practice tests and vocabulary drills, driven by a published Google Sheet and embedded on the Hyperspace Tutors site via iframe.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables are needed. Vercel deploys automatically on every push to `main`.

## Settings (edit, commit, push)

| File | Setting |
|---|---|
| `lib/sheetConfig.ts` | Sheet address; list of tests and vocab lists (name, tab gid, visible, order) |
| `lib/vocab.ts` | Words per vocab session, skip flagged words |
| `lib/sheets.ts` | `SHEET_CACHE_SECONDS` (how often the sheet is re-read) |
| `app/test/[testId]/page.tsx` | RC passage/question split, equation-only text size |
| `app/vocab/[listId]/page.tsx` | Check Results default, definitions on summary |

To add a test: add a tab to the sheet, then add `{ name, gid, visible: true }` to `TESTS` in `lib/sheetConfig.ts` and push.
The gid is the number after `#gid=` in the browser address bar when that tab is open.

## Sheet format

- One tab per test. Columns: `question_num, question_text, option_a–d, column_a, column_b, reading_passage, subsection, section, difficulty, concepts, correct_answer, solution_notes, problem_notes, figure_url`.
- `section` = `Verbal Reasoning`, `Quantitative Reasoning`, `Reading Comprehension`, `Mathematics Achievement`, plus:
  - `Reading Passage` rows: `question_num` = passage ID, `question_text` = passage (`||` = line break). RC questions link via `reading_passage`.
  - `Source` row: `question_text` = citation shown in the footer.
- Math: wrap LaTeX in `\(...\)` (write `\#` for the `#` operator). Formatting: `<b> <i> <u> <sup> <sub> <br>`; Ctrl+Enter line breaks are kept.
- Set cells to Plain Text so values like `0.0100` keep their zeros.

## Figures

See `public/figures/README.md`. Put PNGs in `public/figures/` and the file name in `figure_url`.
