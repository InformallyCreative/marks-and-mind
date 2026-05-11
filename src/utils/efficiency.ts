// Efficiency rating algorithm. See the proposal for the spec.

import type { Entry, ScheduleBlock } from '../types';

function within30Days(iso: string, now = new Date()): boolean {
  const t = new Date(iso).getTime();
  return now.getTime() - t <= 30 * 86_400_000;
}

function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export interface EfficiencyInputs {
  talked_count: number;
  scheduled_count: number;
  completed_count: number;
  estimated_minutes: number;
  actual_minutes: number;
  on_time_count: number;
}

export function computeEfficiency(
  entries: Entry[],
  blocks: ScheduleBlock[],
  now = new Date(),
): { rating: number; inputs: EfficiencyInputs } {
  // talked_count: proposals from journal entries in the last 30 days.
  // For now we approximate as "entries linked to at least one block" + entries
  // that have linked_block_ids. We'll also count blocks whose linked_entry is
  // a recent entry, which is the more direct read.
  const recentEntryIds = new Set(
    entries.filter((e) => within30Days(e.timestamp, now)).map((e) => e.id),
  );

  const proposedFromRecentEntries = blocks.filter(
    (b) => b.linked_entry_id && recentEntryIds.has(b.linked_entry_id),
  );

  const talked_count = proposedFromRecentEntries.length;
  const scheduled_count = proposedFromRecentEntries.filter(
    (b) => b.status !== 'skipped',
  ).length;
  const completedBlocks = blocks.filter(
    (b) =>
      b.status === 'done' && b.completed_at && within30Days(b.completed_at, now),
  );
  const completed_count = completedBlocks.length;
  const estimated_minutes = completedBlocks.reduce(
    (sum, b) => sum + b.estimated_minutes,
    0,
  );
  const actual_minutes = completedBlocks.reduce(
    (sum, b) => sum + (b.actual_minutes ?? b.estimated_minutes),
    0,
  );
  const on_time_count = completedBlocks.filter((b) => {
    if (!b.completed_at) return false;
    const completed = new Date(b.completed_at);
    const target = new Date(b.scheduled_for);
    // On time if completed on or before the scheduled day
    return completed.toISOString().slice(0, 10) <=
      target.toISOString().slice(0, 10);
  }).length;

  const intent_conversion = talked_count
    ? clamp01(scheduled_count / talked_count)
    : 0;
  const execution_rate = scheduled_count
    ? clamp01(completed_count / scheduled_count)
    : 0;
  const time_accuracy = estimated_minutes
    ? clamp01(1 - Math.abs(actual_minutes - estimated_minutes) / estimated_minutes)
    : 0;
  const punctuality = completed_count
    ? clamp01(on_time_count / completed_count)
    : 0;

  const rating = Math.round(
    100 *
      (0.2 * intent_conversion +
        0.45 * execution_rate +
        0.15 * time_accuracy +
        0.2 * punctuality),
  );

  return {
    rating,
    inputs: {
      talked_count,
      scheduled_count,
      completed_count,
      estimated_minutes,
      actual_minutes,
      on_time_count,
    },
  };
}
