# AI Usage

This project was built with Claude Code as a pair-programming assistant. This document describes how it was used, which suggestions were kept, changed or rejected, which AI mistakes were caught, and how the data and calculations were verified.

**Status:** final. Covers the whole project: backend, frontend, brand and UX polish, and documentation.

| The brief asks for | Answered in |
|---|---|
| (a) A summary of key prompts and the workflow | Section 1 |
| (b) AI suggestions accepted, modified or rejected, and why | Section 2 (plus sections 5 and 6) |
| (c) AI mistakes caught, how `CLAUDE.md` helped, and what to improve in it | Sections 3 and 8 (evidence in sections 4, 5 and 7) |

## 1. Summary of key prompts and workflow

The work was done in small, explicitly scoped steps. Each prompt said what to create and what *not* to create yet, so every layer was finished and checked (tests, type-check, lint or screenshots) before the next one was started.

1. **`CLAUDE.md` first.** Ran `/init` on the empty repository to create a `CLAUDE.md` for future AI sessions, to be updated as the architecture took shape.
2. **Monorepo and layered folders.** Created `backend/` and `frontend/`, and inside the backend the layers `src/routes`, `src/controllers`, `src/services`, `src/validators`, `src/data`, `src/types` and `tests/`. Folders only, no code.
3. **Toolchain.** Set up `package.json`, `tsconfig.json` (strict mode, `resolveJsonModule`, `esModuleInterop`), the `dev`/`build`/`start`/`test` scripts, `.env`/`.env.example` (`PORT=3001`) and a root `.gitignore`.
4. **`app.ts` separated from `server.ts`.** `src/app.ts` configures Express (morgan, cors, JSON body parsing, `GET /api/health`, 404 handler, global JSON error handler) and exports the app. `server.ts` only loads `.env`, starts the HTTP server and handles `EACCES`/`EADDRINUSE`. Verified with `curl` (health, 404, broken JSON) and by starting a second instance to trigger the port conflict.
5. **Raw data and types.** Added `solarData.json` exactly as provided in the assignment, and `calculator.types.ts`.
6. **Business logic before HTTP.** Implemented `calculatorService.ts` as pure functions with no Express dependency, using the assignment's formulas, and covered it with Vitest unit tests *before* writing any routes, validators or controllers.
7. **Hardening.** Changed `paybackYears` to `null` for the no-savings case, added type-checking of test files, and updated `CLAUDE.md` to match the actual architecture.
8. **HTTP layer.** Added `validators` → `routes` → `controllers` on top of the tested service, with `express-validator` rules and supertest integration tests against `src/app.ts`.
9. **Code review by a subagent.** Created a read-only `code-reviewer` subagent, had it review the whole backend, and fixed its findings (section 5).
10. **English API messages, structured warnings.** Moved all backend messages to English and turned `warnings` into coded objects, so that localization belongs to the frontend (section 6).
11. **Frontend foundation.** Scaffolded React + TypeScript + Vite with Tailwind CSS v4, then built the non-visual layers first: API types, the axios service with `ApiError`, the Swedish/English dictionary and the `useSolarCalculator` hook (section 7).
12. **Responsive UI.** Built the header, form, results, chart and monthly table, and checked them in a real browser with screenshots (section 7).
13. **Brand and UX polish.** Applied the 1KOMMA5° logo and aubergine palette, made the monthly table's horizontal scroll visible on small screens, and made numbers and validation messages wrap-safe. Several of these details were then refined by hand (section 7).
14. **Frontend code review.** Ran the same `code-reviewer` subagent on the frontend and fixed its findings: form inputs, accessibility, units, state shape and brand tokens (section 5).
15. **Documentation.** Wrote the `README.md`, finished this document and brought `CLAUDE.md` in line with the final code.

## 2. AI suggestions: accepted, modified or rejected

### Accepted

- **`paybackYears: null` instead of `0`** when there are no savings (for example when the roof is too small for a single panel). A payback of "0 years" would read as "pays for itself immediately" in the UI. `Infinity` was also avoided because it does not survive conversion to JSON.
- **`tsconfig.test.json` and a `typecheck` script.** The AI pointed out that Vitest does not type-check and that `tsconfig.json` excludes `tests/`, so test files were never type-checked. `npm run typecheck` now checks both app and test code.
- **Frontend architecture:** one `ApiError` type with flags instead of parsing error text, request cancellation with `AbortSignal`, and a `Translations` type that makes the build fail if a language is missing a text (section 7).
- **Computed chart colours.** Colours were checked with a palette validator for colour-blind separation instead of being picked by eye (section 7).
- **Smaller technical suggestions** made during implementation and kept:
  - `module: NodeNext`, because TypeScript 7 no longer supports the older `node10` module resolution.
  - `rootDir: "."` once `server.ts` moved outside `src/`.
  - `morgan` placed first so requests rejected by the JSON parser are still logged.
  - `dotenv.config({ quiet: true })` to silence dotenv 18's startup log.
  - Doing all calculations at full precision and rounding only the final result.
  - Validation messages that format their min/max from `INPUT_LIMITS`, so the text cannot drift from the actual rules.

### Directed or modified by me

- **Strict separation of `app.ts` and `server.ts`.** I first asked for `src/server.ts` as the entry point, then changed the design so that `server.ts` sits at the backend root and only starts the HTTP server, while `src/app.ts` owns all Express configuration. This keeps the app importable in tests without opening a port.
- **Validation and response format.** Chose `express-validator` and a standard response envelope: `{ status: "success", data }` for 2xx, `{ status: "fail", data }` for 4xx and `{ status: "error", message }` for 5xx. The 4xx/5xx shapes were finalised after the code review (section 5). Messages were first written in Swedish, then switched to English (section 6).
- **Source data kept untouched.** All Swedish keys and the original (anomalous) values in `solarData.json` are kept exactly as delivered. Corrections live in small, named, tested helper functions instead, so the original assignment data stays traceable.
- **Specific handling rules for each anomaly** (×1000, ÷ sum, ÷10 when above 24, 0 plus a warning for missing months) were specified by me. The AI implemented them generically, so the missing-month warning is built from whichever months are missing rather than hard-coded to Sundsvall's December.
- **Result hierarchy.** I set the order of the results by the customer's questions: annual savings first as the one dark hero card, then payback and price.

### Rejected or replaced

- **Unverified claims in the UI text.** The AI's first translations said the price was "before the tax deduction for green technology" and that the electricity price should include "grid fees, energy tax and VAT". The assignment says neither, so I removed them. The hints now describe only the model.
- **The AI's placeholder branding.** A generated sun icon (in the header and as the favicon) was replaced with the official 1KOMMA5° logo (`public/1KOMMA5.png`) and icon (`public/1K5.png`).
- **The table's right-edge fade gradient.** The AI suggested a white gradient over the table edge plus a text hint to show that the table scrolls sideways. I replaced both with a single, cleaner `ArrowRight` indicator next to the table title, shown below `lg` only while more columns are hidden to the right.
- **Deferred review findings.** Four low-priority backend suggestions were deliberately not done (section 5).
- **Lazy-loading the chart.** The frontend review suggested loading Recharts lazily to shrink the first download. I chose to keep the chart in the main bundle so it renders immediately with the results; the bundle-size warning is accepted (README, section 3).

## 3. AI mistakes caught

| Mistake | How it was caught | Fix |
|---|---|---|
| **City lookup with a plain property access** (`solarData.psh_per_stad[city]`, which has the same flaw as an `in` check). Names on every object's prototype (`"constructor"`, `"toString"`, `"__proto__"`) were accepted as cities and produced a quote for `Infinity` panels. | `code-reviewer` subagent; reproduced before fixing | `Object.hasOwn(...)`, plus an error if a city's yield is ever 0; regression tests (section 5) |
| **Deprecated `FormEvent`** for the form's submit handler. It compiles, but `@types/react` 19 marks it `@deprecated` ("FormEvent doesn't actually exist"). | Manual code review (editor strike-through) | React 19's `SubmitEvent<HTMLFormElement>` |
| **Mobile header truncation.** The title had `truncate` next to the logo and language toggle, so on a phone "Offertkalkylator för solceller" was cut off with an ellipsis. | Manual check on a narrow screen | The header was rebuilt in two rows below `sm`: logo + language toggle on top, the full title and subtitle below it |
| **Table card clipping.** The monthly table card had rounded corners but no `overflow-hidden`, so the scrolling table and its grey sticky header and footer rows were drawn over the corners on mobile. | Manual check on mobile | `overflow-hidden` on the card |
| **Tailwind layout bugs** that passed lint, type-check and build: buttons collapsed by `flex-1` inside a column, a wrapping button label, overlapping month labels, a wrongly ordered and coloured chart legend, and "2 m²" breaking across lines | Headless-browser screenshots | See the table in section 7 |
| **Numbers and units breaking across lines** (for example "100" / "000 kWh") | Manual check, then the frontend review found ~20 remaining places | `formatNumber` uses non-breaking spaces; `withUnit` and `NBSP` join every number to its unit |
| **`type="number"` inputs rejected the formats the placeholders showed.** Typing "15 000" or "2,5" gave the browser an empty value and a validation error, so the custom comma/space parsing never ran. | Frontend `code-reviewer` | `type="text" inputMode="decimal"` and a tested, language-aware `parseNumber` |
| **Accessibility errors:** `aria-describedby` pointed at an id that was never rendered; the city label pointed at a missing `<select>` while loading; `aria-live` on the whole results area; language buttons whose screen-reader name ("Engelska") did not match the visible "EN" (WCAG 2.5.3); an `aria-label` on an SVG | Frontend `code-reviewer` | See section 5 |
| **UI text claiming tax and grid-fee rules** the assignment does not contain | Checked against the brief | Removed (section 2) |
| **A test that passed by coincidence.** It only held because consumption was exactly 10 000 kWh. | `code-reviewer` subagent | Assertion corrected |
| **Malformed JSON broke the response format**, returning V8's parser message in a different shape from every other error | `code-reviewer` subagent | Unified error envelope (section 5) |

The pattern: logic and accessibility mistakes were caught by tests and the review subagent, but none of the layout mistakes were caught by any automated check. They needed screenshots or a human looking at a phone.

## 4. Data and logic verification

### Anomalies in `solarData.json`

| Anomaly | How it was found | Handling |
|---|---|---|
| `pris_per_kwp: 15` | Compared with the assignment table (15 000 kr/kWp) | × 1000 → 15 000 kr/kWp |
| `forbrukningsprofil` sums to **1.03** | Flagged by the AI when it summed the array while adding the data file | Each month ÷ 1.03, so the year sums to 1.0 and consumption is not overstated by 3% |
| Göteborg July PSH `54` | Implausible: more than 24 sun hours per day, and neighbouring cities have ~5.4 | Values > 24 ÷ 10 → 5.4 |
| Sundsvall has 11 PSH values | Array lengths checked for every city | December set to 0 and a `MISSING_PSH_DATA` warning returned in `warnings` |

Each correction has its own unit test, and the original JSON is never modified.

### Malmö baseline

For 10 000 kWh/year, 60 m² roof and 2 kr/kWh in Malmö:

- Annual yield per kWp = Σ(PSH × days × 0.85) ≈ **1 028.67 kWh/kWp**
- 10 000 / 1 028.67 ≈ 9.72 kWp needed → ⌈9.72 / 0.45⌉ = **22 panels**, 9.9 kWp, 44 m², not roof-limited
- Installation cost 9.9 × 15 000 = 148 500 kr
- Spot checks: January production 9.9 × 1.0 × 31 × 0.85 ≈ 260.87 kWh (all of it self-consumed, no surplus); June 9.9 × 5.6 × 30 × 0.85 ≈ 1 413.72 kWh (consumption fully covered, the rest is surplus)

### Test suite

**40 Vitest tests** in two files. `backend/tests/calculatorService.test.ts` (unit tests) covers:

- The list of six cities.
- Each of the four data corrections.
- The Malmö baseline (sizing, monthly self-consumption and surplus, totals and financials).
- A roof-limited case (30 m² → 15 of 22 panels, with a warning).
- A roof that fits no panels (`paybackYears: null`).
- Göteborg's corrected July and Sundsvall's missing December in full calculations.
- Unknown cities, including built-in object property names like `"constructor"`.

`backend/tests/calculatorApi.test.ts` (supertest integration tests) covers every endpoint, each validation rule and its message, inclusive minimum and maximum values, city trimming, malformed JSON, 404s inside and outside `/api`, and the CORS policy.

`npm test` and `npm run typecheck` both pass.

## 5. Code review with a `code-reviewer` subagent

Once the backend was complete, I created a project subagent, `.claude/agents/code-reviewer.md`. It is read-only (it can read, search and run `npm test`/`npm run typecheck`, but cannot edit) and is told to review against `CLAUDE.md`, verify each finding in the code, and rank findings by priority with a concrete fix. I had it review the whole backend; it found one bug and several improvements, and I chose which ones to fix.

- **Prototype-property bug in the city lookup (the one real bug).** The service checked cities with `solarData.psh_per_stad[city]`. Names such as `"constructor"`, `"toString"` and `"__proto__"` exist on every JavaScript object's prototype, so they passed the check. The calculation then saw a "city" with no sun data, needed `Infinity` panels and returned the warning "…men Infinity paneler behövs…". The API's validator already rejected these names, but the service is meant to be the safety net behind it. I reproduced the bug before fixing it. **Fix:** check with `Object.hasOwn(solarData.psh_per_stad, city)`, and throw an error if a city's annual yield is ever 0 so bad data can never produce `Infinity`. Regression tests cover four such names at the service level and `"constructor"` over HTTP.
- **Duplicated yield formula.** `PSH × days × PR` was written twice: once to size the system and once for monthly production. It also read the city's PSH data twice per request. If only one copy were changed later (for example for leap years or shading), the sizing and the production figures would silently disagree. **Fix:** a single `getMonthlyYieldPerKwp` helper now feeds both, and the Malmö baseline tests confirm the results are unchanged.
- **Malformed JSON broke the response format.** A broken request body to `POST /api/calculate` returned `{ error: { message } }` with V8's English parser message, while every other 4xx used `{ status: "fail", data }`. **Fix:** the global error handler now returns `{ status: "fail", data: { message } }` for every 4xx, with a clear fixed message instead of the parser's text (now "Invalid JSON in request body."), and `{ status: "error", message }` for 5xx. It also ignores non-HTTP status codes and errors raised after the response has started. Both 404 handlers were moved to the same format.
- **Also fixed from the review:**
  - CORS is restricted to `CORS_ORIGIN`, which defaults to `http://localhost:5173`.
  - A test assertion that only passed because consumption was exactly 10 000 kWh was corrected.
  - New tests cover the exact minimum and maximum values, city trimming and malformed JSON.
- **Deferred:** a misleading `Number.EPSILON` in the rounding helper, a more robust PSH correction for values that would still be above 24 after dividing by 10, the optional `noUncheckedIndexedAccess` compiler flag, and 2-space indentation left in `server.ts`. None of these affects today's results.

The review was useful mainly because the subagent ran with a fresh context and had to check each finding against the actual code: the prototype bug was invisible in normal use, since the validator in front of the service hid it.

### Frontend review

After the UI and brand polish, the same subagent reviewed the frontend. Lint and type-check were clean, but it found two high-priority and several medium issues. I checked each against the code (one finding, about outdated chart colours in `CLAUDE.md`, was wrong and was dropped) and fixed:

- **Number inputs (high).** `type="number"` returns an empty value for "15 000" and, in some browsers, "2,5", the exact formats the placeholders suggested. **Fix:** `type="text" inputMode="decimal"` (phones still show a numeric keyboard) and a language-aware `parseNumber` in `translations.ts`. It accepts sv "15 000"/"2,5" and en "15,000"/"2.5", and rejects "1e3" and "0x10"; 18 cases were checked with a script. "Fill example values" now writes numbers in the current language's format.
- **Broken ARIA references (high).** Inputs referenced both `…-hint` and `…-error`, but only one exists at a time; the city `<label>` pointed at a `<select>` that is not rendered while cities load. **Fix:** `aria-describedby` points at whichever element is rendered, and the label becomes plain text when there is no control.
- **Live region (medium).** `aria-live` on the whole results section could make a screen reader read every KPI, the chart and the table. **Fix:** a short `sr-only` `role="status"` line: "Beräkningen för Malmö är klar. Årlig besparing: 13 618 kr/år."
- **Units and percent (medium).** About 20 places joined numbers and units with a normal space, and percent was always "45 %". **Fix:** `withUnit()` and `NBSP` in every translation template; `t.units.percent()` gives "45 %" in Swedish and "45%" in English.
- **State shape (medium).** `HomePage` kept the result's input in its own state and synced it after the `await`. **Fix:** the hook stores `{ input, result }` in one state value.
- **Language toggle (medium).** Visible "EN", screen-reader name "Engelska", read in an English voice. **Fix:** no `aria-label`; the visible "SV"/"EN" plus an `sr-only` endonym ("Svenska", "English").
- **Scroll arrow (medium).** `aria-label` on an SVG without a role. **Fix:** `aria-hidden`; it is a visual cue only.
- **Low:** a hard-coded `hover:bg-[#490470]` became the `brand-aubergine-600` token; emerald focus rings became aubergine; the savings split now always adds up to the total; `useId()` replaced a fixed element id; unused translation keys, `public/favicon.svg` and a `.DS_Store` were removed.

All fixes were checked with lint, type-check, build, and a headless-browser run in both languages (the Malmö example: 11 368 kr + 2 250 kr = 13 618 kr).

## 6. Decision: English API messages, localization in the frontend

The first version returned Swedish messages from the API: validation errors, 404s and calculation warnings. I changed this so that all backend messages are in English and the frontend handles the end-user language (a Swedish/English toggle):

- **Why:** English messages are easier to maintain, search for and test for developers. Translated text in the API would also lock the frontend into a single language. The backend's job is to say *what* happened in a stable, machine-readable way; *how* to phrase it for the user belongs to the UI.
- **Structured warnings:** `warnings` changed from `string[]` to `CalculationWarning[]`, a TypeScript union of `{ code, message, params }` with codes `ROOF_LIMITED` (`params: { maxPanelsOnRoof, neededPanelCount }`) and `MISSING_PSH_DATA` (`params: { city, months }`). The frontend builds its own Swedish or English sentence from `code` and `params`; `message` is only an English fallback. The tests assert on `code` and `params` rather than on the wording.
- **Validation errors** are localized in the frontend by the field `path`.
- **Unchanged:** `solarData.json`, including its Swedish keys and city names, is still untouched. `monthName` in the monthly breakdown is still Swedish; the frontend can localize months from the `month` number.

## 7. Frontend and visual verification

The frontend followed the same order as the backend: contracts and logic first, UI last.

- **Non-visual layers first.** The API types, the service layer, the translations and the state hook were built and type-checked before any component existed. AI suggestions kept here:
  - every failed request becomes one `ApiError` with flags (`isNetworkError`, `fieldErrors`, `status`), so the UI picks a localized message instead of showing backend text;
  - requests take an `AbortSignal`, and the hook cancels a calculation when a newer one starts or the page unmounts, so a slow old response can never overwrite a newer result;
  - the `Translations` type forces Swedish and English to define every key, so the build fails if a text is missing.
- **The linter caught a React issue.** oxlint flagged state being set synchronously inside an effect in the hook. The resets were moved into the `retryCities` action instead.
- **UI text aligned with the assignment model.** The first draft of the translations included claims the assignment does not make: that the price was "before the tax deduction for green technology", and that the electricity price should include "grid fees, energy tax and VAT". The AI flagged these as needing a check; I decided to remove them. The hints now state only the model itself ("15 000 kr/kWp × 9,90 kWp", surplus sold "för 0,50 kr/kWh", payback = price ÷ savings), and the figures come from `constants.ts`, which mirrors `solarData.json`, instead of being typed into the text.
- **Chart colours were computed, not picked by eye.** Production (amber) and consumption (teal) were checked with a palette validator for lightness, saturation and colour-blind separation on white. The first teal candidate failed (too grey) and was replaced. The energy-balance bar was then changed to two shades of amber, so that amber means "production" everywhere in the UI. Later, consumption was switched to the 1KOMMA5° brand aubergine (`#5c068c`); the validator re-confirmed strong colour-blind separation from amber (ΔE 36), and flagged only that aubergine is darker than its suggested lightness band, which was accepted as a brand requirement.

### Visual verification with a headless browser

Type-checks and lint cannot show whether a layout works, so the running app was tested in headless Chrome. A small script, driven over the Chrome DevTools Protocol:

1. opened the app with both servers running;
2. clicked "Fyll i exempelvärden" and "Beräkna" (optionally switching to English, or changing the city and roof area);
3. took full-page screenshots at desktop (1440 px) and phone (390 px) width.

This confirmed the full flow end to end. The Malmö example showed 13 618 kr/year, 10,9 years, 148 500 kr and 22 panels, matching the backend tests, and a roof-limited Sundsvall quote showed both warnings correctly translated. It also caught five layout problems that every automated check had passed:

| Problem seen in the screenshots | Fix |
|---|---|
| The form buttons had collapsed to a thin strip (`flex-1` inside a column layout) | Full-width buttons with a fixed height |
| "Fyll i exempelvärden" wrapped onto two lines in the narrow form column | Buttons stacked vertically |
| On mobile the 12 month labels ran together ("JanFebMarApr…") | The chart skips labels that would collide: every month on desktop, every other month on a phone |
| The chart legend listed consumption before production (Recharts sorts alphabetically) and coloured its text in the series colours | Explicit legend order and normal text colour, with the colour only on the swatch |
| "2 m²" broke across two lines in a hint | Non-breaking space |

After each fix the screenshots were retaken to confirm it. The same approach was used to check the first favicon at 16, 32 and 96 px.

### Manual UI refinements

After the AI-generated UI, these details were refined by hand:

- **Official logo.** The AI's placeholder sun icon was replaced by `frontend/public/1KOMMA5.png` in the header, and the favicon by the official `1K5.png`.
- **1KOMMA5° aubergine palette.** The brand colours are Tailwind v4 `@theme` tokens in `src/index.css` (`brand-aubergine-500`, `brand-aubergine-600`, `brand-aubergine-bg`, `brand-teaser`). The primary button is aubergine with a darker aubergine hover, section icons are aubergine, and chart consumption bars are aubergine. Lavender cards were tried for the payback and recommended-system cards and then dropped: all cards are white except the one dark hero card (annual savings), which keeps the attention on the savings. Desktop table rows highlight in lavender on hover.
- **Mobile header.** Rebuilt so the title is never truncated on phones (section 3).
- **Scroll indicator.** The AI's fade gradient and text hint on the monthly table were replaced by a clean `ArrowRight` indicator on mobile and tablet, which fades out once the last column is visible. The sticky month column gets a soft shadow only after scrolling.
- **Card clipping.** `overflow-hidden` on the monthly table card keeps the scrolling table inside the rounded corners.
- **`SubmitEvent` instead of `FormEvent`.** The form handler uses React 19's `SubmitEvent<HTMLFormElement>`.
- **Custom `<select>` chevron.** The city dropdown uses `appearance-none` with a lucide `ChevronDown` icon, so it looks the same as the number inputs in every browser.

## 8. How `CLAUDE.md` guided the work, and what to improve

`CLAUDE.md` is the shared context for every AI session. It records:

- The two backend entry points and the layer responsibilities.
- The rule that `solarData.json` stays untouched and that corrections live in the service.
- The API response envelope, the warning codes and that `paybackYears` can be `null`.
- The exact commands, including how to run a single test and the type-check.
- For the frontend: what each folder does, the brand tokens, number and unit formatting, text-type number inputs, the accessibility rules, the `SubmitEvent` rule, and that end users never see backend message strings.
- A list of things not to change without asking.

**How it helped.** Updating it after each architectural decision kept later prompts short: new code followed the documented conventions without them being restated. The `Object.hasOwn` rule, the `null` payback and the "never show backend messages" rule were written down once and then respected in every later step. The `code-reviewer` subagent reviewed against `CLAUDE.md`, so the file also served as the review checklist.

**What we would improve:**

- **Enforce, don't describe.** `CLAUDE.md` once stated a single code style that the code no longer followed (files drifted between 2- and 4-space indentation). A Prettier config and a lint rule would make the style a check instead of a sentence.
- **Write visual rules earlier.** Brand colours, "never truncate the title on mobile" and "numbers must not wrap" were added after the problems appeared. Stating the design system and a mobile checklist up front would have avoided several manual fixes.
- **Ask for a visual check.** The file now says lint and build do not prove a layout works. Pairing that with a scripted screenshot step (for example Playwright) would make it repeatable.
- **Write accessibility rules up front.** Every accessibility issue in the frontend review (dangling `aria-describedby`, a large live region, button names that differ from their label) is now a rule in `CLAUDE.md`; having them there from the start would have avoided them.
- **Prefer current APIs.** A line such as "use React 19 types; avoid anything marked `@deprecated`" would have prevented the `FormEvent` mistake.
- **Keep it short.** Some sections repeat what the code says. Trimming them to rules and decisions keeps the file cheap for every session to read.
