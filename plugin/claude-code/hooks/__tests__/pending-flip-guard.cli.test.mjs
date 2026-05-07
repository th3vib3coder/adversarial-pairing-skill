/**
 * CLI subprocess tests for pending-flip-guard.js.
 *
 * Spawns the script with a PreToolUse Bash JSON event on stdin and asserts:
 *   • exit code (0 = pass-through, 2 = block)
 *   • stderr message on block path (per hooks-reference exit-code 2 contract)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HOOK = path.resolve(__dirname, '..', 'pending-flip-guard.js');

function runCli(payload, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK], {
      cwd: opts.cwd || tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...(opts.env || {}) },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

/**
 * Build a tmp directory with a wiki/<file>.md ledger fixture.
 * Returns the tmp root path.
 */
async function makeRepoWithLedger(ledgerText) {
  const tmp = await fs.mkdtemp(path.join(tmpdir(), 'pfg-'));
  await fs.mkdir(path.join(tmp, 'wiki'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'wiki', 'adversarial-ledger.md'), ledgerText, 'utf8');
  return tmp;
}

test('CLI: exit 0 (pass) when ledger has no R2 inline pending', async () => {
  const repo = await makeRepoWithLedger('R2 inline OK across all rows.');
  try {
    const r = await runCli(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: complete seq 130"' },
        cwd: repo,
      },
      { cwd: repo }
    );
    assert.equal(r.code, 0);
    assert.equal(r.stderr.trim(), '');
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test('CLI: exit 0 (pass) when ledger pending but commit message is WIP-like', async () => {
  const repo = await makeRepoWithLedger('row contains R2 inline pending placeholder.');
  try {
    const r = await runCli(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "wip: in progress"' },
        cwd: repo,
      },
      { cwd: repo }
    );
    assert.equal(r.code, 0);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test('CLI: exit 2 (BLOCK) + stderr block reason when pending + closure claim', async () => {
  const repo = await makeRepoWithLedger('row contains R2 inline pending placeholder.');
  try {
    const r = await runCli(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: complete seq 130"' },
        cwd: repo,
      },
      { cwd: repo }
    );
    assert.equal(r.code, 2, `expected exit 2 (block), got ${r.code}; stderr=${r.stderr}`);
    assert.match(r.stderr, /BLOCKED/);
    assert.match(r.stderr, /R2 inline pending/);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test('CLI: exit 0 when no ledger file is present (best-effort safe pass)', async () => {
  const tmp = await fs.mkdtemp(path.join(tmpdir(), 'pfg-noledger-'));
  try {
    const r = await runCli(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git commit -m "feat: complete seq"' },
        cwd: tmp,
      },
      { cwd: tmp }
    );
    // No ledger → ledgerContent is null → runHook returns blocked: false.
    assert.equal(r.code, 0);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CLI: exit 0 when command is not git commit', async () => {
  const repo = await makeRepoWithLedger('R2 inline pending here.');
  try {
    const r = await runCli(
      {
        tool_name: 'Bash',
        tool_input: { command: 'git status' },
        cwd: repo,
      },
      { cwd: repo }
    );
    assert.equal(r.code, 0);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test('CLI: empty stdin is handled gracefully (advisory exit 0)', async () => {
  const r = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK], {
      cwd: tmpdir(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end();
  });
  assert.equal(r.code, 0);
});
