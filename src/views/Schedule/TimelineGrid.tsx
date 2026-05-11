// Visual hourly timeline for a single day. Positions blocks by scheduled_for,
// sizes them by estimated_minutes, shows a "now" indicator line, and stacks
// overlapping blocks side-by-side.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScheduleBlock } from '../../types';
import { xpForBlock } from '../../utils/xp';
import { toDayIso } from '../../utils/time';

interface Props {
  day: string; // YYYY-MM-DD
  blocks: ScheduleBlock[]; // already filtered to this day
  onTapBlock: (block: ScheduleBlock) => void;
  onTapEmptySlot?: (hour: number, minute: number) => void;
}

const START_HOUR = 6; // 06:00
const END_HOUR = 24; // 24:00 (midnight)
const HOUR_HEIGHT = 56; // px per hour
const HOURS = END_HOUR - START_HOUR;
const GRID_HEIGHT = HOURS * HOUR_HEIGHT;

interface PositionedBlock {
  block: ScheduleBlock;
  top: number; // px from top of grid
  height: number; // px
  column: number;
  columnCount: number;
}

/** Pack overlapping blocks into columns (Google Calendar-style). */
function layoutBlocks(items: ScheduleBlock[]): PositionedBlock[] {
  if (items.length === 0) return [];
  const withRanges = items
    .map((b) => {
      const d = new Date(b.scheduled_for);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const dur = Math.max(15, b.estimated_minutes);
      return { block: b, startMin, endMin: startMin + dur };
    })
    .sort((a, b) =>
      a.startMin === b.startMin ? a.endMin - b.endMin : a.startMin - b.startMin,
    );

  // Greedy column assignment
  const columns: { startMin: number; endMin: number }[][] = [];
  const placements = withRanges.map((item) => {
    let col = 0;
    while (col < columns.length) {
      const last = columns[col][columns[col].length - 1];
      if (last.endMin <= item.startMin) break;
      col++;
    }
    if (col === columns.length) columns.push([]);
    columns[col].push({ startMin: item.startMin, endMin: item.endMin });
    return { ...item, column: col };
  });

  const totalCols = columns.length;

  // For each placement, find max overlap group size to give visual width
  return placements.map((p) => {
    // Find columns currently overlapping with this block
    let cols = totalCols;
    if (totalCols > 1) {
      let overlap = 1;
      for (let i = 0; i < totalCols; i++) {
        if (i === p.column) continue;
        const hits = columns[i].some(
          (c) => c.startMin < p.endMin && c.endMin > p.startMin,
        );
        if (hits) overlap++;
      }
      cols = overlap;
    }
    const startPx = (p.startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60);
    const heightPx = (p.endMin - p.startMin) * (HOUR_HEIGHT / 60);
    return {
      block: p.block,
      top: Math.max(0, startPx),
      height: Math.max(28, heightPx),
      column: p.column,
      columnCount: cols,
    };
  });
}

export function TimelineGrid({ day, blocks, onTapBlock, onTapEmptySlot }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  // Tick "now" once per minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to current hour (or first block) on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const isToday = toDayIso(now) === day;
    let target: number;
    if (isToday) {
      const currentMin = now.getHours() * 60 + now.getMinutes();
      target = (currentMin - START_HOUR * 60) * (HOUR_HEIGHT / 60) - 120;
    } else if (blocks.length > 0) {
      const first = blocks
        .map((b) => new Date(b.scheduled_for).getHours() * 60 + new Date(b.scheduled_for).getMinutes())
        .reduce((a, b) => Math.min(a, b), 24 * 60);
      target = (first - START_HOUR * 60) * (HOUR_HEIGHT / 60) - 80;
    } else {
      target = 2 * HOUR_HEIGHT; // default to ~8am
    }
    containerRef.current.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const positioned = useMemo(() => layoutBlocks(blocks), [blocks]);

  const isToday = toDayIso(now) === day;
  const nowTopPx = isToday
    ? (now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) * (HOUR_HEIGHT / 60)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto rounded-xl bg-ink-1 border border-ink-2"
      style={{ height: 'min(520px, calc(100vh - 280px))' }}
    >
      <div
        className="relative"
        style={{ height: GRID_HEIGHT, paddingLeft: 44 }}
      >
        {/* Hour labels + lines */}
        {Array.from({ length: HOURS + 1 }).map((_, i) => {
          const hour = START_HOUR + i;
          const top = i * HOUR_HEIGHT;
          const label = formatHour(hour);
          return (
            <div key={hour} className="absolute left-0 right-0 pointer-events-none" style={{ top }}>
              <div className="absolute left-0 -translate-y-1/2 text-[10px] text-ink-4 font-mono w-10 text-right pr-2">
                {label}
              </div>
              <div className="absolute left-10 right-2 border-t border-ink-2/70" />
              {/* Half-hour ticks */}
              {hour < END_HOUR && (
                <div
                  className="absolute left-10 right-2 border-t border-dashed border-ink-2/30"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              )}
            </div>
          );
        })}

        {/* Tap-on-empty-slot listeners */}
        {onTapEmptySlot &&
          Array.from({ length: HOURS }).map((_, i) => (
            <button
              key={`slot-${i}`}
              onClick={() => onTapEmptySlot(START_HOUR + i, 0)}
              className="absolute left-10 right-2 hover:bg-ink-2/40 transition"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              aria-label={`Add block at ${formatHour(START_HOUR + i)}`}
            />
          ))}

        {/* "Now" indicator */}
        {nowTopPx !== null && nowTopPx >= 0 && nowTopPx <= GRID_HEIGHT && (
          <div
            className="absolute left-10 right-2 pointer-events-none z-20"
            style={{ top: nowTopPx }}
          >
            <div className="relative">
              <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-bad shadow shadow-bad/40" />
              <div className="border-t-2 border-bad/80" />
            </div>
          </div>
        )}

        {/* Blocks */}
        {positioned.map(({ block, top, height, column, columnCount }) => {
          const widthPct = 100 / columnCount;
          const leftPct = widthPct * column;
          return (
            <BlockTile
              key={block.id}
              block={block}
              onTap={() => onTapBlock(block)}
              style={{
                top,
                height,
                left: `calc(2.75rem + ${leftPct}% - 2px)`,
                width: `calc(${widthPct}% - 0.5rem)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function BlockTile({
  block,
  onTap,
  style,
}: {
  block: ScheduleBlock;
  onTap: () => void;
  style: React.CSSProperties;
}) {
  const done = block.status === 'done';
  const skipped = block.status === 'skipped';
  const inProgress = block.status === 'in_progress';
  const time = new Date(block.scheduled_for);
  const timeLabel = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const tall = (style.height as number) >= 60;

  return (
    <button
      onClick={onTap}
      style={style}
      className={`absolute rounded-lg overflow-hidden text-left px-2.5 py-1.5 transition active:scale-[0.98] border ${
        done
          ? 'bg-good/15 border-good/40 text-good'
          : skipped
            ? 'bg-ink-2 border-ink-3 text-ink-4 line-through'
            : inProgress
              ? 'bg-warn/15 border-warn/50 text-warn'
              : 'bg-accent/15 border-accent/50 text-white'
      }`}
    >
      <div className="text-[10px] font-mono opacity-80">{timeLabel} · {block.estimated_minutes}m</div>
      <div className={`font-medium leading-tight ${tall ? 'text-xs' : 'text-[11px] truncate'}`}>
        {block.title}
      </div>
      {tall && (
        <div className="text-[10px] mt-1 opacity-70">
          {done ? `+${block.xp_awarded} XP` : `+${xpForBlock(block.estimated_minutes)} XP`}
        </div>
      )}
    </button>
  );
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
