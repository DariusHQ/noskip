import { readFileSync } from 'node:fs';
import { SEVERITIES } from './util.js';

export const CONFIG_FILE = '.anticheat.json';

export const DEFAULT_CONFIG = Object.freeze({
  ignore: [],
  rules: {},
  failOn: 'high',
  testPatterns: [],
});

/** Minimal gitignore-style glob: `*`, `**`, `?`; a pattern without `/` matches at any depth. */
export function globToRegExp(glob) {
  let g = glob.trim().replace(/\\/g, '/');
  let dirOnly = false;
  if (g.endsWith('/')) {
    dirOnly = true;
    g = g.slice(0, -1);
  }
  const anchored = g.startsWith('/') || g.includes('/');
  if (g.startsWith('/')) g = g.slice(1);
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const prefix = anchored ? '^' : '^(?:.*/)?';
  const suffix = dirOnly ? '/' : '(?:$|/)';
  return new RegExp(prefix + re + suffix);
}

export function parseConfig(text, source = CONFIG_FILE) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`${source}: invalid JSON (${err.message})`);
  }
  return normalizeConfig(raw, source);
}

export function normalizeConfig(raw, source = CONFIG_FILE) {
  const cfg = { ...DEFAULT_CONFIG, rules: {}, ignore: [], testPatterns: [] };
  if (!raw || typeof raw !== 'object') return cfg;
  if (Array.isArray(raw.ignore)) cfg.ignore = raw.ignore.filter((s) => typeof s === 'string');
  if (Array.isArray(raw.testPatterns)) cfg.testPatterns = raw.testPatterns.filter((s) => typeof s === 'string');
  if (raw.failOn !== undefined) {
    if (![...SEVERITIES, 'never'].includes(raw.failOn)) throw new Error(`${source}: failOn must be one of low, medium, high, never`);
    cfg.failOn = raw.failOn;
  }
  if (raw.rules && typeof raw.rules === 'object') {
    for (const [id, value] of Object.entries(raw.rules)) {
      if (value === 'off' || value === false || SEVERITIES.includes(value)) cfg.rules[id] = value === false ? 'off' : value;
      else throw new Error(`${source}: rules.${id} must be "off", "low", "medium" or "high"`);
    }
  }
  return cfg;
}

export function loadConfigFile(file) {
  return parseConfig(readFileSync(file, 'utf8'), file);
}

export function compileConfig(cfg) {
  return {
    ...cfg,
    ignoreRes: cfg.ignore.map(globToRegExp),
    testRes: cfg.testPatterns.map(globToRegExp),
  };
}
