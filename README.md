# Lektionsplaneringsmodul (Lesson Plan Generator)

A standalone mockup module for **Frånvarokollen** that generates Swedish-curriculum-aligned lesson plans for substitute teachers (vikarier).

> **Status:** prototype / mockup. Built to validate the design and integration approach before wiring into the real backend.

## What it does

When a teacher is absent, the substitution coordinator can:

1. **Quick-generate** — click *Skapa lektion* on any absence row → modal opens with a generated plan + exit exercise tied to Skolverket's Lgr22 / Gy11 curriculum.
2. **Studio mode** — full control over subject, grade, duration, learning goal, materials, group size, tone, and add-ons (extra activities, differentiation, exit exercises).
3. **Save + share** — save the plan to the lesson, open it as a printable full page, or copy a signed link to send to the substitute.
4. **Substitute view** — the vikarie opens the link on their phone and sees a clean, mobile-optimized read-only version of the plan.

The whole thing runs in **Swedish or English**, picked per generation.

## Quick start (local preview)

This is a single static `index.html` — no build step.

```bash
# Option 1: just open it
open index.html

# Option 2: serve locally (better for clipboard + hashchange behavior)
npx serve .
# or
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

```bash
# 1. Create a new GitHub repo (e.g. franvarokollen-lesson-mockup)
# 2. Drop index.html into the repo root, commit, push.
# 3. In repo settings → Pages → Source: "Deploy from a branch" → main / root → Save.
# 4. Wait ~30 seconds. Site is at:
#    https://<your-username>.github.io/<repo-name>/
```

That's it. No backend, no API keys, no build pipeline. The mockup uses a stub generator that returns canned but realistic content.

## Routes (hash-based, work on GitHub Pages)

| URL | What it shows |
|-----|---------------|
| `#/` | Daily Cover list + Studio (coordinator app) |
| `#/plan/<lessonId>` | Full standalone plan page (printable, shareable) |
| `#/sub/<lessonId>` | Mobile-optimized substitute view |

The `Send to substitute` button copies a `#/sub/<lessonId>` link to clipboard. In production this becomes a signed token sent via SMS/email.

## File structure (this prototype)

```
index.html                 — Everything. Single file, no build.
README.md                  — This file.
```

## File structure (the real project this is based on)

```
curriculum/
  lgr22.json               — Lgr22 grundskola data (8 subjects × 3 grade spans)
  gy11.json                — Gy11 gymnasium courses (12 core courses)
  lookup.ts                — Curriculum lookup with aliases + grade rollup

generator/
  types.ts                 — Request/response type definitions
  prompt.ts                — Bilingual prompt builder (sv/en)
  generate.ts              — LLM orchestrator + pluggable backend interface
                              (Anthropic, stub, or custom proxy)
```

The mockup inlines a small subset of all of the above into `index.html` so it's deployable as a static page.

## Integrating into Frånvarokollen later

The module is designed to drop in with **one button + one modal**:

```jsx
// On each absence row in Daily Cover:
<CreateLessonButton lesson={lesson} />
```

Everything else (state, API call, modal, save) is owned by that component. No changes needed to existing schedule, absence, or substitute logic.

For the real LLM call, swap the stub for a real backend:

```ts
// In production, after Gareth's backend is ready:
const backend = createCustomBackend({
  endpoint: 'https://api.franvarokollen.se/lessons/generate'
});
// Or call Anthropic directly:
const backend = createAnthropicBackend({ apiKey: process.env.ANTHROPIC_API_KEY });
```

## Curriculum coverage (current)

**Grundskola (Lgr22):** Svenska, Matematik, Engelska, NO (Bi/Fy/Ke), SO (Ge/Hi/Re/Sh), Idrott och hälsa, Bild, Musik — across grade spans 1-3, 4-6, 7-9.

**Gymnasium (Gy11):** Svenska 1-2, Matematik 1a/1b/1c, Engelska 5-6, Historia 1a1, Naturkunskap 1a1, Samhällskunskap 1a1, Religionskunskap 1, Idrott och hälsa 1.

Each entry includes *centralt innehåll* and a summary of *betygskriterier*. Easy to extend by editing the JSON.

## Known limitations of this mockup

- **Stub generator** — content is canned (Bråk i vardagen for math, Vattnets kretslopp for NO). Real version uses Claude API.
- **No persistence** — saved plans live in-memory only; refresh wipes them. Real version saves to DB.
- **No auth** — substitute links are not signed. Real version uses time-limited tokens.
- **Curriculum data was authored from training data**, not scraped live from Skolverket. Verify against current sources before production.

## Questions for Gareth

1. Is the integration approach (single button + modal) compatible with how the Daily Cover screen is built?
2. Where does the lesson plan get persisted — alongside the absence record, or in its own table linked by lesson ID?
3. For the substitute view, do we already have a flow that sends links to vikarier, or does this need a new SMS/email pipeline?
4. Is calling the Anthropic API directly from our backend acceptable, or do we want to route through a separate AI service?

## Tech notes for review

- **Pure static.** React via UMD CDN, Babel Standalone in-browser. No bundler, no Node, no install. Works on any HTTP server.
- **Hash routing** so it works on GitHub Pages without server config.
- **CSS variables** for theming. Easy to recolor to match Frånvarokollen's exact palette.
- **No external dependencies at runtime** beyond React/ReactDOM/Babel from unpkg.
- **Print-friendly** — the modal/page hides chrome via `@media print`.
