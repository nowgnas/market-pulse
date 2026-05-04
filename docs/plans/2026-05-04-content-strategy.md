# Content Strategy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reposition Market Pulse around one daily high-value market explanation plus evergreen guide content signals.

**Architecture:** Keep the existing Next.js App Router and Supabase posts table. Update generation rules, schedule behavior, labels, homepage positioning, and trust copy without changing the database schema.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase, TypeScript, Vercel Cron.

---

### Task 1: Update The Content Strategy Documentation

**Files:**
- Create: `docs/content-strategy.md`
- Modify: `docs/adsense-review-checklist.md`

**Steps:**
1. Write the new strategy: one daily insight, evergreen guides, trust standards, and minimum article requirements.
2. Update the AdSense checklist so the review gate focuses on source-backed insight, not just post count.
3. Verify the docs are concise and actionable.

### Task 2: Change Publishing Cadence

**Files:**
- Modify: `src/lib/services/post-generator.ts`

**Steps:**
1. Change weekday generation so all weekday cron slots use one `morning` daily insight slot.
2. Keep the duplicate-slot guard so later cron runs skip once the daily post exists.
3. Keep weekend `weekly_review` and `week_ahead` behavior.
4. Confirm TypeScript compiles.

### Task 3: Rewrite Generation Prompts Around Insight

**Files:**
- Modify: `src/lib/services/openai.ts`

**Steps:**
1. Update the weekday post type label/focus from briefings to daily insight.
2. Rewrite the weekday prompt to require: core driver, evidence, implication, counter-scenario, reader checklist, source notes.
3. Add rules against unsupported exact numbers and exaggerated market claims.
4. Keep fallback blocking behavior intact.

### Task 4: Update Public Positioning

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/about/page.tsx`

**Steps:**
1. Update homepage copy from frequent briefings to fewer, deeper market explanations.
2. Update value sections and reading guide around insight and market guides.
3. Update metadata/footer language.
4. Add stronger trust and contact language to the about page.

### Task 5: Verify

**Files:**
- No new files.

**Steps:**
1. Run `npm run lint`.
2. Run `npm run build`.
3. Review `git diff` for accidental unrelated changes.
