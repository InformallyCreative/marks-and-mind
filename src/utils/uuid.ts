// Use crypto.randomUUID where available, fall back to a v4-shaped random.
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122-ish v4
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-';
    else if (i === 14) out += '4';
    else if (i === 19) out += hex[(Math.random() * 4) | (8 & 0xf)];
    else out += hex[(Math.random() * 16) | 0];
  }
  return out;
}
