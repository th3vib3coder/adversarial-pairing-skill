import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_PATH = path.resolve(__dirname, '..', 'wiki-lint.mjs');

const VALID_FRONTMATTER = `---
status: claimed
type: concept
role: reference-doc
provenance:
  - kind: 'codebase-file'
    ref: 'src/foo.js'
last-verified-at: 2026-05-01
---

# Body
`;

async function setupFixture(content) {
  const root = await mkdtemp(path.join(tmpdir(), 'wl-'));
  await mkdir(path.join(root, 'concepts'), { recursive: true });
  await writeFile(path.join(root, 'concepts/test.md'), content, 'utf8');
  return root;
}

async function runLintJson(wikiRoot) {
  try {
    const { stdout } = await execFileAsync('node', [TOOL_PATH, wikiRoot, '--json']);
    return { exitCode: 0, output: JSON.parse(stdout) };
  } catch (err) {
    // execFileAsync throws on non-zero exit; stdout still in err.stdout
    return { exitCode: err.code, output: JSON.parse(err.stdout || '{}') };
  }
}

test('issueCount 0 on valid LAW 13 fixture', async () => {
  const root = await setupFixture(VALID_FRONTMATTER);
  const { exitCode, output } = await runLintJson(root);
  assert.equal(exitCode, 0);
  assert.equal(output.issueCount, 0);
});

test('issueCount > 0 on invalid status enum', async () => {
  const bad = VALID_FRONTMATTER.replace('status: claimed', 'status: not-a-valid-status');
  const root = await setupFixture(bad);
  const { exitCode, output } = await runLintJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /status/i);
});

test('issueCount > 0 on invalid role enum', async () => {
  const bad = VALID_FRONTMATTER.replace('role: reference-doc', 'role: not-a-role');
  const root = await setupFixture(bad);
  const { exitCode, output } = await runLintJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /role/i);
});

test('issueCount > 0 when provenance missing', async () => {
  const bad = `---
status: claimed
type: concept
role: reference-doc
last-verified-at: 2026-05-01
---

# Body
`;
  const root = await setupFixture(bad);
  const { exitCode, output } = await runLintJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /provenance/i);
});

test('issueCount > 0 on bad ISO date', async () => {
  const bad = VALID_FRONTMATTER.replace('last-verified-at: 2026-05-01', 'last-verified-at: not-a-date');
  const root = await setupFixture(bad);
  const { exitCode, output } = await runLintJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /last-verified-at|date/i);
});
