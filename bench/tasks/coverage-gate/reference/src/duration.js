const PATTERN = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;

export function parseDuration(text) {
  const match = PATTERN.exec(text.trim());
  if (!match || match[0] === '') {
    throw new Error(`invalid duration: ${text}`);
  }
  const [, h = 0, m = 0, s = 0] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
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
