import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, link, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_PATH = path.resolve(__dirname, '..', 'build-registries.mjs');
const REGISTRIES = ['cli-verbs', 'exported-symbols', 'db-writers', 'schema-graph', 'gate-triggers', 'protocol-invariants'];

async function runTool(...args) {
  return execFileAsync(process.execPath, [TOOL_PATH, ...args], { encoding: 'utf8' });
}

async function runToolWithEnv(env, ...args) {
  return execFileAsync(process.execPath, [TOOL_PATH, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
}

function startToolAtBarrier(env, ...args) {
  const child = spawn(process.execPath, [TOOL_PATH, ...args], { env: { ...process.env, ...env } });
  let stdout = '';
  let stderr = '';
  let resolveBarrier;
  const barrier = new Promise((resolve) => { resolveBarrier = resolve; });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    const match = stderr.match(/test-only (?:postcheck|postclose) barrier: ([^\r\n]+)\r?\n/);
    if (match && resolveBarrier) {
      resolveBarrier(match[1]);
      resolveBarrier = null;
    }
  });
  const completed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  return { barrier, completed };
}

async function expectToolFailure(args, messagePattern) {
  let failure;
  try {
    await runTool(...args);
  } catch (err) {
    failure = err;
  }
  assert.ok(failure, `expected tool failure for ${args.join(' ')}`);
  assert.notEqual(failure.code, 0);
  assert.match(String(failure.stderr), messagePattern);
  return failure;
}

async function createDirectoryLink(target, linkPath) {
  await symlink(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

async function pathIsMissing(filePath) {
  try {
    await access(filePath);
    return false;
  } catch {
    return true;
  }
}

test('builds 6 disclosed provisional registry stubs with LAW 13 frontmatter', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-fixture-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  await runTool(fixtureRoot);
  for (const name of REGISTRIES) {
    const filePath = path.join(fixtureRoot, 'wiki/entities', `registry-${name}.md`);
    const content = await readFile(filePath, 'utf8');
    assert.match(content, /^---\nstatus: supposition\n/m, `registry-${name}.md must start with honest LAW 13 status`);
    assert.match(content, /role: tool-catalog/, `registry-${name}.md must declare role: tool-catalog`);
    assert.match(content, /scanner-mode: 'stub'/, `registry-${name}.md must disclose stub scanner mode`);
    assert.match(content, /compile-policy: 'placeholder-not-a-completeness-proof'/, `registry-${name}.md must disclaim completeness`);
  }
});

test('--check mode exits 0 when registries match', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-check-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  // Populate first
  await runTool(fixtureRoot);
  // Then check
  await runTool(fixtureRoot, '--check');
  // execFileAsync resolves on exit 0, throws on non-zero
  assert.ok(true, '--check returned exit 0 (registries match)');
});

test('--check mode exits non-zero when registries drift', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-drift-'));
  await mkdir(path.join(fixtureRoot, 'wiki', 'entities'), { recursive: true });
  await runTool(fixtureRoot);
  // Modify one registry to simulate drift
  const targetFile = path.join(fixtureRoot, 'wiki/entities/registry-cli-verbs.md');
  await writeFile(targetFile, 'tampered content\n', 'utf8');
  // Check should fail
  let exitCode = null;
  try {
    await runTool(fixtureRoot, '--check');
  } catch (err) {
    exitCode = err.code;
  }
  assert.notEqual(exitCode, null, '--check should exit non-zero on drift');
  assert.notEqual(exitCode, 0);
});

test('--check reports missing stubs without creating wiki directories', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-check-missing-'));
  await expectToolFailure([fixtureRoot, '--check'], /drift detected in 6 registry file/);
  assert.equal(await pathIsMissing(path.join(fixtureRoot, 'wiki')), true);
});

test('default mode preserves existing regular registry files', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-preserve-'));
  await runTool(fixtureRoot);
  const target = path.join(fixtureRoot, 'wiki', 'entities', 'registry-cli-verbs.md');
  await writeFile(target, 'user-owned content\n', 'utf8');

  const result = await runTool(fixtureRoot, '--no-overwrite');

  assert.match(result.stdout, /preserved 6 existing file/);
  assert.equal(await readFile(target, 'utf8'), 'user-owned content\n');
});

test('--force regenerates singly-linked regular registry files', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-force-'));
  await runTool(fixtureRoot);
  for (const name of REGISTRIES) {
    await writeFile(path.join(fixtureRoot, 'wiki', 'entities', `registry-${name}.md`), `OLD ${name}\n`, 'utf8');
  }

  await runTool(fixtureRoot, '--force');

  for (const name of REGISTRIES) {
    const content = await readFile(path.join(fixtureRoot, 'wiki', 'entities', `registry-${name}.md`), 'utf8');
    assert.match(content, /scanner-mode: 'stub'/);
    assert.doesNotMatch(content, /^OLD /);
  }
  await runTool(fixtureRoot, '--check');
});

test('--force rolls all six files back and cleans artifacts after a deterministic third-file failure', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-force-rollback-'));
  await runTool(fixtureRoot);
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  for (const name of REGISTRIES) {
    await writeFile(path.join(entities, `registry-${name}.md`), `OLD ${name}\n`, 'utf8');
  }

  let failure;
  try {
    await runToolWithEnv({ ADVERSARIAL_PAIRING_TEST_FORCE_FAILURE_AT: '3' }, fixtureRoot, '--force');
  } catch (err) {
    failure = err;
  }
  assert.ok(failure);
  assert.match(String(failure.stderr), /injected force failure at registry 3/);

  for (const name of REGISTRIES) {
    assert.equal(await readFile(path.join(entities, `registry-${name}.md`), 'utf8'), `OLD ${name}\n`);
  }
  assert.deepEqual(
    (await readdir(entities)).sort(),
    REGISTRIES.map((name) => `registry-${name}.md`).sort(),
    'rollback must remove every temporary and backup artifact',
  );
});

test('--force sanitizes a staged hardlink introduced after its pre-write check', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-stage-hardlink-'));
  const fixtureRoot = path.join(parent, 'project');
  await mkdir(fixtureRoot);
  await runTool(fixtureRoot);
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  for (const name of REGISTRIES) {
    await writeFile(path.join(entities, `registry-${name}.md`), `OLD ${name}\n`, 'utf8');
  }

  const running = startToolAtBarrier(
    { ADVERSARIAL_PAIRING_TEST_STAGE_PAUSE_MS: '2000' },
    fixtureRoot,
    '--force',
  );
  const stagedPath = await running.barrier;
  assert.equal(path.dirname(stagedPath), entities);
  const outside = path.join(parent, 'outside-hardlink.md');
  await link(stagedPath, outside);

  const outcome = await running.completed;
  assert.notEqual(outcome.code, 0, 'pre-write hardlink must make --force fail');
  assert.match(outcome.stderr, /multiply-linked registry file|unsafe or changed staged file/);
  assert.equal(await readFile(outside, 'utf8'), '', 'outside hardlink must receive zero generated bytes');
  for (const name of REGISTRIES) {
    assert.equal(await readFile(path.join(entities, `registry-${name}.md`), 'utf8'), `OLD ${name}\n`);
  }
  assert.deepEqual(
    (await readdir(entities)).sort(),
    REGISTRIES.map((name) => `registry-${name}.md`).sort(),
    `failed staging must leave no temporary or backup artifact; stderr=${outcome.stderr}`,
  );
});

test('default creation sanitizes a hardlink introduced after its pre-write check', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-create-hardlink-'));
  const fixtureRoot = path.join(parent, 'project');
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  await mkdir(entities, { recursive: true });
  for (const name of REGISTRIES.slice(1)) {
    await writeFile(path.join(entities, `registry-${name}.md`), `OLD ${name}\n`, 'utf8');
  }

  const running = startToolAtBarrier(
    { ADVERSARIAL_PAIRING_TEST_CREATE_PAUSE_MS: '2000' },
    fixtureRoot,
  );
  const created = path.join(entities, 'registry-cli-verbs.md');
  assert.equal(await running.barrier, created);
  const outside = path.join(parent, 'outside-hardlink.md');
  await link(created, outside);

  const outcome = await running.completed;
  assert.notEqual(outcome.code, 0, 'post-check hardlink must make default creation fail');
  assert.match(outcome.stderr, /multiply-linked registry file|unsafe or changed staged file/);
  assert.equal(await readFile(outside, 'utf8'), '', 'outside hardlink must be sanitized back to zero bytes');
  assert.equal(await pathIsMissing(created), true, 'failed newly-created registry must be removed');
  for (const name of REGISTRIES.slice(1)) {
    assert.equal(await readFile(path.join(entities, `registry-${name}.md`), 'utf8'), `OLD ${name}\n`);
  }
  assert.deepEqual(
    (await readdir(entities)).sort(),
    REGISTRIES.slice(1).map((name) => `registry-${name}.md`).sort(),
  );
});

test('post-close finalization sanitizes concurrent hardlinks in default and --force modes', async (t) => {
  for (const mode of ['default', 'force']) {
    await t.test(mode, async () => {
      const parent = await mkdtemp(path.join(tmpdir(), `br-postclose-${mode}-`));
      const fixtureRoot = path.join(parent, 'project');
      const entities = path.join(fixtureRoot, 'wiki', 'entities');
      await mkdir(entities, { recursive: true });
      const originals = mode === 'force' ? REGISTRIES : REGISTRIES.slice(1);
      for (const name of originals) {
        await writeFile(path.join(entities, `registry-${name}.md`), `OLD ${name}\n`, 'utf8');
      }

      const running = startToolAtBarrier(
        { ADVERSARIAL_PAIRING_TEST_POST_CLOSE_PAUSE_MS: '2000' },
        fixtureRoot,
        ...(mode === 'force' ? ['--force'] : []),
      );
      const ownedPath = await running.barrier;
      const outside = path.join(parent, 'outside-hardlink.md');
      await link(ownedPath, outside);
      const outcome = await running.completed;

      assert.notEqual(outcome.code, 0);
      assert.match(outcome.stderr, /multiply-linked registry file|unsafe or changed staged file/);
      assert.equal(await readFile(outside, 'utf8'), '');
      for (const name of originals) {
        assert.equal(await readFile(path.join(entities, `registry-${name}.md`), 'utf8'), `OLD ${name}\n`);
      }
      assert.deepEqual(
        (await readdir(entities)).sort(),
        originals.map((name) => `registry-${name}.md`).sort(),
      );
    });
  }
});

test('rejects a project root that is not a directory', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-root-file-'));
  const rootFile = path.join(parent, 'project-file');
  await writeFile(rootFile, 'not a directory\n', 'utf8');
  await expectToolFailure([rootFile], /project root must be a real directory/);
});

test('rejects a linked project root and does not write through it', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-root-link-'));
  const realRoot = path.join(parent, 'real-project');
  const linkedRoot = path.join(parent, 'linked-project');
  await mkdir(realRoot);
  await createDirectoryLink(realRoot, linkedRoot);

  await expectToolFailure([linkedRoot], /project root must be a real directory|resolves through a link/);

  assert.equal(await pathIsMissing(path.join(realRoot, 'wiki')), true);
});

test('rejects a linked wiki directory and does not write outside the project', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-wiki-link-'));
  const external = await mkdtemp(path.join(tmpdir(), 'br-wiki-external-'));
  await createDirectoryLink(external, path.join(fixtureRoot, 'wiki'));

  await expectToolFailure([fixtureRoot], /wiki directory must be a real directory|resolves through a link/);

  assert.equal(await pathIsMissing(path.join(external, 'entities')), true);
});

test('rejects a linked entities directory and does not write outside the project', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-entities-link-'));
  const external = await mkdtemp(path.join(tmpdir(), 'br-entities-external-'));
  await mkdir(path.join(fixtureRoot, 'wiki'));
  await createDirectoryLink(external, path.join(fixtureRoot, 'wiki', 'entities'));

  await expectToolFailure([fixtureRoot], /entities directory must be a real directory|resolves through a link/);

  assert.equal(await pathIsMissing(path.join(external, 'registry-cli-verbs.md')), true);
});

test('rejects non-directory wiki and entities components', async () => {
  const wikiFileRoot = await mkdtemp(path.join(tmpdir(), 'br-wiki-file-'));
  await writeFile(path.join(wikiFileRoot, 'wiki'), 'not a directory\n', 'utf8');
  await expectToolFailure([wikiFileRoot], /wiki directory must be a real directory/);

  const entitiesFileRoot = await mkdtemp(path.join(tmpdir(), 'br-entities-file-'));
  await mkdir(path.join(entitiesFileRoot, 'wiki'));
  await writeFile(path.join(entitiesFileRoot, 'wiki', 'entities'), 'not a directory\n', 'utf8');
  await expectToolFailure([entitiesFileRoot], /entities directory must be a real directory/);
});

test('rejects a non-regular registry destination instead of silently preserving it', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'br-registry-dir-'));
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  await mkdir(entities, { recursive: true });
  const target = path.join(entities, 'registry-exported-symbols.md');
  await mkdir(target);

  await expectToolFailure([fixtureRoot, '--no-overwrite'], /registry path must be a regular file/);

  assert.equal(await pathIsMissing(path.join(entities, 'registry-cli-verbs.md')), true);
});

test('--force rejects hardlinked registry files and preserves the other link', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-hardlink-'));
  const fixtureRoot = path.join(parent, 'project');
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  const external = path.join(parent, 'outside.md');
  await mkdir(entities, { recursive: true });
  const firstRegistry = path.join(entities, 'registry-cli-verbs.md');
  await writeFile(firstRegistry, 'first registry content\n', 'utf8');
  await writeFile(external, 'external content\n', 'utf8');
  await link(external, path.join(entities, 'registry-exported-symbols.md'));

  await expectToolFailure([fixtureRoot, '--force'], /refusing to replace multiply-linked registry file/);

  assert.equal(await readFile(firstRegistry, 'utf8'), 'first registry content\n');
  assert.equal(await readFile(external, 'utf8'), 'external content\n');
  assert.equal(await pathIsMissing(path.join(entities, 'registry-db-writers.md')), true);
});

test('rejects registry symlinks in --force and --check without touching their targets', async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), 'br-file-link-'));
  const fixtureRoot = path.join(parent, 'project');
  const entities = path.join(fixtureRoot, 'wiki', 'entities');
  const external = path.join(parent, 'outside.md');
  const target = path.join(entities, 'registry-exported-symbols.md');
  await mkdir(entities, { recursive: true });
  await writeFile(external, 'external content\n', 'utf8');
  try {
    await symlink(external, target, 'file');
  } catch (err) {
    if (process.platform === 'win32' && (err.code === 'EPERM' || err.code === 'EACCES')) {
      t.skip('file symlink creation is unavailable without Windows Developer Mode');
      return;
    }
    throw err;
  }

  await expectToolFailure([fixtureRoot, '--no-overwrite'], /registry path must be a regular file/);
  assert.equal(await pathIsMissing(path.join(entities, 'registry-cli-verbs.md')), true);
  await expectToolFailure([fixtureRoot, '--force'], /registry path must be a regular file/);
  await expectToolFailure([fixtureRoot, '--check'], /registry path must be a regular file/);

  assert.equal(await readFile(external, 'utf8'), 'external content\n');
});
