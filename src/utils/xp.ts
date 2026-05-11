// XP and level math, plus streak helpers. Pure functions — no IO.

import type { MarkScope, Stats } from '../types';

export function xpForBlock(durationMinutes: number): number {
  return Math.ceil(Math.max(1, durationMinutes) / 15) * 10;
}

export function markHitBonus(scope: MarkScope): number {
  switch (scope) {
    case 'day':
      return 25;
    case 'week':
      return 100;
    case 'month':
      return 500;
    case 'year':
      return 2000; // Implied by the curve. Tweak if desired.
  }
}

/** xp_for_next_level = 500 * level^1.5 */
export function xpForNextLevel(level: number): number {
  return Math.round(500 * Math.pow(level, 1.5));
}

/** Given total cumulative XP, return the current level (>=1). */
export function levelForTotalXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  return level;
}

/** Progress toward the next level, in [0, 1]. */
export function levelProgress(totalXp: number): {
  level: number;
  current: number;
  needed: number;
  ratio: number;
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  const needed = xpForNextLevel(level);
  return {
    level,
    current: remaining,
    needed,
    ratio: needed > 0 ? remaining / needed : 0,
  };
}

function isoDate(d: Date | string): string {
  const dd = typeof d === 'string' ? new Date(d) : d;
  return dd.toISOString().slice(0, 10);
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00Z').getTime();
  const b = new Date(bIso + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Award XP and update the streak based on today's activity.
 * Returns the updated stats AND any streak-milestone bonus that was paid out.
 */
export function awardXP(
  stats: Stats,
  xp: number,
  today = new Date(),
): { stats: Stats; streakBonus: number } {
  const todayIso = isoDate(today);
  let streakBonus = 0;

  let streak = stats.current_streak_days;
  let longest = stats.longest_streak_days;

  if (!stats.last_active_date) {
    streak = 1;
  } else {
    const gap = daysBetween(stats.last_active_date.slice(0, 10), todayIso);
    if (gap === 0) {
      // Same day — streak unchanged
    } else if (gap === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
  }
  if (streak > longest) longest = streak;

  // +50 XP per 7-day milestone (only on the day we cross it)
  if (
    streak > 0 &&
    streak % 7 === 0 &&
    stats.current_streak_days !== streak
  ) {
    streakBonus = 50;
  }

  return {
    stats: {
      ...stats,
      total_xp: stats.total_xp + xp + streakBonus,
      level: levelForTotalXp(stats.total_xp + xp + streakBonus),
      current_streak_days: streak,
      longest_streak_days: longest,
      last_active_date: today.toISOString(),
    },
    streakBonus,
  };
}
