import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHook } from '../pending-flip-guard.js';

test('1. allows commit when no R2 inline pending in ledger', async () => {
  const result = await runHook({
    command: 'git commit -m "feat: stuff"',
    ledgerContent: 'R2 inline OK across all rows.'
  });
  assert.equal(result.blocked, false);
});

test('2. allows commit when R2 inline pending present but message is WIP-like', async () => {
  const result = await runHook({
    command: 'git commit -m "wip: in progress on seq X"',
    ledgerContent: 'row contains R2 inline pending placeholder.'
  });
  assert.equal(result.blocked, false);
});

test('3. BLOCKS commit when R2 inline pending + message claims complete', async () => {
  const result = await runHook({
    command: 'git commit -m "feat: complete seq 130"',
    ledgerContent: 'row contains R2 inline pending placeholder.'
  });
  assert.equal(result.blocked, true);
  assert.match(result.message, /R2 inline pending/i);
});

test('4. BLOCKS commit when R2 inline pending + message claims verified', async () => {
  const result = await runHook({
    command: 'git commit -m "verified: closing chunk"',
    ledgerContent: 'row has R2 inline pending state.'
  });
  assert.equal(result.blocked, true);
});

test('5. non-bash commit context does not trigger (silent)', async () => {
  const result = await runHook({
    command: null,
    ledgerContent: 'has R2 inline pending placeholder.'
  });
  assert.equal(result.blocked, false);
});
