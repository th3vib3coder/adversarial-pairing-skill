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

// ── Write mode ─────────────────────────────────────────────────────────────

async function writeRegistries(projectRoot, { noOverwrite = true } = {}) {
  const entitiesDir = path.join(projectRoot, 'wiki', 'entities');
  await mkdir(entitiesDir, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (const name of REGISTRY_NAMES) {
    const content = generateRegistryContent(projectRoot, name);
    const filePath = path.join(entitiesDir, `registry-${name}.md`);
    try {
      await writeFile(filePath, content, noOverwrite ? { encoding: 'utf8', flag: 'wx' } : 'utf8');
      written++;
    } catch (err) {
      if (noOverwrite && err && err.code === 'EEXIST') {
        skipped++;
        continue;
      }
      throw err;
    }
  }
  return { written, skipped };
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

// ── Entry point ────────────────────────────────────────────────────────────

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
    const { written, skipped } = await writeRegistries(resolvedRoot, { noOverwrite: !forceFlag });
    process.stdout.write(`Built ${written} provisional registry stub(s); preserved ${skipped} existing file(s) under ${resolvedRoot}/wiki/entities/. NOT a completeness proof.\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`Unexpected error: ${err.message}\n`);
  process.exit(1);
});
