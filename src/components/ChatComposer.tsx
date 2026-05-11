import { useEffect, useRef, useState } from 'react';
import type { Entry, ExtractionResult } from '../types';
import { uuid } from '../utils/uuid';
import { nowIso } from '../utils/time';
import {
  chatToTranscript,
  chatTurn,
  type ChatMessage,
} from '../services/claude-chat';
import { extractFromTranscript } from '../services/claude-extraction';
import { listMarks, listNodes, putEntry } from '../services/db';

interface Props {
  onClose: () => void;
  onComplete: (entry: Entry, extraction: ExtractionResult) => void;
}

type Phase = 'chatting' | 'thinking' | 'sorting' | 'saving';

export function ChatComposer({ onClose, onComplete }: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>('chatting');
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [history, phase]);

  async function send() {
    const text = draft.trim();
    if (!text || phase !== 'chatting') return;
    setError('');
    const next: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistory(next);
    setDraft('');
    setPhase('thinking');
    try {
      const reply = await chatTurn(next);
      setHistory([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(`Claude reply failed: ${(e as Error).message}`);
      // Roll back the optimistic user message so they can retry
      setHistory(history);
      setDraft(text);
    } finally {
      setPhase('chatting');
    }
  }

  async function done() {
    if (history.length === 0) return;
    setPhase('sorting');
    setError('');
    const transcript = chatToTranscript(history);
    let extraction: ExtractionResult;
    try {
      const [marks, nodes] = await Promise.all([listMarks(), listNodes()]);
      extraction = await extractFromTranscript(transcript, {
        existingMarks: marks,
        existingNodes: nodes,
      });
    } catch (e) {
      extraction = {
        summary: history[0]?.content.slice(0, 140) ?? '',
        tags: [],
        proposed_marks: [],
        proposed_nodes: [],
        proposed_schedule_blocks: [],
      };
      console.warn('[chat] extraction failed:', e);
    }

    setPhase('saving');
    const entry: Entry = {
      id: uuid(),
      timestamp: nowIso(),
      transcript,
      summary: extraction.summary || transcript.slice(0, 140),
      tags: extraction.tags.length ? extraction.tags : ['chat'],
      linked_mark_ids: [],
      linked_node_ids: [],
      linked_block_ids: [],
    };
    await putEntry(entry);
    onComplete(entry, extraction);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  }

  const busy = phase === 'thinking' || phase === 'sorting' || phase === 'saving';

  return (
    <div className="fixed inset-0 z-40 bg-ink-0 flex flex-col">
      <header
        className="px-4 py-3 flex items-center justify-between border-b border-ink-2"
        style={{ paddingTop: `calc(0.75rem + var(--safe-top))` }}
      >
        <div>
          <h2 className="text-base font-semibold">Talk it through</h2>
          <p className="text-[11px] text-ink-4">
            Back-and-forth with Claude. Tap Done when you're ready and it'll sort the whole convo into marks/mind/schedule.
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={phase === 'sorting' || phase === 'saving'}
          className="text-ink-4 text-sm disabled:opacity-40"
        >
          Close
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {history.length === 0 && phase === 'chatting' && (
          <div className="text-center text-ink-4 text-sm py-10 px-6 leading-relaxed">
            Start talking. Tell Claude what's on your mind — a problem you're stuck on, a plan you're shaping, what happened today. It'll ask short follow-up questions.
          </div>
        )}
        {history.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {phase === 'thinking' && (
          <div className="flex items-center gap-2 text-ink-4 text-xs pl-1">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>Claude is thinking…</span>
          </div>
        )}
        {(phase === 'sorting' || phase === 'saving') && (
          <div className="text-center py-6 space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="text-sm text-ink-4">
              {phase === 'sorting' && 'Sorting the conversation…'}
              {phase === 'saving' && 'Saving entry…'}
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-bad bg-bad/10 border border-bad/30 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      <div
        className="border-t border-ink-2 bg-ink-1 px-3 py-3 space-y-2"
        style={{ paddingBottom: `calc(0.75rem + var(--safe-bottom))` }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            rows={1}
            disabled={busy}
            className="flex-1 bg-ink-2 border border-ink-3 rounded-lg p-2.5 text-sm resize-none max-h-32 focus:outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || busy}
            aria-label="Send"
            className="bg-accent text-white rounded-lg p-2.5 disabled:opacity-30"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={done}
          disabled={history.length === 0 || busy}
          className="w-full bg-ink-2 text-accent-soft rounded-lg py-2.5 text-sm font-medium disabled:opacity-30"
        >
          Done — sort the conversation
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string;
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-accent text-white rounded-br-md' : 'bg-ink-1 border border-ink-2 text-white rounded-bl-md'}`}
      >
        {content}
      </div>
    </div>
  );
}

function SendIcon({ className = '' }: { className?: string }) {
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
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
