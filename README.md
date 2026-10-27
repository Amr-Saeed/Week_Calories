# CalWeek — Weekly Calorie Tracker (PWA)

A mobile-first, offline-capable calorie tracker that focuses on **weekly** progress. Estimate your calorie needs (or enter your own target), log each day's total, and review a weekly report with charts. All data stays on your device (IndexedDB).

**Stack:** React 19 · TypeScript · Vite · React Router · Tailwind CSS · Dexie (IndexedDB) · Recharts · Zod · Lucide · vite-plugin-pwa · Vitest + React Testing Library

## Getting started

```bash
npm install
npm run dev        # development server (http://localhost:5173)
npm test           # run all unit + UI tests once
npm run test:watch # watch mode
npm run typecheck  # TypeScript only
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build (http://localhost:4173)
```

Requires Node 20+ (developed on Node 22).

### Installing as an app (PWA)

The service worker is only active in the **production build**, so test installability with `npm run build && npm run preview`.

- **Chrome / Edge (desktop or Android):** click the install icon in the address bar, or menu → *Install CalWeek*.
- **iOS Safari:** Share → *Add to Home Screen*.
- After the first visit the whole app works offline: logging, editing and reports read and write to IndexedDB, no network needed.
- **Updates:** a new version downloads in the background and a small prompt offers *Update*. Nothing reloads until you accept, so an update never interrupts an entry.

Deploying to a static host: serve `dist/` over HTTPS with an SPA fallback to `index.html` (every unknown path should return `index.html`). Icons are regenerated with `node scripts/make-icons.mjs`.

## How it works

### Calorie maths (`src/lib/calories.ts`)
- **BMR** — Mifflin–St Jeor: `10·kg + 6.25·cm − 5·age + 5` (male) or `− 161` (female).
- **Maintenance (TDEE)** — BMR × activity multiplier (1.2, 1.375, 1.55, 1.725, 1.9).
- **Goals** — 0, 0.25, 0.5 or 1 kg/week → daily deficit of `kg × 7,700 / 7` = 0 / 275 / 550 / 1,100 kcal.
- **Safety** — the target never drops below 1,500 kcal (male) / 1,200 kcal (female) in automatic mode; the app says when the floor was applied. The aggressive goal, large deficits, a BMI under 18.5 combined with a loss goal, and low manual targets all show a warning recommending professional guidance.
- **Manual mode** — your number is used exactly as entered (800–6,000 kcal) and never overwritten by the calculator.

All numbers are estimates and are labelled as such in the UI. This is not medical advice.

### Weekly report (`src/lib/summary.ts`)
```
weeklyBudget         = Σ daily targets (= target × 7 when the target is constant)
weeklyConsumed       = Σ calories of LOGGED days only
weeklyDifference     = weeklyConsumed − weeklyBudget
averageDailyIntake   = weeklyConsumed / loggedDays        (undefined when 0 days logged)
budgetUsagePercent   = weeklyConsumed / weeklyBudget × 100
estimatedWeightChange = (weeklyConsumed − weeklyMaintenance) / 7,700   (kg, negative = loss)
```
- **Unlogged days are never zero.** A week with missing days is marked *Incomplete*, shows "N of 7 days logged", and does **not** show a weekly weight-change estimate (only a clearly-labelled logged-days-only figure).
- Eating below the *target* and losing weight relative to *maintenance* are reported separately.
- Daily status: *Under* (< 95% of target), *On target* (95–105%), *Over* (> 105%), *Not logged yet*.

> **Note on the worked example in the brief:** 13,200 kcal consumed against a 17,500 kcal maintenance is **4,300** kcal below maintenance (≈ −0.56 kg), not 3,300 (≈ −0.43 kg). The app uses the arithmetic result, and the unit tests assert it.

### Weeks (`src/lib/week.ts`, `src/lib/dates.ts`)
- Dates are plain `YYYY-MM-DD` strings. Arithmetic uses UTC-midnight values, and "today" is the user's *local* calendar date, so DST, month ends, leap days, year boundaries and timezones cannot shift a day. The app also refreshes "today" at midnight and when it returns to the foreground.
- You choose the week-start day and the date tracking begins. If that date isn't the chosen weekday, tracking starts on the next matching day (the UI shows exactly which date).
- The schedule is a list of *anchors*. Changing the week-start day later adds a **future** anchor: the current and past weeks stay untouched, and a shorter transition week bridges the gap (its budget is scaled to its length). Changing the initial tracking date, or ticking "reorganize past weeks", rebuilds everything — but only after an explicit confirmation. Daily entries are never lost; they are keyed by date.

### Data model & history (`src/types`, `src/db`)
Dexie tables: `profile`, `settings`, `targetVersions`, `logs` (`&date` is a unique index, and the id is `log-<date>`, so duplicates are impossible).

- Every time you save your profile a **target version** is written, valid from today, together with the inputs used (weight, activity, goal…).
- Each daily log stores a **snapshot** of the target and maintenance that applied to it. Editing an old day keeps its snapshot; unlogged days use the version in force on that date. So changing your target, weight, activity or goal never rewrites earlier reports, and a target changed mid-week produces a budget made of each day's own target.
- Saving a profile also re-snapshots logs dated *today or later* (the new target's period), never earlier ones.

### Assumptions
- One local user per browser profile; no accounts or sync.
- The first target version is stored even if you onboard before the first tracking date.
- Unit preference (kg·cm or lb·ft/in) changes display and input only; data is stored in metric. Calories are always kcal.
- Workouts per week is collected and used only to suggest an activity level (it is never added on top of the activity multiplier, to avoid double counting).
- Logging is allowed for today and past days inside the tracking period; future dates and dates before the first week are blocked.
- Minimum age 15 (formula validity); ranges: height 100–250 cm, weight 30–300 kg, 0–20,000 kcal per day entry.

## Project structure
```
src/
  types/            shared TypeScript types
  lib/              pure, tested logic (no React, no DB)
    calories.ts       BMR, TDEE, goals, safety checks
    dates.ts          calendar-date maths & formatting
    week.ts           week schedule, navigation, week-start changes
    summary.ts        daily status & weekly report
    targets.ts        target versions / snapshots
    schemas.ts        Zod validation
    draft.ts          form state ↔ validated profile (units)
  db/               Dexie schema + repository (all writes go through repo.ts)
  hooks/            live IndexedDB queries, today's date, theme, selected week
  components/       UI building blocks, charts, layout, PWA update prompt
  pages/            Onboarding, Dashboard, Week, Day, Report, Settings
  test/             test setup
scripts/make-icons.mjs   generates PNG icons
```

## Tests
`npm test` runs ~85 tests: BMR/TDEE, every goal, weekly budget/totals/averages, missing days, weight-change estimate, week boundaries (month, year, leap day), custom week start and changing it, navigation, target snapshots and versioning, validation, duplicate prevention, and an end-to-end UI flow (onboarding → log → edit) against a fake IndexedDB.
# Week_Calories
