/**
 * build-registries.mjs
 *
 * Rebuilds 6 inverse-index registries from codebase scan.
 * Writes (or validates) wiki/entities/registry-<name>.md for each registry.
 *
 * Usage:
 *   node build-registries.mjs <project-root>           # write mode
 *   node build-registries.mjs <project-root> --check   # validate mode
 *
 * LAW 13 frontmatter is included in every generated file.
 * Codebase scan is stubbed: produces empty result tables.
 * Real scan logic is out of scope for this minimal implementation.
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';

// ── Registry names ─────────────────────────────────────────────────────────

const REGISTRY_NAMES = [
  'cli-verbs',
  'exported-symbols',
  'db-writers',
  'schema-graph',
  'gate-triggers',
  'protocol-invariants',
];

// ── Date helper ────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Stub scanner ───────────────────────────────────────────────────────────

/**
 * Stub codebase scan. Returns empty entry list per registry.
 * Replace internals here when real scan logic is needed.
 *
 * @param {string} _projectRoot
 * @param {string} _registryName
 * @returns {string[]} array of markdown table row strings
 */
function scanCodebase(_projectRoot, _registryName) {
  // Stub: no entries discovered.
  return [];
}

// ── Content generator ──────────────────────────────────────────────────────

/**
 * Produces the full markdown content for one registry file.
 *
 * @param {string} projectRoot
 * @param {string} name  registry name (e.g. 'cli-verbs')
 * @returns {string}
 */
function generateRegistryContent(projectRoot, name) {
  const entries = scanCodebase(projectRoot, name);
  const date = todayIso();

  const frontmatter = [
    '---',
    'status: computed',
    'type: entity',
    'role: tool-catalog',
    'provenance:',
    `  - kind: 'codebase-directory'`,
    `    ref: '${projectRoot}'`,
    `last-verified-at: ${date}`,
    `compile-policy: 'regenerable-from-codebase'`,
    '---',
  ].join('\n');

  const heading = `\n# Registry: ${name}\n`;

  let body;
  if (entries.length === 0) {
    body = '\n_No entries discovered in stub scan. Run real scan to populate._\n';
  } else {
    body = '\n| Entry | Source |\n| ----- | ------ |\n';
    for (const row of entries) {
      body += row + '\n';
    }
  }

  return frontmatter + heading + body;
}

// ── Write mode ─────────────────────────────────────────────────────────────

async function writeRegistries(projectRoot) {
  const entitiesDir = path.join(projectRoot, 'wiki', 'entities');
  await mkdir(entitiesDir, { recursive: true });

  for (const name of REGISTRY_NAMES) {
    const content = generateRegistryContent(projectRoot, name);
    const filePath = path.join(entitiesDir, `registry-${name}.md`);
    await writeFile(filePath, content, 'utf8');
  }
}

// ── Check mode ─────────────────────────────────────────────────────────────

async function checkRegistries(projectRoot) {
  const entitiesDir = path.join(projectRoot, 'wiki', 'entities');
  const drifted = [];

  for (const name of REGISTRY_NAMES) {
    const filePath = path.join(entitiesDir, `registry-${name}.md`);
    const expected = generateRegistryContent(projectRoot, name);

    let actual;
    try {
      actual = await readFile(filePath, 'utf8');
    } catch {
      drifted.push({ name, reason: 'missing' });
      continue;
    }

    if (actual !== expected) {
      drifted.push({ name, reason: 'content-mismatch' });
    }
  }

  if (drifted.length === 0) {
    process.stdout.write('check: all 6 registries match generated content\n');
    process.exit(0);
  } else {
    process.stderr.write(`check: drift detected in ${drifted.length} registry file(s):\n`);
    for (const d of drifted) {
      process.stderr.write(`  - registry-${d.name}.md: ${d.reason}\n`);
    }
    process.stderr.write('Run without --check to regenerate.\n');
    process.exit(1);
  }
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    process.stderr.write('Usage: node build-registries.mjs <project-root> [--check]\n');
    process.exit(2);
  }

  const checkFlag = args.includes('--check');
  const positional = args.filter((a) => !a.startsWith('--'));
  const projectRoot = positional[0];

  if (!projectRoot) {
    process.stderr.write('Error: <project-root> positional argument is required.\n');
    process.exit(2);
  }

  // Resolve to absolute path
  const resolvedRoot = path.resolve(projectRoot);

  // Verify project root exists
  try {
    await access(resolvedRoot);
  } catch {
    process.stderr.write(`Error: project root does not exist: ${resolvedRoot}\n`);
    process.exit(2);
  }

  if (checkFlag) {
    await checkRegistries(resolvedRoot);
  } else {
    await writeRegistries(resolvedRoot);
    process.stdout.write(`Built 6 registry files under ${resolvedRoot}/wiki/entities/\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`Unexpected error: ${err.message}\n`);
  process.exit(1);
});
