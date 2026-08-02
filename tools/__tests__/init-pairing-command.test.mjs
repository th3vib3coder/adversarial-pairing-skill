import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_COMMAND = path.join(REPO_ROOT, 'plugin', 'claude-code', 'commands', 'init-pairing.md');
const sourceMode = existsSync(SOURCE_COMMAND);
const installedHome = path.dirname(path.dirname(REPO_ROOT));
const installedClaudeCommand = path.basename(installedHome).toLowerCase() === '.claude'
  ? path.join(installedHome, 'commands', 'init-pairing.md')
  : null;
const COMMAND_PATH = sourceMode ? SOURCE_COMMAND : installedClaudeCommand;
const TRUSTED_TOOL_ROOT = sourceMode
  ? '${CLAUDE_PLUGIN_ROOT}/tools'
  : REPO_ROOT.replaceAll('\\', '/') + '/tools';

test('/init-pairing verifies with installed trusted tools, never target-owned copies', async (t) => {
  if (!COMMAND_PATH || !existsSync(COMMAND_PATH)) {
    t.skip('Codex installation has no Claude /init-pairing command');
    return;
  }
  const source = await readFile(COMMAND_PATH, 'utf8');
  const executableNodeLines = source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('node '));

  assert.deepEqual(executableNodeLines, [
    `node "${TRUSTED_TOOL_ROOT}/wiki-lint.mjs" "<target-project-root>/wiki" --json`,
    `node "${TRUSTED_TOOL_ROOT}/build-registries.mjs" "<target-project-root>" --check`,
  ]);
  assert.doesNotMatch(source, /^\s*node\s+"<target-project-root>\/wiki\/tools\//mu);
  assert.match(source, /Do not execute .*target.*wiki\/tools/is);
  assert.match(source, /Git for Windows/i);
  assert.match(source, /\/c\/Program Files\/Git\/bin\/bash\.exe/);
  assert.match(source, /D:\\Work\\Repo/);
  assert.match(source, /\/d\/Work\/Repo/);
  if (sourceMode) assert.doesNotMatch(source, /[A-Za-z]:\/Users\/[^/]+\/\.claude/i);
});
