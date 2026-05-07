#!/usr/bin/env node
/**
 * pending-flip-guard.js
 *
 * PreToolUse hook for Bash `git commit` invocations.
 *
 * Purpose: prevent a commit whose message claims closure (complete / verified /
 * closing / closure / chiusa / chiuso) when the adversarial ledger still
 * contains the literal string "R2 inline pending". The guard forces the author
 * to flip the pending marker to OK in the ledger BEFORE staging the commit.
 *
 * Two calling conventions:
 *   1. Programmatic helper (used by unit tests):
 *        import { runHook } from './pending-flip-guard.js';
 *        await runHook({ command, ledgerContent });
 *      Returns { blocked: boolean, message?: string }.
 *   2. Claude Code hook executable (used by hooks.json):
 *        Reads JSON event payload from stdin. The hook IS scoped to
 *        Bash(git commit*) by hooks.json so we trust matcher + if filter.
 *        Reads ledger from disk (best effort). Exits 2 + writes block
 *        reason to stderr when blocking; exits 0 otherwise.
 *
 * Stdin payload (PreToolUse Bash):
 *   { tool_name: "Bash", tool_input: { command }, cwd, ... }
 *
 * Bypass surface (documented intentionally):
 *   This hook fires only when Claude Code invokes `git commit` through a Bash
 *   tool call. The following pathways bypass this guard entirely:
 *     • IDE-driven commits (VS Code Source Control, JetBrains, etc.)
 *     • `gh` API calls (gh pr merge, gh api …)
 *     • Manual git typed in any shell OTHER than the Claude Code Bash tool
 *     • Pre-commit hooks that amend or create commits internally
 *   Mitigation: pair with a git pre-commit hook or CI check for full coverage.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Exact token that flags an unresolved adversarial-pairing R2 cell. */
const PENDING_TOKEN = 'R2 inline pending';

/**
 * Words in a commit message that signal the author believes a task is done.
 * Matches whole-word occurrences to avoid false positives (e.g., "incomplete").
 */
const CLOSURE_KEYWORDS = /\b(complete|completed|verified|closing|closure|chius[oa])\b/i;

// ---------------------------------------------------------------------------
// Pure helper functions (exported for unit-testing convenience)
// ---------------------------------------------------------------------------

/**
 * Returns true when `command` looks like a Bash-invoked `git commit`.
 * @param {unknown} command
 * @returns {boolean}
 */
export function isBashGitCommit(command) {
  if (!command || typeof command !== 'string') return false;
  return /^\s*git\s+commit\b/.test(command);
}

/**
 * Returns true when `ledgerContent` contains the exact pending token.
 * @param {unknown} ledgerContent
 * @returns {boolean}
 */
export function hasPendingToken(ledgerContent) {
  if (!ledgerContent || typeof ledgerContent !== 'string') return false;
  return ledgerContent.includes(PENDING_TOKEN);
}

/**
 * Returns true when the commit command's message claims closure.
 * @param {unknown} command
 * @returns {boolean}
 */
export function commitClaimsClosure(command) {
  if (!command || typeof command !== 'string') return false;
  return CLOSURE_KEYWORDS.test(command);
}

// ---------------------------------------------------------------------------
// Main hook entry point (programmatic helper, used by unit tests)
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a `git commit` should be blocked.
 *
 * @param {{ command?: string | null, ledgerContent?: string | null }} params
 * @returns {Promise<{ blocked: boolean, message?: string }>}
 */
export async function runHook({ command, ledgerContent } = {}) {
  // Not a Bash git commit → silent pass-through (e.g., null command,
  // IDE commit, gh API, other shell — see bypass surface note above).
  if (!isBashGitCommit(command)) {
    return { blocked: false };
  }

  // No pending token in ledger → no problem, commit is fine.
  if (!hasPendingToken(ledgerContent)) {
    return { blocked: false };
  }

  // Pending token present but commit message does NOT claim closure →
  // author is not asserting completion, so the commit is acceptable
  // (e.g., "wip:", "in progress", "chore: …").
  if (!commitClaimsClosure(command)) {
    return { blocked: false };
  }

  // Pending state + closure claim = BLOCK.
  const message =
    `[pending-flip-guard] BLOCKED: ledger contains "${PENDING_TOKEN}" ` +
    `but the commit message claims closure. ` +
    `Flip the pending marker → OK in the adversarial ledger BEFORE staging the commit. ` +
    `Bypass surface: this hook fires only on Bash invocations of \`git commit\`; ` +
    `IDE-driven commits, gh API calls, and other shell pathways bypass this guard.`;

  return { blocked: true, message };
}

// ---------------------------------------------------------------------------
// CLI wrapper — only runs when invoked directly (not when imported)
// ---------------------------------------------------------------------------

/**
 * Read stdin to completion, return parsed JSON event payload.
 * @returns {Promise<object>}
 */
async function readStdinJson() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`invalid JSON on stdin: ${err.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

/**
 * Walk up from `start` looking for a `.git` directory or known repo markers.
 * @param {string} start
 * @returns {Promise<string>}
 */
async function findRepoRoot(start) {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (true) {
    const candidates = ['.git', 'wiki', 'package.json'];
    for (const c of candidates) {
      try {
        await fs.access(path.join(cur, c));
        return cur;
      } catch {}
    }
    if (cur === root) return start;
    const parent = path.dirname(cur);
    if (parent === cur) return start;
    cur = parent;
  }
}

/**
 * Read the adversarial ledger from disk. Best-effort: looks for any file
 * named `*ledger*.md` under wiki/ from the repo root. Returns the
 * concatenated content (so we catch the pending token wherever it lives),
 * or `null` if no ledger file is found.
 *
 * @param {string} cwd
 * @returns {Promise<string|null>}
 */
async function readLedgerContent(cwd) {
  try {
    const root = await findRepoRoot(cwd);
    const wikiDir = path.join(root, 'wiki');
    let entries;
    try {
      entries = await fs.readdir(wikiDir, { withFileTypes: true, recursive: true });
    } catch {
      return null;
    }
    const parts = [];
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      // ent.parentPath available on Node 20.12+; fall back to ent.path.
      const dir = ent.parentPath || ent.path || wikiDir;
      const name = ent.name;
      if (!/ledger/i.test(name) || !name.endsWith('.md')) continue;
      try {
        const txt = await fs.readFile(path.join(dir, name), 'utf8');
        parts.push(txt);
      } catch {}
    }
    if (parts.length === 0) return null;
    return parts.join('\n');
  } catch {
    return null;
  }
}

async function cliMain() {
  let payload = {};
  try {
    payload = await readStdinJson();
  } catch (err) {
    // Bad input → do not block. Advisory failure mode for safety.
    process.stderr.write(`[pending-flip-guard] ${err.message}\n`);
    process.exit(0);
    return;
  }

  const command = payload?.tool_input?.command ?? null;
  const cwd = payload?.cwd || process.cwd();
  const ledgerContent = await readLedgerContent(cwd);

  const result = await runHook({ command, ledgerContent });

  if (result.blocked) {
    // Per Claude Code hooks reference: exit 2 = blocking error;
    // stderr is shown to the model as feedback; stdout is ignored.
    process.stderr.write((result.message || '[pending-flip-guard] blocked') + '\n');
    process.exit(2);
    return;
  }

  // Pass-through: exit 0. No JSON output needed.
  process.exit(0);
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (invokedDirectly) {
  cliMain().catch((err) => {
    // Defensive: do not block on internal errors. Surface for debug only.
    process.stderr.write(`[pending-flip-guard] internal error: ${err.message}\n`);
    process.exit(0);
  });
}
