import { useEffect, useState } from 'react';
import type { ScheduleBlock } from '../../types';
import { deleteBlock, getStats, putBlock, putStats } from '../../services/db';
import { awardXP, xpForBlock } from '../../utils/xp';
import { nowIso } from '../../utils/time';

interface Props {
  block: ScheduleBlock;
  onClose: () => void;
  onSaved: () => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toLocalInput(iso: string): string {
  // Returns "YYYY-MM-DDTHH:MM" in LOCAL time (datetime-local format)
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  // value is "YYYY-MM-DDTHH:MM" — interpret as local
  return new Date(value).toISOString();
}

export function EditBlockModal({ block, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(block.title);
  const [scheduledFor, setScheduledFor] = useState(toLocalInput(block.scheduled_for));
  const [minutes, setMinutes] = useState(block.estimated_minutes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(block.title);
    setScheduledFor(toLocalInput(block.scheduled_for));
    setMinutes(block.estimated_minutes);
  }, [block]);

  async function save() {
    setSaving(true);
    await putBlock({
      ...block,
      title: title.trim() || block.title,
      scheduled_for: fromLocalInput(scheduledFor),
      estimated_minutes: Math.max(5, Math.min(480, minutes || 30)),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  async function complete() {
    const xp = xpForBlock(block.actual_minutes ?? minutes);
    await putBlock({
      ...block,
      title: title.trim() || block.title,
      scheduled_for: fromLocalInput(scheduledFor),
      estimated_minutes: Math.max(5, Math.min(480, minutes || 30)),
      status: 'done',
      completed_at: nowIso(),
      actual_minutes: block.actual_minutes ?? minutes,
      xp_awarded: xp,
    });
    const stats = await getStats();
    const { stats: nextStats } = awardXP(stats, xp);
    await putStats(nextStats);
    onSaved();
    onClose();
  }

  async function uncomplete() {
    await putBlock({ ...block, status: 'scheduled', completed_at: null });
    onSaved();
    onClose();
  }

  async function skip() {
    await putBlock({ ...block, status: 'skipped' });
    onSaved();
    onClose();
  }

  async function remove() {
    if (!confirm(`Delete "${block.title}"?`)) return;
    await deleteBlock(block.id);
    onSaved();
    onClose();
  }

  const done = block.status === 'done';
  const skipped = block.status === 'skipped';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-ink-1 border-t border-ink-2 rounded-t-3xl p-5 space-y-4 animate-slide-up"
        style={{ paddingBottom: `calc(1.5rem + var(--safe-bottom))` }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold">Edit block</h2>
          <button onClick={onClose} className="text-ink-4 text-sm">
            Close
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide text-ink-4">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-ink-2 border border-ink-3 rounded-lg p-2.5 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-ink-4">When</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-ink-2 border border-ink-3 rounded-lg p-2.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-ink-4">Minutes</label>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 30)}
              className="w-full bg-ink-2 border border-ink-3 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap text-xs">
          {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
            <button
              key={m}
              onClick={() => setMinutes(m)}
              className={`px-2 py-1 rounded-md ${minutes === m ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
            >
              {m}m
            </button>
          ))}
        </div>

        <div className="text-[11px] text-gold-soft">
          Worth +{xpForBlock(minutes)} XP when completed.
        </div>

        <div className="flex gap-2">
          {done ? (
            <button
              onClick={uncomplete}
              className="flex-1 bg-ink-2 text-ink-4 rounded-xl py-3 text-sm font-medium"
            >
              Un-complete
            </button>
          ) : (
            <button
              onClick={complete}
              disabled={saving}
              className="flex-1 bg-good text-ink-0 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              Mark done
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-accent rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          {!done && !skipped && (
            <button
              onClick={skip}
              className="flex-1 text-xs text-warn underline"
            >
              Skip
            </button>
          )}
          <button onClick={remove} className="flex-1 text-xs text-bad underline">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
