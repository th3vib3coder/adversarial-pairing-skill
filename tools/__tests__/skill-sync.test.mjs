import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ──────────────────────────────────────────────────────────────────
// Top-level skill (documented canonical source per spec: skills/<runtime>/<name>/SKILL.md).
// Plugin-bundled skill (loader-discoverable copy under plugin/claude-code/skills/<name>/SKILL.md).
// Both must match byte-for-byte (HAT 1 ACCEPT Q2 option (a): keep both, enforce sync).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const SOURCE = path.join(REPO_ROOT, 'skills', 'claude-code', 'adversarial-pairing', 'SKILL.md');
const BUNDLE = path.join(REPO_ROOT, 'plugin', 'claude-code', 'skills', 'adversarial-pairing', 'SKILL.md');

// ── Helpers ────────────────────────────────────────────────────────────────

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('top-level Claude SKILL.md exists at documented spec path', async () => {
  assert.ok(
    await fileExists(SOURCE),
    `Missing canonical source: ${path.relative(REPO_ROOT, SOURCE)}`
  );
  const buf = await readFile(SOURCE);
  assert.ok(buf.byteLength > 0, 'top-level SKILL.md must be non-empty');
});

test('plugin-bundled Claude SKILL.md exists at loader-discoverable path', async () => {
  assert.ok(
    await fileExists(BUNDLE),
    `Missing plugin bundle: ${path.relative(REPO_ROOT, BUNDLE)}`
  );
  const buf = await readFile(BUNDLE);
  assert.ok(buf.byteLength > 0, 'plugin-bundled SKILL.md must be non-empty');
});

test('top-level Claude SKILL.md and plugin-bundled SKILL.md match byte-for-byte', async () => {
  const sourceBuf = await readFile(SOURCE);
  const bundleBuf = await readFile(BUNDLE);

  if (sourceBuf.equals(bundleBuf)) return;

  // Diverged — produce actionable diagnostic
  const sourceText = sourceBuf.toString('utf8');
  const bundleText = bundleBuf.toString('utf8');
  const sourceLines = sourceText.split('\n');
  const bundleLines = bundleText.split('\n');

  let firstDiff = -1;
  for (let i = 0; i < Math.max(sourceLines.length, bundleLines.length); i++) {
    if (sourceLines[i] !== bundleLines[i]) {
      firstDiff = i + 1;
      break;
    }
  }

  const sourceRel = path.relative(REPO_ROOT, SOURCE).replaceAll('\\', '/');
  const bundleRel = path.relative(REPO_ROOT, BUNDLE).replaceAll('\\', '/');

  assert.fail(
    `Claude SKILL.md sync drift detected.\n` +
    `  source: ${sourceRel} (${sourceLines.length} lines, ${sourceBuf.byteLength} bytes)\n` +
    `  bundle: ${bundleRel} (${bundleLines.length} lines, ${bundleBuf.byteLength} bytes)\n` +
    `  first diff at line ${firstDiff}\n` +
    `  re-sync (from repo root): cp -p ${sourceRel} ${bundleRel}`
  );
});
