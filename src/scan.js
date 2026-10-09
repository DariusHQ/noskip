import { classify, isVendored } from './classify.js';
import { CONFIG_FILE, compileConfig, DEFAULT_CONFIG, loadConfigFile, parseConfig } from './config.js';
import { parseDiff } from './diff.js';
import {
  diffTrees,
  git,
  headTree,
  indexTree,
  listTree,
  mergeBase,
  readBlobs,
  resolveCommit,
  resolveTree,
  worktreeTree,
} from './git.js';
import { applyIntent } from './intent.js';
import { analyzeTests, RULES, RULES_BY_ID } from './rules/index.js';
import { lineStarts, severityRank } from './util.js';

/**
 * Work out which two trees to compare.
 *   default        HEAD            -> working tree (incl. untracked files)
 *   staged         HEAD            -> index
 *   base: rev      rev             -> working tree / head
 *   mergeBase: ref merge-base(ref) -> working tree / head
 */
export function resolveRange(root, { base, mergeBaseRef, staged = false, head } = {}) {
  let newTree;
  let newLabel;
  let newCommit = null;
  if (staged) {
    newTree = indexTree(root);
    newLabel = 'staged changes';
  } else if (head) {
    newTree = resolveTree(root, head);
    if (!newTree) throw new Error(`unknown revision: ${head}`);
    newCommit = resolveCommit(root, head);
    newLabel = head;
  } else {
    newTree = worktreeTree(root);
    newLabel = 'working tree';
  }

  let oldTree;
  let oldLabel;
  let oldCommit = null;
  if (mergeBaseRef) {
    const mb = mergeBase(root, mergeBaseRef, head || 'HEAD');
    if (!mb) throw new Error(`no common ancestor between ${mergeBaseRef} and ${head || 'HEAD'} (fetch more history?)`);
    oldTree = resolveTree(root, mb);
    oldCommit = mb;
    oldLabel = `${mergeBaseRef} (${mb.slice(0, 7)})`;
  } else if (base) {
    oldTree = resolveTree(root, base);
    if (!oldTree) throw new Error(`unknown revision: ${base}`);
    oldCommit = resolveCommit(root, base);
    oldLabel = base;
  } else {
    oldTree = headTree(root);
    oldLabel = 'HEAD';
  }
  return { oldTree, newTree, oldLabel, newLabel, oldCommit, newCommit };
}

const ALLOW_TRAILER = /^anticheat-allow:[ \t]*(.+)$/gim;

/**
 * `Anticheat-Allow: test-removed, assertions-removed (the --jitless flag is gone)` in a commit
 * message of the scanned range: a human signed off on that change. The finding stays visible,
 * downgraded to medium, so it no longer fails the check.
 */
export function allowedByCommits(root, oldCommit, newCommit) {
  const allowed = new Map();
  if (!oldCommit || !newCommit) return allowed;
  const res = git(['log', '--format=%H%x00%B%x1e', `${oldCommit}..${newCommit}`], { cwd: root, allowFail: true });
  if (res.status !== 0) return allowed;
  for (const entry of res.stdout.split('\x1e')) {
    const [sha, body = ''] = entry.trim().split('\0');
    for (const m of body.matchAll(ALLOW_TRAILER)) {
      let rest = m[1].trim();
      const ids = [];
      for (;;) {
        const id = /^([a-z][\w-]*)\s*,?\s*/.exec(rest);
        if (!id || !RULES_BY_ID.has(id[1])) break;
        ids.push(id[1]);
        rest = rest.slice(id[0].length);
      }
      const reason = rest.replace(/^[-–—:(]+\s*/, '').replace(/\s*\)$/, '').trim();
      for (const id of ids) if (!allowed.has(id)) allowed.set(id, { commit: sha.slice(0, 7), reason });
    }
  }
  return allowed;
}

/**
 * Config always comes from the *old* side of the diff, so a change cannot loosen
 * the rules that judge it.
 */
export function loadConfig(root, oldTree, explicitFile) {
  if (explicitFile) return loadConfigFile(explicitFile);
  const text = readBlobs(root, [`${oldTree}:${CONFIG_FILE}`]).get(`${oldTree}:${CONFIG_FILE}`);
  return text ? parseConfig(text, `${CONFIG_FILE} (from ${oldTree.slice(0, 7)})`) : { ...DEFAULT_CONFIG };
}

const toLines = (t) => (t === null ? null : t.split('\n'));
const crlf = (t) => (t === null || t === undefined ? null : t.replace(/\r\n/g, '\n'));

function buildFile(d, blobs, oldTree, newTree, cfg) {
  const oldText = d.status === 'A' ? null : crlf(blobs.get(`${oldTree}:${d.oldPath}`));
  const newText = d.status === 'D' ? null : crlf(blobs.get(`${newTree}:${d.newPath}`));
  const kind = classify(d.path, { extraTestPatterns: cfg.testRes });
  const added = d.hunks.flatMap((h) => h.added);
  let newStarts;
  return {
    path: d.path,
    oldPath: d.oldPath,
    status: d.status,
    kind,
    lang: kind.lang,
    hunks: d.hunks,
    added,
    removed: d.hunks.flatMap((h) => h.removed),
    addedSet: new Set(added.map((a) => a.line)),
    oldText,
    newText,
    oldLines: toLines(oldText),
    newLines: toLines(newText),
    get newStarts() {
      return (newStarts ??= lineStarts(newText ?? ''));
    },
  };
}

const IGNORE_COMMENT = /anticheat-ignore(?:-next-line)?(?![\w-])(?:\s*:?\s*([a-z][\w-]*(?:\s*,\s*[a-z][\w-]*)*))?/i;

function suppressed(file, finding) {
  if (finding.rule === 'ignore-marker-added' || !file.newLines) return false;
  for (const ln of [finding.line, finding.line - 1]) {
    const text = file.newLines[ln - 1];
    if (!text) continue;
    const m = IGNORE_COMMENT.exec(text);
    if (!m) continue;
    if (ln === finding.line - 1 && !/anticheat-ignore-next-line/i.test(text)) continue;
    const ids = (m[1] ?? '').split(',').map((s) => s.trim()).filter((s) => RULES_BY_ID.has(s));
    if (ids.length === 0 || ids.includes(finding.rule)) return true;
  }
  return false;
}

/** Scan the difference between two trees. */
export function scanTrees({ root, oldTree, newTree, config, prompt, allowed } = {}) {
  const cfg = compileConfig(config ?? loadConfig(root, oldTree));
  const parsed = parseDiff(diffTrees(root, oldTree, newTree));
  const diffs = parsed.filter((d) => !d.binary && !isVendored(d.path) && !cfg.ignoreRes.some((re) => re.test(d.path)));

  const specs = [];
  for (const d of diffs) {
    if (d.status !== 'A' && d.oldPath) specs.push(`${oldTree}:${d.oldPath}`);
    if (d.status !== 'D' && d.newPath) specs.push(`${newTree}:${d.newPath}`);
  }
  const blobs = readBlobs(root, specs);
  const files = diffs.map((d) => buildFile(d, blobs, oldTree, newTree, cfg));

  let treeList;
  const ctx = {
    root,
    oldTree,
    newTree,
    files,
    config: cfg,
    classifyPath: (p) => classify(p, { extraTestPatterns: cfg.testRes }),
    listNewTree: () => (treeList ??= listTree(root, newTree)),
    readNew(paths) {
      const m = readBlobs(root, paths.map((p) => `${newTree}:${p}`));
      return paths.map((p) => [p, crlf(m.get(`${newTree}:${p}`))]);
    },
  };

  const errors = [];
  try {
    analyzeTests(ctx);
  } catch (err) {
    errors.push({ rule: 'tests', message: err.message });
    ctx.testDiff = { deletedFiles: [], removed: [], replaced: [], removedIn: new Set() };
    ctx.assertionChanges = [];
  }

  const byPath = new Map(files.map((f) => [f.path, f]));
  const seen = new Set();
  let findings = [];
  for (const rule of RULES) {
    const level = cfg.rules[rule.id];
    if (level === 'off') continue;
    let hits = [];
    try {
      if (rule.checkAll) hits = rule.checkAll(ctx);
      else for (const f of files) if (rule.applies(f)) for (const h of rule.check(f)) hits.push({ file: f, ...h });
    } catch (err) {
      // A bug in one rule must never break someone's commit or block their agent.
      if (process.env.ANTICHEAT_DEBUG) throw err;
      errors.push({ rule: rule.id, message: err.message });
      continue;
    }
    for (const h of hits) {
      const key = `${rule.id}\0${h.file.path}\0${h.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const finding = {
        rule: rule.id,
        category: rule.category,
        severity: level ?? h.severity ?? rule.severity,
        title: rule.title,
        message: h.message ?? rule.title,
        path: h.file.path,
        line: h.line ?? 1,
        snippet: h.snippet,
        hint: rule.hint,
      };
      if (!suppressed(byPath.get(finding.path) ?? h.file, finding)) findings.push(finding);
    }
  }

  if (prompt) findings = applyIntent(findings, prompt);
  if (allowed?.size) {
    findings = findings.map((f) => {
      const a = allowed.get(f.rule);
      if (!a) return f;
      const note = `allowed in ${a.commit}${a.reason ? `: ${a.reason}` : ''}`;
      return { ...f, severity: f.severity === 'high' ? 'medium' : f.severity, allowed: note, message: `${f.message} (${note})` };
    });
  }
  findings.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.path.localeCompare(b.path) || a.line - b.line,
  );
  return summarize({ findings, filesScanned: files.length, failOn: cfg.failOn, errors });
}

export function summarize({ findings, filesScanned, failOn = 'high', errors = [] }) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity]++;
  const verdict = counts.high ? 'busted' : counts.medium ? 'suspicious' : 'clean';
  const score = Math.max(0, 100 - 25 * counts.high - 8 * counts.medium - 2 * counts.low);
  return { verdict, score, counts, filesScanned, findings, failOn, errors };
}

/** Convenience: resolve, load config and scan in one go. */
export function scan(root, options = {}) {
  const range = resolveRange(root, options);
  const config = loadConfig(root, range.oldTree, options.configFile);
  const allowed = allowedByCommits(root, range.oldCommit, range.newCommit);
  const result = scanTrees({ root, oldTree: range.oldTree, newTree: range.newTree, config, prompt: options.prompt, allowed });
  if (options.failOn) result.failOn = options.failOn;
  return { ...result, range };
}
