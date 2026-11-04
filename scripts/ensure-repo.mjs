import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPSTREAM_URL = 'https://github.com/DuarteSantos8/openGym';
const CACHE_DIR = '/tmp/opengym-upstream';

const REMOVED_PREFIXES = [
  '.git/',
  'catalogue/',
  'mcp/',
  'api/integrations/',
  'frontend/src/seasonal/',
];

const REMOVED_FILES = new Set([
  'api/scripts/build-wrapped-copy.mjs',
  'api/test/integrations.test.js',
  'api/test/server-integrations.test.js',
  'api/test/server-wrapped-push.test.js',
  'api/test/wrapped.test.js',
  'api/wrapped-copy.js',
  'api/wrapped.js',
  'docs/INTEGRATIONS.md',
  'frontend/src/components/Seasonal.jsx',
  'frontend/src/components/Seasonal.lazy.test.jsx',
  'frontend/src/components/Wrapped.css',
  'frontend/src/components/Wrapped.jsx',
  'frontend/src/components/Wrapped.test.jsx',
  'frontend/src/components/WrappedEntry.jsx',
  'frontend/src/lib/advent.js',
  'frontend/src/lib/advent.test.js',
  'frontend/src/lib/integrations.js',
  'frontend/src/lib/integrations.test.js',
  'frontend/src/lib/seasonal.js',
  'frontend/src/lib/seasonal.test.js',
  'frontend/src/lib/wrapped-cards.js',
  'frontend/src/lib/wrapped-cards.test.js',
  'frontend/src/lib/wrapped-copy.js',
  'frontend/src/lib/wrapped-notify.js',
  'frontend/src/lib/wrapped-ui.js',
  'frontend/src/lib/wrapped.js',
  'frontend/src/lib/wrapped.test.js',
  'frontend/src/views/Integrations.jsx',
  'frontend/src/views/Integrations.test.jsx',
  'frontend/src/views/Settings.themes.test.jsx',
]);

function isRemoved(relPath) {
  const norm = relPath.split(path.sep).join('/');
  if (REMOVED_FILES.has(norm)) return true;
  return REMOVED_PREFIXES.some((p) => norm === p.slice(0, -1) || norm.startsWith(p));
}

function copyMissing(srcDir, dstDir, relBase = '') {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (isRemoved(rel)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      copyMissing(srcPath, dstPath, rel);
    } else if (entry.isFile() && !fs.existsSync(dstPath)) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function ensureNodeModulesLinks() {
  const rootNm = path.join(ROOT, 'node_modules');
  if (!fs.existsSync(rootNm)) return;
  for (const sub of ['frontend', 'api']) {
    const subDir = path.join(ROOT, sub);
    const targetNm = path.join(subDir, 'node_modules');
    if (fs.existsSync(subDir) && !fs.existsSync(targetNm)) {
      try {
        fs.symlinkSync('../node_modules', targetNm, 'dir');
      } catch {
        // Ignore if symlink already exists or filesystem disallows symlinks
      }
    }
  }
}

export function ensureRepo() {
  const hasFrontend =
    fs.existsSync(path.join(ROOT, 'frontend', 'vite.config.js')) &&
    fs.existsSync(path.join(ROOT, 'frontend', 'src', 'main.jsx')) &&
    fs.existsSync(path.join(ROOT, 'frontend', 'public', 'sw.js'));
  const hasDocs = fs.existsSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'));

  if (!hasFrontend || !hasDocs) {
    if (!fs.existsSync(path.join(CACHE_DIR, 'frontend', 'vite.config.js'))) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      execFileSync('git', ['clone', '--depth', '1', UPSTREAM_URL, CACHE_DIR], {
        stdio: 'inherit',
      });
    }
    copyMissing(CACHE_DIR, ROOT);
  }

  ensureNodeModulesLinks();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureRepo();
}
