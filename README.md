# Kobin Procurement KPI

Web app that automates the monthly procurement-supervisor KPI achievement report
(Kobin Group, Procurement–Purchasing division). Upload the two monthly CSV
exports, and the app reconciles them into Postgres, recalculates all 7 KPIs for
every month in the data, and shows results as a STD / REAL / % / CAPAI matrix
with trend charts and per-KPI drill-down.

## Quick start

```bash
./script/setup.sh    # installs deps, starts Postgres (docker), migrates, seeds
./script/start.sh    # dev server on http://localhost:3000
./script/start.sh --prod   # production build + start
```

Then open **/upload** and drop the two exports (`PO.csv` and `PR TO GR.csv` —
file type is auto-detected). Re-uploading updated files is safe: rows are
merged by natural key and KPIs are recalculated for all months.

## The 7 KPIs

| # | KPI | STD | Weight | Source |
|---|-----|-----|--------|--------|
| 1 | Price performance vs last PO | min –1% | 10% | PO export (unit-price history per item + currency) |
| 2 | Realisasi PO→BPB (Local) | 95% | 20% | GRPO date ≤ ETA + 7 days (join PO × PR TO GR on PO No) |
| 3 | Realisasi PO→BPB (Import) | 95% | 20% | same, tolerance 14 days |
| 4 | Realisasi PR→PO | 95% | 15% | PO created ≤ 7 days after PR |
| 5 | Quality Compliance (LKM) | max 3 | 15% | future source (`kpi_manual_entries`) — shows “–” |
| 6 | Material substitution | max 1/yr | 10% | future source — shows “–” |
| 7 | Sourcing new vendor | min 6/yr | 10% | vendors whose first-ever PO falls in the year (cumulative) |

Scoring: `% = REAL/STD` (capped at 100%, threshold KPIs are all-or-nothing),
`CAPAI = % × weight`, monthly total = Σ CAPAI. Weights, standards, tolerances
and aggregation mode live in the `kpi_config` table and can be tuned without a
code change.

## Project layout

```
src/app/            pages: / (dashboard) /upload /uploads /kpi/[kpiId] /api/health
src/lib/csv/        CSV parsing + normalization (DD.MM.YY dates, "1,234.00" numbers, "-" → null)
src/lib/ingest/     idempotent upserts by natural key + data-quality warnings
src/lib/kpi/        pure KPI calculators + scoring + engine (unit-tested, no DB)
src/lib/server/     server actions & queries (upload, recalc, drill-down)
infra/              docker-compose.yml (Postgres + optional app) and Dockerfile
script/             setup.sh / start.sh
drizzle/            generated SQL migrations
```

## Configuration

Copy `.env.example` to `.env.local` (setup.sh does this). The app fails loudly
if `DATABASE_URL` is missing. `MAX_UPLOAD_SIZE_MB` bounds each uploaded file.

## Tests

```bash
npm test               # unit tests (CSV parsing, KPI calculators, scoring)
npm run test:coverage  # coverage gate ≥80% on business logic
npm run test:e2e       # Playwright: real upload → dashboard → drill-down
```

The E2E test needs the app running (`./script/start.sh --prod`, port 3100 via
`E2E_BASE_URL` or edit `playwright.config.ts`).

## Deploying (AWS)

Build the production image and run it against your managed Postgres:

```bash
docker compose -f infra/docker-compose.yml --profile app up -d --build
# or
docker build -f infra/Dockerfile -t kobin-kpi .
docker run -e DATABASE_URL=postgresql://… -p 3000:3000 kobin-kpi
```

Run migrations once per deploy: `DATABASE_URL=… npx drizzle-kit migrate`.

## Known data notes

- The PO export currently starts at Jan 2025, the PR TO GR export at Nov 2025 —
  KPI 2/3/4 show “–” (no data) for earlier months by design.
- KPI 7 counts every vendor as “new” in 2025 because there is no pre-2025
  history in the data; numbers become meaningful from 2026 onward.
- Anomalies in the source files (PO dated before PR, negative day counts,
  implausible ETAs) are surfaced as warnings on upload, never silently dropped.
