# Marks & Mind

A voice-first personal OS for filtering signal from noise. One audio journal in, multiple organized views out: **Marks** (goals & milestones), **Mind** (knowledge & skills), **Schedule** (time-blocked execution), and **Journal** (raw history). Gamified with XP, streaks, and an efficiency rating.

---

## Part 1 — Project Proposal

### Purpose

Tyler talks. The system listens, transcribes, and sorts. The output is clarity — what he's working toward, what he knows, what he's been thinking about, and what he should actually be doing right now — without the friction of typing or manual tagging.

The goal is signal over noise: a personal knowledge base, execution tracker, and time-blocked schedule, all driven by speech, surfaced as a clean visual interface on mobile.

### Core Principle

**One input, multiple lenses.** The audio journal is the only entry point. Everything else is a view on top of that data.

### The Views

#### 1. Journal (raw)

Chronological feed of all entries. Each entry: timestamp, transcript, audio playback (optional), AI-generated summary, auto-tags, and quick links to any marks/nodes/schedule blocks it spawned.

#### 2. Marks (execution)

Hierarchical goal tracker:

- **Year marks** — longer-term ambitions
- **Month marks** — what's getting done this month
- **Week marks** — current focus
- **Day marks** — today's specific intentions

Each mark: title, status (open / hit / dropped), target date, related journal entries, related schedule blocks, notes. Hitting a mark is a tappable action with a satisfying "done" state and an XP payout.

#### 3. Mind (knowledge)

The networked knowledge base:

- **Skills** — things Tyler can do (e.g. "WordPress plugin development", "WooCommerce REST API", "iOS PWA quirks")
- **Knowledge** — things Tyler knows (e.g. "Toyota Land Cruiser 100 Series part numbers", "Cloudways Varnish purge workflow")
- **Tools** — software/hardware/services Tyler uses

Each node: title, description, related entries, related skills (graph edges), last-touched date. Browseable as a list, searchable, and optionally as a graph view (later phase). Tyler can ask the interface "what are my skills around X?" and it pulls all linked nodes and recent entries.

#### 4. Schedule (time blocks)

Block-out calendar. After journaling, the system asks: "Want to schedule this?" Tyler can accept or skip. Accepted items get auto-placed into time blocks with:

- Suggested time-of-day (this weekend / during work / tonight / etc.)
- Estimated duration
- Linked mark and/or knowledge node
- Status (scheduled / in progress / done / skipped)

The schedule is visible as a day/week grid. Ticking a block off completes it and triggers the XP payout.

#### 5. Stats (gamification)

- **XP** — earned per completed schedule block, scaled by duration
- **Level** — XP thresholds unlock levels for visual progression
- **Streak** — consecutive days with at least one completed block
- **Efficiency Rating** — see algorithm below

### How Entries Get Sorted

When Tyler finishes recording an entry, the backend:

1. Transcribes the audio (Whisper API, or browser Web Speech API as fallback)
2. Sends transcript to Claude with a structured extraction prompt
3. Claude returns JSON with:
   - `summary` — 1–2 sentence recap
   - `tags` — auto-generated
   - `proposed_marks` — new marks or updates to existing ones
   - `proposed_nodes` — new skills/knowledge/tools or updates
   - `proposed_schedule_blocks` — actionable items with suggested duration and time-of-day
4. Frontend shows Tyler a "Review" pane — he accepts, edits, or rejects each suggestion
5. Accepted items merge into the data model; rejected ones are discarded

**AI proposes; Tyler disposes.** He stays in control.

### Efficiency Rating Algorithm

A rolling score (0–100) showing how well Tyler converts intent into action.

Inputs (last 30 days):

- `talked_count` — schedule blocks proposed from journal entries
- `scheduled_count` — proposed blocks Tyler actually added to his schedule
- `completed_count` — scheduled blocks Tyler ticked off
- `estimated_minutes` — total minutes scheduled
- `actual_minutes` — total minutes of completed blocks
- `on_time_count` — blocks completed on or before their target day

Formula:

```
intent_conversion = scheduled_count / talked_count        // did you commit?
execution_rate    = completed_count / scheduled_count     // did you finish?
time_accuracy     = 1 - |actual - estimated| / estimated  // realistic estimates? (capped 0–1)
punctuality       = on_time_count / completed_count       // on time?

efficiency_rating = round(100 * (
    0.20 * intent_conversion +
    0.45 * execution_rate +
    0.15 * time_accuracy +
    0.20 * punctuality
))
```

Weights favour actually finishing things. Tunable later.

### XP & Levels

- XP per block = `ceil(duration_minutes / 15) * 10`
  - 30-min task = 20 XP
  - 1-hour task = 40 XP
  - 3-hour task = 120 XP
- Bonus XP:
  - +25 XP for hitting a Day mark
  - +100 XP for hitting a Week mark
  - +500 XP for hitting a Month mark
  - +50 XP streak bonus per 7-day streak milestone
- Levels: classic RPG curve — `xp_for_next_level = 500 * level^1.5`

### Tech Stack

- **Frontend:** React PWA (matches existing stack — Mobile Hub, Trade Centre)
- **Storage:** Local-first via IndexedDB; optional sync layer later (WordPress REST endpoint, Supabase, or Git-backed JSON)
- **Voice capture:** Browser MediaRecorder API
- **Transcription:** OpenAI Whisper API (primary); Web Speech API (fallback / instant)
- **AI sorting:** Anthropic Claude API; structured JSON output
- **Hosting:** GitHub Pages or Vercel; "Add to Home Screen" for native-feel PWA
- **Repo:** GitHub, auto-deployed on push
- **Build:** Vite + React + TypeScript + Tailwind (matches WFD pattern)

### Data Model

```json
{
  "entries": [
    {
      "id": "uuid",
      "timestamp": "ISO 8601",
      "audio_blob_id": "optional",
      "transcript": "raw text",
      "summary": "AI-generated 1–2 sentence summary",
      "tags": ["business", "wfd-crm", "ideas"],
      "linked_mark_ids": ["uuid"],
      "linked_node_ids": ["uuid"],
      "linked_block_ids": ["uuid"]
    }
  ],
  "marks": [
    {
      "id": "uuid",
      "title": "Ship WFD Mobile Hub Phase 1",
      "scope": "year | month | week | day",
      "target_date": "ISO 8601",
      "status": "open | hit | dropped",
      "created_at": "ISO 8601",
      "hit_at": null,
      "parent_mark_id": "uuid | null",
      "notes": "string"
    }
  ],
  "nodes": [
    {
      "id": "uuid",
      "type": "skill | knowledge | tool",
      "title": "WordPress plugin development",
      "description": "string",
      "related_node_ids": ["uuid"],
      "related_entry_ids": ["uuid"],
      "created_at": "ISO 8601",
      "last_touched_at": "ISO 8601"
    }
  ],
  "schedule_blocks": [
    {
      "id": "uuid",
      "title": "Build CRM Phase 1 order edit screen",
      "estimated_minutes": 90,
      "actual_minutes": null,
      "suggested_window": "this_weekend | tonight | tomorrow_morning | during_work | flexible",
      "scheduled_for": "ISO 8601",
      "status": "scheduled | in_progress | done | skipped",
      "linked_mark_id": "uuid | null",
      "linked_node_ids": ["uuid"],
      "linked_entry_id": "uuid",
      "completed_at": null,
      "xp_awarded": 0
    }
  ],
  "stats": {
    "total_xp": 0,
    "level": 1,
    "current_streak_days": 0,
    "longest_streak_days": 0,
    "last_active_date": "ISO 8601",
    "efficiency_history": [
      { "date": "ISO 8601", "rating": 73 }
    ]
  }
}
```

### Build Phases

#### Phase 1 — Foundation

- Repo scaffolding, PWA setup, IndexedDB layer
- Voice capture + transcription
- Raw journal view (entries list, audio playback)

#### Phase 2 — Marks

- Mark CRUD (year/month/week/day hierarchy)
- "Hit mark" action with XP payout
- Claude extraction prompt for marks
- Review pane

#### Phase 3 — Mind

- Node CRUD (skills/knowledge/tools)
- Node–entry linking
- Claude extraction prompt for knowledge
- Search and "what do I know about X" interface

#### Phase 4 — Schedule + Gamification

- Schedule block CRUD
- "Schedule this?" prompt after journaling
- Day/week grid view
- XP, levels, streaks
- Efficiency rating dashboard

#### Phase 5 — Polish

- Graph view for Mind
- Sync layer (cloud backup)
- Export / Git-backed JSON snapshot
- Push notifications for scheduled blocks

---

## Part 2 — Master Prompt (paste into Claude Code)

Use the block below as the kickoff prompt for the project. Paste it into Claude Code in a fresh repo, attach this proposal as context, and let Claude scaffold Phase 1.

```
You are helping me build "Marks & Mind" — a voice-first personal OS PWA. The full
project proposal is attached as marks-and-mind-proposal.md; read it in full before
writing any code.

CONTEXT ABOUT ME
- Name: Tyler. Based in Western Australia.
- I run Waterfilter.direct (Australian water filtration, WooCommerce/WordPress)
  and Informally Creative (web design).
- I already build PWAs in this stack: React + TypeScript + Vite + Tailwind,
  deployed via GitHub. I've shipped WFD Mobile Hub and WFD Trade Centre using
  this exact pattern.
- iOS PWA quirks I've already solved: safe-area/notch handling must be JS-only,
  gated on `navigator.standalone === true`. Never use CSS env() for safe area
  in this codebase.
- Communication style: direct, concise, task-focused. Skip preamble. Ship code.

WHAT I WANT
A locally-installable PWA where I talk into a mic, my voice gets transcribed,
and Claude sorts the transcript into organized views:
  1. Journal  — raw chronological entries
  2. Marks    — goals hierarchy (year/month/week/day) with "hit mark" actions
  3. Mind     — networked skills/knowledge/tools
  4. Schedule — time-blocked tasks with XP gamification
  5. Stats    — XP, level, streak, efficiency rating

The system proposes structure; I accept/edit/reject in a review pane after
each entry. AI proposes, I dispose.

TECH STACK (non-negotiable)
- React 18 + TypeScript + Vite
- Tailwind CSS
- IndexedDB for storage (use the `idb` package)
- MediaRecorder API for audio capture
- OpenAI Whisper API for transcription (env var: VITE_OPENAI_API_KEY)
- Anthropic Claude API for extraction (env var: VITE_ANTHROPIC_API_KEY,
  structured JSON output)
- PWA manifest + service worker, "Add to Home Screen" ready
- GitHub Pages or Vercel deploy

DATA MODEL
Use the JSON schema defined in marks-and-mind-proposal.md exactly. Store all
data in IndexedDB with one object store per top-level key (entries, marks,
nodes, schedule_blocks, stats).

GAMIFICATION RULES
- XP per block = ceil(duration_minutes / 15) * 10
- Mark hit bonuses: +25 (day), +100 (week), +500 (month)
- Streak bonus: +50 per 7-day milestone
- Level curve: xp_for_next_level = 500 * level^1.5
- Efficiency rating: see proposal "Efficiency Rating Algorithm"

BUILD PLAN
Work through phases 1 → 5 from the proposal. For Phase 1, scaffold:
  - Vite + React + TS + Tailwind + PWA plugin
  - IndexedDB wrapper with typed accessors for all object stores
  - Voice capture component (record / stop / playback / save blob)
  - Whisper transcription service
  - Raw Journal view (list of entries, newest first, with audio playback)
  - Bottom tab nav placeholder for Journal / Marks / Mind / Schedule / Stats
  - Dark mode by default (matches my preference across WFD projects)

CODING STYLE
- Functional React components, hooks, no class components
- Strict TypeScript (no `any` unless justified inline)
- Tailwind utility classes; minimal custom CSS
- Small, focused files. Each view in its own folder under src/views/
- Services (transcription, claude-extraction, db) in src/services/
- Don't ask permission to scaffold — just build Phase 1 and show me the diff

When Phase 1 is working end-to-end (record → transcribe → save → display in
Journal), stop and confirm before starting Phase 2.
```

---

## Part 3 — Quick Start

1. Create a new GitHub repo: `marks-and-mind`
2. Clone it locally and open in Claude Code
3. Drop `marks-and-mind-proposal.md` into the repo root
4. Paste the master prompt above as your first message to Claude Code
5. Add `.env` with your `VITE_OPENAI_API_KEY` and `VITE_ANTHROPIC_API_KEY`
6. Let Claude scaffold Phase 1, then iterate

Phase 1 should be installable on your phone within a session or two. Everything after that is additive.
