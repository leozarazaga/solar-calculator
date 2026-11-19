# 1KOMMA5° Solar Quote Calculator

![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-40_Passing-6E9F18?logo=vitest&logoColor=white)

A full-stack solar quote calculator built for 1KOMMA5° salespeople. Enter four details about a customer's house and electricity use to get an instant estimate of system size, installation cost, annual savings, payback time, and a month-by-month production breakdown.

## Features

- **Instant Solar Quote:** Calculates recommended panels, installed capacity (kWp), roof area used, installation price, annual savings, and payback time.
- **Month-by-Month Comparison:** Interactive bar chart and scrollable monthly table comparing solar production, consumption, self-consumption, and surplus sold to the grid.
- **Smart Validation & Warnings:** Validates inputs on both the client and API, handles roof-size limits, and warns when city sun data is incomplete.
- **Bilingual UI (SV / EN):** Built in Swedish by default with an instant Swedish/English toggle.
- **Mobile & Tablet Ready:** Responsive layout designed for salespeople using a phone or tablet during a home visit.

## Tech Stack

- **Backend:** Node.js, Express 5, TypeScript, `express-validator`
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Axios, Lucide Icons
- **Testing & Linting:** Vitest, Supertest, `oxlint`

## Getting Started

### Prerequisites

- **Node.js 22.12 or newer** (required by Vite 8 and Vitest 5)

### 1. Installation

Install dependencies for both the backend and frontend:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration

Copy the example environment files in both folders:

```bash
cp backend/.env.example backend/.env     # PORT=3001, CORS_ORIGIN=http://localhost:5173
cp frontend/.env.example frontend/.env   # VITE_API_URL=http://localhost:3001/api
```

### 3. Running the Project

Start the backend first (Terminal 1):

```bash
cd backend
npm run dev
```

Start the frontend second (Terminal 2):

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**, click **Fyll i exempelvärden** to load the Malmö example, and click **Beräkna**.

> Note: The frontend runs with `strictPort` on port `5173` because the backend's CORS policy only allows requests from `http://localhost:5173`.

## Quality Checks & API

Run tests, type-checks, and linting:

```bash
# Backend (40 unit + API tests and TypeScript check)
cd backend && npm test && npm run typecheck

# Frontend (oxlint, TypeScript check, and production build)
cd frontend && npm run lint && npm run typecheck && npm run build
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/cities` | List of available Swedish cities |
| `POST` | `/api/calculate` | Calculates a full solar quote from `{ city, annualConsumption, roofArea, electricityPrice }` |

## Decisions & Data Fixes

The assignment leaves a few edge cases open and includes four data quirks in `solarData.json`. `solarData.json` is kept untouched, and all fixes live in `backend/src/services/calculatorService.ts`:

- **Panel rounding:** Needed panels are rounded **up** (`Math.ceil`) so the customer doesn't end up short of their consumption. Panels that fit on the roof are rounded **down** (`Math.floor(roofArea / 2.0)`) because you can't install half a panel.
- **Roof too small:** Instead of failing, the quote caps the system at `maxPanelsOnRoof`, sets `isRoofLimited: true`, and displays a clear warning banner and badge so the salesperson can show what *does* fit.
- **Validation limits:**
  - Annual consumption: `1 000 – 100 000 kWh` (covers small to very large villas and catches extra/missing zeros).
  - Usable roof area: `4 – 500 m²` (minimum fits 2 panels; 500 m² covers any villa roof).
  - Electricity price: `0,10 – 10,00 kr/kWh` (catches öre/kronor typos).
  - City lookups use `Object.hasOwn` so built-in object keys like `"constructor"` are rejected.
- **Result order:** **Annual savings** is shown first as the dark hero card (split into avoided electricity purchases and sold surplus), followed by **Payback time** and **Installation price**—matching the order homeowners ask questions in a sales meeting.
- **Data fixes in `solarData.json`:**
  1. `pris_per_kwp: 15` → multiplied by `1 000` to get `15 000 kr/kWp` (matching the assignment spec).
  2. `forbrukningsprofil` sums to `1.03` → normalized by dividing each month by `1.03` so monthly consumption adds up to 100%.
  3. Göteborg July PSH is `54` → values over `24` are divided by `10` to get `5.4`.
  4. Sundsvall only has `11` months → December is treated as `0 kWh` and triggers a `MISSING_PSH_DATA` warning in the UI.

## Intentional Shortcuts & With More Time

### Shortcuts taken

- **Monthly instead of hourly math:** Uses monthly totals as specified in the brief, which overestimates self-consumption compared to real midday solar peaks.
- **Ideal roof:** Assumes no shading, optimal tilt/direction, and 100% usable roof area.
- **Static rates & in-memory data:** No database, authentication, green-tech tax deduction (*grönt avdrag*), or panel degradation.
- **No automated frontend tests:** Verified via `oxlint`, `tsc`, and headless browser screenshots on desktop and mobile (backend has 40 automated tests).

### With more time

- Add hourly production/consumption profiles and an optional battery toggle.
- Add roof tilt, orientation, and shading inputs, plus the Swedish green-tech tax deduction.
- Add PDF quote export and Playwright end-to-end tests.

## Architecture

### Data Flow

```text
React UI ──> Axios Service ──> Express Router ──> Validator ──> Controller ──> Calculator Service
                                                                                     │
React UI <── Localized UI <─── JSON Envelope <───────────────── Controller <─────────┘
```

### 1. Stack & Frameworks

- **Backend (Node.js, Express 5, TypeScript):** A stateless two-endpoint API does not need the boilerplate of heavier frameworks like NestJS. Strict TypeScript keeps types aligned across the project, `express-validator` handles input rules cleanly, and Vitest + Supertest cover both unit and HTTP tests.
- **Frontend (React 19, TypeScript, Vite, Tailwind CSS v4, Recharts):** A single interactive calculator needs no SSR or file-based routing, so Vite SPA is faster and simpler than Next.js. Tailwind v4 `@theme` tokens (`src/index.css`) hold the 1KOMMA5° brand palette directly in CSS, Recharts renders responsive charts with tooltips, and Axios provides clean request cancellation (`AbortSignal`).

### 2. Folder Structure

```text
solar-calculator/
├── backend/
│   ├── server.ts            # Starts the HTTP server (port & startup errors)
│   ├── src/
│   │   ├── app.ts           # Express setup, middleware, routes, error handler
│   │   ├── routes/          # API routes mounted under /api
│   │   ├── validators/      # express-validator request rules
│   │   ├── controllers/     # Reads HTTP input, calls service, sends JSON
│   │   ├── services/        # Pure calculation math (no Express imports)
│   │   ├── data/            # Raw solarData.json
│   │   └── types/           # Shared TypeScript interfaces
│   └── tests/               # Vitest unit & Supertest API tests
└── frontend/
    ├── public/              # 1KOMMA5° logo and favicon
    └── src/
        ├── pages/           # HomePage layout and language toggle
        ├── components/      # Header, CalculatorForm, ResultsSummary, ProductionChart, MonthlyBreakdown
        ├── hooks/           # useSolarCalculator state & request cancellation
        ├── services/        # Axios API client and ApiError handling
        ├── i18n/            # Swedish & English translations + number formatting
        └── constants.ts     # Mirrored model constants & input limits
```

### 3. Design Patterns

- **Pure calculation service:** `calculatorService.ts` has zero Express imports, making the solar math easy to unit-test in isolation and reuse outside HTTP.
- **Separate `app.ts` and `server.ts`:** Supertest imports `app.ts` directly in memory during tests without binding to a network port.
- **Custom hook as state boundary:** `useSolarCalculator` owns API state and aborts superseded requests with `AbortSignal` so slow responses never overwrite newer results.
- **English API + Frontend i18n:** The API returns English messages and structured warning codes (`ROOF_LIMITED`, `MISSING_PSH_DATA`), while the frontend owns all Swedish/English user text.

### 4. Scaling to the Sales Team

If this grew into a shared tool for the entire 1KOMMA5° sales team, I would restructure in this order:

1. **Database & quote persistence:** Move pricing, panel models, and city sun-hour data out of static `solarData.json` into a database (e.g. PostgreSQL) so rates can be updated without redeploying, and save quotes with a snapshot of the rates used.
2. **Single source of truth for contracts & math:** Share types and validation rules via a workspace `shared/` package (or OpenAPI schema) instead of mirroring them in `frontend/src/constants.ts`, and return the savings split directly from the backend.
3. **Authentication & CRM integration:** Add company SSO login for salespeople and connect saved quotes to customer records.
4. **CI/CD & automated E2E checks:** Run backend tests, type-checks, linting, and Playwright tests automatically on every pull request.

See `CLAUDE.md` for AI coding conventions and `AI.md` for the AI workflow and verification log.