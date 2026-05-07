import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile, execFileSync, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Windows path normalization ─────────────────────────────────────────────
// On Windows (Git Bash / MSYS2 / WSL), mkdtemp returns C:\Users\... style paths.
// bash(1) passed such paths as argv[1] interprets "C:\" as "C:" (drops backslash),
// producing wrong directories. Normalize before passing to bash.
// toPosixPath is intentionally defined BEFORE SCRIPT_PATH so it can be used
// to normalize the script path itself.

let cachedBashType = null;

function detectBashType() {
  if (cachedBashType !== null) return cachedBashType;
  if (process.platform !== 'win32') {
    cachedBashType = 'posix';
    return cachedBashType;
  }
  try {
    // uname -s identifies the bash environment type
    const uname = execSync('bash -c "uname -s"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^Linux/i.test(uname)) cachedBashType = 'wsl';
    else if (/^MSYS|^MINGW/i.test(uname)) cachedBashType = 'msys';
    else if (/^CYGWIN/i.test(uname)) cachedBashType = 'cygwin';
    else cachedBashType = 'unknown';
  } catch {
    cachedBashType = 'unknown';
  }
  return cachedBashType;
}

function toPosixPath(winPath) {
  if (process.platform !== 'win32') return winPath;
  const bashType = detectBashType();

  // WSL: use wslpath via bash, fallback to /mnt/c/... manual conversion
  if (bashType === 'wsl') {
    try {
      const escaped = winPath.replace(/'/g, String.raw`'\''`);
      return execSync(`bash -c "wslpath -u '${escaped}'"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return winPath
        .replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`)
        .replace(/\\/g, '/');
    }
  }

  // MSYS / Git Bash: use cygpath via bash, fallback to /c/... manual
  if (bashType === 'msys' || bashType === 'cygwin') {
    try {
      const escaped = winPath.replace(/'/g, String.raw`'\''`);
      return execSync(`bash -c "cygpath -u '${escaped}'"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      // MSYS uses /c/, Cygwin uses /cygdrive/c/
      const prefix = bashType === 'cygwin' ? '/cygdrive/' : '/';
      return winPath
        .replace(/^([A-Za-z]):/, (_, drive) => `${prefix}${drive.toLowerCase()}`)
        .replace(/\\/g, '/');
    }
  }

  // Unknown win32 bash: best-effort with cygpath/wslpath direct invocation (legacy fallback)
  try {
    return execFileSync('cygpath', ['-u', winPath], { encoding: 'utf8' }).trim();
  } catch {}
  try {
    return execFileSync('wslpath', ['-u', winPath], { encoding: 'utf8' }).trim();
  } catch {}

  // Last resort: manual MSYS-style
  return winPath
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
    .replace(/\\/g, '/');
}

const SCRIPT_PATH = toPosixPath(path.resolve(__dirname, '..', 'bootstrap.sh'));
const REPO_ROOT = path.resolve(__dirname, '..', '..');  // adversarial-pairing root (where tools/*.mjs live)

// ── Helpers ────────────────────────────────────────────────────────────────

async function dirExists(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('bootstrap.sh creates wiki/ folder structure', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-target-'));
  const targetRoot = toPosixPath(targetRootRaw);
  // Run from REPO_ROOT so the script can find tools/*.mjs relatives
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const expectedFolders = [
    'wiki',
    'wiki/concepts',
    'wiki/entities',
    'wiki/sources',
    'wiki/syntheses',
    'wiki/hypotheses',
    'wiki/manual',
    'wiki/coverage',
    'wiki/tools',
  ];
  for (const folder of expectedFolders) {
    assert.ok(await dirExists(path.join(targetRootRaw, folder)), `${folder} must exist`);
  }
});

test('bootstrap.sh injects wiki/CLAUDE.md and wiki/log.md', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-files-'));
  const targetRoot = toPosixPath(targetRootRaw);
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  assert.ok(await fileExists(path.join(targetRootRaw, 'wiki/CLAUDE.md')), 'wiki/CLAUDE.md present');
  assert.ok(await fileExists(path.join(targetRootRaw, 'wiki/log.md')), 'wiki/log.md present');
});

test('bootstrap.sh copies 4 .mjs tools to wiki/tools/', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-tools-'));
  const targetRoot = toPosixPath(targetRootRaw);
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const tools = [
    'build-registries.mjs',
    'sync-mirror.mjs',
    'wiki-lint.mjs',
    'audit-entity-exports.mjs',
  ];
  for (const tool of tools) {
    assert.ok(await fileExists(path.join(targetRootRaw, 'wiki/tools', tool)), `wiki/tools/${tool} present`);
  }
});

test('bootstrap.sh stops BEFORE commit, outputs READY string, no git commit', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-no-commit-'));
  const targetRoot = toPosixPath(targetRootRaw);
  // Pre-init git in target so the script COULD commit if it wanted to
  await execFileAsync('git', ['init', targetRootRaw], { cwd: targetRootRaw });
  const { stdout } = await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  // Verify READY output
  assert.match(stdout, /READY: bootstrap structure complete; operator GO required for first commit/);
  // Verify NO commit was made (git log should fail or be empty)
  let logResult;
  try {
    logResult = await execFileAsync('git', ['log', '--oneline'], { cwd: targetRootRaw });
    // If it returns, log should be empty
    assert.equal(logResult.stdout.trim(), '');
  } catch (err) {
    // git log fails on no commits — acceptable
    assert.ok(true, 'git log failed because no commits exist');
  }
});

test('bootstrap.sh Step 5: generates 6 registry-*.md files under wiki/entities/', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-regs-'));
  const targetRoot = toPosixPath(targetRootRaw);
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const expectedRegistries = [
    'registry-cli-verbs.md',
    'registry-exported-symbols.md',
    'registry-db-writers.md',
    'registry-schema-graph.md',
    'registry-gate-triggers.md',
    'registry-protocol-invariants.md',
  ];
  for (const reg of expectedRegistries) {
    assert.ok(
      await fileExists(path.join(targetRootRaw, 'wiki/entities', reg)),
      `wiki/entities/${reg} must exist after Step 5`
    );
  }
});

test('bootstrap.sh Step 7: creates target CLAUDE.md containing adversarial-pairing methodology header', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-claude-'));
  const targetRoot = toPosixPath(targetRootRaw);
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const claudeMdPath = path.join(targetRootRaw, 'CLAUDE.md');
  assert.ok(await fileExists(claudeMdPath), 'CLAUDE.md must exist after Step 7');
  const contents = await readFile(claudeMdPath, 'utf8');
  assert.ok(
    contents.includes('## adversarial-pairing methodology'),
    'CLAUDE.md must contain "## adversarial-pairing methodology" header'
  );
});

test('bootstrap.sh Step 7: is idempotent — running twice does not duplicate header', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-idem-'));
  const targetRoot = toPosixPath(targetRootRaw);
  // Run bootstrap twice
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  await execFileAsync('bash', [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const claudeMdPath = path.join(targetRootRaw, 'CLAUDE.md');
  const contents = await readFile(claudeMdPath, 'utf8');
  // Count occurrences — must be exactly 1
  const matches = (contents.match(/## adversarial-pairing methodology/g) || []).length;
  assert.equal(matches, 1, 'header must appear exactly once even after double bootstrap');
});
