import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const canonicalDocs = path.join(repo, 'docs');
const canonicalTools = path.join(repo, 'tools');
const canonicalLicense = path.join(repo, 'LICENSE');

const trustedTools = [
  'audit-entity-exports.mjs',
  'bootstrap-apply.mjs',
  'bootstrap-preflight.mjs',
  'bootstrap.sh',
  'build-registries.mjs',
  'lint-discipline.sh',
  'sync-mirror.mjs',
  'wiki-lint.mjs',
];
const esmTools = trustedTools.filter((name) => name.endsWith('.mjs'));
const bashExecutable = process.platform === 'win32'
  ? [
      process.env.GIT_BASH_PATH,
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
    ].find((candidate) => candidate && existsSync(candidate)) || 'bash'
  : 'bash';

const packages = [
  {
    name: 'standalone Claude skill',
    root: path.join(repo, 'skills', 'claude-code', 'adversarial-pairing'),
    entry: 'SKILL.md',
    canonicalEntry: path.join(repo, 'skills', 'claude-code', 'adversarial-pairing', 'SKILL.md'),
    exerciseBootstrap: true,
  },
  {
    name: 'standalone Codex skill',
    root: path.join(repo, 'skills', 'codex', 'adversarial-pairing'),
    entry: 'SKILL.md',
    canonicalEntry: path.join(repo, 'skills', 'codex', 'adversarial-pairing', 'SKILL.md'),
    exerciseBootstrap: true,
  },
  {
    name: 'Claude plugin',
    root: path.join(repo, 'plugin', 'claude-code'),
    entry: path.join('skills', 'adversarial-pairing', 'SKILL.md'),
    canonicalEntry: path.join(repo, 'skills', 'claude-code', 'adversarial-pairing', 'SKILL.md'),
    exerciseBootstrap: false,
  },
  {
    name: 'plugin-nested Claude skill',
    root: path.join(repo, 'plugin', 'claude-code', 'skills', 'adversarial-pairing'),
    entry: 'SKILL.md',
    canonicalEntry: path.join(repo, 'skills', 'claude-code', 'adversarial-pairing', 'SKILL.md'),
    exerciseBootstrap: false,
  },
];

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function relativeFiles(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await relativeFiles(root, absolute));
    else if (entry.isFile()) files.push(path.relative(root, absolute).replaceAll('\\', '/'));
  }
  return files.sort();
}

async function assertByteEqual(actual, expected, label) {
  assert.ok(await isFile(actual), `${label}: missing ${actual}`);
  assert.deepEqual(await readFile(actual), await readFile(expected), label);
}

function executableEnvironment() {
  return {
    ...process.env,
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ''}`,
  };
}

function bashPath(file) {
  return file.replaceAll('\\', '/');
}

async function validateIsolatedPackage(pkg, isolated) {
  await assertByteEqual(
    path.join(isolated, pkg.entry),
    pkg.canonicalEntry,
    `${pkg.name} entry point`,
  );
  await assertByteEqual(
    path.join(isolated, 'LICENSE'),
    canonicalLicense,
    `${pkg.name} license`,
  );

  const canonicalDocFiles = await relativeFiles(canonicalDocs);
  const packagedDocFiles = await relativeFiles(path.join(isolated, 'docs'));
  assert.deepEqual(packagedDocFiles, canonicalDocFiles, `${pkg.name} docs inventory`);
  for (const relative of canonicalDocFiles) {
    await assertByteEqual(
      path.join(isolated, 'docs', relative),
      path.join(canonicalDocs, relative),
      `${pkg.name} docs/${relative}`,
    );
  }

  const packagedToolFiles = await relativeFiles(path.join(isolated, 'tools'));
  assert.deepEqual(packagedToolFiles, trustedTools.slice().sort(), `${pkg.name} tools inventory`);
  for (const tool of trustedTools) {
    await assertByteEqual(
      path.join(isolated, 'tools', tool),
      path.join(canonicalTools, tool),
      `${pkg.name} tools/${tool}`,
    );
  }
}

async function executeIsolatedTools(pkg, isolated, temporaryParent) {
  const env = executableEnvironment();
  for (const tool of esmTools) {
    await run(process.execPath, ['--check', path.join(isolated, 'tools', tool)], {
      cwd: isolated,
      env,
      windowsHide: true,
    });
  }
  if (!pkg.exerciseBootstrap) return;

  const script = bashPath(path.join(isolated, 'tools', 'bootstrap.sh'));
  const help = await run(bashExecutable, [script, '--help'], {
    cwd: isolated,
    env,
    windowsHide: true,
  });
  assert.match(help.stdout, /^Usage: bash tools\/bootstrap\.sh/u);

  const target = path.join(temporaryParent, 'disposable target');
  await mkdir(target);
  const result = await run(bashExecutable, [script, bashPath(target)], {
    cwd: isolated,
    env,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  assert.match(result.stdout, /^CREATE: wiki\/CLAUDE\.md$/mu);
  assert.match(result.stdout, /READY: bootstrap structure complete/u);
  for (const relative of [
    'CLAUDE.md',
    'feature-ledger.md',
    'status-ledger.md',
    path.join('wiki', 'CLAUDE.md'),
    path.join('wiki', 'log.md'),
  ]) {
    assert.ok(await isFile(path.join(target, relative)), `${pkg.name} did not create ${relative}`);
  }
}

test('distribution matrix names every independently installable package', () => {
  assert.deepEqual(packages.map(({ name }) => name), [
    'standalone Claude skill',
    'standalone Codex skill',
    'Claude plugin',
    'plugin-nested Claude skill',
  ]);
});

for (const pkg of packages) {
  test(`${pkg.name} works from an isolated copied package`, async () => {
    const temporaryParent = await mkdtemp(path.join(tmpdir(), 'adversarial-pairing-package-'));
    const isolated = path.join(temporaryParent, 'package');
    try {
      await cp(pkg.root, isolated, { recursive: true, force: false, errorOnExist: true });
      assert.equal(isolated.startsWith(repo), false, 'isolated copy must live outside the repository');
      await validateIsolatedPackage(pkg, isolated);
      await executeIsolatedTools(pkg, isolated, temporaryParent);
    } finally {
      await rm(temporaryParent, { recursive: true, force: true });
    }
  });
}

test('Claude loader entry matches the standalone Claude entry byte-for-byte', async () => {
  await assertByteEqual(
    path.join(repo, 'plugin', 'claude-code', 'skills', 'adversarial-pairing', 'SKILL.md'),
    path.join(repo, 'skills', 'claude-code', 'adversarial-pairing', 'SKILL.md'),
    'Claude skill entry sync',
  );
});
