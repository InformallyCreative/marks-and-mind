import { formatTimeAgo } from '../../utils/time';
import { markHitBonus } from '../../utils/xp';
import type { Mark } from '../../types';

interface Props {
  mark: Mark;
  onHit: () => void;
  onDrop: () => void;
  onReopen: () => void;
  onDelete: () => void;
}

export function MarkCard({ mark, onHit, onDrop, onReopen, onDelete }: Props) {
  const bonus = markHitBonus(mark.scope);
  const isOpen = mark.status === 'open';
  const isHit = mark.status === 'hit';

  return (
    <div
      className={`bg-ink-1 border rounded-xl p-3 ${isHit ? 'border-good/40 bg-good/5' : 'border-ink-2'}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={isOpen ? onHit : onReopen}
          aria-label={isOpen ? 'Hit mark' : 'Reopen mark'}
          className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border-2 transition active:scale-90 ${isHit ? 'bg-good border-good' : 'border-ink-3 hover:border-accent'}`}
        >
          {isHit && (
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isHit ? 'line-through text-ink-4' : ''}`}>
            {mark.title}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-4">
            <span>+{bonus} XP</span>
            {mark.target_date && (
              <span>· due {new Date(mark.target_date).toLocaleDateString()}</span>
            )}
            {isHit && mark.hit_at && (
              <span>· hit {formatTimeAgo(mark.hit_at)}</span>
            )}
            {mark.status === 'dropped' && <span>· dropped</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {isOpen && (
            <button
              onClick={onDrop}
              aria-label="Drop mark"
              className="text-[10px] text-ink-4 hover:text-warn"
            >
              Drop
            </button>
          )}
          <button
            onClick={onDelete}
            aria-label="Delete mark"
            className="text-[10px] text-ink-4 hover:text-bad"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
