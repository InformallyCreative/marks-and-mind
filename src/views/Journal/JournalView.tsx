import { useEffect, useState } from 'react';
import { listEntries } from '../../services/db';
import type { Entry } from '../../types';
import { EntryCard } from './EntryCard';

export function JournalView() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    listEntries().then(setEntries);
  }, []);

  if (entries === null) {
    return (
      <div className="p-6 text-center text-ink-4 text-sm">Loading…</div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-ink-4 text-sm">No entries yet.</p>
        <p className="text-ink-4 text-xs">
          Tap the mic in the top-right to record your first one.
        </p>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 space-y-3">
      {entries.map((e) => (
        <EntryCard
          key={e.id}
          entry={e}
          onDeleted={(id) =>
            setEntries((prev) => (prev ? prev.filter((x) => x.id !== id) : prev))
          }
        />
      ))}
    </div>
  );
}
