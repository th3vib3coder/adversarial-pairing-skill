import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHook } from '../ledger-mantra-check.js';

test('no warning when ledger row present in staged diff', async () => {
  const result = await runHook({ stagedFiles: ['src/foo.js', 'feature-ledger.md', 'wiki/log.md'] });
  assert.equal(result.warnings.length, 0);
  assert.equal(result.exitCode, 0);
});

test('warning when code touched without ledger row', async () => {
  const result = await runHook({ stagedFiles: ['src/foo.js'] });
  assert.match(result.warnings.join('\n'), /ledger.*row.*missing|missing.*ledger/i);
  assert.equal(result.exitCode, 0);
});

test('warning when ledger row present but wiki/log entry absent', async () => {
  const result = await runHook({ stagedFiles: ['src/foo.js', 'feature-ledger.md'] });
  assert.match(result.warnings.join('\n'), /wiki.*log|log.*missing/i);
  assert.equal(result.exitCode, 0);
});

test('hook exit code is 0 (advisory, never blocks)', async () => {
  const result = await runHook({ stagedFiles: ['src/foo.js'] });
  assert.equal(result.exitCode, 0);
  // Even with multiple warnings
  const noFiles = await runHook({ stagedFiles: [] });
  assert.equal(noFiles.exitCode, 0);
});
