import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const plugin = path.join(repo, 'plugin', 'claude-code');
const release = '0.2.0-rc.1';
const releaseDate = '2026-08-02';
const commandNames = [
  'adversarial-review',
  'dual-commit',
  'hat-1-stop',
  'init-pairing',
  'lint-discipline',
];
const distributionRoots = [
  plugin,
  path.join(plugin, 'skills', 'adversarial-pairing'),
  path.join(repo, 'skills', 'claude-code', 'adversarial-pairing'),
  path.join(repo, 'skills', 'codex', 'adversarial-pairing'),
];

const read = (file) => readFile(path.join(repo, file), 'utf8');
const json = async (file) => JSON.parse(await read(file));

async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function markdownFiles(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) result.push(...await markdownFiles(root, absolute));
    else if (entry.isFile() && entry.name.endsWith('.md')) result.push(absolute);
  }
  return result;
}

function localLinkTargets(markdown) {
  const targets = [];
  const matcher = /!?(?:\[[^\]]*\])\(([^)]+)\)/gu;
  for (const match of markdown.matchAll(matcher)) {
    let target = match[1].trim().replace(/^<|>$/gu, '');
    if (!target || target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
    target = target.split('#', 1)[0].split('?', 1)[0];
    if (target) targets.push(decodeURIComponent(target));
  }
  return targets;
}

test('plugin.json is the single machine-readable version authority', async () => {
  const [manifest, marketplace, spec, changelog, pluginChangelog, readme] = await Promise.all([
    json('plugin/claude-code/.claude-plugin/plugin.json'),
    json('.claude-plugin/marketplace.json'),
    read('docs/spec/README.md'),
    read('CHANGELOG.md'),
    read('plugin/claude-code/CHANGELOG.md'),
    read('README.md'),
  ]);

  assert.equal(manifest.version, release);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
  assert.equal(manifest.license, 'MIT');
  const entry = marketplace.plugins.find(({ name }) => name === manifest.name);
  assert.ok(entry, 'marketplace must expose the manifest plugin');
  assert.equal(Object.hasOwn(entry, 'version'), false, 'marketplace must defer to plugin.json');
  assert.equal(path.resolve(repo, entry.source), plugin);
  assert.match(spec, new RegExp(`\\*\\*Version\\*\\*: v${release.replaceAll('.', '\\.')}\\b`, 'u'));
  assert.match(spec, /\*\*Status\*\*: release candidate/u);
  assert.match(changelog, new RegExp(`^## v${release.replaceAll('.', '\\.')} — ${releaseDate}$`, 'mu'));
  assert.equal(pluginChangelog, changelog);
  assert.match(readme, new RegExp(`^v${release.replaceAll('.', '\\.')}\\b`, 'mu'));
});

test('all seven clusters and bootstrap Appendix A carry the release version', async () => {
  const docs = [
    ...Array.from({ length: 7 }, (_, index) =>
      `docs/spec/0${index + 1}-${[
        'roles-and-cycles',
        'verification-discipline',
        'ledger-discipline',
        'wiki-discipline',
        'code-discipline',
        'state-integrity',
        'plan-and-document-discipline',
      ][index]}.md`),
    'docs/spec/appendices/A-day-1-bootstrap-checklist.md',
    'docs/spec/appendices/E-standing-operator-authorization.md',
  ];
  for (const file of docs) {
    assert.match(await read(file), new RegExp(`^\\*\\*Version\\*\\*: v${release.replaceAll('.', '\\.')}$`, 'mu'), file);
  }
});

test('every distribution carries the canonical MIT license', async () => {
  const canonical = await readFile(path.join(repo, 'LICENSE'));
  for (const root of distributionRoots) {
    assert.deepEqual(await readFile(path.join(root, 'LICENSE')), canonical, path.relative(repo, root));
  }
});

test('plugin hooks use cross-platform exec form and declare the Node floor', async () => {
  const [config, packageManifest, activation] = await Promise.all([
    json('plugin/claude-code/hooks/hooks.json'),
    json('plugin/claude-code/hooks/package.json'),
    read('plugin/claude-code/hooks/ENABLE.md'),
  ]);
  const handlers = Object.values(config.hooks)
    .flatMap((groups) => groups)
    .flatMap(({ hooks }) => hooks);
  assert.equal(handlers.length, 2);
  for (const handler of handlers) {
    assert.equal(handler.type, 'command');
    assert.equal(handler.command, 'node');
    assert.equal(handler.args.length, 1);
    assert.match(handler.args[0], /^\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[a-z-]+\.js$/u);
  }
  assert.equal(packageManifest.engines.node, '>=18.17.0');
  assert.match(activation, /registers both hooks automatically/i);
  assert.match(activation, /user.*project.*local/is);
  assert.match(activation, /standalone skill does not register plugin hooks/i);
});

test('installation guide covers prerequisites, scope, namespacing, migration, and failure residue', async () => {
  const [installation, readme, appendix] = await Promise.all([
    read('docs/installation.md'),
    read('README.md'),
    read('docs/spec/appendices/A-day-1-bootstrap-checklist.md'),
  ]);
  assert.match(installation, /Node\.js 18\.17\.0 or newer/u);
  assert.match(installation, /Git Bash on Windows/u);
  assert.match(installation, /`user`, `project`, and `local` scopes/u);
  assert.match(installation, /hooks are registered automatically/i);
  assert.match(installation, /standalone skill does not\s+register hooks/i);
  assert.match(installation, /Migrate from v0\.1\.x/u);
  assert.match(installation, /standing authorization/i);
  assert.match(installation, /never implies merge\/tag\/release/i);
  assert.doesNotMatch(
    installation,
    /https:\/\/github\.com\/th3vib3coder\/adversarial-pairing-skill\/blob\/main\/plugin\/claude-code\/hooks\/ENABLE\.md/u
  );
  assert.match(installation, /bundled `hooks\/ENABLE\.md`/iu);
  for (const text of [installation, readme, appendix]) {
    assert.match(text, /only (?:permitted residue is )?empty .*director/iu);
    assert.match(text, /(?:never|does not)\s+remove.*pre-existing/isu);
    assert.match(text, /unknown\/concurrently\s+substituted path/iu);
    assert.match(text, /rerun/iu);
    assert.match(text, /no-clobber/iu);
  }
  for (const name of commandNames) {
    const namespaced = `/adversarial-pairing:${name}`;
    assert.ok(installation.includes(namespaced), `installation must name ${namespaced}`);
    assert.ok(readme.includes(namespaced), `README must name ${namespaced}`);
    assert.match(await read(`plugin/claude-code/commands/${name}.md`), new RegExp(`^# ${namespaced.replace('/', '\\/')}$`, 'mu'));
  }
});

test('plugin package has complete isolated runtime inventory', async () => {
  const required = [
    '.claude-plugin/plugin.json',
    'CHANGELOG.md',
    'LICENSE',
    'hooks/hooks.json',
    'hooks/ledger-mantra-check.js',
    'hooks/pending-flip-command-parser.js',
    'hooks/pending-flip-guard.js',
    'hooks/pending-flip-ledger-state.js',
    'hooks/package.json',
    'skills/adversarial-pairing/SKILL.md',
    ...commandNames.map((name) => `commands/${name}.md`),
  ];
  for (const relative of required) {
    assert.ok(await isFile(path.join(plugin, relative)), `plugin missing ${relative}`);
  }

  const pluginPrefix = `${path.resolve(plugin)}${path.sep}`.toLowerCase();
  for (const markdown of await markdownFiles(plugin)) {
    for (const target of localLinkTargets(await readFile(markdown, 'utf8'))) {
      const resolved = path.resolve(path.dirname(markdown), target);
      assert.ok(resolved.toLowerCase().startsWith(pluginPrefix), `${markdown} escapes plugin: ${target}`);
      assert.ok(await exists(resolved), `${markdown} has broken local link: ${target}`);
    }
  }
});
