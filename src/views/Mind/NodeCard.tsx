import { useState } from 'react';
import { formatTimeAgo } from '../../utils/time';
import type { MindNode } from '../../types';

interface Props {
  node: MindNode;
  onDelete: () => void;
  onSave: (patch: Partial<MindNode>) => void;
}

export function NodeCard({ node, onDelete, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [desc, setDesc] = useState(node.description);

  function save() {
    onSave({ title: title.trim() || node.title, description: desc });
    setEditing(false);
  }

  // Three Fortnite colors map cleanly to three node types:
  //   skill = purple (what you can do)
  //   knowledge = blue (what you know)
  //   tool = gold (what you use to win)
  const badgeColor = {
    skill: 'bg-accent/15 text-accent-soft',
    knowledge: 'bg-sky/15 text-sky-soft',
    tool: 'bg-gold/15 text-gold-soft',
  }[node.type];

  return (
    <div className="bg-ink-1 border border-ink-2 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${badgeColor}`}>
          {node.type}
        </span>
        <span className="text-[11px] text-ink-4 ml-auto">
          touched {formatTimeAgo(node.last_touched_at)}
        </span>
      </div>

      {editing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-sm font-medium"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            className="w-full bg-ink-2 border border-ink-3 rounded-md p-2 text-xs"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTitle(node.title);
                setDesc(node.description);
                setEditing(false);
              }}
              className="flex-1 bg-ink-3 rounded-md py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="flex-1 bg-accent rounded-md py-1.5 text-xs font-semibold"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm font-medium">{node.title}</div>
          {node.description && (
            <p className="text-xs text-ink-4 leading-relaxed">{node.description}</p>
          )}
          <div className="flex gap-3 text-[11px] text-ink-4">
            <button onClick={() => setEditing(true)} className="hover:text-accent-soft">
              Edit
            </button>
            <button onClick={onDelete} className="hover:text-bad">
              Delete
            </button>
            {node.related_entry_ids.length > 0 && (
              <span className="ml-auto">
                {node.related_entry_ids.length} linked entr{node.related_entry_ids.length === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
