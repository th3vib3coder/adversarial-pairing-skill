import fs from 'node:fs';
import path from 'node:path';

// ── Enums ──────────────────────────────────────────────────────────────────
const VALID_STATUS = new Set(['sourced', 'computed', 'claimed', 'supposition']);
const VALID_TYPE   = new Set(['concept', 'source', 'entity', 'synthesis', 'hypothesis', 'manual']);
const VALID_ROLE   = new Set(['tool-catalog', 'user-manual', 'reference-doc']);
const ISO_DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

// ── Recursive .md file collector ──────────────────────────────────────────
function collectMdFiles(dir, results) {
  if (!results) results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMdFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// ── Minimal frontmatter extractor ─────────────────────────────────────────
// Returns { fields: { key: value | [items] }, hasFrontmatter: bool }
function extractFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { hasFrontmatter: false, fields: {} };

  const fmLines = [];
  let closed = false;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { closed = true; break; }
    fmLines.push(lines[i]);
  }
  if (!closed) return { hasFrontmatter: false, fields: {} };

  const fields = {};
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    // Skip blank lines
    if (!line.trim()) { i++; continue; }
    // List item continuation (indented " - ") — handled by parent key block
    if (/^\s+-\s/.test(line)) { i++; continue; }
    // Key: value or key: (start of list)
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)/);
    if (!m) { i++; continue; }
    const key = m[1];
    const val = m[2].trim();
    if (val === '') {
      // Expect indented list items on following lines
      const items = [];
      i++;
      while (i < fmLines.length && /^\s+-\s/.test(fmLines[i])) {
        // Each list item line: "  - kind: 'x'\n    ref: 'y'" — collect as object
        const itemLine = fmLines[i].replace(/^\s+-\s+/, '');
        const obj = {};
        // Parse first key on this line
        const im = itemLine.match(/^([A-Za-z0-9_-]+):\s*(.*)/);
        if (im) obj[im[1]] = im[2].replace(/^['"]|['"]$/g, '');
        i++;
        // Collect continuation lines (deeper indent, no leading -)
        while (i < fmLines.length && /^\s{4,}[A-Za-z]/.test(fmLines[i]) && !/^\s+-\s/.test(fmLines[i])) {
          const subLine = fmLines[i].trim();
          const sm = subLine.match(/^([A-Za-z0-9_-]+):\s*(.*)/);
          if (sm) obj[sm[1]] = sm[2].replace(/^['"]|['"]$/g, '');
          i++;
        }
        items.push(obj);
      }
      fields[key] = items;
    } else {
      fields[key] = val;
      i++;
    }
  }
  return { hasFrontmatter: true, fields };
}

// ── Validate a single file's frontmatter ─────────────────────────────────
function validateFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return [{ file: filePath, field: 'file', problem: 'Cannot read file: ' + e.message }];
  }

  const { hasFrontmatter, fields } = extractFrontmatter(text);
  const issues = [];

  if (!hasFrontmatter) {
    issues.push({ file: filePath, field: 'frontmatter', problem: 'Missing or malformed YAML frontmatter' });
    return issues;
  }

  // status
  if (!fields.status) {
    issues.push({ file: filePath, field: 'status', problem: 'Missing required field "status"' });
  } else if (!VALID_STATUS.has(fields.status)) {
    issues.push({ file: filePath, field: 'status', problem: `Invalid status "${fields.status}"; must be one of: ${[...VALID_STATUS].join(', ')}` });
  }

  // type
  if (!fields.type) {
    issues.push({ file: filePath, field: 'type', problem: 'Missing required field "type"' });
  } else if (!VALID_TYPE.has(fields.type)) {
    issues.push({ file: filePath, field: 'type', problem: `Invalid type "${fields.type}"; must be one of: ${[...VALID_TYPE].join(', ')}` });
  }

  // role
  if (!fields.role) {
    issues.push({ file: filePath, field: 'role', problem: 'Missing required field "role"' });
  } else if (!VALID_ROLE.has(fields.role)) {
    issues.push({ file: filePath, field: 'role', problem: `Invalid role "${fields.role}"; must be one of: ${[...VALID_ROLE].join(', ')}` });
  }

  // provenance — must be present and an array with at least one item having kind + ref
  if (!fields.provenance) {
    issues.push({ file: filePath, field: 'provenance', problem: 'Missing required field "provenance"' });
  } else if (!Array.isArray(fields.provenance) || fields.provenance.length === 0) {
    issues.push({ file: filePath, field: 'provenance', problem: 'provenance must be a non-empty array of objects with "kind" and "ref"' });
  } else {
    for (let idx = 0; idx < fields.provenance.length; idx++) {
      const item = fields.provenance[idx];
      if (!item.kind) {
        issues.push({ file: filePath, field: 'provenance', problem: `provenance[${idx}] missing "kind"` });
      }
      if (!item.ref) {
        issues.push({ file: filePath, field: 'provenance', problem: `provenance[${idx}] missing "ref"` });
      }
    }
  }

  // last-verified-at — must be ISO date YYYY-MM-DD
  const lva = fields['last-verified-at'];
  if (!lva) {
    issues.push({ file: filePath, field: 'last-verified-at', problem: 'Missing required field "last-verified-at"' });
  } else if (!ISO_DATE_RE.test(lva)) {
    issues.push({ file: filePath, field: 'last-verified-at', problem: `Invalid date "${lva}"; must match YYYY-MM-DD` });
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));

  if (positional.length === 0) {
    const msg = 'Usage: wiki-lint.mjs <wiki-root-path> [--json]';
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ issueCount: 0, issues: [], error: msg }) + '\n');
    } else {
      process.stderr.write(msg + '\n');
    }
    process.exit(1);
  }

  const wikiRoot = positional[0];

  if (!fs.existsSync(wikiRoot)) {
    const msg = `Error: wiki root path does not exist: ${wikiRoot}`;
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ issueCount: 0, issues: [], error: msg }) + '\n');
    } else {
      process.stderr.write(msg + '\n');
    }
    process.exit(1);
  }

  const mdFiles = collectMdFiles(wikiRoot);
  const allIssues = [];

  for (const f of mdFiles) {
    const fileIssues = validateFile(f);
    allIssues.push(...fileIssues);
  }

  const issueCount = allIssues.length;

  if (jsonMode) {
    process.stdout.write(JSON.stringify({ issueCount, issues: allIssues }) + '\n');
  } else {
    if (issueCount === 0) {
      process.stdout.write(`wiki-lint: OK — scanned ${mdFiles.length} file(s), 0 issues found.\n`);
    } else {
      process.stdout.write(`wiki-lint: FAIL — scanned ${mdFiles.length} file(s), ${issueCount} issue(s) found:\n`);
      for (const issue of allIssues) {
        process.stdout.write(`  [${issue.field}] ${issue.file}\n    ${issue.problem}\n`);
      }
    }
  }

  process.exit(issueCount === 0 ? 0 : 1);
}

main();
