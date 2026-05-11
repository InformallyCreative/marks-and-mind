import { useEffect, useState } from 'react';
import { deleteEntry, getAudioBlob } from '../../services/db';
import { formatTimeAgo } from '../../utils/time';
import type { Entry } from '../../types';

interface Props {
  entry: Entry;
  onDeleted: (id: string) => void;
}

export function EntryCard({ entry, onDeleted }: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    if (entry.audio_blob_id) {
      getAudioBlob(entry.audio_blob_id).then((b) => {
        if (!active || !b) return;
        createdUrl = URL.createObjectURL(b.blob);
        setAudioUrl(createdUrl);
      });
    }
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [entry.audio_blob_id]);

  async function onDelete() {
    if (!confirm('Delete this entry? Audio and links will be removed.')) return;
    await deleteEntry(entry.id);
    onDeleted(entry.id);
  }

  return (
    <article className="bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink-4">
          {formatTimeAgo(entry.timestamp)}
        </span>
        <button
          onClick={onDelete}
          aria-label="Delete entry"
          className="text-ink-4 text-xs hover:text-bad"
        >
          ✕
        </button>
      </div>
      <p className="text-sm leading-relaxed">{entry.summary || entry.transcript.slice(0, 200)}</p>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full h-9" preload="metadata" />
      )}

      {(entry.tags.length > 0 || entry.linked_mark_ids.length > 0 || entry.linked_node_ids.length > 0 || entry.linked_block_ids.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((t) => (
            <span key={t} className="text-[10px] uppercase font-medium bg-ink-2 px-2 py-0.5 rounded text-ink-4">
              {t}
            </span>
          ))}
          {entry.linked_mark_ids.length > 0 && (
            <span className="text-[10px] uppercase font-medium bg-accent/15 text-accent-soft px-2 py-0.5 rounded">
              {entry.linked_mark_ids.length} mark{entry.linked_mark_ids.length === 1 ? '' : 's'}
            </span>
          )}
          {entry.linked_node_ids.length > 0 && (
            <span className="text-[10px] uppercase font-medium bg-accent/15 text-accent-soft px-2 py-0.5 rounded">
              {entry.linked_node_ids.length} node{entry.linked_node_ids.length === 1 ? '' : 's'}
            </span>
          )}
          {entry.linked_block_ids.length > 0 && (
            <span className="text-[10px] uppercase font-medium bg-accent/15 text-accent-soft px-2 py-0.5 rounded">
              {entry.linked_block_ids.length} block{entry.linked_block_ids.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {entry.transcript && entry.transcript !== entry.summary && (
        <>
          <button
            onClick={() => setExpanded((x) => !x)}
            className="text-xs text-ink-4 underline"
          >
            {expanded ? 'Hide transcript' : 'Show transcript'}
          </button>
          {expanded && (
            <p className="text-xs text-ink-4 whitespace-pre-wrap leading-relaxed pt-1 border-t border-ink-2">
              {entry.transcript}
            </p>
          )}
        </>
      )}
    </article>
  );
}
