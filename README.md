# Marks & Mind

Voice-first personal OS PWA. One audio journal in, multiple organized views out: **Marks** (goals), **Mind** (knowledge), **Schedule** (time-blocked execution), **Journal** (raw history). Gamified with XP, streaks, and an efficiency rating.

Full spec: [`marks-and-mind-proposal.md`](./marks-and-mind-proposal.md).

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env and add your API keys
cp .env.example .env
# edit .env -> add VITE_OPENAI_API_KEY and VITE_ANTHROPIC_API_KEY

# 3. Run the dev server
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`). On your phone use the LAN URL it prints alongside — the dev server binds to `0.0.0.0`.

## Add to Home Screen

1. Run `npm run build && npm run preview` (or deploy to Vercel/GitHub Pages).
2. Open the served URL on your iPhone in Safari.
3. Share → Add to Home Screen.
4. Launch from the home-screen icon — `navigator.standalone === true` triggers the JS-only safe-area shim in `src/services/safe-area.ts`. (We deliberately do **not** use CSS `env()` here — iOS PWA env() is unreliable in this stack.)

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark by default)
- IndexedDB via `idb` (one object store per top-level data-model key)
- MediaRecorder API for audio capture
- OpenAI Whisper API for transcription (env `VITE_OPENAI_API_KEY`)
- Anthropic Claude API for extraction (env `VITE_ANTHROPIC_API_KEY`)
- `vite-plugin-pwa` for manifest + service worker

## Layout

```
src/
  components/      App-wide UI: BottomNav, Recorder, ReviewPane
  services/        IO: db (IndexedDB), transcription (Whisper), claude-extraction, safe-area
  utils/           Pure helpers: uuid, time, xp/levels/streak, efficiency rating
  types/           Data-model TypeScript types
  views/
    Journal/       Raw chronological feed
    Marks/         Year/month/week/day goal hierarchy with hit-mark action
    Mind/          Skill/knowledge/tool nodes with search
    Schedule/      Day/week grid; complete blocks → XP
    Stats/         Level, streak, efficiency rating
```

## Data model

See `src/types/index.ts` (mirrors the JSON spec in the proposal). All five top-level entities live in their own IndexedDB object store: `entries`, `marks`, `nodes`, `schedule_blocks`, `audio_blobs`, plus a singleton `stats` row.

## How an entry flows

1. Tap mic → `Recorder` records via MediaRecorder.
2. Tap Stop → blob saved + URL preview.
3. Tap *Transcribe & sort* → Whisper transcribes, then Claude extracts proposed marks/nodes/schedule blocks (JSON output).
4. `ReviewPane` opens — accept, edit, or reject each proposal.
5. Accepted items are written to IndexedDB; the entry is updated with the new IDs in `linked_*` fields.

If Whisper fails (no key, offline), you can paste a manual transcript and still run extraction. If Claude fails, the entry saves with a fallback summary.

## Gamification rules

- XP per completed block: `ceil(duration_minutes / 15) * 10`
- Mark hit bonus: +25 (day), +100 (week), +500 (month), +2000 (year)
- Streak bonus: +50 XP per 7-day streak milestone
- Level curve: `xp_for_next_level = 500 * level^1.5`
- Efficiency rating (0–100, rolling 30d): weighted blend of intent conversion (0.20), execution rate (0.45), time accuracy (0.15), punctuality (0.20)

See `src/utils/xp.ts` and `src/utils/efficiency.ts`.

## API key safety

`VITE_*` env vars are bundled into the client. That's fine for a personal-use PWA on your own phone, but **don't deploy this with your keys to a public URL** — anyone hitting the page can pull them out. For multi-user or public deploys, proxy these requests through a backend.

## Roadmap (post-Phase 1)

The current build covers the full Phase 1–4 surface end-to-end. Phase 5 polish to add:

- Graph view for Mind (nodes + edges)
- Cloud sync layer (WordPress REST / Supabase / Git-backed JSON)
- Export / import of full DB to JSON
- Push notifications for scheduled blocks
