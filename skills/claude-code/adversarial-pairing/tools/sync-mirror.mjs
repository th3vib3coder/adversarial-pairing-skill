import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect all .md files under `dir`, excluding any path that
 * starts with `excludeDir` (normalised, with trailing sep).
 * Returns an array of absolute file paths.
 */
function collectMdFiles(dir, excludeDir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the mirror subtree to avoid infinite recursion
      if (fullPath === excludeDir || fullPath.startsWith(excludeDir + path.sep)) {
        continue;
      }
      results.push(...collectMdFiles(fullPath, excludeDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Ensure all ancestor directories of `filePath` exist.
 */
function mkdirpSync(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: sync-mirror.mjs <project-root> [--check]');
    process.exit(2);
  }

  const checkMode = args.includes('--check');
  const projectRoot = args.find(a => !a.startsWith('--'));

  if (!projectRoot) {
    console.error('Error: <project-root> argument is required.');
    process.exit(2);
  }

  const wikiDir = path.resolve(projectRoot, 'wiki');
  const mirrorDir = path.join(wikiDir, 'mirror');

  // Guard: wiki/ must exist when not in check mode (it may just be empty)
  if (!fs.existsSync(wikiDir)) {
    if (checkMode) {
      console.error('DRIFT: wiki/ directory does not exist.');
      process.exit(1);
    }
    // Nothing to sync
    process.exit(0);
  }

  const sourceFiles = collectMdFiles(wikiDir, mirrorDir);

  if (checkMode) {
    // --check: compare source vs mirror, exit 1 on any mismatch
    let drifted = false;

    for (const srcPath of sourceFiles) {
      const relPath = path.relative(wikiDir, srcPath);
      const tgtPath = path.join(mirrorDir, relPath);

      if (!fs.existsSync(tgtPath)) {
        console.error(`DRIFT: mirror missing file: ${relPath}`);
        drifted = true;
        continue;
      }

      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const tgtContent = fs.readFileSync(tgtPath, 'utf8');
      if (srcContent !== tgtContent) {
        console.error(`DRIFT: content mismatch for: ${relPath}`);
        drifted = true;
      }
    }

    // Also flag mirror files that have no counterpart in source
    if (fs.existsSync(mirrorDir)) {
      const mirrorFiles = collectMdFiles(mirrorDir, path.join(mirrorDir, '__none__'));
      for (const tgtPath of mirrorFiles) {
        const relPath = path.relative(mirrorDir, tgtPath);
        const srcPath = path.join(wikiDir, relPath);
        if (!fs.existsSync(srcPath)) {
          console.error(`DRIFT: mirror has extra file: ${relPath}`);
          drifted = true;
        }
      }
    }

    if (drifted) {
      process.exit(1);
    }
    process.exit(0);
  }

  // Default mode: sync source → mirror
  for (const srcPath of sourceFiles) {
    const relPath = path.relative(wikiDir, srcPath);
    const tgtPath = path.join(mirrorDir, relPath);
    mkdirpSync(tgtPath);
    const content = fs.readFileSync(srcPath, 'utf8');
    fs.writeFileSync(tgtPath, content, 'utf8');
  }

  console.log(`sync-mirror: synced ${sourceFiles.length} file(s) → ${mirrorDir}`);
  process.exit(0);
}

main();
