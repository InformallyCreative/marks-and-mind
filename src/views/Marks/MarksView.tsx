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

  return (
    <div className="px-4 py-3 space-y-5">
      <div className="flex gap-1 text-xs">
        <button
          onClick={() => setFilter('open')}
          className={`px-3 py-1 rounded-full ${filter === 'open' ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full ${filter === 'all' ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
        >
          All
        </button>
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
