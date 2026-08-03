import { promises as fs } from 'node:fs';
import path from 'node:path';

export const PENDING_STATE = 'R2 inline pending';
export const OK_STATE = 'R2 inline OK';

function trimOuter(value) { return value.replace(/^[ \t]+|[ \t]+$/g, ''); }

function headerCell(value) {
  let normalized = trimOuter(value);
  if (/^`[^`]*`$/.test(normalized)) normalized = normalized.slice(1, -1);
  return trimOuter(normalized).replace(/[ \t]+/g, ' ').toLowerCase();
}

function splitRow(line) {
  let body = trimOuter(line);
  if (!body.includes('|')) return null;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells = [];
  let cell = '';
  let escaped = false;
  let codeTicks = 0;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (escaped) { cell += char; escaped = false; continue; }
    if (char === '\\' && body[index + 1] === '|') { escaped = true; continue; }
    if (char === '`') {
      let run = 1;
      while (body[index + run] === '`') run += 1;
      if (!codeTicks) codeTicks = run;
      else if (codeTicks === run) codeTicks = 0;
      cell += '`'.repeat(run); index += run - 1; continue;
    }
    if (char === '|' && !codeTicks) { cells.push(trimOuter(cell)); cell = ''; continue; }
    cell += char;
  }
  cells.push(trimOuter(cell));
  return cells;
}

function visibleLines(markdown) {
  const lines = [];
  let fence = null;
  let comment = false;
  for (let line of String(markdown).split(/\r?\n/)) {
    const trimmed = trimOuter(line);
    if (trimmed.startsWith('>')) continue;
    if (fence) {
      const closing = /^(?<marker>`{3,}|~{3,})[ \t]*$/.exec(trimmed)?.groups?.marker;
      if (closing?.[0] === fence[0] && closing.length >= fence.length) fence = null;
      continue;
    }
    if (/^(?: {4}|\t)/.test(line)) continue;
    const opening = /^(?<marker>`{3,}|~{3,})/.exec(trimmed)?.groups?.marker;
    if (opening) { fence = opening; continue; }
    if (comment) {
      const end = line.indexOf('-->');
      if (end < 0) continue;
      line = line.slice(end + 3); comment = false;
    }
    while (line.includes('<!--')) {
      const start = line.indexOf('<!--');
      const end = line.indexOf('-->', start + 4);
      if (end < 0) { line = line.slice(0, start); comment = true; break; }
      line = line.slice(0, start) + line.slice(end + 3);
    }
    lines.push(line);
  }
  return lines;
}

function separator(cells) { return Boolean(cells?.length) && cells.every((cell) => /^:?-{3,}:?$/.test(cell)); }

function recognizableHeader(cells) {
  if (!cells) return false;
  const names = cells.map(headerCell);
  return ['seq', 'patch', 'feature', 'tests'].every((name) => names.includes(name));
}

function structural(reason, details = {}) { return { state: 'structural-error', reason, ...details }; }

export function inspectLedgerState(content, { requireCanonical = false } = {}) {
  if (typeof content !== 'string') return structural('ledger content is not readable text', { tables: 0 });
  const lines = visibleLines(content);
  let tables = 0;
  let pending = false;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const header = splitRow(lines[lineIndex]);
    if (!recognizableHeader(header)) continue;
    tables += 1;
    if (tables > 1) return structural('multiple canonical feature tables', { tables });
    const r2 = header.map(headerCell).map((name, index) => name === 'r2 inline' ? index : -1).filter((index) => index >= 0);
    if (r2.length !== 1) return structural(`canonical feature table has ${r2.length} R2 inline columns`, { tables });
    const divider = splitRow(lines[lineIndex + 1] || '');
    if (!separator(divider) || divider.length !== header.length) return structural('canonical feature table separator is malformed', { tables });
    let rows = 0;
    for (lineIndex += 2; lineIndex < lines.length; lineIndex += 1) {
      const row = splitRow(lines[lineIndex]);
      if (!row) { lineIndex -= 1; break; }
      if (row.length !== header.length) return structural('canonical feature row has the wrong column count', { tables });
      rows += 1;
      const value = trimOuter(row[r2[0]]);
      if (value === PENDING_STATE) pending = true;
      else if (value !== OK_STATE) return structural(`unknown R2 inline state: ${value || '<empty>'}`, { tables });
    }
    if (!rows) return structural('canonical feature table has no state rows', { tables });
  }
  if (requireCanonical && tables !== 1) return structural(`feature-ledger.md contains ${tables} canonical feature tables`, { tables });
  return { state: pending ? 'pending' : 'ok', tables };
}

/** Boolean safety adapter retained for older callers. */
export function hasPendingToken(content) { return inspectLedgerState(content).state !== 'ok'; }

export function inspectLedgerDocuments(documents) {
  const featureFiles = documents.filter((document) => path.basename(document.file || '').toLowerCase() === 'feature-ledger.md');
  if (featureFiles.length > 1) return structural('multiple feature-ledger.md files discovered');
  let pending = false;
  for (const document of documents) {
    if (document.readError || document.discoveryError) return structural(`${document.file}: ${document.readError || document.discoveryError}`);
    const requireCanonical = path.basename(document.file || '').toLowerCase() === 'feature-ledger.md';
    const result = inspectLedgerState(document.content, { requireCanonical });
    if (result.state === 'structural-error') return structural(`${document.file}: ${result.reason}`);
    pending ||= result.state === 'pending';
  }
  return { state: pending ? 'pending' : 'ok', noFeatureLedger: featureFiles.length === 0 };
}

export async function findRepoRoot(start) {
  const resolved = path.resolve(start);
  let current = resolved;
  const root = path.parse(current).root;
  while (true) {
    try { await fs.access(path.join(current, '.git')); return current; } catch {}
    if (current === root) return resolved;
    const parent = path.dirname(current);
    if (parent === current) return resolved;
    current = parent;
  }
}

async function readDocument(file) {
  try { return { file, content: await fs.readFile(file, 'utf8') }; }
  catch (error) { return { file, readError: error?.message || String(error) }; }
}

async function walk(directory, files) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { return error; }
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const error = await walk(target, files);
      if (error) return error;
    } else if (entry.isFile() && /ledger.*\.md$/i.test(entry.name)) files.push(target);
  }
  return null;
}

export async function readLedgerDocuments(cwd) {
  const root = await findRepoRoot(cwd);
  const canonical = path.join(root, 'feature-ledger.md');
  const files = [];
  let canonicalExists = false;
  try {
    const stat = await fs.stat(canonical);
    if (!stat.isFile()) return [{ file: canonical, readError: 'feature-ledger.md is not a regular file' }];
    canonicalExists = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') return [{ file: canonical, readError: error?.message || String(error) }];
  }
  if (canonicalExists) files.push(canonical);
  let rootEntries;
  try { rootEntries = await fs.readdir(root, { withFileTypes: true }); }
  catch (error) {
    return canonicalExists ? [{ file: canonical, discoveryError: error?.message || String(error) }] : [];
  }
  for (const entry of rootEntries) {
    const target = path.join(root, entry.name);
    if (entry.isFile() && /ledger.*\.md$/i.test(entry.name) && target !== canonical) files.push(target);
  }
  const wikiError = await walk(path.join(root, 'wiki'), files);
  if (wikiError && canonicalExists && wikiError?.code !== 'ENOENT') {
    return [{ file: canonical, discoveryError: wikiError?.message || String(wikiError) }];
  }
  const documents = [];
  for (const file of [...new Set(files)].sort()) documents.push(await readDocument(file));
  return documents;
}
