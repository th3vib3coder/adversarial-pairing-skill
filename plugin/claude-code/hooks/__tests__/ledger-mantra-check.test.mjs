import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCodeFile,
  normalizeRepoPath,
  runHook,
} from '../ledger-mantra-check.js';

test('normalizes absolute POSIX wiki/docs paths relative to the repo', () => {
  assert.equal(normalizeRepoPath('/repo/wiki/tools/probe.js', '/repo'), 'wiki/tools/probe.js');
  assert.equal(normalizeRepoPath('/repo/docs/probe.js', '/repo'), 'docs/probe.js');
});

test('normalizes absolute Windows wiki/docs paths relative to the repo', () => {
  assert.equal(
    normalizeRepoPath('C:\\repo\\wiki\\tools\\probe.js', 'C:\\repo'),
    'wiki/tools/probe.js'
  );
  assert.equal(
    normalizeRepoPath('C:\\repo\\docs\\probe.js', 'C:\\repo'),
    'docs/probe.js'
  );
});

test('normalizes relative backslash paths for portable classification', () => {
  assert.equal(normalizeRepoPath('wiki\\tools\\probe.js', 'C:\\repo'), 'wiki/tools/probe.js');
  assert.equal(isCodeFile('docs\\probe.js'), false);
});

test('absolute repo-local wiki/docs files do not produce warnings', async () => {
  const posix = await runHook({
    stagedFiles: ['/repo/wiki/tools/probe.js', '/repo/docs/probe.js'],
    repoRoot: '/repo',
  });
  const windows = await runHook({
    stagedFiles: ['C:\\repo\\wiki\\tools\\probe.js', 'C:\\repo\\docs\\probe.js'],
    repoRoot: 'C:\\repo',
  });
  assert.deepEqual(posix.warnings, []);
  assert.deepEqual(windows.warnings, []);
  assert.equal(posix.exitCode, 0);
  assert.equal(windows.exitCode, 0);
});

test('absolute paths outside the repo cannot masquerade as local docs', () => {
  assert.equal(normalizeRepoPath('/outside/docs/probe.js', '/repo'), '/outside/docs/probe.js');
  assert.equal(isCodeFile(normalizeRepoPath('/outside/docs/probe.js', '/repo')), true);
});

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
