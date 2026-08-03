import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BootstrapError, DIRS, REGISTRIES, TOOLS, inspectManaged, isSame, isSameOrBelow,
  key, lintWiki, runPreflight, validateRegistries,
} from './bootstrap-preflight.mjs';

const isoDate = () => new Date().toISOString().slice(0, 10);
const fingerprint = (stats) => `${stats.dev}:${stats.ino}:${stats.mode}`;
const stats = (target) => fs.lstatSync(target, { bigint: true });
const frontmatter = (date) => `---
status: claimed
type: manual
role: reference-doc
provenance:
  - kind: protocol
    ref: adversarial-pairing-skill/tools/bootstrap.sh
last-verified-at: ${date}
---`;

function wikiSchema(date) {
  return `${frontmatter(date)}
# Wiki Schema (LAW 13)

This file documents the required frontmatter schema for all wiki pages.
LAW 13: every wiki page MUST have YAML frontmatter with the fields below.

## Required frontmatter fields

\`\`\`yaml
---
status: sourced | computed | claimed | supposition
type: concept | source | entity | synthesis | hypothesis | manual
role: tool-catalog | user-manual | reference-doc
provenance:
  - kind: audit-finding | codebase-file | codebase-directory | protocol |
          feature-ledger | generated-inventory | generated-summary |
          command-output | wiki-page
    ref: <citation-or-url>
    locator: <optional-section-or-page>
last-verified-at: YYYY-MM-DD
---
\`\`\`

## Status definitions

- **sourced**: backed by a primary source cited in provenance
- **computed**: derived deterministically from sourced data
- **claimed**: asserted without a primary source; needs verification
- **supposition**: working hypothesis; treat as provisional

## Tier A/B/C update model

- **Tier A (mechanical)**: registries may auto-regenerate only from an explicitly configured real
  project scanner. Bundled registry stubs are schema/drift fixtures, not source-coverage proof.
- **Tier B (semi-automatic)**: entity, schema, and hook pages are created or updated from inspected
  project sources and record their provenance.
- **Tier C (cognitive)**: concept, synthesis, and hypothesis pages capture architectural insight, or
  the ledger records an explicit noop with rationale.

## Operator notes

Replace this file's content with project-specific schema details.
This placeholder was injected by bootstrap.sh.
`;
}

function wikiLog(date) {
  return `${frontmatter(date)}
# Wiki Change Log

Append-only. Most recent first.

<!-- FORMAT: each entry on one line:
  YYYY-MM-DD | <author> | <page-path> | <change-summary>
-->
`;
}

const featureLedger = `# Feature Ledger

Per-patch rows. Add one row per feature shipped.
Append-only: never rewrite or batch rows from prior patches.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| seq | patch | feature | tests | R2 inline | confounder | wiki-lint | registry-check | tier-C | residual disclosure | save targets | mantra | status |
|-----|-------|---------|-------|-----------|------------|-----------|----------------|--------|---------------------|--------------|--------|--------|
`;

const statusLedger = `# Status Ledger

Per-cluster status. Update when cluster status changes.
Append-only: record status transitions as new rows rather than rewriting history.

## Mantras (VERBATIM placeholder — replace with project mantras)

- "<mantra 1>"
- "<mantra 2>"

## Columns

| cluster | gate | status | last-updated | notes |
|---------|------|--------|--------------|-------|
`;

const workflow = `
## adversarial-pairing methodology

This project uses the adversarial-pairing two-agent methodology framework.

- Wiki source of truth: \`wiki/\`; schema and operating instructions: \`wiki/CLAUDE.md\`
- Per-patch ledger: \`feature-ledger.md\` + \`status-ledger.md\` (mantras VERBATIM in N save targets)
- Tools: \`wiki/tools/\` (build-registries, sync-mirror, wiki-lint, audit-entity-exports)
- Every code-affecting patch carries its ledger row and parallel wiki sync; follow the methodology documentation bundled with the installed skill or plugin
- Day 1 bootstrap was performed via \`bootstrap.sh\` or \`/init-pairing\`

For full methodology, use the documentation bundled with the installed skill or plugin, or visit https://github.com/th3vib3coder/adversarial-pairing-skill.
`;

function contentPlan(repoRoot, target, canonical) {
  const plan = new Map([
    ['wiki/CLAUDE.md', wikiSchema(isoDate())], ['wiki/log.md', wikiLog(isoDate())],
    ['feature-ledger.md', featureLedger], ['status-ledger.md', statusLedger],
    ['CLAUDE.md', `# ${path.basename(target)}\n\n(project README — extend as needed.)\n${workflow}`],
  ]);
  for (const tool of TOOLS) {
    plan.set(`wiki/tools/${tool}.mjs`, fs.readFileSync(path.join(repoRoot, 'tools', `${tool}.mjs`)));
  }
  for (const name of REGISTRIES) plan.set(`wiki/entities/registry-${name}.md`, canonical.get(name));
  return plan;
}

function rollback(records) {
  const errors = [];
  for (const record of [...records].reverse()) {
    if (record.kind !== 'file') continue;
    const candidates = [...new Set([record.actual, record.lexical].filter(Boolean))];
    for (const candidate of candidates) {
      let current;
      try { current = stats(candidate); } catch (error) {
        if (error.code === 'ENOENT') continue;
        errors.push(`${candidate}: ${error.message}`); continue;
      }
      try {
        if (fingerprint(current) === record.fingerprint) {
          if (current.isDirectory()) fs.rmdirSync(candidate);
          else fs.unlinkSync(candidate);
        }
      } catch (error) { errors.push(`${candidate}: ${error.message}`); }
    }
  }
  return errors;
}

export function applyBootstrap(repoInput, targetInput) {
  const snapshot = runPreflight(repoInput, targetInput, false);
  const { repoRoot, target, canonical, inventory } = snapshot;
  const action = new Map(inventory.map((line) => line.split(': ', 2).reverse()));
  const payload = contentPlan(repoRoot, target, canonical);
  const rootReal = fs.realpathSync.native(target);
  const rootFingerprint = fingerprint(stats(target));
  const expectedDirectories = new Map([[key(target), rootFingerprint]]);
  const records = [];
  const notices = [];

  for (const relative of DIRS) {
    if (action.get(relative) === 'PRESERVE') {
      expectedDirectories.set(key(path.join(target, relative)), fingerprint(stats(path.join(target, relative))));
    }
  }

  function verifyRoot() {
    const current = stats(target);
    if (!current.isDirectory() || current.isSymbolicLink() || fingerprint(current) !== rootFingerprint ||
        !isSame(fs.realpathSync.native(target), rootReal)) {
      throw new BootstrapError('target root identity changed during bootstrap', 2);
    }
  }

  function verifyDirectory(directory) {
    const current = stats(directory);
    const expected = expectedDirectories.get(key(directory));
    if (!current.isDirectory() || current.isSymbolicLink() || !expected || fingerprint(current) !== expected) {
      throw new BootstrapError(`managed parent identity changed: ${directory}`, 2);
    }
    const actual = fs.realpathSync.native(directory);
    if (!isSameOrBelow(actual, rootReal)) throw new BootstrapError(`managed parent escaped target: ${directory}`, 2);
  }

  function verifyParents(destination) {
    verifyRoot();
    const parent = path.dirname(destination);
    if (!isSameOrBelow(parent, target)) throw new BootstrapError(`mutation escaped target: ${destination}`, 2);
    const relative = path.relative(target, parent);
    let current = target;
    if (relative) for (const part of relative.split(path.sep)) {
      current = path.join(current, part); verifyDirectory(current);
    }
  }

  function createDirectory(relative) {
    const destination = path.join(target, relative);
    verifyParents(destination);
    try { fs.mkdirSync(destination, { recursive: false }); }
    catch (error) {
      if (error.code === 'EEXIST') {
        throw new BootstrapError(`unknown path appeared during CREATE: ${destination}`, 2);
      }
      throw error;
    }
    const current = stats(destination);
    const actual = current.isSymbolicLink() ? null : fs.realpathSync.native(destination);
    if (!current.isDirectory() || current.isSymbolicLink() || !actual || !isSameOrBelow(actual, rootReal)) {
      throw new BootstrapError(`unknown path substituted during CREATE: ${destination}`, 2);
    }
    const record = { lexical: destination, actual, fingerprint: fingerprint(current), kind: 'directory' };
    records.push(record);
    expectedDirectories.set(key(destination), record.fingerprint);
    verifyParents(destination);
    verifyDirectory(destination);
  }

  function createFile(relative, content) {
    const destination = path.join(target, relative);
    verifyParents(destination);
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    let descriptor;
    try {
      descriptor = fs.openSync(destination, fs.constants.O_WRONLY | fs.constants.O_CREAT |
        fs.constants.O_EXCL | noFollow, 0o644);
      const opened = fs.fstatSync(descriptor, { bigint: true });
      const record = { lexical: destination, actual: null,
        fingerprint: fingerprint(opened), kind: 'file' };
      records.push(record);
      record.actual = fs.realpathSync.native(destination);
      const lexicalBefore = stats(destination);
      if (!opened.isFile() || opened.nlink !== 1n || lexicalBefore.nlink !== 1n ||
          fingerprint(lexicalBefore) !== record.fingerprint || !isSameOrBelow(record.actual, rootReal)) {
        throw new BootstrapError(`created file escaped target: ${destination}`, 2);
      }
      fs.writeFileSync(descriptor, content); fs.fsyncSync(descriptor);
      const openedAfter = fs.fstatSync(descriptor, { bigint: true });
      const lexicalAfter = stats(destination);
      if (openedAfter.nlink !== 1n || lexicalAfter.nlink !== 1n ||
          fingerprint(openedAfter) !== record.fingerprint || fingerprint(lexicalAfter) !== record.fingerprint) {
        fs.ftruncateSync(descriptor, 0); fs.fsyncSync(descriptor);
        throw new BootstrapError(`created file acquired an external hardlink: ${destination}`, 2);
      }
      verifyParents(destination);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.ftruncateSync(descriptor, 0); fs.fsyncSync(descriptor); } catch { /* best-effort owned inode sanitization */ }
      }
      throw error;
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
    const current = stats(destination);
    const record = records.at(-1);
    if (current.isSymbolicLink() || current.nlink !== 1n || fingerprint(current) !== record.fingerprint ||
        !isSame(fs.realpathSync.native(destination), record.actual)) {
      sanitizeRecord(record);
      throw new BootstrapError(`created file identity changed: ${destination}`, 2);
    }
  }

  function sanitizeRecord(record) {
    if (record.kind !== 'file') return;
    for (const candidate of [...new Set([record.actual, record.lexical].filter(Boolean))]) {
      let current;
      try { current = stats(candidate); } catch { continue; }
      if (!current.isFile() || fingerprint(current) !== record.fingerprint) continue;
      let descriptor;
      try {
        descriptor = fs.openSync(candidate, fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0));
        const opened = fs.fstatSync(descriptor, { bigint: true });
        if (fingerprint(opened) === record.fingerprint) {
          fs.ftruncateSync(descriptor, 0); fs.fsyncSync(descriptor);
        }
      } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
      return;
    }
  }

  try {
    for (const relative of DIRS) if (action.get(relative) === 'CREATE') createDirectory(relative);
    for (const [relative, content] of payload) {
      if (action.get(relative) === 'CREATE') createFile(relative, content);
    }
    if (action.get('CLAUDE.md') === 'PRESERVE') {
      const existing = fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8');
      notices.push(existing.includes('## adversarial-pairing methodology')
        ? 'project CLAUDE.md already contains the methodology marker'
        : `project CLAUDE.md already exists; manual merge required\n${workflow}`);
    }
    inspectManaged(target, true);
    lintWiki(repoRoot, target, true);
    validateRegistries(target, canonical, true);
    for (const record of records) {
      const current = stats(record.lexical);
      if (current.isSymbolicLink() || fingerprint(current) !== record.fingerprint ||
          (record.kind === 'file' && current.nlink !== 1n)) {
        sanitizeRecord(record);
        throw new BootstrapError(`created path identity changed before READY: ${record.lexical}`, 2);
      }
    }
    return { inventory, notices };
  } catch (error) {
    const cleanupErrors = rollback(records);
    if (cleanupErrors.length) error.message += `\nrollback incomplete:\n${cleanupErrors.join('\n')}`;
    error.message += '\nRECOVERY: bootstrap rolls back only proven-owned files, never directories. Empty scaffold directories may remain; concurrent contents and every pre-existing file are preserved. Rerun safely to complete missing files.';
    throw error;
  }
}

if (process.argv[1] && isSame(fileURLToPath(import.meta.url), path.resolve(process.argv[1]))) {
  try {
    const [repoRoot, target] = process.argv.slice(2);
    if (!repoRoot || !target) throw new BootstrapError('Usage: node bootstrap-apply.mjs <repo-root> <target-root>', 2);
    const result = applyBootstrap(repoRoot, target);
    for (const notice of result.notices) process.stderr.write(`NOTICE: ${notice}\n`);
    process.stdout.write(`INVENTORY:\n${result.inventory.join('\n')}\n`);
    process.stdout.write('SUMMARY: no-clobber mode used; trusted validation passed\n');
    process.stdout.write('READY: bootstrap structure complete; operator authorization required for first commit\n');
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exit(Number.isInteger(error.code) ? error.code : 1);
  }
}
