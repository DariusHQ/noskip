const UNITS = { h: 3600, m: 60, s: 1 };

export function parseDuration(text) {
  const match = /^(\d+)([hms])$/.exec(text.trim());
  if (!match) {
    throw new Error(`invalid duration: ${text}`);
  }
  return Number(match[1]) * UNITS[match[2]];
}

export function formatDuration(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error(`invalid seconds: ${seconds}`);
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join('') || '0s';
}
