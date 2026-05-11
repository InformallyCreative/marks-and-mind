import { useState } from 'react';
import { xpForBlock } from '../../utils/xp';
import { describeWindow } from '../../utils/time';
import type { ScheduleBlock } from '../../types';

interface Props {
  block: ScheduleBlock;
  timeLabel: string;
  onComplete: () => void;
  onUncomplete: () => void;
  onSkip: () => void;
  onDelete: () => void;
}

export function BlockCard({
  block,
  timeLabel,
  onComplete,
  onUncomplete,
  onSkip,
  onDelete,
}: Props) {
  const [showActions, setShowActions] = useState(false);
  const done = block.status === 'done';
  const skipped = block.status === 'skipped';
  const xp = xpForBlock(block.estimated_minutes);

  return (
    <div
      className={`rounded-xl border p-3 ${done ? 'border-good/40 bg-good/5' : skipped ? 'border-ink-3 bg-ink-1 opacity-50' : 'border-ink-2 bg-ink-1'}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={done ? onUncomplete : onComplete}
          aria-label={done ? 'Mark not done' : 'Mark done'}
          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border-2 transition active:scale-90 ${done ? 'bg-good border-good' : 'border-ink-3 hover:border-accent'}`}
        >
          {done && (
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${done ? 'line-through text-ink-4' : ''}`}>
            {block.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-ink-4">
            <span>{timeLabel}</span>
            <span>· {block.estimated_minutes}m</span>
            <span>· +{done ? block.xp_awarded : xp} XP</span>
            <span>· {describeWindow(block.suggested_window)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowActions((x) => !x)}
          aria-label="More actions"
          className="text-ink-4 text-lg leading-none px-1"
        >
          ⋯
        </button>
      </div>
      {showActions && (
        <div className="flex gap-2 mt-2 text-xs">
          {!done && !skipped && (
            <button
              onClick={onSkip}
              className="flex-1 bg-ink-3 rounded-md py-1.5"
            >
              Skip
            </button>
          )}
          <button
            onClick={onDelete}
            className="flex-1 bg-bad/15 text-bad rounded-md py-1.5"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
