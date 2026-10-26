# Scientifically — Build Plan

A Duolingo-style learning app for **science**, designed for **laptops**. This repo
is the **shell only**: lesson engine, question types, characters, game systems and
an AI content pipeline. **We do not hand-write course content.** An AI model
(called via an API key on the server) generates content as JSON that matches our
schema; the app validates and plays it.

Work through the milestones in order. Tick boxes as you finish them and commit
after each milestone. If something here is ambiguous, pick the simplest option
that fits the existing code and note it in the "Decisions log" at the bottom.

---

## 1. Fixed decisions (do not change)

| Area | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) — single app, no monorepo |
| Styling | Tailwind CSS |
| Animation | Framer Motion (`motion` package) |
| Client state | Zustand (lesson session state only) |
| Schema/validation | **Zod v4** — the single source of truth. Types via `z.infer`, JSON Schema via `z.toJSONSchema()` |
| DB | Prisma — SQLite locally (`file:./dev.db`), Postgres in production |
| Charts | Recharts (for `graph_read`; `graph_plot` uses a custom SVG grid) |
| Math eval | `mathjs` (restricted `evaluate`, never `eval`) |
| Sound | Synthesised with the Web Audio API (no audio files) |
| Tests | Vitest (unit) + Playwright (e2e; Chromium is pre-installed, do not run `playwright install`) |
| Lint/format | ESLint (Next config) + Prettier |
| AI | Provider adapter; Anthropic SDK is the default implementation |

Package manager: npm. Node 20+.

Required scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`
(`tsc --noEmit`), `test` (vitest run), `test:e2e`, `generate` (AI CLI, M10),
`db:push`, `db:seed`.

**Every milestone must end with `npm run lint && npm run typecheck && npm test`
passing.**

---

## 2. Repo layout

```
src/
  app/                      # Next.js routes
    (app)/                  # main shell: sidebar + right rail layout
      learn/page.tsx        # course path (home)
      practice/page.tsx
      leagues/page.tsx
      quests/page.tsx
      shop/page.tsx
      profile/page.tsx
    lesson/[lessonId]/page.tsx   # full-screen lesson player (no sidebar)
    admin/...               # content generation + review (M11)
    api/...                 # route handlers (server only)
  content/
    schema/                 # Zod schemas: course.ts, exercise-base.ts, index.ts
    registry.ts             # exercise type registry
    demo-pack.json          # handwritten demo pack, one of every type
  exercises/
    <type>/                 # one folder per question type (see §4)
      schema.ts  grade.ts  Component.tsx  autoCheck.ts?  example.ts  grade.test.ts
  engine/                   # lesson state machine, queue, scoring (pure TS, no React)
  game/                     # xp.ts, hearts.ts, streak.ts, gems.ts, leagues.ts,
                            # achievements.ts, quests.ts, srs.ts  (pure, tested)
  characters/               # cast.ts, Character.tsx, reactions.ts, svg parts
  sims/                     # simulation models for the `simulation` type
  sound/                    # sfx.ts (Web Audio)
  server/
    db.ts                   # Prisma client
    ai/                     # provider.ts, anthropic.ts, openai.ts, prompts.ts,
                            # generate.ts, validate.ts
    repo/                   # data access functions (progress, wallet, packs...)
  lib/
    clock.ts                # injectable "now" — ALL date logic goes through this
    rng.ts                  # seeded RNG for shuffling
    keyboard.ts             # shortcut hook
  components/ui/            # Button, Card, ProgressBar, Modal, Toast...
prisma/schema.prisma
scripts/generate.ts         # CLI for AI generation
tests/e2e/
```

Rules:
- `src/engine`, `src/game`, `src/content`, `exercises/*/grade.ts` are **pure TS**
  (no React, no DB, no `Date.now()` — take time from `clock`). Unit test them.
- Anything touching the API key lives in `src/server/**` and imports
  `"server-only"`. The key is never sent to the browser.

---

## 3. The content contract (most important part)

Defined in `src/content/schema/`. Everything is versioned: `schemaVersion: 1`.

```ts
// course.ts (sketch — implement with Zod)
ContentPack = {
  schemaVersion: 1,
  id: string,                 // slug
  title: string,
  subject: string,            // "biology", "chemistry", ...
  level: string,              // free text: "Middle school", "AP Physics 1", "Adult beginner"
  description: string,
  units: Unit[]
}
Unit = {
  id: string, title: string, description: string,
  color?: string,             // hex; else pick from palette
  lessons: Lesson[]           // 3–8
}
Lesson = {
  id: string, title: string,
  kind: "standard" | "checkpoint",   // checkpoint = end-of-unit review
  objectives: string[],
  exercises: Exercise[]       // 8–15
}

// exercise-base.ts
ExerciseBase = {
  id: string,                 // unique within pack
  type: ExerciseType,         // discriminator
  prompt: string,             // the instruction/question shown at top
  explanation: string,        // shown after answering (both right and wrong)
  hint?: string,
  skillTags: string[],        // e.g. ["cells.organelles"] — used by SRS
  difficulty: 1 | 2 | 3 | 4 | 5,
  characterId?: CharacterId   // character shown beside the prompt
}
Exercise = z.discriminatedUnion("type", [ ...each type's schema ])
```

Text fields support a tiny markup only: `**bold**`, `*italic*`, `_{sub}`, `^{sup}`
(so `H_{2}O`, `m/s^{2}`) and inline `$...$` is **not** supported. Write one
`<RichText>` component that renders this; use it everywhere content text appears.

IDs: all `id`s are slugs (`/^[a-z0-9-]+$/`). A pack-level refinement must check
all exercise/lesson/unit IDs are unique and every `characterId` exists.

### Registry

`src/content/registry.ts` maps `type` → module:

```ts
interface ExerciseModule<E, R> {
  type: E["type"];
  schema: ZodType<E>;            // exercise JSON
  responseSchema: ZodType<R>;    // what the UI produces when the user hits Check
  grade(ex: E, res: R): GradeResult;
  autoCheck?(ex: E): string[];   // returns problems found (empty = OK). Used on AI output.
  Component: React.FC<ExerciseProps<E, R>>;
  example: E;                    // valid example; also used in AI prompts
  promptNotes: string;           // 1–3 sentences telling the AI how to write this type well
}
type GradeResult = { correct: boolean; feedback?: string; correctAnswerText: string };
interface ExerciseProps<E, R> {
  exercise: E;
  status: "answering" | "correct" | "incorrect";   // lock input when not answering
  onChange(response: R | null): void;              // null = not ready, disables Check
  seed: number;                                    // for deterministic shuffles
}
```

The registry is split so server code can import schemas/graders without React:
`registry.ts` (schema, grade, autoCheck, example, promptNotes) and
`registry.client.ts` (adds `Component`).

---

## 4. Question types

Each type = a folder in `src/exercises/`. Build `multiple_choice` first (M2) as the
reference; every other type copies its structure. All option lists are shuffled
with `rng(seed)` at render, never in the data.

| type | key fields (beyond base) | response | grading |
|---|---|---|---|
| `info_card` | `title`, `body` | `{}` | always correct; not counted for XP/hearts; button says "Continue" |
| `multiple_choice` | `options: string[2–5]`, `answerIndex` | `{index}` | exact |
| `multi_select` | `options: string[3–6]`, `answerIndices: number[]` | `{indices}` | exact set |
| `true_false` | `statement`, `answer: boolean` | `{value}` | exact |
| `fill_blank` | `text` with `___` per blank, `blanks: {accepted: string[], caseSensitive?: boolean}[]` | `{values: string[]}` | each value trimmed, whitespace-collapsed, case-insensitive unless flagged, in `accepted` |
| `word_bank` | `text` with `___` per blank, `answers: string[]`, `distractors: string[]` | `{tiles: string[]}` | tiles in order equal answers |
| `match_pairs` | `pairs: {left, right}[3–6]` | `{mistakes: number}` | UI handles matching live (wrong pair shakes); correct when all matched. Record `mistakes` for SRS |
| `ordering` | `items: string[3–7]` (correct order) | `{order: number[]}` | exact |
| `categorize` | `categories: {id,label}[2–4]`, `items: {text, categoryId}[4–10]` | `{assignments: Record<itemIndex, categoryId>}` | all correct |
| `spot_error` | `segments: string[3–8]`, `errorIndex`, `correction` | `{index}` | exact; show `correction` in feedback |
| `numeric` | `answer: number`, `tolerance: {abs?: number, rel?: number}`, `units?: string[]` (accepted unit strings; first is canonical), `computation?: {expr: string, vars: Record<string, number>}` | `{value: number, unit?: string}` | within tolerance and unit accepted (normalise case/spaces). **autoCheck:** if `computation` present, evaluate with mathjs and confirm it matches `answer` within tolerance |
| `equation_balance` | `reactants: string[]`, `products: string[]` (formulas like `Fe2(SO4)3`), `answer: number[]` (coefficients, reactants then products) | `{coefficients: number[]}` | **grade by atom counting**, not by comparing to `answer`: balanced + gcd 1 → correct; balanced but not simplest → incorrect, feedback "simplify". **autoCheck:** `answer` balances. Write `src/exercises/equation_balance/formula.ts` (parse elements, digits, parentheses; no hydrates/charges) with thorough tests |
| `graph_read` | `chart: {kind: "line"\|"bar"\|"scatter", xLabel, yLabel, series: {name, points: [x,y][]}[]}`, `question: {mode:"choice", options, answerIndex} \| {mode:"numeric", answer, tolerance, units?}` | choice or numeric response | reuse MC / numeric graders |
| `graph_plot` | `axes: {xLabel, yLabel, xMin, xMax, yMin, yMax, step}`, `points: [x,y][]` (expected), `tolerance: number` (in axis units) | `{points: [x,y][]}` | every expected point has a placed point within tolerance, and count equal. UI: click to place (snaps to `step`), click again to remove |
| `simulation` | `modelId`, `fixed: Record<param, number>`, `adjustable: string[]` (param names), `goal: {output: string, target: number, tolerance: number}` | `{params: Record<string, number>}` | run the model with params, output within tolerance of target. **autoCheck:** modelId exists, params exist, target reachable within slider ranges (grid search) |
| `dialogue` | `lines: {characterId, text}[1–6]`, then `question: {options, answerIndex}` | `{index}` | as MC. UI: lines appear one by one as chat bubbles beside the character, then options |

**Simulation models** (`src/sims/`): each model = `{ id, title, params: {name, label, unit, min, max, step, default}[], outputs: {name, label, unit}[], run(params): Record<output, number>, Visual: React.FC<{params, outputs}> }`.
Ship: `projectile`, `ohms_law`, `ideal_gas`, `pendulum`, `hookes_law`, `wave_speed`. Visuals are simple SVG
(a ball arc, a circuit with a glowing bulb, a piston, a swinging bob, a spring, a moving wave).
The AI is given the model list (ids, params, outputs, ranges) in its prompt.

**Deferred (do NOT build):** diagram labelling / hotspots (owner will add later as new
types through the registry), AI-marked free text. Leave a comment in `registry.ts`
noting `free_text` is reserved.

---

## 5. Lesson engine (`src/engine/`)

Pure state machine + a Zustand store that wraps it.

```
State: { queue: ExerciseRef[], index, status: "answering"|"correct"|"incorrect"|"complete"|"failed",
         response, hearts, correctCount, mistakes: exerciseId[], startedAt, streakInLesson }
Actions: setResponse, check, continue, skip ("Can't answer now" — counts as wrong), quit
```

Rules:
- `check` → grade. Wrong: lose 1 heart (unless unlimited hearts), push the exercise
  to the **end of the queue** to retry later (max once per exercise).
- Lesson **completes** when the queue is exhausted. **Fails** when hearts hit 0
  (offer: refill with gems, or quit; progress in this attempt is lost).
- Practice/review lessons do not cost hearts and can earn a heart back.
- `info_card` never costs hearts or counts toward accuracy.
- Track an in-lesson combo ("5 in a row!") for character reactions.
- Result: `{xp, accuracy, durationMs, mistakes, perfect}` → passed to the results screen
  and saved via a server action.

**Lesson screen** (full-screen, centred column ~720px):
top bar (✕ quit, progress bar, hearts) → prompt + character → exercise component →
bottom bar (Skip / Check). After check the bottom bar turns green or red, shows
`explanation` + `correctAnswerText`, and the button becomes Continue.

**Keyboard (laptop-first, required):** `1–9` pick option/tile, `Enter` = Check/Continue,
`Esc` = quit dialog, `Backspace` removes last word-bank tile, arrow keys + space for
ordering, `H` = hint. Show small key hints on options. Implement once in `lib/keyboard.ts`;
each exercise registers its own handlers.

---

## 6. Game systems (`src/game/`) — default numbers

Put every number in `src/game/config.ts` so they can be tuned.

- **XP:** lesson complete 10, +5 if perfect, checkpoint 20, practice 5. Combo bonus +1 per 5-streak.
- **Hearts:** max 5. −1 per wrong answer. Regenerate 1 per 4 hours. Full refill costs 350 gems.
  Practice lesson completion restores 1 heart.
- **Streak:** a day counts if ≥1 lesson completed (user's local date, via `clock`).
  Missing a day resets to 0 unless a **streak freeze** is equipped (max 2, cost 200 gems),
  which is consumed automatically. Track `longestStreak`.
- **Daily goal:** user picks 10/20/30/50 XP. Hitting it shows a celebration and grants a chest (5–20 gems, seeded).
- **Gems:** +5 per completed lesson, chests, quests, achievements.
- **Shop:** streak freeze, heart refill, "double XP 15 min" boost, cosmetic character outfits (hats/colours).
- **Daily quests:** 3 per day picked from a pool (earn X XP, get N perfect lessons, answer N in a row,
  complete a checkpoint, practise weak skills). Reward gems.
- **Achievements:** tiered (I/II/III): streak length, total XP, perfect lessons, lessons completed,
  league wins, units completed. Defined as data in `achievements.ts`.
- **Leagues:** weekly (Mon 00:00 UTC). Tiers: Quark, Electron, Atom, Molecule, Cell, Organism,
  Planet, Star, Nebula, Galaxy. Groups of 30; top 7 promote, bottom 5 demote. Until there are
  enough real users, fill each group with **seeded bot players** whose XP grows
  deterministically through the week (`leagues.ts`, seeded by week + group).
- **Spaced repetition (`srs.ts`):** per `skillTag` strength 0–1 with an SM-2-lite interval.
  Correct raises strength, wrong drops it; strength decays with time. The Practice page builds a
  10-exercise lesson from the weakest/due skills, pulling exercises from completed lessons, plus a
  "Mistakes review" built from recent wrong answers.

All of these are pure functions with tests (streaks across day boundaries/timezones,
freeze consumption, heart regeneration, league promotion, SRS ordering).

---

## 7. Characters (`src/characters/`)

A cast drawn in code as SVG React components (simple rounded shapes, bold colours, big eyes —
friendly and readable at 120px). The AI only references them by ID and writes their lines.

| id | name | role / vibe |
|---|---|---|
| `lumi` | Lumi | main mascot: an axolotl in a lab coat; encouraging, a bit cheeky (the "Duo") |
| `nova` | Nova | astrophysicist; dreamy, loves big numbers |
| `pip` | Pip | a single cell; biology; excitable |
| `bond` | Bond | a little molecule; chemistry; dry wit |
| `volt` | Volt | a spark; electricity & energy; fast-talking |
| `terra` | Terra | a rock with a hat; earth science; calm, patient |

`cast.ts` holds `{id, name, field, personality, colors}` — `personality` is also fed to the AI prompt.

`<Character id expression size animate />` with expressions:
`neutral, happy, celebrate, sad, thinking, surprised, sleepy`. Expressions change eyes/mouth/arms;
use Framer Motion for idle bob, blink, jump on celebrate, droop on sad.

`reactions.ts` maps engine events → expression + optional short line:
correct, incorrect, combo(5/10), lesson complete, perfect, failed, streak extended,
streak lost, daily goal hit, level up, league promoted. Keep a small built-in pool of lines per
character per event (UI copy, not course content).

Cosmetics from the shop render as an overlay layer (hat/glasses/colour swap) on any character.

---

## 8. App shell & screens (laptop layout)

- **Layout:** left sidebar (logo, Learn, Practice, Leagues, Quests, Shop, Profile), centre content,
  right rail (streak 🔥, gems, hearts, league card, daily goal ring, quests preview). Design for
  1280–1920px wide; must still work at 1024px (right rail collapses below 1200px).
- **Learn:** vertical winding path of lesson nodes grouped by unit banners (unit colour).
  Node states: locked, available (pulsing), completed, checkpoint (trophy). Click → popover →
  Start → `/lesson/[id]`. Character peeks beside the path.
- **Results screen:** XP gained, accuracy, time, character celebration, confetti, streak update
  animation, daily-goal progress, then quests progress.
- **Profile:** stats, streak calendar, achievements grid, character outfit picker, settings
  (daily goal, sound on/off, reduce motion).
- **Pack picker:** if several published packs exist, the user chooses a course (like choosing a language).
- **Sound (`sound/sfx.ts`):** correct ding, wrong buzz, combo, lesson complete fanfare, tap — all
  synthesised. Respect the sound setting.
- Respect `prefers-reduced-motion`. Visible focus rings. Dark mode via Tailwind `dark:`.

Visual style: bright, rounded, chunky 3D-ish buttons (bottom border shadow), generous spacing,
one display font + one body font from Google Fonts via `next/font`.

---

## 9. Data model (`prisma/schema.prisma`)

- `User` — id, name, email?, passwordHash?, dailyGoalXp, timezone, settings JSON, createdAt
- `Wallet` — userId, gems, hearts, heartsUpdatedAt, streakFreezes, boosts JSON
- `Streak` — userId, current, longest, lastActiveDate (YYYY-MM-DD local)
- `LessonProgress` — userId, packId, lessonId, completedAt, bestAccuracy, timesCompleted
- `Attempt` — userId, packId, exerciseId, skillTags, correct, at
- `SkillStrength` — userId, packId, skillTag, strength, intervalDays, dueAt
- `XpEvent` — userId, amount, source, at (powers daily goal, leagues, stats)
- `AchievementUnlock`, `QuestProgress`, `LeagueMembership` (userId, weekId, tier, groupId)
- `ContentPack` — id, title, status (`draft`|`published`|`archived`), json, createdAt, generatedBy JSON
- `GenerationJob` — id, params JSON, status, log JSON[], inputTokens, outputTokens, error, createdAt

`db:seed` loads `src/content/demo-pack.json` as a published pack and creates a demo user.
Until M12, the app runs as that single demo user (`getCurrentUser()` returns it) — keep all
data access behind `server/repo/*` so swapping in real auth later is one change.

---

## 10. AI content pipeline (`src/server/ai/`)

**Before writing this code, invoke the `claude-api` skill** for current SDK usage and model IDs.

- `provider.ts`: interface
  `generateJSON({ system, prompt, jsonSchema, maxTokens }): Promise<{ data: unknown; usage }>`.
  `anthropic.ts` implements it with the official SDK using structured output / tool use so the
  reply is JSON matching `jsonSchema`. `openai.ts` optional, same interface.
  Selected by env: `AI_PROVIDER` (default `anthropic`), `AI_MODEL`, `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY`. Fail with a clear message if the key is missing. Document in `.env.example`.
- `prompts.ts`: builds prompts from code, never hand-maintained copies:
  - contract description + JSON Schema from `z.toJSONSchema()`
  - each requested type's `example` and `promptNotes`
  - character cast (ids, names, personalities)
  - simulation model list
  - generation params: subject, topic, level, tone, exercise type mix
  - quality rules: scientifically accurate, one unambiguous correct answer, plausible
    distractors, explanation teaches *why*, use SI units, vary types, ramp difficulty
- `generate.ts`, two stages:
  1. **Outline**: params → units → lessons (titles, objectives, skillTags). Saved to the job.
  2. **Lessons**: one call per lesson (concurrency limit 3), given the outline for context.
  Each lesson result: Zod-validate → run every `autoCheck` → on failure, retry up to 2 times
  sending the exact validation errors back to the model → if still failing, keep the lesson but
  mark it `needsReview` with the errors. Assemble pack → validate whole pack → save as `draft`.
  Log every step and token usage on the `GenerationJob`. Support a `maxCostTokens` budget that aborts.
- `scripts/generate.ts` CLI:
  `npm run generate -- --subject chemistry --topic "stoichiometry" --level "High school" --units 3 --lessons 5 --out content/packs/chem.json`
  Also `--validate <file>` to validate a pack JSON without calling the model.
- Import/export: packs can be exported to and imported from JSON files.

**Testing:** a `mock` provider that returns fixtures (valid and deliberately broken JSON) so the
whole pipeline including retries is unit tested without a key. Never call the real API in tests.

---

## 11. Admin (`/admin`)

Protected by `ADMIN_PASSWORD` env (simple cookie session; good enough for now).
- **Generate:** form for the params above → starts a job → live log (poll job status).
- **Packs:** list with status. Pack review page: browse units/lessons, see each exercise
  rendered with the real component *and* its raw JSON, `needsReview` items highlighted with errors.
  Actions: edit JSON inline (re-validated on save), regenerate one lesson, delete exercise,
  publish / archive, export JSON.
- **Preview:** play any lesson in the real player without affecting progress.

---

## 12. Milestones

Effort tag: **[low]** fine at low effort · **[med]** take care · **[high]** do carefully /
consider a higher-effort pass or review.

### M0 — Scaffold [low]
- [ ] `create-next-app` (TS, Tailwind, App Router, ESLint, `src/`), add Prettier, Vitest, Playwright, Zod, Zustand, motion, Prisma, mathjs, Recharts
- [ ] All scripts from §1; `.env.example`; `.gitignore` (dev.db, .env)
- [ ] GitHub Actions CI: install, lint, typecheck, test, build
- [ ] Empty route skeleton from §2 with the sidebar/right-rail layout rendering placeholders
- **Done when:** `npm run dev` shows the shell; CI config present; all checks pass.

### M1 — Content schema & registry [high]
- [ ] `exercise-base.ts`, `course.ts`, pack-level refinements (unique ids, valid characterIds)
- [ ] `registry.ts` / `registry.client.ts` with the interface in §3
- [ ] `RichText` component + tests for the markup
- [ ] `lib/rng.ts` (seeded, e.g. mulberry32) and `lib/clock.ts`
- **Done when:** a pack with only `info_card` + `multiple_choice` validates; invalid packs give readable errors; `z.toJSONSchema` output snapshot test exists.

### M2 — Lesson engine + reference types [high]
- [ ] Engine state machine (§5) with tests: retry queue, hearts, fail, complete, combo, info_card rules
- [ ] Zustand store + lesson screen + bottom feedback bar + results screen (basic)
- [ ] Keyboard system
- [ ] Types: `info_card`, `multiple_choice`, `true_false` — complete with tests. **`multiple_choice` is the reference implementation every other type copies.**
- [ ] Lesson loads from `demo-pack.json` directly (no DB yet)
- **Done when:** you can play a demo lesson end-to-end with mouse and keyboard only.

### M3 — Core question types [low]
- [ ] `multi_select`, `fill_blank`, `word_bank`, `match_pairs`, `ordering`, `categorize`, `spot_error`
- [ ] Each: schema, grade + tests, component, example, promptNotes, keyboard support, added to demo pack
- **Done when:** demo pack has a lesson using each, all playable.

### M4 — Science question types [med]
- [ ] `numeric` (+ mathjs autoCheck), `equation_balance` (+ formula parser, heavy tests), `graph_read`, `graph_plot`, `dialogue`
- [ ] `simulation` + the 6 sim models with simple visuals; autoCheck reachability
- **Done when:** all in demo pack and playable; formula parser handles `Ca(OH)2`, `Fe2(SO4)3`, `C6H12O6`.

### M5 — Persistence [low]
- [ ] Prisma schema (§9), `db:push`, `db:seed`, `server/repo/*`, `getCurrentUser()`
- [ ] Lesson loads pack from DB; completion saved via server action (progress, attempts, XP event)
- **Done when:** progress survives reload; seed works on a fresh clone.

### M6 — Learn path & home [med]
- [ ] Winding path with unit banners, node states, unlock order, popover, checkpoint nodes
- [ ] Pack picker
- **Done when:** completing a lesson unlocks the next node and the path animates it.

### M7 — Core game systems [med]
- [ ] `config.ts`, xp, hearts (regen), streak (+freeze), daily goal + chest, gems — pure + tested
- [ ] Wire into lesson completion and the right rail; heart-refill/fail flow; Shop page
- **Done when:** tests cover day boundaries; buying a freeze in the shop protects a missed day (test with clock).

### M8 — Characters, sound & feel [high]
- [ ] Six characters with all expressions + idle animations; `reactions.ts`; cosmetics overlay
- [ ] Characters in lesson screen, results, path, empty states
- [ ] sfx; confetti; streak flame animation; satisfying button press states; reduced-motion
- **Done when:** a full lesson feels lively; owner sign-off on look & feel (this milestone benefits most from human review).

### M9 — Engagement systems [med]
- [ ] Achievements + profile grid; daily quests + Quests page
- [ ] Leagues with seeded bots, weekly rollover, promotion/demotion, Leagues page
- [ ] SRS + Practice page (weak skills, mistakes review)
- **Done when:** pure logic tested; pages render real data.

### M10 — AI pipeline [high]
- [ ] Provider interface, anthropic adapter, mock provider, prompts, two-stage generate, validation + autoCheck + retry loop, budget, job logging
- [ ] CLI with `--validate`
- **Done when:** pipeline tests pass with the mock; with a real key, the CLI produces a pack that validates and plays (owner runs this).

### M11 — Admin [med]
- [ ] Auth gate, generate form + live log, pack list, review page, inline JSON edit, regenerate lesson, publish/archive, export/import, preview player
- **Done when:** owner can generate → review → publish → play, without touching the terminal.

### M12 — Accounts & deploy [med]
- [ ] Auth.js (credentials: email + password, hashed with bcrypt) replacing the demo user; demo user still available in dev
- [ ] Postgres config for production; deploy notes (Vercel + managed Postgres) in README
- **Done when:** two accounts have independent progress and share a league.

### M13 — Hardening [low]
- [ ] Playwright e2e: play a lesson by keyboard; fail a lesson; streak/goal flow; admin publish (mock provider)
- [ ] Accessibility pass (labels, focus, contrast), loading/error states, empty states
- [ ] README: setup, env vars, how to generate content, **how to add a new question type** (checklist mirroring the registry)
- **Done when:** CI green including e2e.

---

## 13. Conventions

- Small commits, one milestone (or part) at a time; message format `M3: add ordering exercise`.
- No `any`. Types come from Zod (`z.infer`), not hand-duplicated.
- Components: function components, named exports, Tailwind classes, no CSS modules.
- Never put course content in code except `demo-pack.json` (which is test/demo data).
- Never import `src/server/**` from client components.
- When adding a question type, update: its folder, both registries, demo pack, README checklist.
- Don't add libraries beyond §1 without noting why in the Decisions log.

## 14. Decisions log

_(Append dated one-line entries for any choice not covered above.)_
