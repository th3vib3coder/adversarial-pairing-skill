#!/usr/bin/env node
/**
 * PreToolUse guard for Bash-tool commit invocations.
 *
 * The guard blocks commits whose target repository has a canonical feature
 * ledger row in the unresolved R2 state. It parses the table structurally, so
 * documentary mentions cannot deadlock the repository. Shell parsing is
 * conservative around dynamic commands and working directories.
 *
 * This is a local workflow guard, not a security boundary. IDE commits, API
 * commits, and tools other than the Claude Code Bash tool remain outside its
 * enforcement surface; CI and repository policy must cover those paths.
 */
import { pathToFileURL } from 'node:url';
import {
  isBashGitCommit,
  parseGitCommitInvocation,
  parseGitCommitInvocations,
} from './pending-flip-command-parser.js';
import {
  PENDING_STATE,
  hasPendingToken,
  inspectLedgerDocuments,
  inspectLedgerState,
  readLedgerDocuments,
} from './pending-flip-ledger-state.js';

const CLOSURE_KEYWORDS = /\b(complete|completed|verified|closing|closure|chius[oa])\b/i;

export { isBashGitCommit, parseGitCommitInvocation, parseGitCommitInvocations, hasPendingToken };

export function commitClaimsClosure(command) {
  if (typeof command !== 'string') return false;
  return parseGitCommitInvocations(command).some((parsed) => {
    if (parsed.commitIndex < 0) return true;
    const args = parsed.words.slice(parsed.commitIndex + 1);
    const messages = [];
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (arg === '-m' || arg === '--message') {
        if (args[index + 1]) messages.push(args[index + 1]);
        index += 1;
      } else if (arg.startsWith('--message=')) messages.push(arg.slice('--message='.length));
      else if (/^-m.+/.test(arg)) messages.push(arg.slice(2));
    }
    return messages.length ? CLOSURE_KEYWORDS.test(messages.join(' ')) : true;
  });
}

function blockedMessage(reason) {
  return (
    `[pending-flip-guard] BLOCKED: ${reason}. ` +
    'Obtain independent reviewer acceptance, then flip the canonical ledger cell before staging the commit. ' +
    'This Bash-tool hook is not a substitute for CI or repository policy.'
  );
}

/** Programmatic adapter retained for installed-skill and unit-test compatibility. */
export async function runHook({ command, ledgerContent } = {}) {
  if (!isBashGitCommit(command)) return { blocked: false };
  if (ledgerContent == null) return { blocked: false };
  const result = inspectLedgerState(ledgerContent);
  if (result.state === 'structural-error') {
    return { blocked: true, message: blockedMessage(`feature ledger is structurally invalid (${result.reason})`) };
  }
  if (result.state !== 'pending') return { blocked: false };
  return { blocked: true, message: blockedMessage(`canonical ledger cell is ${PENDING_STATE}`) };
}

function readStdinJson() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`invalid JSON on stdin: ${error.message}`));
      }
    });
    process.stdin.on('error', reject);
  });
}

async function inspectRepository(cwd) {
  const documents = await readLedgerDocuments(cwd);
  const result = inspectLedgerDocuments(documents);
  if (result.state === 'structural-error') return { blocked: true, reason: result.reason };
  if (result.state === 'pending') return { blocked: true, reason: `canonical ledger cell is ${PENDING_STATE}` };
  return { blocked: false, noFeatureLedger: result.noFeatureLedger };
}

async function cliMain() {
  let payload;
  try {
    payload = await readStdinJson();
  } catch (error) {
    process.stderr.write(`[pending-flip-guard] ${error.message}\n`);
    process.exit(0);
    return;
  }

  const command = payload?.tool_input?.command;
  const callerCwd = payload?.cwd || process.cwd();
  const invocations = parseGitCommitInvocations(command, callerCwd);
  for (const parsed of invocations) {
    if (parsed.unresolvedCommand || !parsed.cwd) {
      process.stderr.write(blockedMessage(parsed.unresolvedReason || 'commit repository cannot be resolved safely') + '\n');
      process.exit(2);
      return;
    }
    const state = await inspectRepository(parsed.cwd);
    if (state.blocked) {
      process.stderr.write(blockedMessage(state.reason) + '\n');
      process.exit(2);
      return;
    }
  }
  process.exit(0);
}

const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (invokedDirectly) {
  cliMain().catch((error) => {
    process.stderr.write(`[pending-flip-guard] internal error: ${error.message}\n`);
    process.exit(2);
  });
}
