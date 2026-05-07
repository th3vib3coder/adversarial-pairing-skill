import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_PATH = path.resolve(__dirname, '..', 'build-registries.mjs');

test('rebuilds 6 registry files with LAW 13 frontmatter', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-fixture-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);
  const registries = ['cli-verbs', 'exported-symbols', 'db-writers', 'schema-graph', 'gate-triggers', 'protocol-invariants'];
  for (const name of registries) {
    const filePath = path.join(fixtureRoot, 'wiki/entities', `registry-${name}.md`);
    const content = await readFile(filePath, 'utf8');
    assert.match(content, /^---\nstatus: computed\n/m, `registry-${name}.md must start with LAW 13 frontmatter`);
    assert.match(content, /role: tool-catalog/, `registry-${name}.md must declare role: tool-catalog`);
    assert.match(content, /compile-policy: 'regenerable-from-codebase'/, `registry-${name}.md must declare compile-policy`);
  }
});

test('--check mode exits 0 when registries match', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-check-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  // Populate first
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);
  // Then check
  const result = await execFileAsync('node', [TOOL_PATH, fixtureRoot, '--check']);
  // execFileAsync resolves on exit 0, throws on non-zero
  assert.ok(true, '--check returned exit 0 (registries match)');
});

test('--check mode exits non-zero when registries drift', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-drift-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);
  // Modify one registry to simulate drift
  const targetFile = path.join(fixtureRoot, 'wiki/entities/registry-cli-verbs.md');
  await writeFile(targetFile, 'tampered content\n', 'utf8');
  // Check should fail
  let exitCode = null;
  try {
    await execFileAsync('node', [TOOL_PATH, fixtureRoot, '--check']);
  } catch (err) {
    exitCode = err.code;
  }
  assert.notEqual(exitCode, null, '--check should exit non-zero on drift');
  assert.notEqual(exitCode, 0);
});
