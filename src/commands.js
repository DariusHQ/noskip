// Shell commands an agent should never run on its own: they switch the referee off.

function stripMessages(cmd) {
  return cmd
    .replace(/<<-?\s*['"]?(\w+)['"]?[^]*?\n\s*\1\b/g, ' ') // heredoc bodies (commit messages)
    .replace(/(?:^|\s)(?:-m|--message|-F|--file)(?:=|\s+)(?:"(?:\\.|[^"\\])*"|'[^']*'|\$\((?:[^()]|\([^()]*\))*\)|\S+)/g, ' ');
}

function segments(cmd) {
  return cmd.split(/&&|\|\||[;|\n]/).map((s) => s.trim()).filter(Boolean);
}

const HOOK_DIRS = String.raw`(?:\.git[\\/]+hooks|\.husky)\b`;
const GUARD_FILES = /\.noskip\.json|\.claude[\\/]settings(?:\.local)?\.json|\.codex[\\/](?:hooks\.json|config\.toml)|\.cursor[\\/]hooks\.json|\.gemini[\\/]settings\.json/;

const CHECKS = [
  {
    rule: 'no-verify',
    test: (seg) => /\bgit\b/.test(seg) && /\b(?:commit|push|merge|rebase|am|cherry-pick|revert)\b/.test(seg) && /(?:^|\s)--no-verify\b/.test(seg),
    message: '`--no-verify` skips the git hooks that check this change',
  },
  {
    rule: 'no-verify',
    test: (seg) => /\bgit\b.*\bcommit\b/.test(seg) && seg.split(/\s+/).some((t) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(t)),
    message: '`git commit -n` skips the git hooks that check this change',
  },
  {
    rule: 'no-verify',
    test: (seg) => /(?:^|\s)(?:HUSKY|LEFTHOOK)=0\b|\bHUSKY_SKIP_HOOKS=(?:1|true)\b|(?:^|\s)SKIP=\S+.*\bgit\b/.test(seg),
    message: 'this environment variable disables the git hooks that check this change',
  },
  {
    rule: 'no-verify',
    test: (seg) => /\bcore\.hooksPath\b\s*=?\s*(?:\/dev\/null|NUL\b|""|''|$)/.test(seg),
    message: 'pointing core.hooksPath at nothing disables every git hook',
  },
  {
    rule: 'guard-tampered',
    test: (seg) => /\bgit\s+update-index\b.*--(?:assume-unchanged|skip-worktree)\b/.test(seg),
    message: '`git update-index --assume-unchanged/--skip-worktree` hides changes from review',
  },
  {
    rule: 'guard-tampered',
    test: (seg) => new RegExp(String.raw`\b(?:rm|del|erase|unlink|mv|move|Remove-Item|Move-Item)\b.*${HOOK_DIRS}`).test(seg),
    message: 'removing git hooks disables the checks they run',
  },
  {
    rule: 'guard-tampered',
    test: (seg) => new RegExp(String.raw`\bchmod\b.*(?:-x|[ugoa]-[rwx]*x|\b0?[0-6][0-6][0-6]\b).*${HOOK_DIRS}`).test(seg),
    message: 'making git hooks non-executable disables the checks they run',
  },
  {
    rule: 'guard-tampered',
    test: (seg) => /\bnoskip\b.*\buninstall\b/.test(seg),
    message: 'uninstalling noskip needs a human decision',
  },
  {
    rule: 'guard-tampered',
    test: (seg) =>
      (/\b(?:sed|perl)\b.*\s-i|\b(?:Set-Content|Add-Content|Out-File|tee|truncate)\b/.test(seg) && GUARD_FILES.test(seg)) ||
      new RegExp(String.raw`>>?\s*["']?[^\s"']*(?:${GUARD_FILES.source})`).test(seg),
    message: 'editing noskip or agent hook configuration needs a human decision',
  },
];

/** Returns { rule, message } for a command that disables checks, or null. */
export function checkCommand(command) {
  if (!command || typeof command !== 'string') return null;
  for (const seg of segments(stripMessages(command))) {
    for (const c of CHECKS) if (c.test(seg)) return { rule: c.rule, message: c.message, segment: seg };
  }
  return null;
}
