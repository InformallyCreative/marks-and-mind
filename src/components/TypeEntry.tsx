import { useEffect, useRef, useState } from 'react';
import type { Entry, ExtractionResult } from '../types';
import { uuid } from '../utils/uuid';
import { nowIso } from '../utils/time';
import { extractFromTranscript } from '../services/claude-extraction';
import { listMarks, listNodes, putEntry } from '../services/db';

interface Props {
  onClose: () => void;
  onComplete: (entry: Entry, extraction: ExtractionResult) => void;
}

type Phase = 'editing' | 'extracting' | 'saving' | 'error';

export function TypeEntry({ onClose, onComplete }: Props) {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('editing');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Tiny delay so iOS Safari actually focuses + opens the keyboard.
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  async function save() {
    const transcript = text.trim();
    if (!transcript) return;
    setError('');
    setPhase('extracting');
    let extraction: ExtractionResult;
    try {
      const [marks, nodes] = await Promise.all([listMarks(), listNodes()]);
      extraction = await extractFromTranscript(transcript, {
        existingMarks: marks,
        existingNodes: nodes,
      });
    } catch (e) {
      extraction = {
        summary: transcript.slice(0, 140),
        tags: [],
        proposed_marks: [],
        proposed_nodes: [],
        proposed_schedule_blocks: [],
      };
      console.warn('[type-entry] extraction failed, continuing:', e);
      setError(`Claude extraction failed: ${(e as Error).message}. Saved without AI sort.`);
    }

    setPhase('saving');
    const entry: Entry = {
      id: uuid(),
      timestamp: nowIso(),
      transcript,
      summary: extraction.summary || transcript.slice(0, 140),
      tags: extraction.tags,
      linked_mark_ids: [],
      linked_node_ids: [],
      linked_block_ids: [],
    };
    await putEntry(entry);
    onComplete(entry, extraction);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl + Enter saves
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  }

  const charCount = text.trim().length;
  const busy = phase === 'extracting' || phase === 'saving';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-ink-1 border border-ink-2 rounded-t-2xl p-5 space-y-4"
        style={{ paddingBottom: `calc(1.5rem + var(--safe-bottom))` }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-semibold">Write or paste an entry</h2>
            <p className="text-[11px] text-ink-4">
              Type, dictate, or paste a chat from ChatGPT/Claude — anything text-based.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-ink-4 hover:text-white text-sm disabled:opacity-40"
          >
            Close
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your thoughts, dictate with the iOS mic key, or paste a chat transcript from another AI…"
          rows={8}
          disabled={busy}
          className="w-full bg-ink-2 border border-ink-3 rounded-lg p-3 text-sm placeholder:text-ink-4 resize-none focus:outline-none focus:border-accent disabled:opacity-50"
        />

        <div className="flex items-center justify-between text-[11px] text-ink-4">
          <span>{charCount} chars</span>
          <span>⌘+Return to save</span>
        </div>

        {phase === 'editing' && (
          <button
            onClick={save}
            disabled={!charCount}
            className="w-full bg-accent rounded-xl py-3.5 font-semibold disabled:opacity-30"
          >
            Sort &amp; save
          </button>
        )}

        {busy && (
          <div className="py-3 text-center space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="text-sm text-ink-4">
              {phase === 'extracting' && 'Sorting with Claude…'}
              {phase === 'saving' && 'Saving entry…'}
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded-lg p-3 leading-relaxed">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
