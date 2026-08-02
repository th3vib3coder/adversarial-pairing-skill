import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');
const sourceMode = existsSync(path.join(root, 'plugin', 'claude-code', 'commands'));
const installedHome = path.dirname(path.dirname(root));
const installedClaudeCommand = path.basename(installedHome).toLowerCase() === '.claude'
  ? path.join(installedHome, 'commands', 'lint-discipline.md')
  : null;
const lintCommandPath = sourceMode
  ? path.join(root, 'plugin', 'claude-code', 'commands', 'lint-discipline.md')
  : installedClaudeCommand;

test('canonical wiki docs disclose no-clobber bootstrap and provisional registry stubs', async () => {
  const [cluster, appendix] = await Promise.all([
    read('docs/spec/04-wiki-discipline.md'),
    read('docs/spec/appendices/A-day-1-bootstrap-checklist.md'),
  ]);

  for (const text of [cluster, appendix]) {
    assert.match(text, /manual[- ]merge/i);
    assert.match(text, /scanner-mode: stub|scanner is (?:a )?stub/i);
    assert.match(text, /not (?:a )?(?:completeness|coverage) proof/i);
  }
  assert.doesNotMatch(cluster, /ensuring registries never diverge/i);
  assert.doesNotMatch(appendix, /entries accumulate as patches land/i);
  assert.doesNotMatch(cluster, /^\s*node\s+.*wiki\/tools\//mu);
  assert.doesNotMatch(appendix, /^\s*node\s+.*wiki\/tools\//mu);
  assert.match(appendix, /<trusted-skill-root>\/tools\/build-registries\.mjs/);
});

test('canonical LAW 13 schema matches the closed linter enum and Tier A/B/C model', async () => {
  const schema = await read('wiki/CLAUDE.md');
  for (const kind of [
    'audit-finding', 'codebase-file', 'codebase-directory', 'protocol', 'feature-ledger',
    'generated-inventory', 'generated-summary', 'command-output', 'wiki-page',
  ]) assert.match(schema, new RegExp(`\\b${kind}\\b`, 'u'));
  assert.doesNotMatch(schema, /<primary-source-kind>/u);
  assert.match(schema, /Tier A \(mechanical\)/u);
  assert.match(schema, /Tier B \(semi-automatic\)/u);
  assert.match(schema, /Tier C \(cognitive\)/u);
  assert.match(schema, /stub[\s\S]{0,80}not source-coverage proof/iu);
});

test('public authorization records are attributable without private transcript or machine paths', async () => {
  const [status, authorization, hat1] = await Promise.all([
    read('status-ledger.md'),
    read('docs/spec/appendices/E-standing-operator-authorization.md'),
    read('plugin/claude-code/commands/hat-1-stop.md'),
  ]);
  assert.doesNotMatch(status, /[A-Za-z]:\\(?:Users|Desktop)\\/u);
  assert.doesNotMatch(status, /Verbatim operator sources:/iu);
  assert.match(status, /<clean-replay-worktree>/u);
  assert.match(status, /<CODEX_HOME>/u);
  assert.match(status, /<CLAUDE_CONFIG_DIR>/u);
  assert.match(status, /source-record-sha256: 2ec7553df2f1552abf4ca51f3c0388cb2763224b8bd144a0a661c829ffb73f0f/u);
  assert.match(status, /source-count: 3/u);
  for (const text of [authorization, hat1]) {
    assert.match(text, /public artifact/iu);
    assert.match(text, /private transcript/iu);
    assert.match(text, /PII/iu);
    assert.match(text, /SHA-256|hash/iu);
  }
});

test('lint command uses trusted wiki tools and treats stub registry check as N/A', async (t) => {
  if (!lintCommandPath || !existsSync(lintCommandPath)) {
    t.skip('Codex installation has no Claude slash-command runtime');
    return;
  }
  const command = await readFile(lintCommandPath, 'utf8');

  assert.match(command, /(?:\$\{CLAUDE_PLUGIN_ROOT\}|adversarial-pairing)\/tools\/wiki-lint\.mjs/);
  assert.match(command, /(?:\$\{CLAUDE_PLUGIN_ROOT\}|adversarial-pairing)\/tools\/build-registries\.mjs/);
  assert.match(command, /NOT a completeness proof/);
  assert.match(command, /reviewer-approved N\/A/i);
  assert.doesNotMatch(command, /^node tools\/wiki-lint\.mjs --staged$/m);
  assert.doesNotMatch(command, /^\s*node\s+.*wiki\/tools\//mu);
});

test('canonical README and runtime skills carry the safe registry contract', async () => {
  const relativePaths = sourceMode
    ? [
        'README.md',
        'skills/claude-code/adversarial-pairing/SKILL.md',
        'plugin/claude-code/skills/adversarial-pairing/SKILL.md',
        'skills/codex/adversarial-pairing/SKILL.md',
      ]
    : ['README.md', 'SKILL.md'];
  const files = await Promise.all(relativePaths.map(read));

  for (const text of files) {
    assert.match(text, /no-clobber|preserv(?:e|es|ing) existing/i);
    assert.match(text, /real (?:project )?scanner/i);
    assert.match(text, /stub/i);
    assert.doesNotMatch(text, /`\/lint-wiki` check and `build-registries --check` must both pass/i);
  }
});

test('core protocol docs use the two-stage HAT 3 flip contract consistently', async () => {
  const relativePaths = [
    'docs/spec/README.md',
    'docs/spec/01-roles-and-cycles.md',
    'docs/spec/06-state-integrity.md',
    ...(sourceMode
      ? [
          'skills/claude-code/adversarial-pairing/SKILL.md',
          'plugin/claude-code/skills/adversarial-pairing/SKILL.md',
          'skills/codex/adversarial-pairing/SKILL.md',
        ]
      : ['SKILL.md']),
  ];
  const files = await Promise.all(relativePaths.map(read));

  for (const text of files) {
    assert.match(text, /ACCEPT-TO-FLIP/);
    assert.match(text, /GO-TO-FLIP|(?:direct or standing )?flip authorization/i);
    assert.match(text, /final HAT 3 [`*]?ACCEPT[`*]?/i);
    assert.match(text, /GO-COMMIT|(?:direct or standing )?commit authorization/i);
    assert.doesNotMatch(text, /Reviewer ACCEPT triggers operator GO that flips/i);
    assert.doesNotMatch(text, /OK until the reviewer has issued HAT 3 ACCEPT/i);
    assert.match(text, /working-tree/i);
    assert.match(text, /cached (?:patch|diff)/i);
  }
});

test('state checks are current-row structural and cannot match their own prose', async () => {
  const [stateSpec, reviewCommand, lintCommand] = await Promise.all([
    read('docs/spec/06-state-integrity.md'),
    read('plugin/claude-code/commands/adversarial-review.md'),
    read('plugin/claude-code/commands/lint-discipline.md'),
  ]);
  assert.match(stateSpec, /header-defined R2 column|locate its `R2 inline` column/i);
  assert.doesNotMatch(stateSpec, /grep -c "R2 inline (?:pending|OK)"/);
  assert.match(reviewCommand, /exactly one anchored row/i);
  assert.doesNotMatch(reviewCommand, /rg -n "R2 inline \(pending\|OK\)"/);
  assert.doesNotMatch(lintCommand, /git diff --cached \| rg/);
  const dual = await read('plugin/claude-code/commands/dual-commit.md');
  const appendix = await read('docs/spec/appendices/D-dual-commit-playbook.md');
  for (const text of [dual, appendix]) {
    assert.match(text, /exactly one anchored consumer-seq\s+row/i);
    assert.doesNotMatch(text, /rg -n "R2 inline \(pending\|OK\)"/u);
  }
});

test('standing authorization removes repeated prompts without weakening reviewer gates', async () => {
  const relativePaths = [
    'docs/spec/appendices/E-standing-operator-authorization.md',
    'docs/spec/01-roles-and-cycles.md',
    'docs/spec/README.md',
    ...(sourceMode
      ? [
          'skills/claude-code/adversarial-pairing/SKILL.md',
          'plugin/claude-code/skills/adversarial-pairing/SKILL.md',
          'skills/codex/adversarial-pairing/SKILL.md',
        ]
      : ['SKILL.md']),
  ];
  for (const text of await Promise.all(relativePaths.map(read))) {
    assert.match(text, /standing (?:operator )?authorization/i);
    assert.match(text, /distinct reviewer|distinct agent instance|never (?:replaces?|permits)[\s\S]{0,50}(?:reviewer|review)/i);
  }
  const contract = await read('docs/spec/appendices/E-standing-operator-authorization.md');
  assert.match(contract, /MERGE-TAG-RELEASE.*not implied/is);
  assert.match(contract, /scope expansion/i);
  assert.match(contract, /expires|expiry/i);
  assert.match(contract, /revok/i);
  assert.match(contract, /without asking the operator\s+again/i);
});

test('Windows bootstrap docs name Git Bash, executable discovery, and path conversion', async () => {
  const appendix = await read('docs/spec/appendices/A-day-1-bootstrap-checklist.md');
  assert.match(appendix, /Windows with Git Bash/i);
  assert.match(appendix, /Get-Command bash\.exe/);
  assert.match(appendix, /ProgramFiles\\Git\\bin\\bash\.exe/);
  assert.match(appendix, /D:\\Work\\My Project/);
  assert.match(appendix, /\/d\/Work\/My Project/);
  assert.match(appendix, /ENOENT/);
});

test('Claude skill documents self-contained skill and plugin-root command resolution', { skip: !sourceMode }, async () => {
  const [standalone, plugin] = await Promise.all([
    read('skills/claude-code/adversarial-pairing/SKILL.md'),
    read('plugin/claude-code/skills/adversarial-pairing/SKILL.md'),
  ]);
  assert.equal(standalone, plugin);
  assert.match(plugin, /self-contained skill directory/i);
  assert.match(plugin, /\$\{CLAUDE_PLUGIN_ROOT\}/);
  assert.match(plugin, /neither surface traverses outside/i);
});

test('spec glossary does not present provisional registry stubs as Tier-A coverage', async () => {
  const glossary = await read('docs/spec/README.md');
  assert.match(glossary, /real project scanner/i);
  assert.match(glossary, /bundled (?:registry )?stubs/i);
  assert.doesNotMatch(glossary, /Tier A registries auto-regenerate,/i);
  assert.doesNotMatch(glossary, /Tier A \(mechanical\):\s*auto-regenerated registries,/i);
});

test('legacy case study is labeled historical and mapped to the current two-stage gate', async () => {
  const [caseStudy, closureEvidence, trail, specIndex] = await Promise.all([
    read('docs/case-studies/phase-9-wave-5/README.md'),
    read('docs/case-studies/phase-9-wave-5/03-closure-evidence.md'),
    read('docs/case-studies/phase-9-wave-5/01-trail.md'),
    read('docs/spec/README.md'),
  ]);
  assert.match(caseStudy, /historical v2\.1/i);
  assert.match(caseStudy, /non-normative/i);
  assert.match(caseStudy, /ACCEPT-TO-FLIP/);
  assert.match(caseStudy, /final HAT 3 [`*]?ACCEPT[`*]?/i);
  assert.match(caseStudy, /GO-COMMIT/);
  assert.doesNotMatch(caseStudy, /Canonical role of this case study/i);
  assert.doesNotMatch(caseStudy, /^\s*- \*\*Canonical:/mu);
  assert.doesNotMatch(caseStudy, /docs\/spec\/clusters\//);
  assert.doesNotMatch(caseStudy, /every claim below is traceable/i);
  assert.match(caseStudy, /semantic SHA placeholders/i);
  assert.match(caseStudy, /not independently\s+verifiable from this distribution/i);
  assert.match(closureEvidence, /semantic SHA placeholders/i);
  assert.match(closureEvidence, /not independently verifiable evidence\s+from this distribution/i);
  assert.match(trail, /SHA placeholders?/i);
  assert.match(specIndex, /historical.*non-normative/is);
});
