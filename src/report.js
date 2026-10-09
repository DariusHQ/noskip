import { CATEGORIES, RULES, RULES_BY_ID } from './rules/index.js';
import { HOMEPAGE, makeColors, plural, VERSION } from './util.js';

const LABEL = { high: 'HIGH', medium: 'MED ', low: 'LOW ' };

export function verdictLine(result, c = makeColors(false)) {
  const { counts, filesScanned, verdict, score } = result;
  const tally = `${counts.high} high · ${counts.medium} medium · ${counts.low} low`;
  if (verdict === 'busted') return `${c.bgRed(c.bold(' 🚨 BUSTED '))}  ${tally}   ${c.dim(`integrity ${score}/100`)}`;
  if (verdict === 'suspicious') return `${c.bgYellow(c.bold(' ⚠ SUSPICIOUS '))}  ${tally}   ${c.dim(`integrity ${score}/100`)}`;
  return `${c.bgGreen(c.bold(' ✔ CLEAN '))}  no cheating patterns in ${plural(filesScanned, 'changed file')}${counts.low ? c.dim(`  (${counts.low} low)`) : ''}`;
}

export function formatPretty(result, { color = false, quiet = false } = {}) {
  const c = makeColors(color);
  const out = [];
  const sev = {
    high: (s) => c.bgRed(c.bold(` ${s} `)),
    medium: (s) => c.bgYellow(c.bold(` ${s} `)),
    low: (s) => c.bgGray(` ${s} `),
  };
  if (!quiet) {
    const range = result.range ? `${result.range.oldLabel} → ${result.range.newLabel}` : '';
    out.push('', `${c.bold('noskip')} ${c.dim(`v${VERSION}`)}  ${c.dim(range)}`, '');
  } else if (!result.findings.length) return '';
  for (const f of result.findings) {
    out.push(`${sev[f.severity](LABEL[f.severity])} ${c.bold(f.rule)}  ${c.cyan(`${f.path}:${f.line}`)}${f.requested ? c.dim('  (requested by the user)') : ''}`);
    out.push(`      ${f.message}`);
    if (f.snippet) out.push(`      ${c.gray('│')} ${c.dim(f.snippet)}`);
    if (f.hint) out.push(`      ${c.gray('↳')} ${c.italic(c.dim(f.hint))}`);
    out.push('');
  }
  if (result.errors?.length) {
    for (const e of result.errors) out.push(c.yellow(`  ! rule ${e.rule} crashed and was skipped: ${e.message}`));
    out.push('');
  }
  out.push(verdictLine(result, c));
  if (result.verdict === 'busted' && !quiet) {
    out.push(c.dim('  These changes make tests pass without making the code correct.'));
  }
  out.push('');
  return out.join('\n');
}

export function formatJSON(result) {
  return JSON.stringify(
    {
      tool: 'noskip',
      version: VERSION,
      verdict: result.verdict,
      score: result.score,
      counts: result.counts,
      filesScanned: result.filesScanned,
      range: result.range ? { base: result.range.oldLabel, head: result.range.newLabel } : undefined,
      findings: result.findings,
      errors: result.errors?.length ? result.errors : undefined,
    },
    null,
    2,
  );
}

const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;');

export function formatMarkdown(result) {
  const { counts, verdict, score, findings, filesScanned } = result;
  const head = {
    busted: `### 🚨 noskip: BUSTED`,
    suspicious: `### ⚠️ noskip: suspicious changes`,
    clean: `### ✅ noskip: clean`,
  }[verdict];
  const lines = [head, ''];
  if (!findings.length) {
    lines.push(`No test-gaming patterns in ${plural(filesScanned, 'changed file')}.`);
  } else {
    lines.push(`**${counts.high} high · ${counts.medium} medium · ${counts.low} low** · integrity ${score}/100`, '');
    lines.push('| | Rule | Where | What |', '|---|---|---|---|');
    const icon = { high: '🔴', medium: '🟡', low: '⚪' };
    for (const f of findings) {
      const snippet = f.snippet ? `<br><code>${html(f.snippet)}</code>` : '';
      lines.push(`| ${icon[f.severity]} | \`${f.rule}\` | \`${html(f.path)}:${f.line}\` | ${html(f.message)}${snippet} |`);
    }
  }
  lines.push('', `<sub>[noskip](${HOMEPAGE}) v${VERSION}: anti-cheat for AI coding agents</sub>`, '');
  return lines.join('\n');
}

const escData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = (s) => escData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

export function formatGitHub(result) {
  const level = { high: 'error', medium: 'warning', low: 'notice' };
  const out = result.findings.map(
    (f) =>
      `::${level[f.severity]} file=${escProp(f.path)},line=${f.line},title=${escProp(`noskip/${f.rule}`)}::${escData(`${f.message}${f.hint ? `\n${f.hint}` : ''}`)}`,
  );
  out.push(formatPretty(result, { color: false }));
  return out.join('\n');
}

export function formatSARIF(result) {
  const used = [...new Set(result.findings.map((f) => f.rule))];
  const rules = (used.length ? used : RULES.map((r) => r.id)).map((id) => {
    const r = RULES_BY_ID.get(id);
    return {
      id,
      name: id,
      shortDescription: { text: r.title },
      fullDescription: { text: `${r.title}. ${r.hint}` },
      helpUri: `${HOMEPAGE}/blob/main/docs/rules.md#${id}`,
      defaultConfiguration: { level: sarifLevel(r.severity) },
      properties: { category: CATEGORIES[r.category], tags: ['ai-agents', 'testing', r.category] },
    };
  });
  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'noskip', version: VERSION, informationUri: HOMEPAGE, rules } },
          results: result.findings.map((f) => ({
            ruleId: f.rule,
            level: sarifLevel(f.severity),
            message: { text: `${f.message}. ${f.hint ?? ''}`.trim() },
            locations: [{ physicalLocation: { artifactLocation: { uri: f.path }, region: { startLine: Math.max(1, f.line) } } }],
          })),
        },
      ],
    },
    null,
    2,
  );
}

function sarifLevel(sev) {
  return sev === 'high' ? 'error' : sev === 'medium' ? 'warning' : 'note';
}

export function formatRules(color = false) {
  const c = makeColors(color);
  const out = [''];
  for (const [cat, label] of Object.entries(CATEGORIES)) {
    out.push(c.bold(label));
    for (const r of RULES.filter((x) => x.category === cat)) {
      const s = { high: c.red('high  '), medium: c.yellow('medium'), low: c.gray('low   ') }[r.severity];
      out.push(`  ${s}  ${r.id.padEnd(20)} ${c.dim(r.title)}`);
    }
    out.push('');
  }
  return out.join('\n');
}
