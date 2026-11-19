# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Solar panel calculator (1KOMMA5 assignment). Given a Swedish city, annual electricity consumption, roof area and electricity price, it sizes a solar installation and estimates production, self-consumption, savings and payback. `backend/` is an Express + TypeScript API; `frontend/` is a React + TypeScript + Vite single-page app for salespeople (Swedish by default, with an SV/EN toggle). 

## Commands

Backend (run from `backend/`):

```bash
npm run dev        # tsx watch server.ts (http://localhost:3001)
npm run build      # tsc -> dist/
npm start          # node dist/server.js
npm test           # vitest run
npm run typecheck  # tsc on app code, then on tests via tsconfig.test.json

npx vitest run tests/calculatorService.test.ts          # single file
npx vitest run -t "roof-limited"                         # tests matching a name
```

Vitest does not type-check, and `tsconfig.json` excludes `tests/`; run `npm run typecheck` to type-check test files.

Frontend (run from `frontend/`; start the backend first):

```bash
npm run dev        # vite on http://localhost:5173 (strictPort: the backend's CORS only allows this origin)
npm run build      # tsc -b (type-check) + vite build
npm run lint       # oxlint (config in .oxlintrc.json)
npm run typecheck  # tsc -b
npm run preview    # serve the production build
```

The frontend has no test runner yet.

## Frontend architecture

React 19, TypeScript 7, Vite 8, Tailwind CSS v4 (via `@tailwindcss/vite`; no `tailwind.config` file, theme tokens live in `src/index.css`), axios, recharts, lucide-react. `tsconfig.app.json` sets `verbatimModuleSyntax` (use `import type`) and `erasableSyntaxOnly` (no enums or constructor parameter properties).

Code style is not enforced by a formatter and is currently mixed: most files use 2-space indent, single quotes and no semicolons (the Vite template style), while `CalculatorForm.tsx`, `MonthlyBreakdown.tsx` and `translations.ts` use 4-space indent, double quotes and semicolons. Match the style of the file you are editing; do not reformat whole files.

Frontend rules:

- **Brand tokens.** `src/index.css` defines the 1KOMMA5° palette in a Tailwind v4 `@theme` block: `--color-brand-aubergine-500` (`#5c068c`), `--color-brand-aubergine-600` (`#490470`, hover), `--color-brand-aubergine-bg` (`#fbf5ff`, not used yet) and `--color-brand-teaser` (`#fae8ff`). Use them as utilities (`bg-brand-aubergine-500`, `hover:bg-brand-aubergine-600`, `text-brand-aubergine-500`, `sm:hover:bg-brand-teaser/70`); never hard-code brand hex values in components (no `bg-[#...]`). Add new brand colours to `@theme`. Focus styles use the brand too: `focus-visible:outline-brand-aubergine-500` on buttons, `focus:border-brand-aubergine-500 focus:ring-purple-100` on inputs.
- **Numbers and units.** Format every displayed number with `formatNumber` (or the `svNumber`/`enNumber` helpers inside `translations.ts`). It normalizes all grouping spaces to a non-breaking space (`\u00a0`), so Swedish `100 000` and `0,10` never wrap mid-number; English gives `100,000` and `0.10`. Join a number and its unit with a non-breaking space: `withUnit(n, t.units.kwh)` in components, `${value}${NBSP}kWh` in translation templates. Percent comes from `t.units.percent(value)` (sv `45 %`, en `45%`); never concatenate `%` by hand.
- **Number inputs.** Numeric fields are `type="text" inputMode="decimal"`, parsed with `parseNumber(raw, language)` from `translations.ts` (accepts `15 000`, `2,5`, `15,000`, `2.5`). Do not switch back to `type="number"`: browsers return an empty value for `15 000` and, in some locales, `2,5`.
- **Accessibility.** `aria-describedby` must only reference elements that are rendered (a field shows its hint *or* its error). A `<label htmlFor>` must point at a rendered control. Do not put `aria-live` on large regions; announce results through the short `role="status"` line in `HomePage`. A button's accessible name must start with its visible text (the SV/EN toggle adds the language name in `sr-only`). Decorative icons are `aria-hidden`.
- **Form events.** Type form handlers with React 19's `SubmitEvent<HTMLFormElement>`. `FormEvent` is deprecated in `@types/react` 19.

`VITE_API_URL` in `frontend/.env` (see `.env.example`) is the backend base URL, default `http://localhost:3001/api`; it is typed in `src/vite-env.d.ts`.

Under `frontend/src/`:

- `types/calculator.types.ts`: a hand-maintained mirror of the backend API contract (`CalculationInput`, `CalculationResult`, `CalculationWarning`, the response envelopes). Update it when backend types change.
- `services/calculatorService.ts`: the only module that talks HTTP. A single axios instance (`VITE_API_URL`, 10 s timeout); `fetchCities()` and `calculateQuote()` unwrap `response.data.data` and throw `ApiError` (`status`, `fieldErrors` from 400 `fail` arrays, `isNetworkError` when no response arrived, `isCanceled`). Both accept an `AbortSignal`.
- `hooks/useSolarCalculator.ts`: app state (cities with `retryCities`, `result` and the `resultInput` it was calculated from (stored together in one state value), `calculating`, `error`, `fieldErrors` keyed by field, `submitCalculation`, `resetResult`). Aborts superseded or unmounted requests so stale responses never update state.
- `i18n/translations.ts`: all UI text, Swedish (`sv`, the default) and English (`en`), typed by the `Translations` interface so both languages must define every key. Helpers: `formatNumber` (Intl `sv-SE`/`en-GB`, fixed decimals, non-breaking group spaces), `withUnit`, `parseNumber` (user input, language-aware), `monthName` (from `month` 1–12), `formatWarning` (from warning `code` + `params`, falling back to `message`), `fieldErrorMessage` (min/max formatted from `INPUT_LIMITS`, so messages never drift from the rules), `errorMessage` (picks network/validation/server text from an `ApiError`).
- `constants.ts`: `MODEL` (panel model, 15 000 kr/kWp, 0.50 kr/kWh surplus compensation, mirrored from `solarData.json`), `INPUT_LIMITS` (mirrored from the backend validator) and `EXAMPLE_INPUT` (the assignment's Malmö case). Used for explanatory text, client-side validation and splitting `annualSavingsKr` into its two parts; never for sizing or totals, which always come from the API.
- `pages/HomePage.tsx`: owns `language` state and `useSolarCalculator()`. Two columns from `lg` (sticky form left, results right), stacked below. Handles the empty state, the skeleton for a first calculation, a dimmed overlay when recalculating, a dismissible error banner (with retry for network errors), and an `sr-only` `role="status"` line announcing finished calculations.
- `components/`: `Header` (logo, title, SV/EN toggle; below `sm` the title gets its own full-width row instead of being truncated), `CalculatorForm` (text inputs parsed with `parseNumber`, example values shown in the current language's format, custom `<select>` chevron, client validation against `INPUT_LIMITS`, backend `fieldErrors` shown until the field is edited, "fill example values"), `ResultsSummary` (warnings; KPIs in sales order: annual savings as the one dark hero card, then payback and installation price as white cards; then the recommended system and the energy balance, also white, with aubergine section icons. The savings split rounds the surplus part and derives the other from the total, so the rows always add up to `annualSavingsKr`), `ProductionChart` (Recharts grouped bars), `MonthlyBreakdown` (horizontally scrollable table in an `overflow-hidden` card, with a decorative (`aria-hidden`) `ArrowRight` indicator below `lg` while more columns are to the right, lavender row hover from `sm` and a shadow on the sticky month column once scrolled; the footer uses the API's annual totals, not a sum of the rounded rows).

Brand assets in `public/`: `1KOMMA5.png` (header logo) and `1K5.png` (favicon, linked as `/1K5.png` in `index.html`; reference `public/` files from the root, never as `./public/...`). The primary button is `bg-brand-aubergine-500` with `hover:bg-brand-aubergine-600`. Chart colors: production `#d97706` (amber), consumption `#5c068c` (brand aubergine); the pair is well separated for colour-blind readers on white (ΔE ≈ 36). Amber means production throughout the UI; the energy-balance bar uses two amber shades because both segments are parts of production. The app is light-mode only.

Never show backend message strings to end users; render text through `i18n` using codes, field names and `ApiError` flags.

Lint, typecheck and build passing does not prove a layout works: check UI changes in a browser at phone (~390 px) and desktop width.

## Backend architecture

Two entry points, kept strictly separate:

- `backend/server.ts`: loads `.env` (`dotenv.config({ quiet: true })`), creates the HTTP server with `http.createServer(app)` on `PORT` (default 3001) and handles `EACCES`/`EADDRINUSE`. No Express setup here.
- `backend/src/app.ts`: builds and default-exports the Express app (middleware, routes, 404 and error handlers). It never calls `listen`, so tests can import it directly (e.g. with supertest).

Because ES imports are hoisted, `src/` modules load before `dotenv.config()` runs; read `process.env` inside functions, not at module top level.

Layers under `backend/src/` (a request flows top to bottom):

- `routes/`: Express routers mounted under `/api`; wire validators and controllers together.
- `validators/`: `express-validator` chains for request input.
- `controllers/`: translate HTTP (`req`/`res`) to service calls and shape the JSON response.
- `services/`: pure business logic with no Express imports. `calculatorService.ts` exposes `getAvailableCities()` and `calculateSolarQuote(input)`.
- `data/`: `solarData.json`, the raw assignment data.
- `types/`: shared interfaces (`calculator.types.ts`: `SolarData`, `CalculationInput`, `MonthlyBreakdown`, `CalculationResult`).
- `backend/tests/`: Vitest tests (outside `src/`, excluded from the build).

Build output: `rootDir` is `backend/`, so `tsc` emits `dist/server.js` and `dist/src/...`. TypeScript 7 with `module: NodeNext` in a CommonJS package: relative imports need no `.js` extension, and JSON is imported directly (`resolveJsonModule`).

## Source data (`solarData.json`)

Keep the file exactly as delivered, including its Swedish keys and its known anomalies. All corrections happen in helper functions in `calculatorService.ts`:

| Anomaly | Handling |
|---|---|
| `pris_per_kwp: 15` | × 1000 → 15 000 kr/kWp (`getPricePerKwp`) |
| `forbrukningsprofil` sums to 1.03 | each share ÷ sum (`getNormalizedConsumptionProfile`) |
| Göteborg July PSH `54` | values > 24 are ÷ 10 → 5.4 (`getMonthlyPsh`) |
| Sundsvall has 11 PSH values | missing months set to 0, `MISSING_PSH_DATA` warning added to `warnings` |

Panel power, panel area, PR and surplus compensation are read from the JSON rather than hard-coded. Calculations keep full precision and round only in the returned result (2 decimals for kWh/kWp/m²/%/years, whole kr).

## Language and localization

Backend API messages (validation errors, 4xx/5xx messages, warning `message` fallbacks) are in **English**, for developer maintainability. End-user localization (the Swedish/English toggle) is the frontend's job: it must not display backend messages verbatim to end users, but render its own text from stable identifiers:

- Warnings are structured (`CalculationWarning` in `calculator.types.ts`): `{ code: "ROOF_LIMITED" | "MISSING_PSH_DATA", message, params }`. `code` + `params` are the contract (`ROOF_LIMITED`: `{ maxPanelsOnRoof, neededPanelCount }`; `MISSING_PSH_DATA`: `{ city, months: number[] }` with months 1–12). `message` is an English fallback. Add a new code to the union rather than encoding information only in the text.
- Validation errors: localize by the field `path` (`city`, `annualConsumption`, `roofArea`, `electricityPrice`); `msg` is English.
- Exceptions: `solarData.json` keys and city names stay Swedish (source data), and `monthlyBreakdown[].monthName` is still Swedish; the frontend should localize months from `month` (1–12).

## API conventions

Every JSON response except the health check uses this envelope:

- 2xx: `{ "status": "success", "data": ... }`
- 400 validation errors: `{ "status": "fail", "data": [...] }`, the `express-validator` error array (one entry per invalid field, `path` + English `msg`)
- Other 4xx (404, malformed JSON, `UnknownCityError`, ...): `{ "status": "fail", "data": { "message": "<English message>" } }`
- 5xx: `{ "status": "error", "message": "An internal server error occurred." }`; never leak internal details, log the error server-side

Endpoints (`src/routes/index.ts` is mounted at `/api` in `app.ts`):

- `GET /api/health`: `{ status: "ok", timestamp }` (deliberately outside the envelope)
- `GET /api/cities`: `{ status: "success", data: string[] }`
- `POST /api/calculate`: body `{ city, annualConsumption, roofArea, electricityPrice }`. Validated by `calculateRules` (English messages, one error per field, numbers sanitized with `toFloat()`); the controller returns 400 `{ status: "fail", data: validationErrors.array() }` or 200 `{ status: "success", data: CalculationResult }`.
- Unknown routes: 404 `{ status: "fail", data: { message: "Route GET /x does not exist." } }`, from `routes/index.ts` for `/api/*` and from `app.ts` for everything else

The global error handler in `app.ts` produces the 4xx/5xx shapes above. It takes the status from `err.status`/`err.statusCode` (anything outside 400–599 becomes 500), maps body-parser errors by `err.type` to fixed messages (`entity.parse.failed` → "Invalid JSON in request body."), and otherwise passes 4xx `err.message` through. So services signal client errors by throwing an error with a `status` and an English message (e.g. `UnknownCityError`, status 400).

CORS allows only `CORS_ORIGIN` (default `http://localhost:5173`, the frontend dev server), read per request because of the dotenv hoisting rule above. Requests without an `Origin` header (curl, supertest) are allowed.

Controllers stay thin (no calculation math). `tests/calculatorApi.test.ts` exercises the HTTP layer with supertest against `src/app.ts`; morgan logging is skipped when `NODE_ENV=test` (set by Vitest).

In `calculatorService.ts`, look up cities with `Object.hasOwn` (a plain `obj[city]` lookup accepts `"constructor"` etc.), and keep the production formula (PSH × days × PR) only in `getMonthlyYieldPerKwp`, which feeds both sizing and the monthly breakdown.

`CalculationResult.paybackYears` is `number | null`: it is `null` when annual savings are 0 (e.g. the roof fits no panels), never `0` or `Infinity`. Consumers must handle `null`.

## Do not change without asking

- `backend/src/data/solarData.json` (contents, keys or anomalies); fix data in the service helpers instead.
- The calculation model: the assignment's formulas, `Math.ceil` for needed panels, `Math.floor` for panels that fit, the roof cap with `ROOF_LIMITED`, and the four anomaly corrections.
- The API contract: the response envelope, field names, warning codes/params, and `paybackYears: number | null`. A change must update `frontend/src/types/calculator.types.ts` in the same change.
- Input limits in `calculatorValidator.ts`; they are mirrored in `frontend/src/constants.ts` (`INPUT_LIMITS`) and must change together.
- Ports and CORS: backend 3001, frontend 5173 with `strictPort`, `CORS_ORIGIN`.
- Brand colours, chart colours and the KPI order (savings, payback, price).
- Adding dependencies, a dark mode, or a formatter run over existing files.
