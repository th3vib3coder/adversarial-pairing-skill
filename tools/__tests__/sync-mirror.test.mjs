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
const TOOL_PATH = path.resolve(__dirname, '..', 'sync-mirror.mjs');

test('mirror creates equivalent file tree from source', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'sm-mirror-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'concepts'), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'wiki/concepts/foo.md'), '---\nstatus: claimed\ntype: concept\n---\n# foo\n', 'utf8');
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);
  const mirroredPath = path.join(fixtureRoot, 'wiki/mirror/concepts/foo.md');
  await access(mirroredPath);  // throws if missing
  const content = await readFile(mirroredPath, 'utf8');
  assert.match(content, /^---\nstatus: claimed\n/m);
});

test('--check exits 0 when mirror matches source', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'sm-check-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'concepts'), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'wiki/concepts/bar.md'), '---\nstatus: sourced\n---\n# bar\n', 'utf8');
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);  // populate
  await execFileAsync('node', [TOOL_PATH, fixtureRoot, '--check']);  // check
  assert.ok(true);
});

test('--check exits non-zero when mirror drifts', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'sm-drift-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'concepts'), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'wiki/concepts/baz.md'), 'original\n', 'utf8');
  await execFileAsync('node', [TOOL_PATH, fixtureRoot]);
  // Tamper with mirror file (simulate drift)
  await writeFile(path.join(fixtureRoot, 'wiki/mirror/concepts/baz.md'), 'tampered\n', 'utf8');
  let exitCode = null;
  try {
    await execFileAsync('node', [TOOL_PATH, fixtureRoot, '--check']);
  } catch (err) {
    exitCode = err.code;
  }
  assert.notEqual(exitCode, null);
  assert.notEqual(exitCode, 0);
});
