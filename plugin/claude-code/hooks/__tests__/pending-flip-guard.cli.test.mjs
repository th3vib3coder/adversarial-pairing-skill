import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.resolve(HERE, '..', 'pending-flip-guard.js');
const stateTable = (state) => [
  '| seq | patch | feature | tests | R2 inline | status |',
  '|-----|-------|---------|-------|-----------|--------|',
  `| 1 | patch | feature | tests | ${state} | open |`,
].join('\n');

function runCli(command, cwd, environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...environment },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }));
  });
}

async function fixture() {
  const parent = await mkdtemp(path.join(tmpdir(), 'pfg-cli-'));
  const caller = path.join(parent, 'caller');
  const target = path.join(parent, 'target');
  await mkdir(path.join(caller, '.git'), { recursive: true });
  await mkdir(path.join(target, '.git'), { recursive: true });
  return {
    parent, caller, target,
    callerArg: caller.replaceAll('\\', '/'),
    targetArg: target.replaceAll('\\', '/'),
  };
}

async function setState(repo, state) {
  await writeFile(path.join(repo, 'feature-ledger.md'), stateTable(state), 'utf8');
}

test('CLI distinguishes safe commands, no-ledger repositories, and canonical states', async () => {
  const f = await fixture();
  try {
    await setState(f.caller, 'R2 inline pending');
    assert.equal((await runCli('git status', f.caller)).code, 0);
    assert.equal((await runCli('git commit -m x', f.parent)).code, 0, 'genuinely absent ledger passes');
    assert.equal((await runCli('git commit -m x', f.caller)).code, 2);
    await setState(f.caller, 'R2 inline OK');
    assert.equal((await runCli('git commit -m x', f.caller)).code, 0);
    await writeFile(path.join(f.caller, 'feature-ledger.md'), stateTable('unknown'), 'utf8');
    assert.equal((await runCli('git commit -m x', f.caller)).code, 2);
    await writeFile(path.join(f.caller, 'feature-ledger.md'), 'historic R2 inline pending prose', 'utf8');
    const malformed = await runCli('git commit -m x', f.caller);
    assert.equal(malformed.code, 2);
    assert.match(malformed.stderr, /0 canonical feature tables/);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('documentary sentinel mentions outside a root feature ledger do not block', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pfg-doc-'));
  try {
    await mkdir(path.join(root, '.git'));
    await mkdir(path.join(root, 'wiki'));
    await writeFile(path.join(root, 'wiki', 'status-ledger.md'), [
      'Historic R2 inline pending prose.',
      '<!-- ' + stateTable('R2 inline pending') + ' -->',
      '````md\n```\n' + stateTable('R2 inline pending') + '\n```\n````',
      '> ' + stateTable('R2 inline pending').replaceAll('\n', '\n> '),
    ].join('\n'), 'utf8');
    assert.equal((await runCli('git commit -m x', root)).code, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('paired target-routing matrix blocks only the repository receiving the commit', async () => {
  const f = await fixture();
  const commands = [
    `git -C "${f.targetArg}" commit -m x`,
    `cd "${f.targetArg}" && git commit -m x`,
    `(cd "${f.targetArg}" && git commit -m x)`,
    `{ cd "${f.targetArg}" && git commit -m x; }`,
    `pushd "${f.targetArg}" && git commit -m x`,
    `eval 'cd "${f.targetArg}" && git commit -m x'`,
    `bash -lc 'cd "${f.targetArg}" && git commit -m x'`,
    `sh -ec 'cd "${f.targetArg}" && git commit -m x'`,
    `env -C "${f.targetArg}" git commit -m x`,
    `env --chdir "${f.targetArg}" git commit -m x`,
    `env --chdir="${f.targetArg}" git commit -m x`,
    `{ ! env -C "${f.targetArg}" bash -c 'exec -- git commit -m x'; }`,
  ];
  try {
    await setState(f.caller, 'R2 inline OK'); await setState(f.target, 'R2 inline pending');
    for (const command of commands) assert.equal((await runCli(command, f.caller)).code, 2, command);
    await setState(f.caller, 'R2 inline pending'); await setState(f.target, 'R2 inline OK');
    for (const command of commands) assert.equal((await runCli(command, f.caller)).code, 0, command);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('Git environment export rules and final -C cwd select the governing work tree', async () => {
  const f = await fixture();
  const gitDir = `${f.targetArg}/.git`;
  try {
    await setState(f.caller, 'R2 inline OK'); await setState(f.target, 'R2 inline pending');
    for (const command of [
      `GIT_DIR="${gitDir}" GIT_WORK_TREE="${f.targetArg}" git commit -m x`,
      `env GIT_DIR="${gitDir}" GIT_WORK_TREE="${f.targetArg}" git commit -m x`,
      `export GIT_DIR="${gitDir}" GIT_WORK_TREE="${f.targetArg}"; git commit -m x`,
      `GIT_DIR="${gitDir}" GIT_WORK_TREE="${f.targetArg}" eval 'git commit -m x'`,
    ]) assert.equal((await runCli(command, f.caller)).code, 2, command);
    assert.equal((await runCli(`GIT_DIR="${gitDir}"; GIT_WORK_TREE="${f.targetArg}"; git commit -m x`, f.caller)).code, 0);
    const relative = await runCli(`git -C "${f.targetArg}" commit -m x`, f.caller, { GIT_DIR: '.git', GIT_WORK_TREE: '.' });
    assert.equal(relative.code, 2);

    await setState(f.caller, 'R2 inline pending'); await setState(f.target, 'R2 inline OK');
    assert.equal((await runCli(`GIT_DIR="${gitDir}"; GIT_WORK_TREE="${f.targetArg}"; git commit -m x`, f.caller)).code, 2);
    assert.equal((await runCli('env -u GIT_DIR -u GIT_WORK_TREE git commit -m x', f.caller, { GIT_DIR: gitDir, GIT_WORK_TREE: f.targetArg })).code, 2);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('cwd failure branches, negation, and scope restoration cannot hide caller commits', async () => {
  const f = await fixture();
  try {
    await setState(f.caller, 'R2 inline pending'); await setState(f.target, 'R2 inline OK');
    for (const command of [
      'cd missing; git commit -m x', 'cd missing || git commit -m x',
      '! cd missing && git commit -m x',
      "! eval 'cd missing' && git commit -m x", "! eval 'cd .' || git commit -m x",
      `bash -lc 'cd "${f.targetArg}" && git status'; git commit -m x`,
      `false && cd "${f.targetArg}" || git commit -m x`,
      `true || cd "${f.targetArg}" && git commit -m x`,
    ]) assert.equal((await runCli(command, f.caller)).code, 2, command);
    assert.equal((await runCli(`cd "${f.targetArg}" || git commit -m x`, f.caller)).code, 0);
    await setState(f.target, 'R2 inline pending');
    assert.equal((await runCli(`! cd "${f.targetArg}" || git commit -m x`, f.caller)).code, 2);
    await setState(f.caller, 'R2 inline OK');
    assert.equal((await runCli(`cd "${f.targetArg}"; git commit -m x`, f.caller)).code, 2);
    await setState(f.caller, 'R2 inline pending'); await setState(f.target, 'R2 inline OK');
    assert.equal((await runCli(`cd "${f.targetArg}"; git commit -m x`, f.caller)).code, 2);
    assert.equal((await runCli(`cd "${f.targetArg}"; env git commit -m x`, f.caller)).code, 2);
    await setState(f.caller, 'R2 inline OK');
    assert.equal((await runCli(`cd "${f.targetArg}"; git commit -m x`, f.caller)).code, 0);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('unresolved targets and unsupported commit-bearing wrappers block without a ledger', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pfg-unresolved-'));
  try {
    for (const command of [
      '$GIT commit -m x', 'G=gi; "${G}t" commit -m x',
      'eval "$SCRIPT"', 'bash -lc "$SCRIPT"', 'cd "$TARGET" && git commit -m x',
      'env -C "$TARGET" git commit -m x', 'git --work-tree="$TARGET" commit -m x',
      'command -Z git commit -m x', 'exec -Z git commit -m x', 'env -S "git commit -m x"',
      'if true; then git commit -m x; fi', 'for x in 1; do git commit -m x; done',
      'while true; do git commit -m x; break; done', '$(printf git) commit -m x',
    ]) assert.equal((await runCli(command, root)).code, 2, command);
    assert.equal((await runCli('env -C "$TARGET" echo safe', root)).code, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('comments, heredocs, substitutions, backticks, and continuations follow Bash execution', async () => {
  const f = await fixture();
  try {
    await setState(f.caller, 'R2 inline pending');
    for (const command of [
      'echo ok # ; git commit -m x', "echo '$(git commit -m x)'",
      'cat <<EOF\ngit commit -m x\nEOF', "cat <<'EOF'\n$(git commit -m x)\nEOF",
      'TEXT="git commit -m x"', 'echo "$(date)"',
    ]) assert.equal((await runCli(command, f.caller)).code, 0, command);
    for (const command of [
      'echo ok # ignored\ngit commit -m x', 'echo "$(git commit -m x)"',
      'echo "\'$(git commit -m x)\'"', 'echo "$(printf \')\'; git commit -m x)"',
      'echo `git commit -m x`', 'cat <<EOF\n$(git commit -m x)\nEOF',
      'cat <<EOF\n`git commit -m x`\nEOF', "bash <<'EOF'\ngit commit -m x\nEOF",
      'env bash <<EOF\ngit commit -m x\nEOF', 'command bash <<EOF\ngit commit -m x\nEOF',
      'exec bash <<EOF\ngit commit -m x\nEOF', 'time bash <<EOF\ngit commit -m x\nEOF',
      'bash <<END-MARK\ngit commit -m x\nEND-MARK',
      "bash -c 'git commit -m x' <<EOF\necho safe\nEOF", "bash <<EOF -c 'git commit -m x'\necho safe\nEOF",
      "bash -c bash <<EOF\ngit commit -m x\nEOF", "bash -c 'cat >/dev/null' <<EOF\n$(git commit -m x)\nEOF",
      "bash <<$'EOF'\ngit commit -m x\nEOF",
      "bash <<< 'git commit -m x'", 'coproc git commit -m x',
      'git \\\ncommit -m x',
    ]) assert.equal((await runCli(command, f.caller)).code, 2, command);
    await setState(f.caller, 'R2 inline OK'); await setState(f.target, 'R2 inline pending');
    for (const command of [
      `env -C "${f.targetArg}" bash <<'EOF'\ngit commit -m x\nEOF`,
      `env -C "${f.targetArg}" command bash <<'END-MARK'\ngit commit -m x\nEND-MARK`,
      `GIT_DIR="${f.targetArg}/.git" GIT_WORK_TREE="${f.targetArg}" bash <<'EOF'\ngit commit -m x\nEOF`,
    ]) assert.equal((await runCli(command, f.caller)).code, 2, command);
    await setState(f.caller, 'R2 inline pending'); await setState(f.target, 'R2 inline OK');
    const isolated = `bash <<'EOF'\ncd "${f.targetArg}"\ngit status\nEOF\ngit commit -m x`;
    assert.equal((await runCli(isolated, f.caller)).code, 2, isolated);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('known script variables distinguish exported child state from inert unexported state', async () => {
  const f = await fixture();
  try {
    await setState(f.caller, 'R2 inline pending');
    assert.equal((await runCli("SCRIPT='git commit -m x'; bash -c '$SCRIPT'", f.caller)).code, 0);
    for (const command of [
      "SCRIPT='git commit -m x'; bash -c \"$SCRIPT\"",
      "export SCRIPT='git commit -m x'; bash -c '$SCRIPT'",
      "SCRIPT='git commit -m x' bash -c '$SCRIPT'",
      "env SCRIPT='git commit -m x' bash -c '$SCRIPT'",
      "SCRIPT='git commit -m x'; eval '$SCRIPT'",
    ]) assert.equal((await runCli(command, f.caller)).code, 2, command);
    for (const command of [
      "SCRIPT=printf; bash -c \"$SCRIPT\"", 'SCRIPT=printf; eval "$SCRIPT"',
      'GIT=printf; "$GIT" "git commit"',
    ]) assert.equal((await runCli(command, f.caller)).code, 0, command);
  } finally { await rm(f.parent, { recursive: true, force: true }); }
});

test('an existing unreadable-shaped feature ledger path fails closed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pfg-io-'));
  try {
    await mkdir(path.join(root, '.git'));
    await mkdir(path.join(root, 'feature-ledger.md'));
    assert.equal((await runCli('git commit -m x', root)).code, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('invalid or empty hook payload remains advisory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pfg-payload-'));
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [HOOK], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
      child.on('error', reject); child.on('close', (code) => resolve(code)); child.stdin.end('{bad');
    });
    assert.equal(result, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
