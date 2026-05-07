/**
 * CLI subprocess tests for ledger-mantra-check.js.
 *
 * Spawns the script with a JSON event payload on stdin and asserts:
 *   • exit code (always 0 — advisory)
 *   • stdout JSON shape (systemMessage when warning, empty otherwise)
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
const HOOK = path.resolve(__dirname, '..', 'ledger-mantra-check.js');

/**
 * Spawn the hook script with stdin/JSON and return { code, stdout, stderr }.
 */
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

test('CLI: exit 0 + no stdout JSON when no code files in event', async () => {
  // empty tmp cwd → no git index → no staged files → no warnings
  const tmp = await fs.mkdtemp(path.join(tmpdir(), 'lmc-empty-'));
  try {
    const r = await runCli(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'docs/foo.md' }, // .md → not code
        cwd: tmp,
      },
      { cwd: tmp }
    );
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CLI: exit 0 + systemMessage JSON on stdout when ledger row missing', async () => {
  // Use an arbitrary path outside any git repo; payload's tool_input.file_path
  // is 'src/foo.js' (a code file) and we run from a tmp dir with no git.
  const tmp = await fs.mkdtemp(path.join(tmpdir(), 'lmc-warn-'));
  try {
    const r = await runCli(
      {
        tool_name: 'Write',
        tool_input: { file_path: 'src/foo.js' },
        cwd: tmp,
      },
      { cwd: tmp }
    );
    assert.equal(r.code, 0);
    const lines = r.stdout.trim().split('\n').filter(Boolean);
    assert.equal(lines.length, 1, 'expected one JSON object on stdout');
    const obj = JSON.parse(lines[0]);
    assert.match(obj.systemMessage, /ledger.*missing|missing.*ledger/i);
    assert.equal(obj.continue, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('CLI: exit 0 + no warning when payload references a non-code (wiki) file', async () => {
  const tmp = await fs.mkdtemp(path.join(tmpdir(), 'lmc-wiki-'));
  try {
    const r = await runCli(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'wiki/log.md' },
        cwd: tmp,
      },
      { cwd: tmp }
    );
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), '');
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
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
    child.stdin.end(); // no payload
  });
  assert.equal(r.code, 0);
});
