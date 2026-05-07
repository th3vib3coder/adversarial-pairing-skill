#!/usr/bin/env node
/**
 * ledger-mantra-check.js
 *
 * PostToolUse advisory hook (Edit/Write to tracked code paths).
 * Checks that every code change is accompanied by:
 *   1. A ledger row file (file name contains "ledger")
 *   2. A wiki/log.md entry
 *
 * Always returns exitCode 0 — advisory only, never blocks.
 *
 * Two calling conventions:
 *   1. Programmatic helper (used by unit tests):
 *        import { runHook } from './ledger-mantra-check.js';
 *        await runHook({ stagedFiles });
 *   2. Claude Code hook executable (used by hooks.json):
 *        Reads JSON event payload from stdin, writes advisory JSON to stdout,
 *        exits 0 always (advisory).
 *
 * Stdin payload (PostToolUse Edit|Write):
 *   { tool_name, tool_input: { file_path, content?, new_string?, old_string? }, cwd, ... }
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Determine whether a file path is a code file.
 * Heuristic: not a .md file, not under wiki/ or docs/.
 *
 * @param {string} filename
 * @returns {boolean}
 */
export function isCodeFile(filename) {
  if (filename.endsWith('.md')) return false;
  if (filename.startsWith('wiki/') || filename.startsWith('docs/')) return false;
  return true;
}

/**
 * Check whether any staged file is a ledger file.
 * Heuristic: file name contains "ledger".
 *
 * @param {string[]} stagedFiles
 * @returns {boolean}
 */
export function hasLedgerFile(stagedFiles) {
  return stagedFiles.some(f => /ledger/.test(f));
}

/**
 * Check whether a wiki/log.md entry is staged.
 * Matches exact "wiki/log.md" or any path ending in "/wiki/log.md".
 *
 * @param {string[]} stagedFiles
 * @returns {boolean}
 */
export function hasWikiLogEntry(stagedFiles) {
  return stagedFiles.some(
    f => f === 'wiki/log.md' || f.endsWith('/wiki/log.md')
  );
}

/**
 * Pure helper used by unit tests.
 *
 * @param {{ stagedFiles?: string[] }} options
 * @returns {Promise<{ warnings: string[], exitCode: number }>}
 */
export async function runHook({ stagedFiles = [] } = {}) {
  const warnings = [];

  const codeFiles = stagedFiles.filter(isCodeFile);

  if (codeFiles.length > 0) {
    if (!hasLedgerFile(stagedFiles)) {
      warnings.push(
        `[ledger-mantra-check] ledger row missing (code files: ${codeFiles.length})`
      );
    } else if (!hasWikiLogEntry(stagedFiles)) {
      warnings.push(
        `[ledger-mantra-check] wiki/log.md entry missing (log missing — ledger present but no wiki/log entry)`
      );
    }
  }

  // Emit warnings to stderr (advisory output, does not affect exit code)
  for (const w of warnings) {
    process.stderr.write(w + '\n');
  }

  return { warnings, exitCode: 0 }; // Advisory: always 0
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
 * Walk up from `start` looking for a directory that contains a `.git` entry,
 * `wiki/`, or `package.json`. Falls back to `start` if no marker is found.
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
 * Compute the list of "staged" files for advisory purposes from a single
 * Edit|Write event. The PostToolUse event reports one file at a time, so we
 * also peek at git index to pick up any other staged files in this commit.
 *
 * @param {object} payload
 * @returns {Promise<string[]>}
 */
async function gatherStagedFiles(payload) {
  const set = new Set();
  const ti = payload.tool_input || {};
  if (typeof ti.file_path === 'string' && ti.file_path.length > 0) {
    set.add(ti.file_path);
  }
  // Best-effort: read git index for already-staged files. Failures are silent.
  // execFileSync is used (not exec/execSync) — argv passed as array, no shell.
  try {
    const cwd = payload.cwd || process.cwd();
    const root = await findRepoRoot(cwd);
    const { execFileSync } = await import('node:child_process');
    const out = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (t) set.add(t);
    }
  } catch {
    // not a git repo, or git not available — fall through with what we have
  }
  return [...set];
}

async function cliMain() {
  let payload = {};
  try {
    payload = await readStdinJson();
  } catch (err) {
    process.stderr.write(`[ledger-mantra-check] ${err.message}\n`);
    process.exit(0); // advisory: never block on bad input
    return;
  }

  const stagedFiles = await gatherStagedFiles(payload);
  const result = await runHook({ stagedFiles });

  // Emit advisory output as JSON on stdout (Claude Code surfaces systemMessage
  // to the user). Exit code is always 0 for an advisory hook.
  if (result.warnings.length > 0) {
    const out = {
      systemMessage: result.warnings.join('\n'),
      suppressOutput: false,
      continue: true,
    };
    process.stdout.write(JSON.stringify(out) + '\n');
  }
  process.exit(0);
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (invokedDirectly) {
  cliMain().catch((err) => {
    // Defensive: advisory hook must never block on internal errors.
    process.stderr.write(`[ledger-mantra-check] internal error: ${err.message}\n`);
    process.exit(0);
  });
}
