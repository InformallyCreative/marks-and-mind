import { useEffect, useMemo, useState } from 'react';
import { listEntries } from '../../services/db';
import { formatDayLabel, toDayIso } from '../../utils/time';
import type { Entry } from '../../types';
import { EntryCard } from './EntryCard';

export function JournalView() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    listEntries().then(setEntries);
  }, []);

  const allTags = useMemo(() => {
    if (!entries) return [];
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [entries]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeTag && !e.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        e.summary.toLowerCase().includes(q) ||
        e.transcript.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [entries, query, activeTag]);

  const grouped = useMemo(() => {
    const groups: { day: string; label: string; items: Entry[] }[] = [];
    let currentDay = '';
    for (const e of filtered) {
      const day = toDayIso(e.timestamp);
      if (day !== currentDay) {
        groups.push({ day, label: formatDayLabel(day), items: [] });
        currentDay = day;
      }
      groups[groups.length - 1].items.push(e);
    }
    return groups;
  }, [filtered]);

  if (entries === null) {
    return (
      <div className="p-6 text-center text-ink-4 text-sm">Loading…</div>
    );
  }

  if (entries.length === 0) {
    return <EmptyJournal />;
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-4" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries, tags, transcripts…"
          className="w-full bg-ink-1 border border-ink-2 rounded-lg pl-9 pr-9 py-2.5 text-sm placeholder:text-ink-4 focus:outline-none focus:border-ink-3"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-4 text-xs px-2"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setActiveTag(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-medium ${
              activeTag === null ? 'bg-accent text-white' : 'bg-ink-1 border border-ink-2 text-ink-4'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] uppercase tracking-wide font-medium ${
                activeTag === t ? 'bg-accent text-white' : 'bg-ink-1 border border-ink-2 text-ink-4'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-4 text-sm">
          No entries match {query ? `"${query}"` : 'this filter'}.
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.day} className="space-y-2">
            <div className="sticky top-0 z-10 bg-ink-0/95 backdrop-blur-sm py-1.5">
              <h3 className="text-[11px] uppercase tracking-wide text-ink-4 font-semibold">
                {group.label}
                <span className="text-ink-4/60 font-normal ml-2 normal-case">
                  · {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                </span>
              </h3>
            </div>
            <div className="space-y-2">
              {group.items.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onDeleted={(id) =>
                    setEntries((prev) => (prev ? prev.filter((x) => x.id !== id) : prev))
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EmptyJournal() {
  return (
    <div className="px-6 py-12 text-center space-y-4">
      <div className="text-5xl">📓</div>
      <div>
        <p className="text-base font-medium">Your journal is empty</p>
        <p className="text-xs text-ink-4 mt-1 leading-relaxed max-w-xs mx-auto">
          Tap <span className="text-accent-soft font-medium">+ New</span> in the top right to record, type, or have a conversation with Claude — anything you put in gets sorted into Marks, Mind, and Schedule.
        </p>
      </div>
    </div>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16.65" y2="16.65" />
    </svg>
  );
}
