/**
 * template-esm-executable.test.mjs
 *
 * Verifies that each tool copied to wiki/tools/*.mjs by bootstrap.sh is
 * runtime-loadable as ESM — not just statically free of require().
 *
 * Strategy: create a temp fixture, copy each tool into wiki/tools/,
 * then spawn `node <tool>` with args that trigger early usage output (exit 1
 * or exit 2 is acceptable — what matters is that the Node ESM loader did NOT
 * emit ERR_REQUIRE_ESM, ERR_INVALID_PACKAGE_TARGET, or a SyntaxError).
 */

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = path.resolve(__dirname, '..');

const TOOLS = [
  'build-registries.mjs',
  'sync-mirror.mjs',
  'wiki-lint.mjs',
  'audit-entity-exports.mjs',
];

/**
 * Spawn `node <toolPath>` with no meaningful args so the tool exits quickly
 * (usage error, exit 1 or 2).  The critical assertion is that stderr does NOT
 * contain Node loader errors that indicate the file failed to load as ESM.
 */
async function spawnTool(toolPath) {
  try {
    const result = await execFileAsync('node', [toolPath]);
    // Exit 0 — fine (some tools may handle no-args gracefully)
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    // Non-zero exit is expected (usage error). Capture details.
    return {
      exitCode: err.code,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
    };
  }
}

const ESM_LOADER_ERRORS = [
  'ERR_REQUIRE_ESM',
  'ERR_INVALID_PACKAGE_TARGET',
  'SyntaxError',
  'ERR_MODULE_NOT_FOUND',
  'Must use import to load ES Module',
];

test('each tool is runtime-loadable as ESM when copied to wiki/tools/', async () => {
  // Create fixture: mimic what bootstrap.sh step 4 does
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'esm-exec-'));
  const wikiToolsDir = path.join(fixtureRoot, 'wiki', 'tools');
  await mkdir(wikiToolsDir, { recursive: true });

  for (const toolName of TOOLS) {
    const srcPath = path.join(TOOL_DIR, toolName);
    const dstPath = path.join(wikiToolsDir, toolName);

    // Copy (simulates bootstrap.sh step 4)
    await copyFile(srcPath, dstPath);

    const { exitCode, stderr } = await spawnTool(dstPath);

    // The tool must have loaded — Node ESM loader errors are fatal and produce
    // a specific stderr pattern.  A usage-error exit (1 or 2) is fine.
    for (const loaderError of ESM_LOADER_ERRORS) {
      assert.ok(
        !stderr.includes(loaderError),
        `${toolName} copied to wiki/tools/ failed ESM load: found "${loaderError}" in stderr.\nstderr: ${stderr.slice(0, 500)}`
      );
    }

    // Also assert that exit code is not indicative of a crash (exit 3+ from
    // an unhandled exception before the tool body ran). 0, 1, 2 are usage exits.
    assert.ok(
      exitCode === 0 || exitCode === 1 || exitCode === 2,
      `${toolName}: unexpected exit code ${exitCode} (expected 0, 1, or 2 — usage error).\nstderr: ${stderr.slice(0, 500)}`
    );
  }
});
