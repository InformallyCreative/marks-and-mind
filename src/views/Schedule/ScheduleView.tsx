import { useEffect, useMemo, useState } from 'react';
import { listBlocks, putBlock } from '../../services/db';
import { describeWindow, formatDayLabel, nowIso, toDayIso } from '../../utils/time';
import { xpForBlock } from '../../utils/xp';
import { uuid } from '../../utils/uuid';
import type { ScheduleBlock, SuggestedWindow } from '../../types';
import { TimelineGrid } from './TimelineGrid';
import { EditBlockModal } from './EditBlockModal';

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
  const [selectedDay, setSelectedDay] = useState<string>(() => toDayIso(new Date()));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ScheduleBlock | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    minutes: 30,
    window: 'tonight' as SuggestedWindow,
    time: '09:00',
  });

  useEffect(() => {
    listBlocks().then(setBlocks);
  }, []);

  async function reload() {
    setBlocks(await listBlocks());
    onChange();
  }

  // Build 7-day strip centered on today
  const dayStrip = useMemo(() => {
    const days: { iso: string; label: string; dow: string; dayNum: number; count: number }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = -1; i <= 5; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const iso = toDayIso(d);
      const count = blocks.filter(
        (b) => toDayIso(b.scheduled_for) === iso && b.status !== 'skipped',
      ).length;
      days.push({
        iso,
        label: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        dow: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        count,
      });
    }
    return days;
  }, [blocks]);

  const todayBlocks = useMemo(
    () => blocks.filter((b) => toDayIso(b.scheduled_for) === selectedDay),
    [blocks, selectedDay],
  );

  const stats = useMemo(() => {
    const open = todayBlocks.filter((b) => b.status === 'scheduled').length;
    const done = todayBlocks.filter((b) => b.status === 'done').length;
    const totalMin = todayBlocks
      .filter((b) => b.status !== 'skipped')
      .reduce((s, b) => s + b.estimated_minutes, 0);
    return { open, done, totalMin };
  }, [todayBlocks]);

  async function addBlock() {
    if (!draft.title.trim()) return;
    const [hh, mm] = draft.time.split(':').map((n) => parseInt(n, 10));
    const when = new Date(selectedDay + 'T00:00:00');
    when.setHours(hh, mm, 0, 0);
    const b: ScheduleBlock = {
      id: uuid(),
      title: draft.title.trim(),
      estimated_minutes: draft.minutes,
      actual_minutes: null,
      suggested_window: draft.window,
      scheduled_for: when.toISOString(),
      status: 'scheduled',
      linked_mark_id: null,
      linked_node_ids: [],
      linked_entry_id: null,
      completed_at: null,
      xp_awarded: 0,
    };
    await putBlock(b);
    setDraft({ title: '', minutes: 30, window: 'tonight', time: '09:00' });
    setAdding(false);
    reload();
  }

  function openEmptySlotAdd(hour: number, minute: number) {
    setDraft({
      ...draft,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    });
    setAdding(true);
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Day strip */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
        {dayStrip.map((d) => {
          const active = d.iso === selectedDay;
          return (
            <button
              key={d.iso}
              onClick={() => setSelectedDay(d.iso)}
              className={`shrink-0 w-14 py-2 rounded-xl flex flex-col items-center transition active:scale-95 ${
                active
                  ? 'bg-accent text-white shadow shadow-accent/30'
                  : 'bg-ink-1 border border-ink-2 text-ink-4'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wide">{d.dow}</span>
              <span className={`text-lg font-semibold leading-none mt-0.5 ${active ? '' : 'text-white'}`}>{d.dayNum}</span>
              {d.count > 0 && (
                <span className={`mt-1 w-1 h-1 rounded-full ${active ? 'bg-white/80' : 'bg-accent'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day header + stats */}
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold leading-none">{formatDayLabel(selectedDay)}</h2>
          <p className="text-[11px] text-ink-4 mt-1">
            {stats.done}/{stats.open + stats.done} done · {Math.round(stats.totalMin / 6) / 10}h scheduled
          </p>
        </div>
        <button
          onClick={() => setAdding((x) => !x)}
          className="text-sm text-accent-soft active:scale-95 transition"
        >
          + Add block
        </button>
      </div>

      {/* Inline add */}
      {adding && (
        <div className="bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2 animate-in">
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Block title (start with a verb)"
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm"
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-4">Time</label>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                className="w-full bg-ink-2 border border-ink-3 rounded-md p-1.5 text-sm mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-4">Mins</label>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={draft.minutes}
                onChange={(e) =>
                  setDraft({ ...draft, minutes: Number(e.target.value) || 30 })
                }
                className="w-full bg-ink-2 border border-ink-3 rounded-md p-1.5 text-sm mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-ink-4">XP</label>
              <div className="bg-ink-2 border border-ink-3 rounded-md p-1.5 text-sm mt-0.5 font-mono text-accent-soft">
                +{xpForBlock(draft.minutes)}
              </div>
            </div>
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
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 bg-ink-2 rounded-md py-2 text-sm text-ink-4"
            >
              Cancel
            </button>
            <button
              onClick={addBlock}
              disabled={!draft.title.trim()}
              className="flex-[2] bg-accent rounded-md py-2 text-sm font-semibold disabled:opacity-40"
            >
              Save block
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {todayBlocks.length === 0 && !adding ? (
        <EmptyDay onAdd={() => setAdding(true)} dayLabel={formatDayLabel(selectedDay)} />
      ) : (
        <TimelineGrid
          day={selectedDay}
          blocks={todayBlocks}
          onTapBlock={(b) => setEditing(b)}
          onTapEmptySlot={openEmptySlotAdd}
        />
      )}

      {editing && (
        <EditBlockModal
          block={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function EmptyDay({ onAdd, dayLabel }: { onAdd: () => void; dayLabel: string }) {
  return (
    <div className="bg-ink-1 border border-dashed border-ink-3 rounded-2xl p-8 text-center space-y-3">
      <div className="text-3xl">📅</div>
      <div>
        <p className="text-sm font-medium">Nothing scheduled for {dayLabel.toLowerCase()}</p>
        <p className="text-xs text-ink-4 mt-1">
          Record an entry and Claude proposes blocks — or add one directly.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="text-sm font-medium text-accent-soft bg-accent/10 px-4 py-2 rounded-lg active:scale-95 transition"
      >
        + Add a block
      </button>
    </div>
  );
}

// nowIso is exported by utils/time so referenced files don't need to import it
void nowIso;
