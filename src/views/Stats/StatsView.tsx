import { useEffect, useState } from 'react';
import { getStats, listBlocks, listEntries, putStats } from '../../services/db';
import { levelProgress } from '../../utils/xp';
import { computeEfficiency } from '../../utils/efficiency';
import type { Stats } from '../../types';
import { nowIso } from '../../utils/time';

export function StatsView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [efficiency, setEfficiency] = useState<{
    rating: number;
    inputs: ReturnType<typeof computeEfficiency>['inputs'];
  } | null>(null);

  useEffect(() => {
    (async () => {
      const [s, entries, blocks] = await Promise.all([
        getStats(),
        listEntries(),
        listBlocks(),
      ]);
      const eff = computeEfficiency(entries, blocks);

      // Record today's rating in history (one entry per day max).
      const today = new Date().toISOString().slice(0, 10);
      const last = s.efficiency_history[s.efficiency_history.length - 1];
      let nextHistory = s.efficiency_history;
      if (!last || !last.date.startsWith(today)) {
        nextHistory = [
          ...s.efficiency_history.slice(-29),
          { date: nowIso(), rating: eff.rating },
        ];
      } else {
        nextHistory = [
          ...s.efficiency_history.slice(0, -1),
          { date: nowIso(), rating: eff.rating },
        ];
      }
      const updated = { ...s, efficiency_history: nextHistory };
      await putStats(updated);
      setStats(updated);
      setEfficiency(eff);
    })();
  }, []);

  if (!stats || !efficiency) {
    return <div className="p-6 text-center text-ink-4 text-sm">Loading…</div>;
  }

  const lvl = levelProgress(stats.total_xp);

  return (
    <div className="px-4 py-3 space-y-4">
      {/* Level + XP */}
      <section className="bg-ink-1 border border-ink-2 rounded-xl p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-ink-4 uppercase tracking-wide">Level</div>
            <div className="text-3xl font-bold leading-none">{lvl.level}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-4">Total XP</div>
            <div className="text-lg font-semibold">{stats.total_xp.toLocaleString()}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-ink-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.round(lvl.ratio * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-ink-4 flex justify-between">
            <span>{lvl.current} XP</span>
            <span>{lvl.needed} XP to L{lvl.level + 1}</span>
          </div>
        </div>
      </section>

      {/* Streak */}
      <section className="grid grid-cols-2 gap-3">
        <Stat title="Streak" value={`${stats.current_streak_days}d`} sub={`Best: ${stats.longest_streak_days}d`} />
        <Stat title="Last active" value={stats.last_active_date ? new Date(stats.last_active_date).toLocaleDateString() : '—'} />
      </section>

      {/* Efficiency rating */}
      <section className="bg-ink-1 border border-ink-2 rounded-xl p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-ink-4 uppercase tracking-wide">Efficiency rating</div>
            <div className="text-xs text-ink-4">Rolling 30-day intent → action</div>
          </div>
          <div className={`text-4xl font-bold ${ratingColor(efficiency.rating)}`}>
            {efficiency.rating}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Talked" value={efficiency.inputs.talked_count} />
          <Metric label="Scheduled" value={efficiency.inputs.scheduled_count} />
          <Metric label="Completed" value={efficiency.inputs.completed_count} />
          <Metric label="On time" value={efficiency.inputs.on_time_count} />
          <Metric label="Mins est." value={efficiency.inputs.estimated_minutes} />
          <Metric label="Mins actual" value={efficiency.inputs.actual_minutes} />
        </div>

        {stats.efficiency_history.length > 1 && (
          <Sparkline points={stats.efficiency_history.map((h) => h.rating)} />
        )}
      </section>
    </div>
  );
}

function ratingColor(r: number): string {
  if (r >= 75) return 'text-good';
  if (r >= 50) return 'text-warn';
  return 'text-bad';
}

function Stat({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-ink-1 border border-ink-2 rounded-xl p-3">
      <div className="text-xs text-ink-4 uppercase tracking-wide">{title}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-ink-4 mt-0.5">{sub}</div>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-2 rounded-md px-2 py-1.5 flex items-center justify-between">
      <span className="text-ink-4">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 280;
  const h = 40;
  if (points.length === 0) return null;
  const max = Math.max(100, ...points);
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (p / max) * h}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <path d={d} fill="none" stroke="#7c5cff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
