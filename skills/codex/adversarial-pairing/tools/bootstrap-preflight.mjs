import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const DIRS = [
  'wiki', 'wiki/concepts', 'wiki/entities', 'wiki/sources', 'wiki/syntheses',
  'wiki/hypotheses', 'wiki/manual', 'wiki/coverage', 'wiki/tools',
];
export const FILES = [
  'wiki/CLAUDE.md', 'wiki/log.md',
  'wiki/tools/build-registries.mjs', 'wiki/tools/sync-mirror.mjs',
  'wiki/tools/wiki-lint.mjs', 'wiki/tools/audit-entity-exports.mjs',
  'wiki/entities/registry-cli-verbs.md',
  'wiki/entities/registry-exported-symbols.md',
  'wiki/entities/registry-db-writers.md',
  'wiki/entities/registry-schema-graph.md',
  'wiki/entities/registry-gate-triggers.md',
  'wiki/entities/registry-protocol-invariants.md',
  'feature-ledger.md', 'status-ledger.md', 'CLAUDE.md',
];
export const TOOLS = ['build-registries', 'sync-mirror', 'wiki-lint', 'audit-entity-exports'];
export const REGISTRIES = [
  'cli-verbs', 'exported-symbols', 'db-writers', 'schema-graph',
  'gate-triggers', 'protocol-invariants',
];

export class BootstrapError extends Error {
  constructor(message, code = 1) { super(message); this.code = code; }
}
function fail(message, code = 1) { throw new BootstrapError(message, code); }

function platformPath(input) {
  if (process.platform !== 'win32') return input;
  const slash = input.replaceAll('\\', '/');
  let match = slash.match(/^\/(?:cygdrive|mnt)\/([A-Za-z])(?:\/(.*))?$/u);
  if (!match) match = slash.match(/^\/([A-Za-z])(?:\/(.*))?$/u);
  return match ? `${match[1]}:/${match[2] || ''}` : input;
}

function resolved(input) {
  return path.resolve(platformPath(input));
}

export function key(input) {
  const value = path.normalize(input);
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

export function isSame(left, right) {
  return key(left) === key(right);
}

export function isSameOrBelow(child, parent) {
  const childKey = key(child);
  const parentKey = key(parent);
  return childKey === parentKey || childKey.startsWith(`${parentKey}${path.sep}`);
}

export function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    fail(`cannot inspect path ${target}: ${error.message}`, 2);
  }
}

export function rejectLinkedComponents(input) {
  const seen = new Set();
  let current = resolved(input);
  for (;;) {
    const currentKey = key(current);
    if (seen.has(currentKey)) break;
    seen.add(currentKey);
    const stats = lstatOrNull(current);
    if (stats?.isSymbolicLink()) {
      fail(`unsafe target (symlink/junction/reparse-point path component): ${current}`, 2);
    }
    const parent = path.dirname(current);
    if (isSame(parent, current)) break;
    current = parent;
  }
}

function canonicalOrResolved(input) {
  const candidate = resolved(input);
  try {
    return fs.realpathSync.native(candidate);
  } catch {
    return candidate;
  }
}

function rejectProtected(target, input, label, descendants) {
  if (!input) return;
  const protectedRoot = canonicalOrResolved(input);
  if (isSame(target, protectedRoot) || (descendants && isSameOrBelow(target, protectedRoot))) {
    fail(`unsafe target (${label}): ${target}`, 2);
  }
}

export function validateTarget(targetInput) {
  const lexical = resolved(targetInput);
  if (isSame(lexical, path.parse(lexical).root)) {
    fail(`unsafe target (filesystem root): ${targetInput}`, 2);
  }
  rejectLinkedComponents(lexical);
  const stats = lstatOrNull(lexical);
  if (!stats?.isDirectory()) fail(`target directory does not exist: ${targetInput}`, 2);
  const target = fs.realpathSync.native(lexical);
  for (const home of [process.env.HOME, process.env.USERPROFILE]) {
    if (!home) continue;
    rejectProtected(target, home, 'user home', false);
    rejectProtected(target, path.join(platformPath(home), '.claude'), 'Claude configuration root', true);
    rejectProtected(target, path.join(platformPath(home), '.codex'), 'Codex configuration root', true);
  }
  rejectProtected(target, process.env.CODEX_HOME, 'CODEX_HOME configuration root', true);
  rejectProtected(target, process.env.CLAUDE_CONFIG_DIR, 'CLAUDE_CONFIG_DIR configuration root', true);
  return target;
}

export function validateTrustedTools(repoRoot) {
  const version = process.versions.node.split('.').map(Number);
  if (version[0] < 18 || (version[0] === 18 && version[1] < 17)) {
    fail(`Node >=18.17.0 is required; found ${process.versions.node}`);
  }
  for (const name of TOOLS) {
    const source = path.join(repoRoot, 'tools', `${name}.mjs`);
    const stats = lstatOrNull(source);
    if (!stats?.isFile() || stats.isSymbolicLink()) {
      fail(`trusted source tool is missing, linked, or non-regular: ${source}`);
    }
    try {
      fs.accessSync(source, fs.constants.R_OK);
    } catch {
      fail(`trusted source tool is unreadable: ${source}`);
    }
    const check = spawnSync(process.execPath, ['--check', source], { encoding: 'utf8' });
    if (check.status !== 0) {
      fail(`trusted source tool failed syntax preflight: ${source}\n${String(check.stderr || '').trim()}`);
    }
  }
}

export function inspectManaged(target, requireComplete) {
  const inventory = [];
  for (const relative of DIRS) {
    const destination = path.join(target, relative);
    rejectLinkedComponents(destination);
    const stats = lstatOrNull(destination);
    if (stats && !stats.isDirectory()) fail(`managed directory path is not a directory: ${destination}`, 2);
    if (requireComplete && !stats) fail(`final verification found missing managed directory: ${destination}`);
    inventory.push(`${stats ? 'PRESERVE' : 'CREATE'}: ${relative}`);
  }
  for (const relative of FILES) {
    const destination = path.join(target, relative);
    rejectLinkedComponents(destination);
    const stats = lstatOrNull(destination);
    if (stats && !stats.isFile()) fail(`managed file path is not a regular file: ${destination}`, 2);
    if (stats) {
      try { fs.accessSync(destination, fs.constants.R_OK); }
      catch { fail(`managed file is unreadable: ${destination}`, 2); }
    }
    if (requireComplete && !stats) fail(`final verification found missing managed file: ${destination}`);
    inventory.push(`${stats ? 'PRESERVE' : 'CREATE'}: ${relative}`);
  }
  return inventory;
}

export function lintWiki(repoRoot, target, required) {
  const wiki = path.join(target, 'wiki');
  if (!fs.existsSync(wiki)) {
    if (required) fail(`final verification found missing wiki directory: ${wiki}`);
    return;
  }
  const linter = path.join(repoRoot, 'tools', 'wiki-lint.mjs');
  const result = spawnSync(process.execPath, [linter, wiki, '--json'], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`${required ? 'final' : 'existing'} wiki failed LAW 13 schema validation\n${(result.stdout || result.stderr).trim()}`);
  }
}

function fieldValue(text, field) {
  text = text.replace(/\r\n/gu, '\n');
  const end = text.indexOf('\n---', 4);
  if (!text.startsWith('---\n') || end < 0) return null;
  const expression = new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'mu');
  const match = text.slice(4, end).match(expression);
  return match ? match[1].replace(/^['"]|['"]$/gu, '') : null;
}

export function buildCanonicalRegistries(repoRoot) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'adversarial-bootstrap-'));
  try {
    const builder = path.join(repoRoot, 'tools', 'build-registries.mjs');
    const result = spawnSync(process.execPath, [builder, temporary, '--no-overwrite'], { encoding: 'utf8' });
    if (result.status !== 0) fail(`trusted registry builder failed: ${(result.stderr || result.stdout).trim()}`);
    const canonical = new Map();
    for (const name of REGISTRIES) {
      const generated = path.join(temporary, 'wiki', 'entities', `registry-${name}.md`);
      if (!lstatOrNull(generated)?.isFile()) fail(`trusted registry builder did not create canonical ${name}`);
      canonical.set(name, fs.readFileSync(generated, 'utf8'));
    }
    return canonical;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

export function validateRegistries(target, canonical, requireComplete) {
  for (const name of REGISTRIES) {
    const registry = path.join(target, 'wiki', 'entities', `registry-${name}.md`);
    const stats = lstatOrNull(registry);
    if (!stats) {
      if (requireComplete) fail(`final verification found missing registry: ${registry}`);
      continue;
    }
    if (!stats.isFile() || stats.isSymbolicLink()) fail(`registry is not a regular file: ${registry}`, 2);
    const text = fs.readFileSync(registry, 'utf8');
    if (fieldValue(text, 'type') !== 'entity' || fieldValue(text, 'role') !== 'tool-catalog') {
      fail(`registry metadata is incoherent for ${name}: expected type entity and role tool-catalog`);
    }
    const heading = text.split(/\r?\n/u).find((line) => line.startsWith('# '));
    if (heading !== `# Registry: ${name}`) fail(`registry title is incoherent for ${name}`);
    if (fieldValue(text, 'scanner-mode') === 'stub') {
      const normalize = (value) => value.replace(/\r\n/gu, '\n');
      if (normalize(text) !== normalize(canonical.get(name))) {
        fail(`preserved stub registry is not canonical for ${name}`);
      }
    }
  }
}

export function runPreflight(repoInput, targetInput, requireComplete = false) {
  const repoRoot = fs.realpathSync.native(resolved(repoInput));
  validateTrustedTools(repoRoot);
  const target = validateTarget(targetInput);
  const canonical = buildCanonicalRegistries(repoRoot);
  const inventory = inspectManaged(target, requireComplete);
  lintWiki(repoRoot, target, requireComplete);
  validateRegistries(target, canonical, requireComplete);
  return { repoRoot, target, canonical, inventory };
}

if (process.argv[1] && isSame(fileURLToPath(import.meta.url), resolved(process.argv[1]))) {
  try {
    const [mode, repoInput, targetInput] = process.argv.slice(2);
    if (!['preflight', 'final'].includes(mode) || !repoInput || !targetInput) {
      fail('Usage: node bootstrap-preflight.mjs <preflight|final> <repo-root> <target-root>', 2);
    }
    const result = runPreflight(repoInput, targetInput, mode === 'final');
    process.stdout.write(mode === 'preflight' ? `${result.inventory.join('\n')}\n` : 'VALIDATED\n');
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(Number.isInteger(error.code) ? error.code : 1);
  }
}
