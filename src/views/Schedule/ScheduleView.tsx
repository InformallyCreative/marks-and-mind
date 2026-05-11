import { useEffect, useMemo, useState } from 'react';
import {
  deleteBlock,
  getStats,
  listBlocks,
  putBlock,
  putStats,
} from '../../services/db';
import { awardXP, xpForBlock } from '../../utils/xp';
import { describeWindow, formatDayLabel, formatTimeOfDay, nowIso, toDayIso } from '../../utils/time';
import { uuid } from '../../utils/uuid';
import type { ScheduleBlock, SuggestedWindow } from '../../types';
import { BlockCard } from './BlockCard';

interface Props {
  onChange: () => void;
}

const WINDOWS: SuggestedWindow[] = [
  'tonight',
  'tomorrow_morning',
  'this_weekend',
  'during_work',
  'flexible',
];

export function ScheduleView({ onChange }: Props) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'all'>('day');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    minutes: 30,
    window: 'tonight' as SuggestedWindow,
  });

  useEffect(() => {
    listBlocks().then(setBlocks);
  }, []);

  async function reload() {
    setBlocks(await listBlocks());
  }

  const grouped = useMemo(() => {
    const today = toDayIso(new Date());
    const filtered = blocks
      .filter((b) => b.status !== 'skipped' || view === 'all')
      .filter((b) => {
        if (view === 'all') return true;
        const day = toDayIso(b.scheduled_for);
        if (view === 'day') return day === today;
        // week: ±7 days
        const diff =
          (new Date(b.scheduled_for).getTime() - Date.now()) / 86_400_000;
        return diff >= -1 && diff <= 7;
      })
      .sort((a, b) =>
        a.scheduled_for < b.scheduled_for
          ? -1
          : a.scheduled_for > b.scheduled_for
            ? 1
            : 0,
      );

    const byDay = new Map<string, ScheduleBlock[]>();
    for (const b of filtered) {
      const k = toDayIso(b.scheduled_for);
      const arr = byDay.get(k) ?? [];
      arr.push(b);
      byDay.set(k, arr);
    }
    return Array.from(byDay.entries());
  }, [blocks, view]);

  async function add() {
    if (!draft.title.trim()) return;
    const b: ScheduleBlock = {
      id: uuid(),
      title: draft.title.trim(),
      estimated_minutes: draft.minutes,
      actual_minutes: null,
      suggested_window: draft.window,
      scheduled_for: nowIso(),
      status: 'scheduled',
      linked_mark_id: null,
      linked_node_ids: [],
      linked_entry_id: null,
      completed_at: null,
      xp_awarded: 0,
    };
    await putBlock(b);
    setDraft({ title: '', minutes: 30, window: 'tonight' });
    setAdding(false);
    reload();
  }

  async function complete(b: ScheduleBlock) {
    const xp = xpForBlock(b.actual_minutes ?? b.estimated_minutes);
    const updated: ScheduleBlock = {
      ...b,
      status: 'done',
      completed_at: nowIso(),
      actual_minutes: b.actual_minutes ?? b.estimated_minutes,
      xp_awarded: xp,
    };
    await putBlock(updated);
    const stats = await getStats();
    const { stats: nextStats } = awardXP(stats, xp);
    await putStats(nextStats);
    reload();
    onChange();
  }

  async function uncomplete(b: ScheduleBlock) {
    const updated: ScheduleBlock = {
      ...b,
      status: 'scheduled',
      completed_at: null,
    };
    await putBlock(updated);
    // Note: not refunding XP — that's a deliberate quirk to discourage gaming.
    reload();
  }

  async function skip(b: ScheduleBlock) {
    await putBlock({ ...b, status: 'skipped' });
    reload();
  }

  async function remove(b: ScheduleBlock) {
    if (!confirm(`Delete "${b.title}"?`)) return;
    await deleteBlock(b.id);
    reload();
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex gap-1 text-xs">
        {(['day', 'week', 'all'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 rounded-full capitalize ${view === v ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
          >
            {v}
          </button>
        ))}
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-3 py-1 rounded-full bg-ink-2 text-accent-soft"
        >
          + Block
        </button>
      </div>

      {adding && (
        <div className="bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2">
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Block title (start with a verb)"
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm"
          />
          <div className="flex items-center gap-2 text-xs">
            <label className="text-ink-4">Minutes</label>
            <input
              type="number"
              min={5}
              max={480}
              value={draft.minutes}
              onChange={(e) =>
                setDraft({ ...draft, minutes: Number(e.target.value) || 30 })
              }
              className="w-20 bg-ink-2 border border-ink-3 rounded-md p-1.5"
            />
            <span className="ml-auto text-ink-4">+{xpForBlock(draft.minutes)} XP</span>
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setDraft({ ...draft, window: w })}
                className={`px-2 py-1 rounded-md ${draft.window === w ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
              >
                {describeWindow(w)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 bg-ink-3 rounded-md py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={add}
              className="flex-1 bg-accent rounded-md py-2 text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <p className="text-center text-ink-4 text-xs py-6">
          No blocks {view === 'day' ? 'for today' : view === 'week' ? 'this week' : 'yet'}.
        </p>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day}>
            <h3 className="text-xs uppercase tracking-wide text-ink-4 mb-2">
              {formatDayLabel(day)}
            </h3>
            <div className="space-y-2">
              {items.map((b) => (
                <BlockCard
                  key={b.id}
                  block={b}
                  timeLabel={formatTimeOfDay(b.scheduled_for)}
                  onComplete={() => complete(b)}
                  onUncomplete={() => uncomplete(b)}
                  onSkip={() => skip(b)}
                  onDelete={() => remove(b)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
