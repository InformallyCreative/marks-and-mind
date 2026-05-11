import { useState, type ReactNode } from 'react';
import type {
  Entry,
  ExtractionResult,
  Mark,
  MindNode,
  ScheduleBlock,
} from '../types';
import { uuid } from '../utils/uuid';
import { describeWindow, nowIso, resolveSuggestedWindow } from '../utils/time';
import { putBlock, putEntry, putMark, putNode } from '../services/db';

interface Props {
  entry: Entry;
  extraction: ExtractionResult;
  onClose: () => void;
}

type Decision = 'accept' | 'reject';

interface MarkChoice {
  decision: Decision;
  draft: Mark;
}
interface NodeChoice {
  decision: Decision;
  draft: MindNode;
}
interface BlockChoice {
  decision: Decision;
  draft: ScheduleBlock;
}

export function ReviewPane({ entry, extraction, onClose }: Props) {
  const [marks, setMarks] = useState<MarkChoice[]>(() =>
    extraction.proposed_marks.map((p) => ({
      decision: 'accept' as const,
      draft: {
        id: uuid(),
        title: p.title,
        scope: p.scope,
        target_date: p.target_date ?? null,
        status: 'open',
        created_at: nowIso(),
        hit_at: null,
        parent_mark_id: p.parent_mark_id ?? null,
        notes: p.notes ?? '',
      },
    })),
  );
  const [nodes, setNodes] = useState<NodeChoice[]>(() =>
    extraction.proposed_nodes.map((p) => ({
      decision: 'accept' as const,
      draft: {
        id: uuid(),
        type: p.type,
        title: p.title,
        description: p.description,
        related_node_ids: [],
        related_entry_ids: [entry.id],
        created_at: nowIso(),
        last_touched_at: nowIso(),
      },
    })),
  );
  const [blocks, setBlocks] = useState<BlockChoice[]>(() =>
    extraction.proposed_schedule_blocks.map((p) => ({
      decision: 'accept' as const,
      draft: {
        id: uuid(),
        title: p.title,
        estimated_minutes: p.estimated_minutes,
        actual_minutes: null,
        suggested_window: p.suggested_window,
        scheduled_for: resolveSuggestedWindow(p.suggested_window),
        status: 'scheduled',
        linked_mark_id: null,
        linked_node_ids: [],
        linked_entry_id: entry.id,
        completed_at: null,
        xp_awarded: 0,
        notes: p.notes,
      },
    })),
  );

  const [saving, setSaving] = useState(false);

  async function commit() {
    setSaving(true);
    const acceptedMarkIds: string[] = [];
    const acceptedNodeIds: string[] = [];
    const acceptedBlockIds: string[] = [];

    for (const m of marks) {
      if (m.decision === 'accept') {
        await putMark(m.draft);
        acceptedMarkIds.push(m.draft.id);
      }
    }
    for (const n of nodes) {
      if (n.decision === 'accept') {
        await putNode(n.draft);
        acceptedNodeIds.push(n.draft.id);
      }
    }
    for (const b of blocks) {
      if (b.decision === 'accept') {
        await putBlock(b.draft);
        acceptedBlockIds.push(b.draft.id);
      }
    }
    // Update the entry with links
    await putEntry({
      ...entry,
      linked_mark_ids: acceptedMarkIds,
      linked_node_ids: acceptedNodeIds,
      linked_block_ids: acceptedBlockIds,
    });
    setSaving(false);
    onClose();
  }

  const nothingProposed =
    marks.length === 0 && nodes.length === 0 && blocks.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-ink-0 overflow-y-auto">
      <div
        className="max-w-md mx-auto px-4 pb-8"
        style={{
          paddingTop: `calc(1rem + var(--safe-top))`,
          paddingBottom: `calc(2rem + var(--safe-bottom))`,
        }}
      >
        <header className="flex items-center justify-between py-3">
          <h2 className="text-lg font-semibold">Review</h2>
          <button onClick={onClose} className="text-ink-4 text-sm">
            Skip all
          </button>
        </header>

        <section className="bg-ink-1 border border-ink-2 rounded-xl p-4 mb-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-ink-4">Summary</div>
          <p className="text-sm leading-relaxed">{extraction.summary || entry.transcript.slice(0, 200)}</p>
          {extraction.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {extraction.tags.map((t) => (
                <span key={t} className="text-[10px] uppercase font-medium bg-ink-2 px-2 py-0.5 rounded">
                  {t}
                </span>
              ))}
            </div>
          )}
        </section>

        {nothingProposed && (
          <div className="text-center text-ink-4 text-sm py-6">
            Claude didn't propose any marks, nodes, or schedule blocks for this entry.
          </div>
        )}

        {marks.length > 0 && (
          <Section title="Marks">
            {marks.map((m, i) => (
              <ProposalCard
                key={m.draft.id}
                accent={m.decision === 'accept'}
                onToggle={() =>
                  setMarks((prev) =>
                    prev.map((x, j) =>
                      j === i
                        ? { ...x, decision: x.decision === 'accept' ? 'reject' : 'accept' }
                        : x,
                    ),
                  )
                }
                onChange={(patch) =>
                  setMarks((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, draft: { ...x.draft, ...patch } } : x,
                    ),
                  )
                }
                label={m.draft.scope.toUpperCase()}
                title={m.draft.title}
                onTitleChange={(t) =>
                  setMarks((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, draft: { ...x.draft, title: t } } : x,
                    ),
                  )
                }
                accepted={m.decision === 'accept'}
              >
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['day', 'week', 'month', 'year'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setMarks((prev) =>
                          prev.map((x, j) =>
                            j === i
                              ? { ...x, draft: { ...x.draft, scope: s } }
                              : x,
                          ),
                        )
                      }
                      className={`rounded-md py-1.5 ${m.draft.scope === s ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </ProposalCard>
            ))}
          </Section>
        )}

        {nodes.length > 0 && (
          <Section title="Mind">
            {nodes.map((n, i) => (
              <ProposalCard
                key={n.draft.id}
                accent={n.decision === 'accept'}
                onToggle={() =>
                  setNodes((prev) =>
                    prev.map((x, j) =>
                      j === i
                        ? { ...x, decision: x.decision === 'accept' ? 'reject' : 'accept' }
                        : x,
                    ),
                  )
                }
                onChange={() => {}}
                label={n.draft.type.toUpperCase()}
                title={n.draft.title}
                onTitleChange={(t) =>
                  setNodes((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, draft: { ...x.draft, title: t } } : x,
                    ),
                  )
                }
                accepted={n.decision === 'accept'}
              >
                <textarea
                  value={n.draft.description}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((x, j) =>
                        j === i
                          ? { ...x, draft: { ...x.draft, description: e.target.value } }
                          : x,
                      ),
                    )
                  }
                  rows={2}
                  className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-xs"
                />
              </ProposalCard>
            ))}
          </Section>
        )}

        {blocks.length > 0 && (
          <Section title="Schedule">
            {blocks.map((b, i) => (
              <ProposalCard
                key={b.draft.id}
                accent={b.decision === 'accept'}
                onToggle={() =>
                  setBlocks((prev) =>
                    prev.map((x, j) =>
                      j === i
                        ? { ...x, decision: x.decision === 'accept' ? 'reject' : 'accept' }
                        : x,
                    ),
                  )
                }
                onChange={() => {}}
                label={`${b.draft.estimated_minutes}m`}
                title={b.draft.title}
                onTitleChange={(t) =>
                  setBlocks((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, draft: { ...x.draft, title: t } } : x,
                    ),
                  )
                }
                accepted={b.decision === 'accept'}
              >
                <div className="flex flex-wrap gap-1 text-xs">
                  {(
                    [
                      'tonight',
                      'tomorrow_morning',
                      'this_weekend',
                      'during_work',
                      'flexible',
                    ] as const
                  ).map((w) => (
                    <button
                      key={w}
                      onClick={() =>
                        setBlocks((prev) =>
                          prev.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  draft: {
                                    ...x.draft,
                                    suggested_window: w,
                                    scheduled_for: resolveSuggestedWindow(w),
                                  },
                                }
                              : x,
                          ),
                        )
                      }
                      className={`rounded-md px-2 py-1 ${b.draft.suggested_window === w ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
                    >
                      {describeWindow(w)}
                    </button>
                  ))}
                </div>
              </ProposalCard>
            ))}
          </Section>
        )}

        <button
          onClick={commit}
          disabled={saving}
          className="w-full mt-4 bg-accent rounded-xl py-3.5 font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save accepted items'}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <h3 className="text-xs uppercase tracking-wide text-ink-4 mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ProposalCard({
  label,
  title,
  onTitleChange,
  accepted,
  onToggle,
  accent,
  children,
  onChange: _onChange,
}: {
  label: string;
  title: string;
  onTitleChange: (s: string) => void;
  accepted: boolean;
  onToggle: () => void;
  accent: boolean;
  children: ReactNode;
  onChange?: (patch: Record<string, unknown>) => void;
}) {
  void _onChange;
  return (
    <div
      className={`rounded-xl border p-3 space-y-2 ${accent ? 'border-accent/50 bg-accent/5' : 'border-ink-3 bg-ink-1 opacity-60'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-wide bg-ink-2 px-1.5 py-0.5 rounded">
          {label}
        </span>
        <button
          onClick={onToggle}
          className={`text-xs px-2 py-1 rounded ${accepted ? 'bg-good/20 text-good' : 'bg-ink-3 text-ink-4'}`}
        >
          {accepted ? 'Accepted' : 'Rejected'}
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm font-medium"
      />
      {children}
    </div>
  );
}
