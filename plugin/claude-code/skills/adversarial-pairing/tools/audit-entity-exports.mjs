import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const positional = args.filter(a => !a.startsWith('--'));

if (positional.length < 2) {
  const msg = 'Usage: audit-entity-exports.mjs <project-root> <registry-path> [--json]';
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ issueCount: 0, issues: [], error: msg }) + '\n');
  } else {
    process.stderr.write(msg + '\n');
  }
  process.exit(1);
}

const projectRoot = path.resolve(positional[0]);
const registryPath = path.resolve(positional[1]);

// ---------------------------------------------------------------------------
// Parse registry: extract symbol names from body (after frontmatter)
// Supports bullet-list entries:  - `symbolName`
// and plain markdown table cells: | `symbolName` |
// ---------------------------------------------------------------------------
function parseRegistry(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Strip YAML frontmatter (--- ... ---)
  let body = content;
  if (content.startsWith('---')) {
    const end = content.indexOf('\n---', 3);
    if (end !== -1) {
      body = content.slice(end + 4); // skip closing ---
    }
  }

  const symbols = new Set();

  // Match bullet lines:  - `symbolName`  or  - symbolName
  const bulletRe = /^-\s+`([^`]+)`/gm;
  let m;
  while ((m = bulletRe.exec(body)) !== null) {
    const sym = m[1].trim();
    if (sym) symbols.add(sym);
  }

  // Match table cells: | `symbolName` |
  const tableRe = /\|\s*`([^`]+)`\s*\|/g;
  while ((m = tableRe.exec(body)) !== null) {
    const sym = m[1].trim();
    if (sym) symbols.add(sym);
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// Recursively collect .js / .mjs files, skipping excluded dirs
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', 'wiki', 'tools', '.git']);

function collectFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...collectFiles(path.join(dir, entry.name)));
    } else if (entry.isFile()) {
      if (/\.(js|mjs|cjs)$/.test(entry.name)) {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Extract exported symbol names from a file's source text
// Patterns:
//   export function name
//   export const/let/var/class name
//   export { name1, name2 as alias, ... }
// ---------------------------------------------------------------------------
function extractExports(filePath) {
  let src;
  try {
    src = fs.readFileSync(filePath, 'utf8');
  } catch {
    return new Set();
  }

  const symbols = new Set();

  // export function/const/let/var/class name
  const namedRe = /export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+(\w+)/g;
  let m;
  while ((m = namedRe.exec(src)) !== null) {
    symbols.add(m[1]);
  }

  // export { name1, name2 as alias, ... }
  const braceRe = /export\s*\{([^}]+)\}/g;
  while ((m = braceRe.exec(src)) !== null) {
    const inner = m[1];
    // Each entry: localName  or  localName as exportedName
    const entryRe = /(\w+)(?:\s+as\s+(\w+))?/g;
    let em;
    while ((em = entryRe.exec(inner)) !== null) {
      // Use exported name if aliased, otherwise local name
      const exported = em[2] || em[1];
      symbols.add(exported);
    }
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// Main audit logic
// ---------------------------------------------------------------------------
function audit() {
  // 1. Parse registry symbols
  let registrySymbols;
  try {
    registrySymbols = parseRegistry(registryPath);
  } catch (err) {
    const msg = `Failed to read registry: ${err.message}`;
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ issueCount: 0, issues: [], error: msg }) + '\n');
    } else {
      process.stderr.write(msg + '\n');
    }
    process.exit(1);
  }

  // 2. Scan codebase for exports
  const files = collectFiles(projectRoot);
  const codebaseSymbols = new Map(); // symbol -> first file seen

  for (const file of files) {
    const syms = extractExports(file);
    for (const sym of syms) {
      if (!codebaseSymbols.has(sym)) {
        codebaseSymbols.set(sym, file);
      }
    }
  }

  // 3. Compute orphans and gaps
  const issues = [];

  // Orphans: in registry but not in codebase
  for (const sym of registrySymbols) {
    if (!codebaseSymbols.has(sym)) {
      issues.push({ type: 'orphan', symbol: sym });
    }
  }

  // Gaps: in codebase but not in registry
  for (const [sym, file] of codebaseSymbols) {
    if (!registrySymbols.has(sym)) {
      issues.push({ type: 'gap', symbol: sym, file });
    }
  }

  const issueCount = issues.length;

  // 4. Emit output
  if (jsonMode) {
    process.stdout.write(JSON.stringify({ issueCount, issues }) + '\n');
  } else {
    if (issueCount === 0) {
      process.stdout.write('audit-entity-exports: OK (0 issues)\n');
    } else {
      process.stdout.write(`audit-entity-exports: ${issueCount} issue(s) found\n`);
      for (const issue of issues) {
        if (issue.type === 'orphan') {
          process.stdout.write(`  [orphan] ${issue.symbol} - in registry but not in codebase\n`);
        } else {
          process.stdout.write(`  [gap]    ${issue.symbol} - in codebase (${issue.file}) but not in registry\n`);
        }
      }
    }
  }

  process.exit(issueCount === 0 ? 0 : 1);
}

audit();
