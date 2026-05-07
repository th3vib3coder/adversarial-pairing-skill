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
const TOOL_PATH = path.resolve(__dirname, '..', 'audit-entity-exports.mjs');

const REGISTRY_FRONTMATTER = `---
status: computed
type: entity
role: tool-catalog
provenance:
  - kind: 'codebase-directory'
    ref: '<project-root>'
last-verified-at: 2026-05-01
compile-policy: 'regenerable-from-codebase'
---

# Exported Symbols Registry

`;

async function setupFixture({ registrySymbols = [], codebaseExports = [] } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'aee-'));
  await mkdir(path.join(root, 'wiki', 'entities'), { recursive: true });
  await mkdir(path.join(root, 'src'), { recursive: true });
  // Registry body: list each symbol as `- \`<name>\``
  const registryBody = registrySymbols.map(s => `- \`${s}\``).join('\n');
  await writeFile(
    path.join(root, 'wiki/entities/registry-exported-symbols.md'),
    REGISTRY_FRONTMATTER + registryBody + '\n',
    'utf8'
  );
  // Codebase: each export written to src/foo.js
  if (codebaseExports.length > 0) {
    const exports = codebaseExports.map(s => `export function ${s}() {}`).join('\n');
    await writeFile(path.join(root, 'src/foo.js'), exports + '\n', 'utf8');
  }
  return root;
}

async function runJson(root) {
  const registryPath = path.join(root, 'wiki/entities/registry-exported-symbols.md');
  try {
    const { stdout } = await execFileAsync('node', [TOOL_PATH, root, registryPath, '--json']);
    return { exitCode: 0, output: JSON.parse(stdout) };
  } catch (err) {
    return { exitCode: err.code, output: JSON.parse(err.stdout || '{}') };
  }
}

test('issueCount 0 when registry matches codebase exports', async () => {
  const root = await setupFixture({ registrySymbols: ['foo', 'bar'], codebaseExports: ['foo', 'bar'] });
  const { exitCode, output } = await runJson(root);
  assert.equal(exitCode, 0);
  assert.equal(output.issueCount, 0);
});

test('issueCount > 0 when registry lists symbol not in codebase (orphan)', async () => {
  const root = await setupFixture({ registrySymbols: ['foo', 'bar', 'orphan_sym'], codebaseExports: ['foo', 'bar'] });
  const { exitCode, output } = await runJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /orphan/i);
  assert.match(JSON.stringify(output.issues), /orphan_sym/);
});

test('issueCount > 0 when codebase exports symbol not in registry (gap)', async () => {
  const root = await setupFixture({ registrySymbols: ['foo'], codebaseExports: ['foo', 'gap_sym'] });
  const { exitCode, output } = await runJson(root);
  assert.notEqual(exitCode, 0);
  assert.ok(output.issueCount > 0);
  assert.match(JSON.stringify(output.issues), /gap/i);
  assert.match(JSON.stringify(output.issues), /gap_sym/);
});
