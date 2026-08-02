import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as guard from '../pending-flip-guard.js';
import {
  hasPendingToken,
  inspectLedgerDocuments,
  inspectLedgerState,
} from '../pending-flip-ledger-state.js';

const table = (...states) => [
  '| seq | patch | feature | tests | R2 inline | status |',
  '|-----|-------|---------|-------|-----------|--------|',
  ...states.map((state, index) => `| ${index + 1} | patch | feature | tests | ${state} | open |`),
].join('\n');

test('public adapter retains exactly six exports', () => {
  assert.deepEqual(Object.keys(guard).sort(), [
    'commitClaimsClosure', 'hasPendingToken', 'isBashGitCommit',
    'parseGitCommitInvocation', 'parseGitCommitInvocations', 'runHook',
  ]);
});

test('ledger parser returns pending, ok, and structural-error states', () => {
  assert.equal(inspectLedgerState(table('R2 inline OK')).state, 'ok');
  assert.equal(inspectLedgerState(table('R2 inline OK', 'R2 inline pending')).state, 'pending');
  assert.equal(inspectLedgerState(table('unknown')).state, 'structural-error');
  assert.equal(hasPendingToken(table('R2 inline OK')), false);
  assert.equal(hasPendingToken(table('R2 inline pending')), true);
  assert.equal(hasPendingToken(table('unknown')), true);
});

test('documentary text, comments, fences, headings, and unrelated tables are ignored', () => {
  const samples = [
    'Historic prose says R2 inline pending.',
    '# R2 inline pending',
    '<!-- R2 inline pending -->',
    '```md\n' + table('R2 inline pending') + '\n```',
    '~~~\n' + table('R2 inline pending') + '\n~~~',
    '| name | note |\n|---|---|\n| x | R2 inline pending |',
    '> ' + table('R2 inline pending').replaceAll('\n', '\n> '),
    '````md\n```\n' + table('R2 inline pending') + '\n```\n````',
    '    ' + table('R2 inline pending').replaceAll('\n', '\n    '),
    '````md\n````not-a-close\n' + table('R2 inline pending') + '\n````',
  ];
  for (const sample of samples) assert.deepEqual(inspectLedgerState(sample), { state: 'ok', tables: 0 }, sample);
});

test('header normalization, CRLF, escaped pipes, and code-span pipes are supported', () => {
  const markdown = [
    '| ` SeQ ` | PATCH | feature | tests | `R2   INLINE` | status |',
    '|:---|---:|---|---|---|---|',
    '| 1 | p | escaped \\| pipe and `code|pipe` | t | R2 inline OK | open |',
  ].join('\r\n');
  assert.deepEqual(inspectLedgerState(markdown, { requireCanonical: true }), { state: 'ok', tables: 1 });
});

test('canonical table structural errors fail closed', () => {
  const malformed = [
    '| seq | patch | feature | tests | status |\n|---|---|---|---|---|\n| 1 | p | f | t | open |',
    '| seq | patch | feature | tests | R2 inline | R2 inline |\n|---|---|---|---|---|---|\n| 1 | p | f | t | R2 inline OK | R2 inline OK |',
    '| seq | patch | feature | tests | R2 inline |\n|---|---|---|---|--|\n| 1 | p | f | t | R2 inline OK |',
    '| seq | patch | feature | tests | R2 inline |\n|---|---|---|---|---|\n| 1 | p | f | t |',
    table('R2  inline OK'),
    table('r2 inline ok'),
    table('R2 inline O\\K'),
    table('R2 inline OK') + '\n\n' + table('R2 inline OK'),
  ];
  for (const sample of malformed) assert.equal(inspectLedgerState(sample).state, 'structural-error', sample);
  assert.equal(inspectLedgerState('prose', { requireCanonical: true }).state, 'structural-error');
});

test('path-aware document inspection blocks read errors and missing or duplicate feature tables', () => {
  assert.equal(inspectLedgerDocuments([{ file: '/repo/feature-ledger.md', readError: 'EACCES' }]).state, 'structural-error');
  assert.equal(inspectLedgerDocuments([{ file: '/repo/feature-ledger.md', content: 'prose' }]).state, 'structural-error');
  assert.equal(inspectLedgerDocuments([
    { file: '/repo/feature-ledger.md', content: table('R2 inline OK') },
    { file: '/repo/wiki/feature-ledger.md', content: table('R2 inline OK') },
  ]).state, 'structural-error');
  assert.deepEqual(inspectLedgerDocuments([]), { state: 'ok', noFeatureLedger: true });
});

test('runHook preserves result shape and blocks structural errors', async () => {
  assert.deepEqual(await guard.runHook({ command: 'echo safe', ledgerContent: table('R2 inline pending') }), { blocked: false });
  assert.deepEqual(await guard.runHook({ command: 'git commit -m x', ledgerContent: table('R2 inline OK') }), { blocked: false });
  assert.equal((await guard.runHook({ command: 'git commit -m x', ledgerContent: table('R2 inline pending') })).blocked, true);
  assert.equal((await guard.runHook({ command: 'git commit -m x', ledgerContent: table('unknown') })).blocked, true);
});

async function withDirectories(callback) {
  const parent = await mkdtemp(path.join(tmpdir(), 'pfg-unit-'));
  const caller = path.join(parent, 'caller');
  const target = path.join(parent, 'target');
  await mkdir(caller); await mkdir(target);
  try { await callback({ parent, caller, target, posixTarget: target.replaceAll('\\', '/') }); }
  finally { await rm(parent, { recursive: true, force: true }); }
}

test('direct and bounded wrapper forms resolve as commits', async () => withDirectories(({ caller, target, posixTarget }) => {
  const commands = [
    'git commit -m x', '{ git commit -m x; }', '! git commit -m x',
    'command -p -- git commit -m x', 'exec -- git commit -m x',
    'exec -c -a agent git commit -m x', 'time -p -- git commit -m x',
    "eval 'git commit -m x'", "bash -lc 'git commit -m x'", "sh -ec 'git commit -m x'",
    "bash -c 'git commit -m x' <<EOF\necho safe\nEOF", "bash <<EOF -c 'git commit -m x'\necho safe\nEOF",
    "bash -c bash <<EOF\ngit commit -m x\nEOF", "bash -c 'cat >/dev/null' <<EOF\n$(git commit -m x)\nEOF",
    "bash <<$'EOF'\ngit commit -m x\nEOF",
    "C:/tools/bash.exe -lc 'git commit -m x'", 'GIT=git; "$GIT" commit -m x',
    '"C:\\Program Files\\Git\\cmd\\git.exe" commit -m x',
    "CMD='git commit'; \${CMD} -m x",
  ];
  for (const command of commands) assert.equal(guard.parseGitCommitInvocations(command, caller, {}).length, 1, command);
  const nested = `{ ! env -C "${posixTarget}" bash -lc 'exec -- git commit -m x'; }`;
  assert.equal(guard.parseGitCommitInvocation(nested, caller, {}).cwd, target);
  const envHeredoc = `env -C "${posixTarget}" bash <<'EOF'\ngit commit -m x\nEOF`;
  assert.equal(guard.parseGitCommitInvocation(envHeredoc, caller, {}).cwd, target);
  const generalDelimiter = `env -C "${posixTarget}" command bash <<'END-MARK'\ngit commit -m x\nEND-MARK`;
  assert.equal(guard.parseGitCommitInvocation(generalDelimiter, caller, {}).cwd, target);
  const gitHeredoc = `GIT_DIR="${posixTarget}/.git" GIT_WORK_TREE="${posixTarget}" bash <<'EOF'\ngit commit -m x\nEOF`;
  assert.equal(guard.parseGitCommitInvocation(gitHeredoc, caller, {}).cwd, target);
  const isolated = guard.parseGitCommitInvocations(`bash <<'EOF'\ncd "${posixTarget}"\ngit status\nEOF\ngit commit -m x`, caller, {});
  assert.equal(isolated.length, 1);
  assert.equal(isolated[0].cwd, caller);
}));

test('Git target environment honors export boundaries and work-tree precedence', async () => withDirectories(({ caller, target, posixTarget }) => {
  const gitDir = `${posixTarget}/.git`;
  const targetCommands = [
    `GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}" git commit -m x`,
    `env GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}" git commit -m x`,
    `export GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}"; git commit -m x`,
  ];
  for (const command of targetCommands) assert.equal(guard.parseGitCommitInvocation(command, caller, {}).cwd, target, command);
  const inherited = guard.parseGitCommitInvocation('git commit -m x', caller, { GIT_DIR: gitDir, GIT_WORK_TREE: posixTarget });
  assert.equal(inherited.cwd, target);
  const unexported = guard.parseGitCommitInvocation(`GIT_DIR="${gitDir}"; GIT_WORK_TREE="${posixTarget}"; git commit -m x`, caller, {});
  assert.equal(unexported.cwd, caller);
  const unset = guard.parseGitCommitInvocation(`export GIT_WORK_TREE="${posixTarget}"; unset GIT_WORK_TREE; git commit -m x`, caller, {});
  assert.equal(unset.cwd, caller);
  assert.equal(guard.parseGitCommitInvocation(`GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}" eval 'true'; git commit -m x`, caller, {}).cwd, caller);
  assert.equal(guard.parseGitCommitInvocation(`export GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}"; export -n GIT_DIR GIT_WORK_TREE; git commit -m x`, caller, {}).cwd, caller);
  assert.equal(guard.parseGitCommitInvocation(`export GIT_DIR="${gitDir}" GIT_WORK_TREE="${posixTarget}"; unset -f GIT_DIR GIT_WORK_TREE; git commit -m x`, caller, {}).cwd, target);
  const split = guard.parseGitCommitInvocation(`GIT_DIR="${caller.replaceAll('\\', '/')}/.git" GIT_WORK_TREE="${posixTarget}" git commit -m x`, caller, {});
  assert.equal(split.cwd, target);
  for (const command of [
    `git --git-dir=.git --work-tree=. -C "${posixTarget}" commit -m x`,
    `git -C "${posixTarget}" --git-dir=.git --work-tree=. commit -m x`,
  ]) assert.equal(guard.parseGitCommitInvocation(command, caller, {}).cwd, target, command);
}));

test('cd, pushd, subshell, brace, eval, shell, and env cwd branches are modeled', async () => withDirectories(({ caller, target, posixTarget }) => {
  const targetOnly = [
    `cd "${posixTarget}" && git commit -m x`,
    `(cd "${posixTarget}" && git commit -m x)`,
    `{ cd "${posixTarget}" && git commit -m x; }`,
    `pushd "${posixTarget}" && git commit -m x`,
    `eval 'cd "${posixTarget}" && git commit -m x'`,
    `bash -lc 'cd "${posixTarget}" && git commit -m x'`,
    `env --chdir="${posixTarget}" git commit -m x`,
  ];
  for (const command of targetOnly) assert.equal(guard.parseGitCommitInvocation(command, caller, {}).cwd, target, command);
  assert.equal(guard.parseGitCommitInvocation('cd missing; git commit -m x', caller, {}).cwd, caller);
  assert.equal(guard.parseGitCommitInvocation('cd missing || git commit -m x', caller, {}).cwd, caller);
  assert.equal(guard.parseGitCommitInvocations(`cd "${posixTarget}" || git commit -m x`, caller, {}).length, 0);
  const dual = guard.parseGitCommitInvocations(`cd "${posixTarget}"; git commit -m x`, caller, {});
  assert.deepEqual(new Set(dual.map((item) => item.cwd)), new Set([caller, target]));
  const envDual = guard.parseGitCommitInvocations(`cd "${posixTarget}"; env git commit -m x`, caller, {});
  assert.deepEqual(new Set(envDual.map((item) => item.cwd)), new Set([caller, target]));
  const restored = guard.parseGitCommitInvocations(`bash -lc 'cd "${posixTarget}" && git status'; git commit -m x`, caller, {});
  assert.equal(restored[0].cwd, caller);
}));

test('dynamic and unsupported possible commit targets are surfaced unresolved', async () => withDirectories(({ caller }) => {
  const commands = [
    '$GIT commit -m x', 'eval "$SCRIPT"', 'bash -lc "$SCRIPT"',
    'cd "$TARGET" && git commit -m x', 'env -C "$TARGET" git commit -m x',
    'git --work-tree="$TARGET" commit -m x', 'command -Z git commit -m x',
    'exec -Z git commit -m x', 'env -S "git commit -m x"',
    "$'git' commit -m x", "$'g\\x69t' commit -m x",
  ];
  for (const command of commands) assert.equal(guard.parseGitCommitInvocation(command, caller, {}).unresolvedCommand, true, command);
  const cdpath = guard.parseGitCommitInvocation('cd target && git commit -m x', caller, { CDPATH: '/elsewhere' });
  assert.equal(cdpath.unresolvedCommand, true);
  assert.equal(guard.parseGitCommitInvocation('CDPATH=../other; cd target && git commit -m x', caller, {}).unresolvedCommand, true);
}));

test('comments, heredocs, inert quotes, and assignment-only prose are safe negatives', async () => withDirectories(({ caller }) => {
  const commands = [
    '# git commit -m x', 'echo "git commit -m x"', "echo '$(git commit -m x)'",
    "GIT=git; '$GIT' commit -m x", "TEXT='git commit -m x'", "bash -lc 'echo git commit'",
    'cat <<EOF\ngit commit -m x\nEOF\necho done', 'echo "$(date)"',
    "bash -c 'cat >/dev/null' <<'EOF'\necho safe\nEOF",
  ];
  for (const command of commands) assert.equal(guard.parseGitCommitInvocations(command, caller, {}).length, 0, command);
  assert.equal(guard.parseGitCommitInvocations('echo "$(git commit -m x)"', caller, {}).length, 1);
}));

test('hook registration removes the unsupported prefilter and keeps broad Bash routing', async () => {
  const config = JSON.parse(await readFile(new URL('../hooks.json', import.meta.url), 'utf8'));
  const packageScope = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const registration = config.hooks.PreToolUse[0];
  assert.equal(registration.matcher, 'Bash');
  assert.equal(Object.hasOwn(registration.hooks[0], 'if'), false);
  assert.deepEqual(packageScope, { private: true, type: 'module', engines: { node: '>=18.17.0' } });
});
