// Date/time helpers used across the app.

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDayIso(d: Date | string): string {
  const dd = typeof d === 'string' ? new Date(d) : d;
  return dd.toISOString().slice(0, 10);
}

export function formatTimeAgo(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime();
  const diff = now.getTime() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayLabel(iso: string, now = new Date()): string {
  const target = new Date(iso);
  const today = toDayIso(now);
  const targetDay = toDayIso(target);
  if (today === targetDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (toDayIso(yesterday) === targetDay) return 'Yesterday';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (toDayIso(tomorrow) === targetDay) return 'Tomorrow';
  return target.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Resolve a suggested_window enum into an actual ISO datetime. */
export function resolveSuggestedWindow(
  win: string,
  now = new Date(),
): string {
  const d = new Date(now);
  switch (win) {
    case 'tonight': {
      d.setHours(19, 30, 0, 0);
      if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
      return d.toISOString();
    }
    case 'tomorrow_morning': {
      d.setDate(d.getDate() + 1);
      d.setHours(8, 30, 0, 0);
      return d.toISOString();
    }
    case 'this_weekend': {
      const day = d.getDay(); // 0=Sun
      const daysUntilSat = (6 - day + 7) % 7;
      d.setDate(d.getDate() + (daysUntilSat || 0));
      d.setHours(10, 0, 0, 0);
      return d.toISOString();
    }
    case 'during_work': {
      // Next weekday 10am
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      d.setHours(10, 0, 0, 0);
      return d.toISOString();
    }
    case 'flexible':
    default:
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return d.toISOString();
  }
}

export function describeWindow(win: string): string {
  switch (win) {
    case 'tonight':
      return 'Tonight';
    case 'tomorrow_morning':
      return 'Tomorrow morning';
    case 'this_weekend':
      return 'This weekend';
    case 'during_work':
      return 'During work';
    case 'flexible':
    default:
      return 'Flexible';
  }
}
