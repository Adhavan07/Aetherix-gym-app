import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { ensureRepo } from './scripts/ensure-repo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_PORT = Number(process.env.API_INTERNAL_PORT || 3001);
const isProd = process.env.NODE_ENV !== 'development';

const rawOrigin = (process.env.ORIGIN || process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
let rpId = process.env.RP_ID || 'localhost';
try {
  rpId = process.env.RP_ID || new URL(rawOrigin).hostname || 'localhost';
} catch {
  rpId = 'localhost';
}

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

// Spawn openGym's plain node:http API server on internal port 3001
let apiProc: ChildProcess | null = null;
function startApiServer() {
  const apiEntry = path.resolve(__dirname, 'api', 'server.js');
  apiProc = spawn(process.execPath, [apiEntry], {
    cwd: path.resolve(__dirname, 'api'),
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(API_PORT),
      DATA_DIR: dataDir,
      ORIGIN: rawOrigin,
      RP_ID: rpId,
      ALLOW_GUEST: process.env.ALLOW_GUEST ?? '1',
      PASSWORD_LOGIN: process.env.PASSWORD_LOGIN ?? '1',
      FIRST_USER_ADMIN: process.env.FIRST_USER_ADMIN ?? '1',
    },
  });
  apiProc.on('exit', (code, signal) => {
    if (!shuttingDown && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      setTimeout(startApiServer, 1000);
    }
  });
}

let shuttingDown = false;
function cleanup() {
  shuttingDown = true;
  if (apiProc && !apiProc.killed) {
    apiProc.kill('SIGTERM');
  }
}
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGINT', () => { cleanup(); process.exit(0); });

async function waitForApi(maxWaitMs = 8000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${API_PORT}/api/health`, (res) => {
        res.resume();
        resolve((res.statusCode || 500) < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 150));
  }
}

async function boot() {
  ensureRepo();
  startApiServer();
  await waitForApi();

  const app = express();
  const isHttpsPreview = /^https:/i.test(rawOrigin);

  // Single-origin reverse proxy for /api/* -> plain node:http api/server.js
  app.use('/api', (req, res) => {
    const headers = { ...req.headers };
    headers.host = `127.0.0.1:${API_PORT}`;
    if (headers.origin) {
      headers.origin = rawOrigin;
    }

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path: req.originalUrl,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const outHeaders = { ...proxyRes.headers };
        // Allow session cookies inside cross-origin HTTPS preview iframes while keeping api/server.js strict
        if (isHttpsPreview && outHeaders['set-cookie']) {
          const cookies = Array.isArray(outHeaders['set-cookie'])
            ? outHeaders['set-cookie']
            : [String(outHeaders['set-cookie'])];
          outHeaders['set-cookie'] = cookies.map((c) =>
            c.replace(/SameSite=Lax/gi, 'SameSite=None').includes('Secure')
              ? c.replace(/SameSite=Lax/gi, 'SameSite=None')
              : `${c.replace(/SameSite=Lax/gi, 'SameSite=None')}; Secure`
          );
        }
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({ error: 'API server starting up, please retry.' });
      } else {
        res.end();
      }
    });

    req.pipe(proxyReq);
  });

  // Serve licensed 180px exercise media identically to web/Dockerfile & vite.config.js
  const mediaRoots = [
    path.resolve(__dirname, 'catalogue', 'media'),
    '/tmp/opengym-upstream/catalogue/media',
  ];
  app.get('/exercise-media/:kind/:file', (req, res) => {
    const { kind, file } = req.params;
    const expectedExt = kind === 'still' ? '.webp' : kind === 'clip' ? '.mp4' : null;
    if (!expectedExt || !/^\d{4,5}\.(webp|mp4)$/.test(file) || !file.endsWith(expectedExt)) {
      res.status(404).end();
      return;
    }
    const fullPath = mediaRoots
      .map((root) => path.join(root, kind, file))
      .find((candidate) => fs.existsSync(candidate));
    if (!fullPath) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', expectedExt === '.mp4' ? 'video/mp4' : 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
  });

  const httpServer = http.createServer(app);

  if (!isProd) {
    const enableHmr = process.env.ENABLE_HMR === 'true' && process.env.DISABLE_HMR !== 'true';
    const frontendVitePath = path.resolve(__dirname, 'frontend', 'node_modules', 'vite', 'dist', 'node', 'index.js');
    const viteMod = fs.existsSync(frontendVitePath)
      ? await import(pathToFileURL(frontendVitePath).href)
      : await import('vite');
    const vite = await viteMod.createServer({
      root: path.resolve(__dirname, 'frontend'),
      configFile: path.resolve(__dirname, 'frontend', 'vite.config.js'),
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: enableHmr ? { server: httpServer } : false,
        ws: enableHmr ? { server: httpServer } : false,
        watch: enableHmr ? {} : null,
      },
      appType: 'spa',
    });

    // Ensure no stale service worker intercepts unhashed Vite dev modules.
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(
        "self.addEventListener('install', () => self.skipWaiting());\n" +
        "self.addEventListener('activate', (e) => e.waitUntil(" +
        "caches.delete('opengym-rt-__BUILD__').then(() => self.registration.unregister())" +
        "));\n"
      );
    });

    if (!enableHmr) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const result = await vite.transformRequest('/@vite/client');
          if (!result?.code) {
            next();
            return;
          }
          const patched = result.code
            .replace(/const hmrPort = [^;]+;/g, 'const hmrPort = null;')
            .replace(
              /transport\.connect\(createHMRHandler\(handleMessage\)\);?/g,
              '/* HMR disabled */'
            );
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.status(200).send(patched);
        } catch (err) {
          next(err);
        }
      });
    }

    app.use(vite.middlewares);
    vite.warmupRequest?.('/src/main.jsx')?.catch(() => {});
  } else {
    const distDir = path.resolve(__dirname, 'frontend', 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Aetherix server listening on http://0.0.0.0:${PORT} (API on 127.0.0.1:${API_PORT})`);
  });
}

boot().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
