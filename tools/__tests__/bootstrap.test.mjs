import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
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

const BASH_BIN = process.platform === 'win32'
  ? [
      process.env.GIT_BASH_PATH,
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    ].find((candidate) => candidate && existsSync(candidate)) || 'bash'
  : 'bash';

function detectBashType() {
  if (cachedBashType !== null) return cachedBashType;
  if (process.platform !== 'win32') {
    cachedBashType = 'posix';
    return cachedBashType;
  }
  try {
    // uname -s identifies the bash environment type
    const uname = execFileSync(BASH_BIN, ['-c', 'uname -s'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
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
const PREFLIGHT_PATH = path.resolve(__dirname, '..', 'bootstrap-preflight.mjs');

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

async function runBootstrapExpectFailure(target, options = {}) {
  const { scriptPath = SCRIPT_PATH, ...execOptions } = options;
  try {
    await execFileAsync(BASH_BIN, [scriptPath, target], { cwd: REPO_ROOT, ...execOptions });
  } catch (error) {
    return {
      code: error.code,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || ''),
    };
  }
  assert.fail(`bootstrap.sh unexpectedly accepted unsafe target: ${target}`);
}

async function makeDirectoryLink(target, linkPath) {
  await symlink(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

async function runPreflightExpectFailure(target, options = {}) {
  try {
    await execFileAsync(process.execPath, [PREFLIGHT_PATH, 'preflight', REPO_ROOT, target], options);
  } catch (error) {
    return { code: error.code, stdout: String(error.stdout || ''), stderr: String(error.stderr || '') };
  }
  assert.fail(`bootstrap preflight unexpectedly accepted unsafe target: ${target}`);
}

async function makeBootstrapRepoFixture() {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-repo-'));
  const fixtureTools = path.join(fixture, 'tools');
  await mkdir(fixtureTools);
  for (const file of ['bootstrap.sh', 'bootstrap-apply.mjs', 'bootstrap-preflight.mjs', 'build-registries.mjs',
    'sync-mirror.mjs', 'wiki-lint.mjs', 'audit-entity-exports.mjs']) {
    await copyFile(path.join(REPO_ROOT, 'tools', file), path.join(fixtureTools, file));
  }
  return { fixture, fixtureTools, script: toPosixPath(path.join(fixtureTools, 'bootstrap.sh')) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('bootstrap.sh creates wiki/ folder structure', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-target-'));
  const targetRoot = toPosixPath(targetRootRaw);
  // Run from REPO_ROOT so the script can find tools/*.mjs relatives
  await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
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
  await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  assert.ok(await fileExists(path.join(targetRootRaw, 'wiki/CLAUDE.md')), 'wiki/CLAUDE.md present');
  assert.ok(await fileExists(path.join(targetRootRaw, 'wiki/log.md')), 'wiki/log.md present');
  const schema = await readFile(path.join(targetRootRaw, 'wiki/CLAUDE.md'), 'utf8');
  for (const kind of [
    'audit-finding', 'codebase-file', 'codebase-directory', 'protocol', 'feature-ledger',
    'generated-inventory', 'generated-summary', 'command-output', 'wiki-page',
  ]) assert.match(schema, new RegExp(`\\b${kind}\\b`, 'u'));
  assert.doesNotMatch(schema, /<primary-source-kind>/u);
  assert.match(schema, /Tier A \(mechanical\)/u);
  assert.match(schema, /Tier B \(semi-automatic\)/u);
  assert.match(schema, /Tier C \(cognitive\)/u);
  assert.match(schema, /Bundled registry stubs are schema\/drift fixtures, not source-coverage proof/u);
});

test('bootstrap.sh copies 4 .mjs tools to wiki/tools/', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-tools-'));
  const targetRoot = toPosixPath(targetRootRaw);
  await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
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
  const { stdout } = await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  // Verify READY output
  assert.match(stdout, /READY: bootstrap structure complete; operator authorization required for first commit/);
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
  await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
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
  await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const claudeMdPath = path.join(targetRootRaw, 'CLAUDE.md');
  assert.ok(await fileExists(claudeMdPath), 'CLAUDE.md must exist after Step 7');
  const contents = await readFile(claudeMdPath, 'utf8');
  assert.ok(
    contents.includes('## adversarial-pairing methodology'),
    'CLAUDE.md must contain "## adversarial-pairing methodology" header'
  );
  assert.match(contents, /wiki\/CLAUDE\.md/u);
  assert.match(contents, /Every code-affecting patch carries its ledger row and parallel wiki sync/u);
  assert.doesNotMatch(contents, /Cluster 4 §4\.5\.1/u);
  assert.doesNotMatch(contents, /docs\/spec\/, skills\/, plugin\//u);
  assert.match(contents, /methodology documentation bundled with the installed skill or plugin/iu);
  assert.match(contents, /https:\/\/github\.com\/th3vib3coder\/adversarial-pairing-skill/u);
});

test('bootstrap.sh Step 7: is idempotent — running twice does not duplicate header', async () => {
  const targetRootRaw = await mkdtemp(path.join(tmpdir(), 'bs-idem-'));
  const targetRoot = toPosixPath(targetRootRaw);
  // Run bootstrap twice
  const first = await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const second = await execFileAsync(BASH_BIN, [SCRIPT_PATH, targetRoot], { cwd: REPO_ROOT });
  const claudeMdPath = path.join(targetRootRaw, 'CLAUDE.md');
  const contents = await readFile(claudeMdPath, 'utf8');
  // Count occurrences — must be exactly 1
  const matches = (contents.match(/## adversarial-pairing methodology/g) || []).length;
  assert.equal(matches, 1, 'header must appear exactly once even after double bootstrap');
  const firstInventory = first.stdout.split(/\r?\n/u).filter((line) => /^(?:CREATE|PRESERVE): /u.test(line));
  const secondInventory = second.stdout.split(/\r?\n/u).filter((line) => /^(?:CREATE|PRESERVE): /u.test(line));
  assert.equal(firstInventory.length, 24, 'inventory must list every managed path exactly once');
  assert.ok(firstInventory.every((line) => line.startsWith('CREATE: ')), 'first run inventory must be CREATE-only');
  assert.deepEqual(secondInventory, firstInventory.map((line) => line.replace(/^CREATE:/u, 'PRESERVE:')),
    'second run inventory must preserve the same deterministic path order');
});

test('bootstrap.sh rejects a filesystem root with the safety exit code', async () => {
  const rootTarget = process.platform === 'win32' ? '/' : path.parse(homedir()).root;
  const result = await runBootstrapExpectFailure(rootTarget);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unsafe target.*filesystem root/i);
});

test('bootstrap.sh rejects the user home and Claude/Codex configuration roots', async () => {
  const fakeHomeRaw = await mkdtemp(path.join(tmpdir(), 'bs-home-'));
  const fakeHome = toPosixPath(fakeHomeRaw);
  await mkdir(path.join(fakeHomeRaw, '.claude'));
  await mkdir(path.join(fakeHomeRaw, '.codex'));

  for (const rawTarget of [fakeHomeRaw, path.join(fakeHomeRaw, '.claude'), path.join(fakeHomeRaw, '.codex')]) {
    const result = await runBootstrapExpectFailure(toPosixPath(rawTarget), {
      env: { ...process.env, HOME: fakeHome },
    });
    assert.equal(result.code, 2);
    assert.match(result.stderr, /unsafe target.*(home|configuration)/i);
    assert.equal(await fileExists(path.join(rawTarget, 'feature-ledger.md')), false, 'must fail before writing a ledger');
  }
});

test('bootstrap.sh rejects a target reached through a pre-existing symlink or junction', async () => {
  const fixtureRaw = await mkdtemp(path.join(tmpdir(), 'bs-link-target-'));
  const outsideRaw = path.join(fixtureRaw, 'outside');
  const realTargetRaw = path.join(outsideRaw, 'project');
  const linkRaw = path.join(fixtureRaw, 'linked-parent');
  await mkdir(realTargetRaw, { recursive: true });
  await writeFile(path.join(realTargetRaw, 'sentinel.txt'), 'unchanged', 'utf8');
  await makeDirectoryLink(outsideRaw, linkRaw);

  const result = await runBootstrapExpectFailure(toPosixPath(path.join(linkRaw, 'project')));
  assert.equal(result.code, 2);
  assert.match(result.stderr, /(symlink|junction|reparse)/i);
  assert.deepEqual(await readdir(realTargetRaw), ['sentinel.txt'], 'must fail before writing through the link');
});

test('bootstrap.sh rejects a pre-existing linked wiki component before writing through it', async () => {
  const fixtureRaw = await mkdtemp(path.join(tmpdir(), 'bs-link-wiki-'));
  const targetRaw = path.join(fixtureRaw, 'project');
  const outsideRaw = path.join(fixtureRaw, 'outside-wiki');
  await mkdir(targetRaw);
  await mkdir(outsideRaw);
  await writeFile(path.join(outsideRaw, 'sentinel.txt'), 'unchanged', 'utf8');
  await makeDirectoryLink(outsideRaw, path.join(targetRaw, 'wiki'));

  const result = await runBootstrapExpectFailure(toPosixPath(targetRaw));
  assert.equal(result.code, 2);
  assert.match(result.stderr, /(symlink|junction|reparse)/i);
  assert.deepEqual(await readdir(outsideRaw), ['sentinel.txt'], 'must fail before writing through target/wiki');
  assert.equal(await fileExists(path.join(targetRaw, 'feature-ledger.md')), false, 'must fail before any target write');
});

test('bootstrap.sh preserves and never executes pre-existing target-owned wiki tools', async () => {
  const targetRaw = await mkdtemp(path.join(tmpdir(), 'bs-untrusted-tools-'));
  const toolsRaw = path.join(targetRaw, 'wiki', 'tools');
  const markerRaw = path.join(targetRaw, 'target-tool-executed.txt');
  await mkdir(toolsRaw, { recursive: true });
  const maliciousSource = `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(markerRaw)}, 'executed');\n`;
  const builderRaw = path.join(toolsRaw, 'build-registries.mjs');
  const linterRaw = path.join(toolsRaw, 'wiki-lint.mjs');
  await writeFile(builderRaw, maliciousSource, 'utf8');
  await writeFile(linterRaw, maliciousSource, 'utf8');

  await execFileAsync(BASH_BIN, [SCRIPT_PATH, toPosixPath(targetRaw)], { cwd: REPO_ROOT });

  assert.equal(await readFile(builderRaw, 'utf8'), maliciousSource, 'target-owned builder must be byte-preserved');
  assert.equal(await readFile(linterRaw, 'utf8'), maliciousSource, 'target-owned linter must be byte-preserved');
  assert.equal(await fileExists(markerRaw), false, 'target-owned tools must never run during bootstrap');
});

test('bootstrap.sh rejects the double-slash root before invoking mutation tools', async () => {
  const result = await runBootstrapExpectFailure('//');
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unsafe target.*filesystem root/i);
});

test('trusted preflight protects explicit Codex and Claude configuration trees', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'bs-config-roots-'));
  const home = path.join(base, 'home');
  const codex = path.join(base, 'custom-codex');
  const claude = path.join(base, 'custom-claude');
  const targets = [home, path.join(home, '.codex', 'project'), path.join(home, '.claude', 'project'),
    path.join(codex, 'project'), path.join(claude, 'project')];
  for (const target of targets) await mkdir(target, { recursive: true });
  const env = { ...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: codex, CLAUDE_CONFIG_DIR: claude };
  for (const target of targets) {
    const before = await readdir(target);
    const result = await runPreflightExpectFailure(target, { env });
    assert.equal(result.code, 2);
    assert.match(result.stderr, /unsafe target.*(home|configuration)/i);
    assert.deepEqual(await readdir(target), before, 'preflight must not write into protected roots');
  }
});

test('trusted preflight rejects wrong managed path types before any scaffold write', async () => {
  for (const relative of ['wiki/entities', 'wiki/tools/wiki-lint.mjs', 'feature-ledger.md', 'CLAUDE.md']) {
    const target = await mkdtemp(path.join(tmpdir(), 'bs-managed-type-'));
    const badPath = path.join(target, relative);
    if (path.extname(relative)) await mkdir(badPath, { recursive: true });
    else {
      await mkdir(path.dirname(badPath), { recursive: true });
      await writeFile(badPath, 'not a directory', 'utf8');
    }
    const before = await readdir(target);
    const result = await runPreflightExpectFailure(target);
    assert.equal(result.code, 2);
    assert.match(result.stderr, /managed (?:file|directory) path/i);
    assert.deepEqual(await readdir(target), before, 'preflight must not add scaffold files');
  }
});

test('trusted preflight rejects invalid existing wiki schema before any scaffold write', async () => {
  const target = await mkdtemp(path.join(tmpdir(), 'bs-invalid-wiki-'));
  await mkdir(path.join(target, 'wiki'));
  await writeFile(path.join(target, 'wiki', 'invalid.md'), '# no frontmatter\n', 'utf8');
  const result = await runPreflightExpectFailure(target);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /existing wiki failed LAW 13 schema validation/i);
  assert.equal(await fileExists(path.join(target, 'feature-ledger.md')), false);
});

test('trusted preflight rejects an incomplete source tool set before target writes', async () => {
  const { fixture, fixtureTools } = await makeBootstrapRepoFixture();
  const missing = path.join(fixtureTools, 'audit-entity-exports.mjs');
  await unlink(missing);
  const target = await mkdtemp(path.join(tmpdir(), 'bs-missing-source-'));
  const helper = path.join(fixtureTools, 'bootstrap-preflight.mjs');
  await assert.rejects(execFileAsync(process.execPath, [helper, 'preflight', fixture, target]), (error) => {
    assert.match(String(error.stderr || ''), /trusted source tool is missing/i);
    return true;
  });
  assert.deepEqual(await readdir(target), []);
});

test('bootstrap.sh withholds READY when final managed-file verification fails', async () => {
  const { fixture, fixtureTools, script } = await makeBootstrapRepoFixture();
  await writeFile(path.join(fixtureTools, 'build-registries.mjs'), 'process.exit(0);\n', 'utf8');
  const target = await mkdtemp(path.join(tmpdir(), 'bs-final-fail-'));
  const result = await runBootstrapExpectFailure(toPosixPath(target), { cwd: fixture, scriptPath: script });
  assert.equal(result.code, 1);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.match(result.stderr, /trusted registry builder did not create canonical|final verification found missing managed file/i);
});

test('Windows path protection is case-insensitive', { skip: process.platform !== 'win32' }, async () => {
  const config = await mkdtemp(path.join(tmpdir(), 'bs-case-config-'));
  const target = path.join(config, 'project');
  await mkdir(target);
  const result = await runPreflightExpectFailure(target.toLowerCase(), {
    env: { ...process.env, CODEX_HOME: config.toUpperCase() },
  });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /CODEX_HOME configuration root/i);
});
