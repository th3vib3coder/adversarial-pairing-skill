/**
 * build-registries.mjs
 *
 * Emits 6 provisional inverse-index registry placeholders.
 * Writes missing files safely by default, force-replaces them only with --force,
 * or validates deterministic placeholder drift with --check.
 *
 * Usage:
 *   node build-registries.mjs <project-root>                  # create missing only
 *   node build-registries.mjs <project-root> --no-overwrite   # create missing only
 *   node build-registries.mjs <project-root> --force          # explicit replacement
 *   node build-registries.mjs <project-root> --check          # validate stub drift
 *
 * LAW 13 frontmatter is included in every generated file.
 * IMPORTANT: the bundled scanner is a scaffold stub. Its output is deliberately
 * marked provisional and MUST NOT be used as evidence of codebase coverage.
 */

import { constants as FS_CONSTANTS } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, realpath, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

const REGISTRY_NAMES = ['cli-verbs', 'exported-symbols', 'db-writers', 'schema-graph', 'gate-triggers', 'protocol-invariants'];
// Stub scanner: replace this implementation when a real project scanner exists.
function scanCodebase(_projectRoot, _registryName) {
  // Stub: no entries discovered.
  return [];
}

function generateRegistryContent(_projectRoot, name) {
  const entries = scanCodebase(_projectRoot, name);

  const frontmatter = [
    '---',
    'status: supposition',
    'type: entity',
    'role: tool-catalog',
    'provenance:',
    `  - kind: 'protocol'`,
    `    ref: 'adversarial-pairing-skill/tools/build-registries.mjs'`,
    'last-verified-at: 1970-01-01',
    `scanner-mode: 'stub'`,
    `compile-policy: 'placeholder-not-a-completeness-proof'`,
    '---',
  ].join('\n');

  const heading = `\n# Registry: ${name}\n`;

  let body;
  if (entries.length === 0) {
    body = '\n_Placeholder only: the bundled scanner is not implemented. Do not use this registry as evidence of codebase coverage._\n';
  } else {
    body = '\n| Entry | Source |\n| ----- | ------ |\n';
    for (const row of entries) {
      body += row + '\n';
    }
  }

  return frontmatter + heading + body;
}

class UnsafePathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafePathError';
  }
}
function isMissing(err) {
  return err && err.code === 'ENOENT';
}

function comparablePath(filePath) {
  const normalized = path.normalize(filePath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function samePath(left, right) {
  return comparablePath(left) === comparablePath(right);
}
function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertWithinRoot(projectRoot, candidate) {
  const relative = path.relative(projectRoot, candidate);
  if (relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))) {
    return;
  }
  throw new UnsafePathError(`path escapes project root: ${candidate}`);
}
async function getLstat(filePath) {
  try {
    return await lstat(filePath);
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
}
async function assertSafeDirectory(filePath, label, { allowMissing = false } = {}) {
  const stats = await getLstat(filePath);
  if (!stats) {
    if (allowMissing) return false;
    throw new UnsafePathError(`${label} does not exist: ${filePath}`);
  }
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new UnsafePathError(`${label} must be a real directory, not a link or another file type: ${filePath}`);
  }

  const canonical = await realpath(filePath);
  if (!samePath(canonical, filePath)) {
    throw new UnsafePathError(`${label} resolves through a link or reparse point: ${filePath} -> ${canonical}`);
  }
  return true;
}
async function createAndValidateDirectory(filePath, label) {
  try {
    await mkdir(filePath);
  } catch (err) {
    if (!err || err.code !== 'EEXIST') throw err;
  }
  await assertSafeDirectory(filePath, label);
}
async function prepareEntitiesDirectory(projectRoot, { create }) {
  await assertSafeDirectory(projectRoot, 'project root');
  const wikiDir = path.join(projectRoot, 'wiki');
  const entitiesDir = path.join(wikiDir, 'entities');
  assertWithinRoot(projectRoot, wikiDir);
  assertWithinRoot(projectRoot, entitiesDir);

  for (const [directory, label] of [[wikiDir, 'wiki directory'], [entitiesDir, 'entities directory']]) {
    const exists = await assertSafeDirectory(directory, label, { allowMissing: true });
    if (!exists) {
      if (!create) return null;
      await createAndValidateDirectory(directory, label);
    }
  }

  await assertSafeDirectory(projectRoot, 'project root');
  await assertSafeDirectory(wikiDir, 'wiki directory');
  await assertSafeDirectory(entitiesDir, 'entities directory');
  return entitiesDir;
}
async function assertRegularPath(filePath, { allowMissing = false, rejectHardlinks = false } = {}) {
  const stats = await getLstat(filePath);
  if (!stats) {
    if (allowMissing) return null;
    throw new UnsafePathError(`registry file does not exist: ${filePath}`);
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new UnsafePathError(`registry path must be a regular file, not a link or another file type: ${filePath}`);
  }
  if (rejectHardlinks && stats.nlink !== 1) {
    throw new UnsafePathError(`refusing to replace multiply-linked registry file (link count ${stats.nlink}): ${filePath}`);
  }
  return stats;
}

async function assertHandlePath(handle, filePath, expected) {
  const opened = await handle.stat();
  const onPath = await assertRegularPath(filePath, { rejectHardlinks: true });
  if (!opened.isFile() || opened.nlink !== 1 || !sameIdentity(opened, onPath) || (expected && !sameIdentity(opened, expected))) {
    throw new UnsafePathError(`unsafe or changed staged file: ${filePath}`);
  }
  return opened;
}

async function sanitizeOwnedHandle(handle, expected) {
  const opened = await handle.stat();
  if (!opened.isFile() || !sameIdentity(opened, expected)) throw new UnsafePathError('refusing to sanitize an unverified inode');
  await handle.truncate(0);
  await handle.sync();
}

async function sanitizeKnownPath(filePath, expected) {
  const before = await assertRegularPath(filePath);
  if (!sameIdentity(before, expected)) throw new UnsafePathError(`refusing to sanitize changed path: ${filePath}`);
  const noFollow = process.platform === 'win32' ? 0 : (FS_CONSTANTS.O_NOFOLLOW ?? 0);
  const handle = await open(filePath, FS_CONSTANTS.O_RDWR | noFollow);
  try {
    const opened = await handle.stat();
    const after = await assertRegularPath(filePath);
    if (!sameIdentity(opened, expected) || !sameIdentity(opened, after)) throw new UnsafePathError(`sanitize identity mismatch: ${filePath}`);
    await sanitizeOwnedHandle(handle, expected);
  } finally {
    await handle.close();
  }
}

async function writeOwnedFile(projectRoot, filePath, content, pauseVariable) {
  const handle = await open(filePath, 'wx', 0o666);
  let opened;
  let failure;
  try {
    opened = await handle.stat();
    await assertHandlePath(handle, filePath, opened);
    await prepareEntitiesDirectory(projectRoot, { create: false });
    await assertHandlePath(handle, filePath, opened);
    const pause = Number.parseInt(process.env[pauseVariable] ?? '', 10);
    if (pause > 0) { process.stderr.write(`test-only postcheck barrier: ${filePath}\n`); await new Promise((resolve) => setTimeout(resolve, pause)); }
    await handle.writeFile(content, { encoding: 'utf8' });
    await handle.sync();
    await assertHandlePath(handle, filePath, opened);
  } catch (err) {
    failure = err;
  }
  if (failure && opened) {
    try { await sanitizeOwnedHandle(handle, opened); }
    catch (err) { failure = new UnsafePathError(`${failure.message}; owned-inode sanitation failed: ${err.message}`); }
  }
  try { await handle.close(); } catch (err) { failure ??= err; }
  const postClosePause = Number.parseInt(process.env.ADVERSARIAL_PAIRING_TEST_POST_CLOSE_PAUSE_MS ?? '', 10);
  if (!failure && postClosePause > 0) { process.stderr.write(`test-only postclose barrier: ${filePath}\n`); await new Promise((resolve) => setTimeout(resolve, postClosePause)); }
  if (!failure) {
    try {
      const finalized = await assertRegularPath(filePath, { rejectHardlinks: true });
      if (!sameIdentity(finalized, opened)) throw new UnsafePathError(`owned file changed after handle close: ${filePath}`);
    } catch (err) { failure = err; }
  }
  // Mutations after this post-close check are external post-finalization actions;
  // excluding them requires filesystem/OS policy rather than process-local checks.
  if (failure) {
    try { if (opened) await removeKnownArtifact(filePath, opened, true); }
    catch (err) { throw new UnsafePathError(`${failure.message}; owned-file cleanup failed: ${err.message}`); }
    throw failure;
  }
  return opened;
}

async function createRegistryFile(projectRoot, filePath, content) {
  const entitiesDir = await prepareEntitiesDirectory(projectRoot, { create: false });
  if (!entitiesDir || !samePath(path.dirname(filePath), entitiesDir)) {
    throw new UnsafePathError(`registry destination is not the verified entities directory: ${filePath}`);
  }

  await writeOwnedFile(projectRoot, filePath, content, 'ADVERSARIAL_PAIRING_TEST_CREATE_PAUSE_MS');
}

function transactionPath(filePath, kind) {
  return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${kind}-${process.pid}-${randomUUID()}`);
}

async function stageRegistryFile(projectRoot, item) {
  await prepareEntitiesDirectory(projectRoot, { create: false });
  const tempPath = transactionPath(item.filePath, 'tmp');
  const backupPath = transactionPath(item.filePath, 'bak');
  assertWithinRoot(projectRoot, tempPath);
  const opened = await writeOwnedFile(projectRoot, tempPath, item.content, 'ADVERSARIAL_PAIRING_TEST_STAGE_PAUSE_MS');
  return { ...item, tempPath, backupPath, tempStats: opened, backedUp: false, installed: false };
}

async function removeKnownArtifact(filePath, expected, sanitize = false) {
  const current = await assertRegularPath(filePath, { allowMissing: true });
  if (!current) return;
  if (!sameIdentity(current, expected)) {
    throw new UnsafePathError(`refusing to remove changed transaction artifact: ${filePath}`);
  }
  if (sanitize) await sanitizeKnownPath(filePath, expected);
  await unlink(filePath);
}

async function installStaged(step) {
  const noFollow = process.platform === 'win32' ? 0 : (FS_CONSTANTS.O_NOFOLLOW ?? 0);
  const handle = await open(step.tempPath, FS_CONSTANTS.O_RDWR | noFollow);
  let failure;
  try {
    await assertHandlePath(handle, step.tempPath, step.tempStats);
    await rename(step.tempPath, step.filePath);
    step.installed = true;
    await assertHandlePath(handle, step.filePath, step.tempStats);
  } catch (err) {
    failure = err;
    try { await sanitizeOwnedHandle(handle, step.tempStats); }
    catch (sanitize) { failure = new UnsafePathError(`${err.message}; install sanitation failed: ${sanitize.message}`); }
  }
  try { await handle.close(); } catch (err) { failure ??= err; }
  if (failure) throw failure;
}

async function forceReplacePlan(projectRoot, plan) {
  const staged = [];
  try {
    for (const item of plan) staged.push(await stageRegistryFile(projectRoot, item));
    const failAt = Number.parseInt(process.env.ADVERSARIAL_PAIRING_TEST_FORCE_FAILURE_AT ?? '', 10);
    for (let index = 0; index < staged.length; index++) {
      const step = staged[index];
      await prepareEntitiesDirectory(projectRoot, { create: false });
      const current = await assertRegularPath(step.filePath, { allowMissing: true, rejectHardlinks: true });
      if (Boolean(current) !== Boolean(step.original) || (current && !sameIdentity(current, step.original))) {
        throw new UnsafePathError(`registry destination changed after force preflight: ${step.filePath}`);
      }
      if (current) {
        if (await getLstat(step.backupPath)) throw new UnsafePathError(`backup path already exists: ${step.backupPath}`);
        await rename(step.filePath, step.backupPath);
        step.backedUp = true;
        const backup = await assertRegularPath(step.backupPath, { rejectHardlinks: true });
        if (!sameIdentity(backup, step.original)) throw new UnsafePathError(`backup identity mismatch: ${step.backupPath}`);
      }
      if (failAt === index + 1) throw new Error(`injected force failure at registry ${index + 1}`);
      await installStaged(step);
    }
  } catch (cause) {
    const rollbackErrors = [];
    for (const step of [...staged].reverse()) {
      try {
        if (step.installed) await removeKnownArtifact(step.filePath, step.tempStats, true);
        if (step.backedUp) {
          if (await getLstat(step.filePath)) throw new UnsafePathError(`rollback destination occupied: ${step.filePath}`);
          const backup = await assertRegularPath(step.backupPath);
          if (!sameIdentity(backup, step.original)) throw new UnsafePathError(`rollback backup changed: ${step.backupPath}`);
          await rename(step.backupPath, step.filePath);
        }
        if (!step.installed) await removeKnownArtifact(step.tempPath, step.tempStats, true);
      } catch (err) {
        rollbackErrors.push(err.message);
      }
    }
    if (rollbackErrors.length) throw new UnsafePathError(`${cause.message}; rollback failed: ${rollbackErrors.join('; ')}`);
    throw cause;
  }
  for (const step of staged) {
    if (step.backedUp) await removeKnownArtifact(step.backupPath, step.original);
  }
}

async function readRegistryFile(projectRoot, filePath) {
  const before = await assertRegularPath(filePath, { allowMissing: true });
  if (!before) return null;
  const noFollow = process.platform === 'win32' ? 0 : (FS_CONSTANTS.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(filePath, FS_CONSTANTS.O_RDONLY | noFollow);
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
  try {
    const opened = await handle.stat();
    const after = await assertRegularPath(filePath);
    if (!opened.isFile() || !sameIdentity(before, opened) || !sameIdentity(opened, after)) {
      throw new UnsafePathError(`registry destination changed while being checked: ${filePath}`);
    }
    const entitiesDir = await prepareEntitiesDirectory(projectRoot, { create: false });
    if (!entitiesDir || !samePath(path.dirname(filePath), entitiesDir)) {
      throw new UnsafePathError(`registry source is not the verified entities directory: ${filePath}`);
    }
    const finalOpened = await handle.stat();
    const finalPath = await assertRegularPath(filePath);
    if (!sameIdentity(opened, finalOpened) || !sameIdentity(finalOpened, finalPath)) {
      throw new UnsafePathError(`registry destination changed immediately before reading: ${filePath}`);
    }
    return await handle.readFile({ encoding: 'utf8' });
  } finally {
    await handle.close();
  }
}

async function writeRegistries(projectRoot, { noOverwrite = true } = {}) {
  const entitiesDir = await prepareEntitiesDirectory(projectRoot, { create: true });
  let written = 0;
  let skipped = 0;
  const plan = [];

  for (const name of REGISTRY_NAMES) {
    const content = generateRegistryContent(projectRoot, name);
    const filePath = path.join(entitiesDir, `registry-${name}.md`);
    assertWithinRoot(projectRoot, filePath);
    const original = await assertRegularPath(filePath, { allowMissing: true, rejectHardlinks: !noOverwrite });
    plan.push({ content, filePath, original });
  }

  if (!noOverwrite) {
    await forceReplacePlan(projectRoot, plan);
    return { written: plan.length, skipped: 0 };
  }

  for (const { content, filePath } of plan) {
    try {
      await createRegistryFile(projectRoot, filePath, content);
      written++;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        await assertRegularPath(filePath);
        skipped++;
        continue;
      }
      throw err;
    }
  }
  return { written, skipped };
}

async function checkRegistries(projectRoot) {
  const entitiesDir = await prepareEntitiesDirectory(projectRoot, { create: false });
  const drifted = [];

  for (const name of REGISTRY_NAMES) {
    const filePath = path.join(projectRoot, 'wiki', 'entities', `registry-${name}.md`);
    assertWithinRoot(projectRoot, filePath);
    const expected = generateRegistryContent(projectRoot, name);

    if (!entitiesDir) {
      drifted.push({ name, reason: 'missing' });
      continue;
    }
    const actual = await readRegistryFile(projectRoot, filePath);
    if (actual === null) {
      drifted.push({ name, reason: 'missing' });
      continue;
    }

    if (actual !== expected) {
      drifted.push({ name, reason: 'content-mismatch' });
    }
  }

  if (drifted.length === 0) {
    process.stdout.write('check: all 6 provisional registry stubs match generated content; NOT a completeness proof\n');
    process.exit(0);
  } else {
    process.stderr.write(`check: drift detected in ${drifted.length} registry file(s):\n`);
    for (const d of drifted) {
      process.stderr.write(`  - registry-${d.name}.md: ${d.reason}\n`);
    }
    process.stderr.write('Run with --force to regenerate provisional stubs.\n');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const usage = 'Usage: node build-registries.mjs <project-root> [--check|--no-overwrite|--force]\n';

  if (args.length === 0) {
    process.stderr.write(usage);
    process.exit(2);
  }

  const supportedFlags = new Set(['--check', '--no-overwrite', '--force', '--help', '-h']);
  const unknownFlags = args.filter((arg) => arg.startsWith('-') && !supportedFlags.has(arg));
  if (unknownFlags.length > 0) {
    process.stderr.write(`Error: unknown option(s): ${unknownFlags.join(', ')}\n`);
    process.stderr.write(usage);
    process.exit(2);
  }
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(usage);
    process.exit(0);
  }

  const checkFlag = args.includes('--check');
  const noOverwriteFlag = args.includes('--no-overwrite');
  const forceFlag = args.includes('--force');
  if ([checkFlag, noOverwriteFlag, forceFlag].filter(Boolean).length > 1) {
    process.stderr.write('Error: --check, --no-overwrite, and --force are mutually exclusive.\n');
    process.exit(2);
  }
  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional.length !== 1) {
    process.stderr.write('Error: exactly one <project-root> positional argument is required.\n');
    process.stderr.write(usage);
    process.exit(2);
  }
  const projectRoot = positional[0];

  if (!projectRoot) {
    process.stderr.write('Error: <project-root> positional argument is required.\n');
    process.exit(2);
  }

  // Resolve to absolute path
  const resolvedRoot = path.resolve(projectRoot);

  // Verify the root is a real directory and not a redirecting path.
  try {
    await assertSafeDirectory(resolvedRoot, 'project root');
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(2);
  }

  if (checkFlag) {
    await checkRegistries(resolvedRoot);
  } else {
    const { written, skipped } = await writeRegistries(resolvedRoot, { noOverwrite: !forceFlag });
    process.stdout.write(`Built ${written} provisional registry stub(s); preserved ${skipped} existing file(s) under ${resolvedRoot}/wiki/entities/. NOT a completeness proof.\n`);
  }
}

main().catch((err) => {
  const prefix = err instanceof UnsafePathError ? 'Safety error' : 'Unexpected error';
  process.stderr.write(`${prefix}: ${err.message}\n`);
  process.exit(1);
});
