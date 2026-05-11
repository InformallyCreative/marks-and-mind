import { useEffect, useMemo, useState } from 'react';
import { deleteNode, listNodes, putNode } from '../../services/db';
import { nowIso } from '../../utils/time';
import { uuid } from '../../utils/uuid';
import type { MindNode, NodeType } from '../../types';
import { NodeCard } from './NodeCard';

interface Props {
  onChange: () => void;
}

const TYPES: NodeType[] = ['skill', 'knowledge', 'tool'];

export function MindView({ onChange }: Props) {
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NodeType | 'all'>('all');
  const [adding, setAdding] = useState<NodeType | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    listNodes().then(setNodes);
  }, []);

  async function reload() {
    setNodes(await listNodes());
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes
      .filter((n) => typeFilter === 'all' || n.type === typeFilter)
      .filter(
        (n) =>
          !q ||
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.last_touched_at < b.last_touched_at ? 1 : -1));
  }, [nodes, query, typeFilter]);

  async function add(type: NodeType) {
    if (!newTitle.trim()) {
      setAdding(null);
      return;
    }
    const n: MindNode = {
      id: uuid(),
      type,
      title: newTitle.trim(),
      description: newDesc.trim(),
      related_node_ids: [],
      related_entry_ids: [],
      created_at: nowIso(),
      last_touched_at: nowIso(),
    };
    await putNode(n);
    setNewTitle('');
    setNewDesc('');
    setAdding(null);
    reload();
    onChange();
  }

  async function remove(n: MindNode) {
    if (!confirm(`Delete "${n.title}"?`)) return;
    await deleteNode(n.id);
    reload();
  }

  async function update(n: MindNode, patch: Partial<MindNode>) {
    const next: MindNode = { ...n, ...patch, last_touched_at: nowIso() };
    await putNode(next);
    reload();
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search skills, knowledge, tools…"
        className="w-full bg-ink-2 border border-ink-3 rounded-lg p-2.5 text-sm"
      />
      <div className="flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1 rounded-full ${typeFilter === 'all' ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full capitalize ${typeFilter === t ? 'bg-accent text-white' : 'bg-ink-2 text-ink-4'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2 text-xs">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => {
              setAdding(t);
              setNewTitle('');
              setNewDesc('');
            }}
            className="flex-1 bg-ink-2 border border-ink-3 rounded-md py-1.5 capitalize text-accent-soft"
          >
            + {t}
          </button>
        ))}
      </div>

      {adding && (
        <div className="bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2">
          <div className="text-xs uppercase tracking-wide text-ink-4">
            New {adding}
          </div>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(null)}
              className="flex-1 bg-ink-3 rounded-md py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => add(adding)}
              className="flex-1 bg-accent rounded-md py-2 text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-ink-4 text-xs py-6">
          {nodes.length === 0
            ? 'Your Mind is empty — record an entry or add nodes manually.'
            : 'No matches.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NodeCard
              key={n.id}
              node={n}
              onDelete={() => remove(n)}
              onSave={(patch) => update(n, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
