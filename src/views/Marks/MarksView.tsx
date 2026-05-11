import { useEffect, useState } from 'react';
import {
  deleteMark,
  getStats,
  listMarks,
  putMark,
  putStats,
} from '../../services/db';
import { awardXP, markHitBonus } from '../../utils/xp';
import { nowIso } from '../../utils/time';
import { uuid } from '../../utils/uuid';
import type { Mark, MarkScope } from '../../types';
import { MarkCard } from './MarkCard';

interface Props {
  onChange: () => void;
}

const SCOPES: MarkScope[] = ['day', 'week', 'month', 'year'];

export function MarksView({ onChange }: Props) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [adding, setAdding] = useState<MarkScope | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  useEffect(() => {
    listMarks().then(setMarks);
  }, []);

  async function reload() {
    setMarks(await listMarks());
  }

  async function addMark(scope: MarkScope) {
    if (!newTitle.trim()) {
      setAdding(null);
      return;
    }
    const m: Mark = {
      id: uuid(),
      title: newTitle.trim(),
      scope,
      target_date: null,
      status: 'open',
      created_at: nowIso(),
      hit_at: null,
      parent_mark_id: null,
      notes: '',
    };
    await putMark(m);
    setNewTitle('');
    setAdding(null);
    reload();
  }

  async function hitMark(m: Mark) {
    const updated: Mark = {
      ...m,
      status: 'hit',
      hit_at: nowIso(),
    };
    await putMark(updated);

    const stats = await getStats();
    const bonus = markHitBonus(m.scope);
    const { stats: nextStats, streakBonus } = awardXP(stats, bonus);
    await putStats(nextStats);
    reload();
    onChange();
    if (streakBonus) {
      // Could surface a toast here.
    }
  }

  async function dropMark(m: Mark) {
    await putMark({ ...m, status: 'dropped' });
    reload();
  }

  async function reopenMark(m: Mark) {
    await putMark({ ...m, status: 'open', hit_at: null });
    reload();
  }

  async function removeMark(m: Mark) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    await deleteMark(m.id);
    reload();
  }

  const totalOpen = marks.filter((m) => m.status === 'open').length;
  const totalHit = marks.filter((m) => m.status === 'hit').length;

  if (marks.length === 0) {
    return (
      <div className="px-6 py-12 text-center space-y-4">
        <div className="text-5xl">🎯</div>
        <div>
          <p className="text-base font-medium">No marks yet</p>
          <p className="text-xs text-ink-4 mt-1 leading-relaxed max-w-xs mx-auto">
            Marks are goals at four scales: day, week, month, year. Record an entry — Claude proposes them — or add one below.
          </p>
        </div>
        <div className="flex justify-center gap-2 pt-1">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setAdding(s);
                setNewTitle('');
              }}
              className="text-xs font-medium text-accent-soft bg-accent/10 px-3 py-1.5 rounded-lg capitalize active:scale-95 transition"
            >
              + {s}
            </button>
          ))}
        </div>
        {adding && (
          <div className="text-left bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2 mt-4 animate-in">
            <div className="text-[11px] uppercase tracking-wide text-ink-4">New {adding} mark</div>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMark(adding)}
              placeholder={`What's the ${adding}-level goal?`}
              className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAdding(null)}
                className="flex-1 bg-ink-2 text-ink-4 rounded-md py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => addMark(adding)}
                className="flex-[2] bg-accent rounded-md py-2 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Header chip with quick stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 text-xs">
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1.5 rounded-full font-medium ${filter === 'open' ? 'bg-accent text-white' : 'bg-ink-1 border border-ink-2 text-ink-4'}`}
          >
            Open · {totalOpen}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-medium ${filter === 'all' ? 'bg-accent text-white' : 'bg-ink-1 border border-ink-2 text-ink-4'}`}
          >
            All · {marks.length}
          </button>
        </div>
        {totalHit > 0 && (
          <span className="text-[11px] text-good">{totalHit} hit ✓</span>
        )}
      </div>

      {SCOPES.map((scope) => {
        const inScope = marks.filter(
          (m) => m.scope === scope && (filter === 'all' || m.status === 'open'),
        );
        return (
          <section key={scope}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wide text-ink-4">
                {scope}
              </h3>
              <button
                onClick={() => {
                  setAdding(scope);
                  setNewTitle('');
                }}
                className="text-xs text-accent-soft"
              >
                + Add
              </button>
            </div>

            {adding === scope && (
              <div className="mb-2 flex gap-2">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMark(scope)}
                  placeholder={`New ${scope} mark…`}
                  className="flex-1 bg-ink-2 border border-ink-3 rounded-md p-2 text-sm"
                />
                <button
                  onClick={() => addMark(scope)}
                  className="bg-accent rounded-md px-3 text-sm font-medium"
                >
                  Save
                </button>
              </div>
            )}

            {inScope.length === 0 ? (
              <p className="text-ink-4 text-xs px-1">No {scope} marks yet.</p>
            ) : (
              <div className="space-y-2">
                {inScope.map((m) => (
                  <MarkCard
                    key={m.id}
                    mark={m}
                    onHit={() => hitMark(m)}
                    onDrop={() => dropMark(m)}
                    onReopen={() => reopenMark(m)}
                    onDelete={() => removeMark(m)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
