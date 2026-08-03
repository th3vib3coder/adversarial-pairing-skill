import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const command = async (name) => fs.readFile(path.resolve(here, '..', name), 'utf8');

test('hat-1-stop keeps HAT 1 planning-only and surveys all helper classes', async () => {
  const text = await command('hat-1-stop.md');
  assert.match(text, /genuine Day 1/);
  assert.match(text, /missing row[\s\S]*does not make[\s\S]*Bootstrap/i);
  assert.match(text, /Literal property\/import\/export/);
  assert.match(text, /Bracket\/dynamic dispatch/);
  assert.match(text, /Helper conventions/);
  assert.match(text, /instanceof and type-guard/);
  assert.match(text, /Catch\/swallow patterns/);
  assert.match(text, /Do not write or execute the new tests yet/);
  assert.doesNotMatch(text, /confirmed RED before the operator issues GO/i);
});

test('adversarial-review requires all six closure signals and valid operator authorization', async () => {
  const text = await command('adversarial-review.md');
  for (let i = 1; i <= 6; i += 1) assert.match(text, new RegExp(`Signal ${i}\\b`));
  assert.match(text, /R2 inline OK/);
  assert.match(text, /NOT a completeness proof/);
  assert.match(text, /Only the distinct reviewer may emit `ACCEPT`/);
  assert.match(text, /direct GO or a separate,[\s\S]*standing authorization/i);
  assert.match(text, /without asking[\s\S]*another conversational GO/i);
  assert.match(text, /ACCEPT-TO-FLIP/);
  assert.match(text, /pre-flip review/i);
  assert.match(text, /git diff --name-status/);
  assert.match(text, /git ls-files --others --exclude-standard/);
  assert.match(text, /empty index .* valid/is);
  assert.match(text, /post-flip final review/i);
  assert.match(text, /git diff --cached/);
  assert.match(text, /exactly one anchored row/i);
  assert.doesNotMatch(text, /staged diff plus HAT 2 RED\/GREEN evidence/);
  assert.doesNotMatch(text, /confirmed via commit order/i);
});

test('dual-commit gates provider and consumer and forbids direct-OK row creation', async () => {
  const text = await command('dual-commit.md');
  assert.match(text, /GO-COMMIT provider/);
  assert.match(text, /GO-COMMIT consumer/);
  assert.match(text, /final HAT 3 `ACCEPT`/);
  assert.match(text, /missing ledger row is a STOP/i);
  assert.match(text, /Never create a missing row directly as `OK`/);
  assert.match(text, /standing-authorization consumption/i);
  assert.match(text, /exactly one anchored consumer-seq/i);
  assert.doesNotMatch(text, /rg -n "R2 inline \(pending\|OK\)"/u);
  assert.doesNotMatch(text, /if the ledger row does not exist, create it with status OK/i);
});

test('hat-1-stop consumes bounded standing authorization without a repeated prompt', async () => {
  const text = await command('hat-1-stop.md');
  assert.match(text, /never infer standing authorization/i);
  for (const requiredField of [
    /Standing authorization ID/i,
    /Operator source:[\s\S]*private record[\s\S]*durable reference\/source receipt/i,
    /Public artifact privacy check/i,
    /Authorized objective/i,
    /Authorized repositories and branches/i,
    /Authorized seq/i,
    /Allowed state transitions/i,
    /Allowed external effects/i,
    /Expiry condition/i,
    /Explicit exclusions/i,
    /Normalized HAT 1 record/i,
  ]) assert.match(text, requiredField);
  assert.match(text, /continue without asking for a repeated conversational GO/i);
});

test('lint-discipline never executes a preserved target-owned bundled tool', async () => {
  const text = await command('lint-discipline.md');
  assert.match(text, /\$\{CLAUDE_PLUGIN_ROOT\}\/tools\/wiki-lint\.mjs/);
  assert.match(text, /\$\{CLAUDE_PLUGIN_ROOT\}\/tools\/build-registries\.mjs/);
  assert.doesNotMatch(text, /^\s*node\s+.*wiki\/tools\//mu);
  assert.match(text, /exactly one[\s\S]*anchored current-seq row/i);
  assert.doesNotMatch(text, /git diff --cached \| rg/);
  assert.doesNotMatch(text, /^rg\s+"tier-C:/mu);
});

test('init-pairing gives a concrete Windows Git Bash path without an inline fallback', async () => {
  const text = await command('init-pairing.md');
  assert.match(text, /Git for Windows/i);
  assert.match(text, /\/c\/Program Files\/Git\/bin\/bash\.exe/);
  assert.match(text, /D:\\Work\\Repo/);
  assert.match(text, /\/d\/Work\/Repo/);
  assert.match(text, /stop rather than falling back to Write\/Edit/i);
});
