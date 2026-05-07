import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = path.resolve(__dirname, '..');

const BOOTSTRAPPED_MJS_TOOLS = [
  'audit-entity-exports.mjs',
  'build-registries.mjs',
  'sync-mirror.mjs',
  'wiki-lint.mjs',
];

test('bootstrapped .mjs tools do not rely on CommonJS require', async () => {
  for (const tool of BOOTSTRAPPED_MJS_TOOLS) {
    const source = await readFile(path.join(TOOL_DIR, tool), 'utf8');
    assert.doesNotMatch(source, /\brequire\s*\(/u, `${tool} must not use require() — it is copied as .mjs by bootstrap.sh`);
  }
});
