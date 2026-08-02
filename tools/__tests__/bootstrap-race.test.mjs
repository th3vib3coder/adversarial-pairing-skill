import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const bash = process.platform === 'win32'
  ? ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files\\Git\\usr\\bin\\bash.exe']
      .find(existsSync) || 'bash'
  : 'bash';

function toPosix(input) {
  if (process.platform !== 'win32') return input;
  return input.replace(/^([A-Za-z]):/u, (_, drive) => `/${drive.toLowerCase()}`).replaceAll('\\', '/');
}

const script = toPosix(path.join(repoRoot, 'tools', 'bootstrap.sh'));

test('Bash launcher delegates all target mutation to the trusted Node runner', async () => {
  const source = await readFile(path.join(repoRoot, 'tools', 'bootstrap.sh'), 'utf8');
  assert.doesNotMatch(source, /\b(?:mkdir|cp|install|mv|rm)\b|(?:^|\s)cat\s*>|>>/mu);
  assert.match(source, /bootstrap-apply\.mjs/u);
});

async function runFailure(target, options = {}) {
  const { preload, ...execOptions } = options;
  const executable = preload ? process.execPath : bash;
  const args = preload
    ? ['--require', preload, path.join(repoRoot, 'tools', 'bootstrap-apply.mjs'), repoRoot, target]
    : [script, toPosix(target)];
  try {
    await execFileAsync(executable, args, { cwd: repoRoot, ...execOptions });
  } catch (error) {
    return { code: error.code, stdout: String(error.stdout || ''), stderr: String(error.stderr || '') };
  }
  assert.fail('bootstrap unexpectedly succeeded');
}

async function removeInjectedLink(link) {
  try { await unlink(link); } catch { await rmdir(link); }
}

async function collectFiles(root) {
  const found = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) found.push(...await collectFiles(child));
    else if (entry.isFile()) found.push(child);
  }
  return found;
}

function registryText(name, scannerMode = 'real') {
  return `---
status: sourced
type: entity
role: tool-catalog
provenance:
  - kind: protocol
    ref: test-fixture
last-verified-at: 2026-08-02
scanner-mode: '${scannerMode}'
---
# Registry: ${name}

| Entry | Source |
| ----- | ------ |
| verified | fixture |
`;
}

test('transaction preserves an unknown junction substituted after mkdirSync', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-junction-race-'));
  const target = path.join(fixture, 'target');
  const outside = path.join(fixture, 'outside');
  const preload = path.join(fixture, 'race-hook.cjs');
  await mkdir(target);
  await mkdir(outside);
  await writeFile(path.join(outside, 'sentinel.txt'), 'unchanged', 'utf8');
  await writeFile(preload, `
const fs = require('node:fs');
const path = require('node:path');
const original = fs.mkdirSync;
let fired = false;
fs.mkdirSync = function(candidate, options) {
  const result = original.call(fs, candidate, options);
  if (!fired && path.resolve(candidate) === path.resolve(process.env.BOOTSTRAP_RACE_WIKI)) {
    fired = true;
    fs.rmdirSync(candidate);
    fs.symlinkSync(process.env.BOOTSTRAP_RACE_OUTSIDE, candidate, process.platform === 'win32' ? 'junction' : 'dir');
  }
  return result;
};
`, 'utf8');

  const result = await runFailure(target, { preload, env: {
    ...process.env,
    BOOTSTRAP_RACE_WIKI: path.join(target, 'wiki'),
    BOOTSTRAP_RACE_OUTSIDE: outside,
  } });

  assert.equal(result.code, 2, result.stderr);
  assert.match(result.stderr, /unknown path substituted during CREATE/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.deepEqual(await readdir(target), ['wiki'], 'unknown injected junction must be preserved');
  assert.equal((await lstat(path.join(target, 'wiki'))).isSymbolicLink(), true);
  assert.deepEqual(await readdir(outside), ['sentinel.txt'], 'bootstrap must leave no artifact outside target');
  assert.equal(await readFile(path.join(outside, 'sentinel.txt'), 'utf8'), 'unchanged');
  await removeInjectedLink(path.join(target, 'wiki'));
});

test('transaction preserves an unknown junction that causes mkdir EEXIST', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-junction-eexist-'));
  const target = path.join(fixture, 'target');
  const outside = path.join(fixture, 'outside');
  const preload = path.join(fixture, 'eexist-hook.cjs');
  await mkdir(target); await mkdir(outside);
  await writeFile(path.join(outside, 'sentinel.txt'), 'unchanged', 'utf8');
  await writeFile(preload, `
const fs = require('node:fs');
const path = require('node:path');
const original = fs.mkdirSync;
let fired = false;
fs.mkdirSync = function(candidate, options) {
  if (!fired && path.resolve(candidate) === path.resolve(process.env.BOOTSTRAP_RACE_WIKI)) {
    fired = true;
    fs.symlinkSync(process.env.BOOTSTRAP_RACE_OUTSIDE, candidate, process.platform === 'win32' ? 'junction' : 'dir');
  }
  return original.call(fs, candidate, options);
};
`, 'utf8');
  const result = await runFailure(target, { preload, env: {
    ...process.env,
    BOOTSTRAP_RACE_WIKI: path.join(target, 'wiki'),
    BOOTSTRAP_RACE_OUTSIDE: outside,
  } });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unknown path appeared during CREATE/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.deepEqual(await readdir(target), ['wiki']);
  assert.equal((await lstat(path.join(target, 'wiki'))).isSymbolicLink(), true);
  assert.deepEqual(await readdir(outside), ['sentinel.txt']);
  await removeInjectedLink(path.join(target, 'wiki'));
});

test('concurrent legitimate directory on mkdir EEXIST is preserved by identity and bytes', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-concurrent-directory-'));
  const target = path.join(fixture, 'target');
  const marker = path.join(fixture, 'owned-identity.json');
  const preload = path.join(fixture, 'concurrent-hook.cjs');
  await mkdir(target);
  await writeFile(preload, `
const fs = require('node:fs');
const path = require('node:path');
const original = fs.mkdirSync;
let fired = false;
fs.mkdirSync = function(candidate, options) {
  if (!fired && path.resolve(candidate) === path.resolve(process.env.BOOTSTRAP_RACE_WIKI)) {
    fired = true;
    original.call(fs, candidate, { recursive: false });
    fs.writeFileSync(path.join(candidate, 'sentinel.txt'), 'concurrent-owner');
    const value = fs.lstatSync(candidate, { bigint: true });
    fs.writeFileSync(process.env.BOOTSTRAP_RACE_IDENTITY, JSON.stringify({ dev: String(value.dev), ino: String(value.ino) }));
  }
  return original.call(fs, candidate, options);
};
`, 'utf8');
  const result = await runFailure(target, { preload, env: {
    ...process.env,
    BOOTSTRAP_RACE_WIKI: path.join(target, 'wiki'),
    BOOTSTRAP_RACE_IDENTITY: marker,
  } });
  assert.equal(result.code, 2, result.stderr);
  assert.match(result.stderr, /unknown path appeared during CREATE/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  const before = JSON.parse(await readFile(marker, 'utf8'));
  const after = await lstat(path.join(target, 'wiki'), { bigint: true });
  assert.deepEqual({ dev: String(after.dev), ino: String(after.ino) }, before);
  assert.equal(await readFile(path.join(target, 'wiki', 'sentinel.txt'), 'utf8'), 'concurrent-owner');
  assert.deepEqual(await readdir(path.join(target, 'wiki')), ['sentinel.txt']);
});

test('post-mkdir real-directory substitution survives a later transactional failure', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-real-substitution-'));
  const target = path.join(fixture, 'target');
  const marker = path.join(fixture, 'substitute-identity.json');
  const preload = path.join(fixture, 'substitute-hook.cjs');
  await mkdir(target);
  await writeFile(preload, `
const fs = require('node:fs');
const path = require('node:path');
const original = fs.mkdirSync;
let substituted = false;
fs.mkdirSync = function(candidate, options) {
  const resolved = path.resolve(candidate);
  if (!substituted && resolved === path.resolve(process.env.BOOTSTRAP_SUBSTITUTE_PATH)) {
    original.call(fs, candidate, options);
    fs.rmdirSync(candidate);
    original.call(fs, candidate, { recursive: false });
    fs.writeFileSync(path.join(candidate, 'sentinel.txt'), 'replacement-owner');
    const value = fs.lstatSync(candidate, { bigint: true });
    fs.writeFileSync(process.env.BOOTSTRAP_SUBSTITUTE_IDENTITY, JSON.stringify({ dev: String(value.dev), ino: String(value.ino) }));
    substituted = true;
    return;
  }
  if (substituted && resolved === path.resolve(process.env.BOOTSTRAP_FAIL_PATH)) {
    const error = new Error('forced failure after real-directory substitution');
    error.code = 'EIO';
    throw error;
  }
  return original.call(fs, candidate, options);
};
`, 'utf8');
  const result = await runFailure(target, { preload, env: {
    ...process.env,
    BOOTSTRAP_SUBSTITUTE_PATH: path.join(target, 'wiki', 'concepts'),
    BOOTSTRAP_SUBSTITUTE_IDENTITY: marker,
    BOOTSTRAP_FAIL_PATH: path.join(target, 'wiki', 'entities'),
  } });
  assert.equal(result.code, 1, result.stderr);
  assert.match(result.stderr, /forced failure after real-directory substitution/i);
  assert.doesNotMatch(result.stderr, /rollback incomplete/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  const expected = JSON.parse(await readFile(marker, 'utf8'));
  const current = await lstat(path.join(target, 'wiki', 'concepts'), { bigint: true });
  assert.deepEqual({ dev: String(current.dev), ino: String(current.ino) }, expected);
  assert.equal(await readFile(path.join(target, 'wiki', 'concepts', 'sentinel.txt'), 'utf8'), 'replacement-owner');
});

test('owned inode is truncated when a hardlink appears after open and before write', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bs-hardlink-race-'));
  const target = path.join(fixture, 'target');
  const outside = path.join(fixture, 'outside');
  const leaked = path.join(outside, 'linked-ledger.md');
  const preload = path.join(fixture, 'hardlink-hook.cjs');
  await mkdir(target); await mkdir(outside);
  await writeFile(preload, `
const fs = require('node:fs');
const path = require('node:path');
const originalOpen = fs.openSync;
const originalWrite = fs.writeFileSync;
const watched = new Set();
let fired = false;
fs.openSync = function(candidate, ...args) {
  const descriptor = originalOpen.call(fs, candidate, ...args);
  if (typeof candidate === 'string' && path.resolve(candidate) === path.resolve(process.env.BOOTSTRAP_HARDLINK_SOURCE)) watched.add(descriptor);
  return descriptor;
};
fs.writeFileSync = function(destination, data, ...args) {
  if (!fired && watched.has(destination)) {
    fired = true;
    fs.linkSync(process.env.BOOTSTRAP_HARDLINK_SOURCE, process.env.BOOTSTRAP_HARDLINK_OUTSIDE);
  }
  return originalWrite.call(fs, destination, data, ...args);
};
`, 'utf8');
  const result = await runFailure(target, { preload, env: {
    ...process.env,
    BOOTSTRAP_HARDLINK_SOURCE: path.join(target, 'feature-ledger.md'),
    BOOTSTRAP_HARDLINK_OUTSIDE: leaked,
  } });
  assert.equal(result.code, 2, result.stderr);
  assert.match(result.stderr, /external hardlink/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.deepEqual(await readdir(target), ['wiki']);
  assert.deepEqual(await collectFiles(target), [], 'all proven-owned CREATE files must roll back');
  assert.deepEqual(await readdir(path.join(target, 'wiki')), [
    'concepts', 'coverage', 'entities', 'hypotheses', 'manual', 'sources', 'syntheses', 'tools',
  ]);
  assert.equal(await readFile(leaked, 'utf8'), '', 'owned inode sanitizer must erase data visible outside target');
});

test('incoherent preserved registry blocks before any scaffold write', async () => {
  const target = await mkdtemp(path.join(tmpdir(), 'bs-false-registry-'));
  const entities = path.join(target, 'wiki', 'entities');
  const registry = path.join(entities, 'registry-cli-verbs.md');
  await mkdir(entities, { recursive: true });
  const corrupt = registryText('wrong-name');
  await writeFile(registry, corrupt, 'utf8');

  const result = await runFailure(target);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /registry title is incoherent for cli-verbs/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.equal(await readFile(registry, 'utf8'), corrupt);
  assert.equal(existsSync(path.join(target, 'feature-ledger.md')), false);
  assert.deepEqual(await readdir(target), ['wiki']);
});

test('tampered preserved stub registry must match its canonical single-registry content', async () => {
  const target = await mkdtemp(path.join(tmpdir(), 'bs-false-stub-'));
  const entities = path.join(target, 'wiki', 'entities');
  const registry = path.join(entities, 'registry-cli-verbs.md');
  await mkdir(entities, { recursive: true });
  const tampered = registryText('cli-verbs', 'stub');
  await writeFile(registry, tampered, 'utf8');

  const result = await runFailure(target);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /preserved stub registry is not canonical for cli-verbs/i);
  assert.doesNotMatch(result.stdout, /READY:/u);
  assert.equal(await readFile(registry, 'utf8'), tampered);
  assert.equal(existsSync(path.join(target, 'feature-ledger.md')), false);
});

test('coherent real preserved registry is allowed and remains byte-identical', async () => {
  const target = await mkdtemp(path.join(tmpdir(), 'bs-real-registry-'));
  const entities = path.join(target, 'wiki', 'entities');
  const registry = path.join(entities, 'registry-cli-verbs.md');
  await mkdir(entities, { recursive: true });
  const real = registryText('cli-verbs');
  await writeFile(registry, real, 'utf8');

  const result = await execFileAsync(bash, [script, toPosix(target)], { cwd: repoRoot });
  assert.match(result.stdout, /READY: bootstrap structure complete/u);
  assert.equal(await readFile(registry, 'utf8'), real);
});
