import { statSync } from 'node:fs';
import path from 'node:path';
const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s;
const VARIABLE_WORD = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/;
const DYNAMIC = /[$`]/;
function joinContinuations(command) {
  let output = '';
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];
    if (char === "'" && quote !== '"') quote = quote === "'" ? null : "'";
    else if (char === '"' && quote !== "'") quote = quote === '"' ? null : '"';
    if (char === '\\' && quote !== "'") {
      if (command[index + 1] === '\n') { index += 1; continue; }
      if (command[index + 1] === '\r' && command[index + 2] === '\n') { index += 2; continue; }
    }
    output += char;
  }
  return output;
}
function launchesShell(prefix) {
  let words = shellWords(prefix); while (ASSIGNMENT.test(words[0]?.value || '')) words.shift(); words = unwrap(words).words || [];
  if (words[0]?.value === 'env') {
    let index = 1;
    while (index < words.length) {
      const value = words[index].value;
      if (['-C', '--chdir', '-u', '--unset', '-a', '--argv0'].includes(value)) { index += 2; continue; }
      if (value.startsWith('-') || ASSIGNMENT.test(value)) { index += 1; continue; }
      break;
    }
    words = unwrap(words.slice(index)).words || [];
  }
  words = unwrap(words).words || []; return ['bash', 'bash.exe', 'sh', 'sh.exe'].includes(path.win32.basename(path.posix.basename(words[0]?.value || '')).toLowerCase());
}
function shellQuote(value) { return `'${String(value).replaceAll("'", "'\\''")}'`; } function heredocDelimiter(raw) { if (!raw.includes("$'")) return shellWords(raw)[0]?.value; return /^\$'([^\\']*)'$/.exec(raw)?.[1] || null; }
function stripNoise(command) {
  const output = [];
  const heredocs = [];
  for (const original of joinContinuations(String(command || '')).split(/\r?\n/)) {
    if (heredocs.length) {
      const active = heredocs[0];
      if (original.trim() === active.delimiter) {
        heredocs.shift();
        if (active.executable) output.push(active.multiple ? '$__ADVERSARIAL_HEREDOC commit' : `${active.before}<<< ${shellQuote(active.body.join('\n'))}${active.after}`);
      } else if (active.executable) active.body.push(original);
      else if (active.expand) {
        for (const script of commandSubstitutions(original, false)) {
          if (script !== null) output.push(`: "$(${script})"`);
        }
      }
      continue;
    }
    let line = '';
    let quote = null;
    let escaped = false;
    for (let index = 0; index < original.length; index += 1) {
      const char = original[index];
      if (escaped) { line += char; escaped = false; continue; }
      if (char === '\\' && quote !== "'") { line += char; escaped = true; continue; }
      if (quote) { line += char; if (char === quote) quote = null; continue; }
      if (char === "'" || char === '"') { quote = char; line += char; continue; }
      if (char === '#' && (index === 0 || /[\s;&|(){}]/.test(original[index - 1]))) break;
      line += char;
    }
    const prefix = line.split(/<<(?!<)/, 1)[0];
    const executable = launchesShell(prefix);
    const pattern = /(?<!<)<<(?!<)-?\s*((?:\\.|'[^']*'|"[^"]*"|[^\s;&|()<>])+)/g;
    const matches = [...line.matchAll(pattern)]; for (const heredoc of matches) {
      const delimiter = heredocDelimiter(heredoc[1]); if (!delimiter) output.push('$__ADVERSARIAL_HEREDOC commit');
      heredocs.push({ delimiter: delimiter || '__ADVERSARIAL_UNMATCHED__', expand: !/['"\\]/.test(heredoc[1]), executable,
        before: line.slice(0, heredoc.index), after: line.slice(heredoc.index + heredoc[0].length), body: [], multiple: matches.length > 1 || !delimiter });
    }
    if (!executable || matches.length === 0) output.push(line);
  }
  return output.join('\n');
}
function substitutionEnd(raw, start) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let index = start + 2; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && quote !== "'") { escaped = true; continue; }
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === "'" || char === '"') { quote = char; continue; }
    if (char === '$' && raw[index + 1] === '(') { depth += 1; index += 1; continue; }
    if (char === '(') depth += 1;
    if (char === ')' && --depth === 0) return index;
  }
  return -1;
}
function backtickEnd(raw, start) {
  let escaped = false;
  for (let index = start + 1; index < raw.length; index += 1) {
    if (escaped) { escaped = false; continue; }
    if (raw[index] === '\\') { escaped = true; continue; }
    if (raw[index] === '`') return index;
  }
  return -1;
}
function shellTokens(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  let escaped = false;
  let parameterDepth = 0;
  const push = () => { if (current.trim()) tokens.push({ type: 'command', value: current.trim() }); current = ''; };
  const source = stripNoise(command);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) { current += char; escaped = false; continue; }
    if (char === '\\' && quote !== "'") { current += char; escaped = true; continue; }
    if (quote) {
      if (quote !== "'" && char === '$' && source[index + 1] === '(') {
        const end = substitutionEnd(source, index);
        current += end < 0 ? source.slice(index) : source.slice(index, end + 1);
        index = end < 0 ? source.length : end; continue;
      }
      if (quote !== "'" && char === '`') {
        const end = backtickEnd(source, index);
        current += end < 0 ? source.slice(index) : source.slice(index, end + 1);
        index = end < 0 ? source.length : end; continue;
      }
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (parameterDepth) {
      current += char;
      if (char === '{') parameterDepth += 1;
      if (char === '}') parameterDepth -= 1;
      continue;
    }
    if (char === '$' && source[index + 1] === '(') {
      const end = substitutionEnd(source, index);
      current += end < 0 ? source.slice(index) : source.slice(index, end + 1);
      index = end < 0 ? source.length : end; continue;
    }
    if (char === '`') {
      const end = backtickEnd(source, index);
      current += end < 0 ? source.slice(index) : source.slice(index, end + 1);
      index = end < 0 ? source.length : end; continue;
    }
    if (char === '$' && source[index + 1] === '{') { current += '${'; parameterDepth = 1; index += 1; continue; }
    if (char === "'" || char === '"') { quote = char; current += char; continue; }
    if ('(){}'.includes(char)) { push(); tokens.push({ type: char, value: char }); continue; }
    if (';\n|&'.includes(char)) {
      push(); let value = char;
      if ((char === '|' || char === '&') && source[index + 1] === char) { value += char; index += 1; }
      tokens.push({ type: 'operator', value }); continue;
    }
    current += char;
  }
  push();
  return tokens;
}
function shellWords(command) {
  const words = [];
  let value = '';
  let raw = '';
  let quote = null;
  let escaped = false;
  let singleQuoted = false;
  let singleQuoteStart = -1;
  const push = () => { if (raw || value) words.push({ value, raw, singleQuoted }); value = ''; raw = ''; singleQuoted = false; };
  const source = String(command).trim();
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (escaped) { value += char; raw += char; escaped = false; continue; }
    if (char === '\\' && quote !== "'") {
      const next = source[index + 1];
      if (quote === '"' && next && !['$', '`', '"', '\\', '\n'].includes(next)) { value += char; raw += char; continue; }
      raw += char; escaped = true; continue;
    }
    if (quote) {
      raw += char;
      if (char === quote) { if (quote === "'" && value.length > singleQuoteStart) singleQuoted = true; quote = null; }
      else value += char;
      continue;
    }
    if (char === "'" || char === '"') { quote = char; raw += char; if (char === "'") singleQuoteStart = value.length; continue; }
    if (/\s/.test(char)) { push(); continue; }
    value += char; raw += char;
  }
  push();
  return words;
}
function environmentVariables(environment) {
  return new Map(Object.entries(environment || {}).map(([name, value]) => [name, { value: String(value), exported: true }]));
}
function cloneState(state) {
  return { cwd: state.cwd, alternateCwds: [...(state.alternateCwds || [])], stack: [...state.stack], variables: new Map(state.variables), skipNext: false, directoryChange: null, branchUnknown: state.branchUnknown || false };
}
function literal(value) { return typeof value === 'string' && value.length > 0 && !DYNAMIC.test(value); }
function directoryStatus(value, cwd, variables) {
  if (!cwd || !literal(value) || value === '-' || value.startsWith('~') || /^[+-]\d+$/.test(value) || /[*?\[\]]/.test(value)) {
    return { status: 'unknown', target: null };
  }
  const cdpath = variables.get('CDPATH');
  if (!path.isAbsolute(value) && !value.startsWith('./') && !value.startsWith('../') && cdpath?.value) {
    return { status: 'unknown', target: null };
  }
  const target = path.resolve(cwd, value);
  try { return { status: statSync(target).isDirectory() ? 'usable' : 'missing', target }; }
  catch (error) { return { status: error?.code === 'ENOENT' ? 'missing' : 'unknown', target }; }
}
function commandSubstitutions(raw, quotesActive = true) {
  const scripts = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) { escaped = false; continue; }
    if (char === '\\' && quote !== "'") { escaped = true; continue; }
    if (quotesActive && quote === "'") { if (char === "'") quote = null; continue; }
    if (quotesActive && quote === '"' && char === '"') { quote = null; continue; }
    if (quotesActive && !quote && char === "'") { quote = "'"; continue; }
    if (quotesActive && !quote && char === '"') { quote = '"'; continue; }
    if (char === '`') {
      const end = backtickEnd(raw, index);
      if (end < 0) { scripts.push(null); break; }
      scripts.push(raw.slice(index + 1, end)); index = end; continue;
    }
    if (char !== '$' || raw[index + 1] !== '(') continue;
    const end = substitutionEnd(raw, index);
    if (end < 0) { scripts.push(null); break; }
    scripts.push(raw.slice(index + 2, end)); index = end;
  }
  return scripts;
}
function isGit(word) {
  const base = path.win32.basename(path.posix.basename(word || '')).toLowerCase();
  return base === 'git' || base === 'git.exe';
}
function unresolved(raw, cwd, reason) {
  return { isCommit: true, cwd, words: [], commitIndex: -1, raw, unresolvedCommand: true, unresolvedReason: reason };
}
function commitish(words) {
  return words.some((word) => DYNAMIC.test(word.value) || /(^|\s)(git(?:\.exe)?\s+)?commit(?:\s|$)/i.test(word.value) || /(^|[\\/])(git|git\.exe)$/i.test(word.value));
}
function resolvePath(value, cwd) { return literal(value) && cwd ? path.resolve(cwd, value) : null; }
function parseGit(words, state, raw, commandVariables) {
  if (!isGit(words[0]?.value)) return null;
  let cwd = state.cwd;
  let workTreeRaw = commandVariables.get('GIT_WORK_TREE')?.exported ? commandVariables.get('GIT_WORK_TREE').value : null;
  let gitDirRaw = commandVariables.get('GIT_DIR')?.exported ? commandVariables.get('GIT_DIR').value : null;
  const valued = new Set(['-c', '--config-env', '--exec-path', '--namespace', '--super-prefix']);
  for (let index = 1; index < words.length; index += 1) {
    const word = words[index].value;
    if (word === 'commit') {
      const workTree = workTreeRaw ? resolvePath(workTreeRaw, cwd) : null;
      const gitDir = gitDirRaw ? resolvePath(gitDirRaw, cwd) : null;
      if ((workTreeRaw && !workTree) || (gitDirRaw && !gitDir)) return unresolved(raw, cwd, 'dynamic Git target');
      if (!cwd && !workTree) return unresolved(raw, state.cwd, 'unresolved commit working directory');
      const inferred = gitDir && path.basename(gitDir).toLowerCase() === '.git' ? path.dirname(gitDir) : null;
      if (gitDir && !workTree && !inferred) return unresolved(raw, cwd, 'non-canonical Git directory target');
      return { isCommit: true, cwd: workTree || inferred || cwd, words: words.map((item) => item.value), commitIndex: index, raw };
    }
    if (['-C', '--work-tree', '--git-dir'].includes(word)) {
      const operand = words[index + 1]?.value;
      if (!literal(operand)) return unresolved(raw, cwd, `dynamic or missing ${word} target`);
      if (word === '-C') cwd = resolvePath(operand, cwd);
      if (word === '--work-tree') workTreeRaw = operand;
      if (word === '--git-dir') gitDirRaw = operand;
      index += 1; continue;
    }
    const joined = /^(--work-tree|--git-dir)=(.*)$/s.exec(word);
    if (joined) {
      if (!literal(joined[2])) return unresolved(raw, cwd, `dynamic ${joined[1]} target`);
      if (joined[1] === '--work-tree') workTreeRaw = joined[2]; else gitDirRaw = joined[2];
      continue;
    }
    if (word.startsWith('-C') && word.length > 2) { cwd = resolvePath(word.slice(2), cwd); if (!cwd) return unresolved(raw, state.cwd, 'dynamic -C target'); continue; }
    if (valued.has(word)) { if (!words[index + 1]) return unresolved(raw, cwd, `missing ${word} operand`); index += 1; continue; }
    if (word.startsWith('-')) continue;
    return null;
  }
  return null;
}
function prefixAssignments(words, state) {
  let index = 0;
  const names = [];
  const commandVariables = new Map(state.variables);
  while (index < words.length) {
    const match = ASSIGNMENT.exec(words[index].value);
    if (!match) break;
    names.push(match[1]);
    commandVariables.set(match[1], { value: literal(match[2]) ? match[2] : null, exported: true });
    index += 1;
  }
  return { index, commandVariables, names };
}
function expandCommand(words, variables) {
  if (!words.length || words[0].singleQuoted) return { words, unresolved: false };
  const match = VARIABLE_WORD.exec(words[0].value);
  if (!match) return { words, unresolved: false };
  const value = variables.get(match[1])?.value;
  if (!literal(value)) return { words, unresolved: true };
  return { words: [...shellWords(value), ...words.slice(1)], unresolved: false };
}
function unwrap(words) {
  let index = 0;
  let negations = 0;
  while (words[index]?.value === '!') { negations += 1; index += 1; }
  if (words[index]?.value === 'command') {
    index += 1;
    while (['-p', '--'].includes(words[index]?.value)) index += 1;
    if (words[index]?.value?.startsWith('-')) return { ambiguous: true, words: words.slice(index) };
  }
  if (words[index]?.value === 'exec') {
    index += 1;
    while (index < words.length) {
      const value = words[index].value;
      if (value === '--' || value === '-c' || value === '-l') { index += 1; continue; }
      if (value === '-a') { if (!words[index + 1]) return { ambiguous: true, words: words.slice(index) }; index += 2; continue; }
      if (value.startsWith('-')) return { ambiguous: true, words: words.slice(index) };
      break;
    }
  }
  if (words[index]?.value === 'time') {
    index += 1;
    while (['-p', '--'].includes(words[index]?.value)) index += 1;
    if (words[index]?.value?.startsWith('-')) return { ambiguous: true, words: words.slice(index) };
  }
  return { words: words.slice(index), ambiguous: false, negated: negations % 2 === 1 };
}
function processEnv(words, state, raw, invocations, depth) {
  let index = 1;
  let cwd = state.cwd;
  let variables = new Map([...state.variables].filter(([, item]) => item.exported));
  while (index < words.length) {
    const value = words[index].value;
    if (value === '--') { index += 1; break; }
    if (value === '-i' || value === '--ignore-environment') { variables = new Map(); index += 1; continue; }
    if (['-0', '--null', '-v', '--debug'].includes(value)) { index += 1; continue; }
    if (['-u', '--unset', '-a', '--argv0'].includes(value)) {
      if (!words[index + 1]) { invocations.push(unresolved(raw, cwd, `missing env ${value} operand`)); return; }
      if (value === '-u' || value === '--unset') variables.delete(words[index + 1].value);
      index += 2; continue;
    }
    if (value.startsWith('--unset=')) { variables.delete(value.slice(8)); index += 1; continue; }
    if (value.startsWith('--argv0=')) { index += 1; continue; }
    if (value === '-C' || value === '--chdir') { const result = directoryStatus(words[index + 1]?.value, cwd, variables); cwd = result.status === 'usable' ? result.target : null; state.alternateCwds = []; index += 2; continue; }
    if (value.startsWith('--chdir=')) { const result = directoryStatus(value.slice(8), cwd, variables); cwd = result.status === 'usable' ? result.target : null; state.alternateCwds = []; index += 1; continue; }
    const assignment = ASSIGNMENT.exec(value);
    if (assignment) { variables.set(assignment[1], { value: literal(assignment[2]) ? assignment[2] : null, exported: true }); index += 1; continue; }
    if (value.startsWith('-')) { if (commitish(words.slice(index + 1))) invocations.push(unresolved(raw, cwd, `unsupported env option ${value}`)); return; }
    break;
  }
  processSegment(words.slice(index), { cwd, alternateCwds: [...(state.alternateCwds || [])], stack: [], variables, skipNext: false, directoryChange: null, branchUnknown: false }, raw, invocations, depth + 1);
}
function processChildScript(script, state, variables, raw, invocations, depth, reason) {
  if (!script || DYNAMIC.test(script)) { invocations.push(unresolved(raw, state.cwd, reason)); return; } const child = cloneState(state);
  child.variables = new Map([...variables].filter(([, item]) => item.exported)); processTokens(shellTokens(script), child, invocations, depth + 1); }
function processScript(words, state, raw, invocations, depth, commandVariables = state.variables, prefixNames = [], negated = false) {
  const name = path.win32.basename(path.posix.basename(words[0]?.value || '')).toLowerCase();
  if (name === 'eval') {
    let script = words.slice(1).map((word) => word.value).join(' ');
    const variable = words.length === 2 ? VARIABLE_WORD.exec(script) : null;
    if (variable) script = commandVariables.get(variable[1])?.value;
    if (!script || DYNAMIC.test(script)) { invocations.push(unresolved(raw, state.cwd, 'dynamic eval script')); return true; }
    const outer = new Map(state.variables);
    const next = processTokens(shellTokens(script), { ...cloneState(state), variables: new Map(commandVariables) }, invocations, depth + 1);
    for (const name of prefixNames) {
      const before = commandVariables.get(name); const after = next.variables.get(name);
      if (before?.value === after?.value && before?.exported === after?.exported) {
        if (outer.has(name)) next.variables.set(name, outer.get(name)); else next.variables.delete(name);
      }
    }
    if (next.directoryChange) next.directoryChange.negated = Boolean(next.directoryChange.negated) !== negated;
    Object.assign(state, next); return true;
  }
  if (!['bash', 'bash.exe', 'sh', 'sh.exe'].includes(name)) return false;
  const cIndex = words.findIndex((word, index) => index > 0 && /^-[A-Za-z]*c[A-Za-z]*$/.test(word.value));
  const here = words.findIndex((word) => word.value === '<<<' || word.value.startsWith('<<<'));
  const stdinScript = here < 0 ? null : (words[here].value === '<<<' ? words[here + 1]?.value : words[here].value.slice(3));
  if (here >= 0 && cIndex < 0) {
    processChildScript(stdinScript, state, commandVariables, raw, invocations, depth, 'dynamic shell here-string');
    return true;
  }
  if (cIndex < 0) return false;
  const scriptWord = words[cIndex + 1];
  let script = scriptWord?.value;
  const variable = VARIABLE_WORD.exec(script || '');
  if (variable) {
    const item = commandVariables.get(variable[1]);
    if (scriptWord.singleQuoted && !item?.exported) return true;
    script = item?.value;
  }
  processChildScript(script, state, commandVariables, raw, invocations, depth, 'dynamic shell script');
  if (here >= 0) processChildScript(stdinScript, state, commandVariables, raw, invocations, depth, 'dynamic shell stdin');
  return true;
}
function processSegment(input, state, raw, invocations, depth) {
  if (state.skipNext) { state.skipNext = false; return; }
  if (depth > 12) { invocations.push(unresolved(raw, state.cwd, 'wrapper nesting limit')); return; }
  for (const script of commandSubstitutions(raw)) {
    if (script === null || DYNAMIC.test(script)) invocations.push(unresolved(raw, state.cwd, 'dynamic command substitution'));
    else processTokens(shellTokens(script), cloneState(state), invocations, depth + 1);
  }
  let words = input;
  const prefixed = prefixAssignments(words, state);
  if (prefixed.index === words.length) {
    for (let index = 0; index < prefixed.index; index += 1) {
      const match = ASSIGNMENT.exec(words[index].value);
      const prior = state.variables.get(match[1]);
      state.variables.set(match[1], { value: literal(match[2]) ? match[2] : null, exported: prior?.exported || false });
    }
    return;
  }
  words = words.slice(prefixed.index);
  if (words[0]?.value === 'export') {
    let exported = true;
    for (const word of words.slice(1)) {
      if (word.value === '-n') { exported = false; continue; }
      if (word.value === '-p' || word.value === '--') continue;
      const match = ASSIGNMENT.exec(word.value); const name = match?.[1] || word.value;
      const value = match?.[2] ?? state.variables.get(name)?.value;
      state.variables.set(name, { value: literal(value) ? value : null, exported });
    }
    return;
  }
  if (words[0]?.value === 'unset') {
    if (words[1]?.value === '-f') return;
    const start = ['-v', '--'].includes(words[1]?.value) ? 2 : 1;
    for (const word of words.slice(start)) state.variables.delete(word.value);
    return;
  }
  const expanded = expandCommand(words, prefixed.commandVariables);
  if (expanded.unresolved) { invocations.push(unresolved(raw, state.cwd, 'dynamic command executable')); return; }
  if (expanded.words[0]?.raw.startsWith("$'")) { invocations.push(unresolved(raw, state.cwd, 'ANSI-C quoted executable')); return; }
  if (!expanded.words[0]?.singleQuoted && DYNAMIC.test(expanded.words[0]?.value || '')) { invocations.push(unresolved(raw, state.cwd, 'composed dynamic executable')); return; }
  const wrapper = unwrap(expanded.words);
  if (wrapper.ambiguous) { if (commitish(wrapper.words || expanded.words)) invocations.push(unresolved(raw, state.cwd, 'unsupported wrapper option')); return; }
  words = wrapper.words;
  if (['if', 'then', 'elif', 'else', 'for', 'while', 'until', 'do', 'case', 'select', 'coproc'].includes(words[0]?.value) && commitish(words.slice(1))) {
    invocations.push(unresolved(raw, state.cwd, 'unsupported shell control structure')); return;
  }
  if (words[0]?.value === 'env') { processEnv(words, { ...state, variables: prefixed.commandVariables }, raw, invocations, depth); return; }
  if (processScript(words, state, raw, invocations, depth, prefixed.commandVariables, prefixed.names, wrapper.negated)) return;
  if (words[0]?.value === 'cd' || words[0]?.value === 'pushd') {
    const args = words.slice(1).filter((word) => word.value !== '--');
    let change = args.length === 1 ? directoryStatus(args[0].value, state.cwd, prefixed.commandVariables) : { status: 'unknown', target: null };
    if (state.branchUnknown || state.alternateCwds?.length) change = { status: 'unknown', target: null };
    state.directoryChange = { ...change, caller: state.cwd, pushd: words[0].value === 'pushd', negated: wrapper.negated }; return;
  }
  if (words[0]?.value === 'popd') {
    const target = words.length === 1 && state.stack.length ? state.stack.at(-1) : null;
    state.directoryChange = { status: target ? 'usable' : 'unknown', target, caller: state.cwd, popd: true, negated: wrapper.negated }; return;
  }
  const parsed = parseGit(words, state, raw, prefixed.commandVariables);
  if (parsed) {
    const candidates = [parsed, ...(state.alternateCwds || []).map((cwd) => parseGit(words, { ...state, cwd, alternateCwds: [] }, raw, prefixed.commandVariables)).filter(Boolean)];
    for (const candidate of candidates) if (!invocations.some((item) => item.raw === candidate.raw && item.cwd === candidate.cwd && item.unresolvedCommand === candidate.unresolvedCommand)) invocations.push(candidate);
  }
}
function applyOperator(state, operator) {
  const change = state.directoryChange;
  if (!change) {
    state.branchUnknown = operator === '&&' || operator === '||';
    if (operator === ';' || operator === '\n') state.branchUnknown = false;
    return state;
  }
  state.directoryChange = null;
  if (change.status === 'unknown') { state.cwd = null; state.alternateCwds = []; return state; }
  const success = change.status === 'usable';
  const conditionSuccess = change.negated ? !success : success;
  if (success && change.pushd) state.stack.push(change.caller);
  if (success && change.popd) state.stack.pop();
  if (operator === '&&') { state.cwd = success ? change.target : change.caller; state.alternateCwds = []; state.skipNext = !conditionSuccess; }
  else if (operator === '||') { state.cwd = success ? change.target : change.caller; state.alternateCwds = []; state.skipNext = conditionSuccess; }
  else if (operator === ';' || operator === '\n') { state.cwd = success ? change.target : change.caller; state.alternateCwds = [success ? change.caller : change.target].filter((cwd) => cwd && cwd !== state.cwd); }
  else state.cwd = null;
  state.branchUnknown = false;
  return state;
}
function processTokens(tokens, initial, invocations, depth = 0) {
  let state = initial;
  const scopes = [];
  for (const token of tokens) {
    if (token.type === '(') { scopes.push({ kind: 'subshell', parent: cloneState(state) }); state = cloneState(state); continue; }
    if (token.type === '{') { scopes.push({ kind: 'brace' }); continue; }
    if (token.type === ')') { const scope = scopes.pop(); if (scope?.kind === 'subshell') state = scope.parent; continue; }
    if (token.type === '}') { if (scopes.at(-1)?.kind === 'brace') scopes.pop(); continue; }
    if (token.type === 'operator') { state = applyOperator(state, token.value); continue; }
    processSegment(shellWords(token.value), state, token.value, invocations, depth);
  }
  return state;
}
export function parseGitCommitInvocations(command, baseCwd = process.cwd(), environment = process.env) {
  const invocations = [];
  const state = { cwd: path.resolve(baseCwd), alternateCwds: [], stack: [], variables: environmentVariables(environment), skipNext: false, directoryChange: null, branchUnknown: false };
  processTokens(shellTokens(command), state, invocations);
  return invocations;
}
export function parseGitCommitInvocation(command, baseCwd = process.cwd(), environment = process.env) {
  return parseGitCommitInvocations(command, baseCwd, environment)[0] || { isCommit: false, cwd: path.resolve(baseCwd), words: [], commitIndex: -1, raw: '' };
}
export function isBashGitCommit(command) { return parseGitCommitInvocations(command).length > 0; }
