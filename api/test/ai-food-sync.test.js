/* Integration tests for the Universal AI Chat Food & Calorie Sync endpoints:
   - POST /api/ai/key (requires signed-in session, mints revocable ax_ token)
   - GET /api/ai/openapi.json (OpenAPI 3.1 schema for ChatGPT Actions)
   - POST /api/ai/food-log & GET /api/ai/food-log (authenticated via Personal AI Sync Key Bearer token,
     infers category, enriches micronutrients, updates _rev/_wid, optional saveToLibrary)
   - DELETE /api/ai/key (instant revocation of existing AI Sync Key)
   - POST /api/ai/analyze-photo (graceful 503 when GEMINI_API_KEY is unset without crashing) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
const ORIGIN = 'http://localhost:8080';

const mintSession = (uid, sv = 0) => {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
};

async function startServer(t, extraEnv = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-ai-food-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [{ id: 'u1', name: 'Tester', created: new Date().toISOString() }],
    creds: [],
    subs: [],
    invites: [],
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: '0',
      DATA_DIR: dataDir,
      ORIGIN,
      RP_ID: 'localhost',
      NUTRITION_OFFLINE: '1',
      GEMINI_API_KEY: '',
      ...extraEnv,
    },
  });
  const h = { api: '', log: '', dataDir };
  child.stdout.on('data', d => { h.log += d; });
  child.stderr.on('data', d => { h.log += d; });
  t.after(() => {
    child.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  });
  h.port = await boundPort(child, () => h.log);
  h.api = `http://127.0.0.1:${h.port}`;
  return h;
}

test('Personal AI Sync Key mints, logs meals via POST /api/ai/food-log, reads summary, and revokes cleanly', async t => {
  const h = await startServer(t);
  const cookie = `gymsid=${mintSession('u1')}`;

  // 1. OpenAPI schema advertises origin & /api/ai/food-log
  const specRes = await fetch(`${h.api}/api/ai/openapi.json?origin=https://aetherix.example`);
  assert.equal(specRes.status, 200);
  const spec = await specRes.json();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.servers[0].url, 'https://aetherix.example');
  assert.ok(spec.paths['/api/ai/food-log']?.post);

  // 2. Mint Personal AI Sync Key with session cookie
  const mintRes = await fetch(`${h.api}/api/ai/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: cookie },
    body: '{}',
  });
  assert.equal(mintRes.status, 200);
  const minted = await mintRes.json();
  assert.ok(minted.key.startsWith('ax_'));

  // 3. Log meal using ONLY Bearer AI Sync Key (cross-origin external AI tool style, no Cookie, no Origin)
  const postRes = await fetch(`${h.api}/api/ai/food-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${minted.key}`,
    },
    body: JSON.stringify({
      name: 'Grilled Chicken Rice Bowl',
      kcal: 540,
      proteinG: 42,
      carbsG: 56,
      fatG: 14,
      sourceAi: 'chatgpt',
      saveToLibrary: true,
    }),
  });
  assert.equal(postRes.status, 200);
  const logged = await postRes.json();
  assert.equal(logged.ok, true);
  assert.equal(logged.entry.name, 'Grilled Chicken Rice Bowl');
  assert.equal(logged.entry.kcal, 540);
  assert.equal(logged.entry.nutrientSource, 'ai:chatgpt');
  assert.equal(logged.entry.nutrients.proteinG, 42);
  assert.ok(logged.savedFood?.id);
  assert.equal(logged.rev, 1);

  // 4. Read daily summary back with the AI Sync Key
  const getRes = await fetch(`${h.api}/api/ai/food-log?date=${logged.entry.d}`, {
    headers: { Authorization: `Bearer ${minted.key}` },
  });
  assert.equal(getRes.status, 200);
  const summary = await getRes.json();
  assert.equal(summary.eaten, 540);
  assert.equal(summary.count, 1);

  // 5. Revoke AI Sync Key -> subsequent webhook calls return 401
  const delRes = await fetch(`${h.api}/api/ai/key`, {
    method: 'DELETE',
    headers: { Origin: ORIGIN, Cookie: cookie },
  });
  assert.equal(delRes.status, 200);

  const afterRevoke = await fetch(`${h.api}/api/ai/food-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${minted.key}`,
    },
    body: JSON.stringify({ name: 'Should fail', kcal: 200 }),
  });
  assert.equal(afterRevoke.status, 401);

  // 6. Unconfigured Gemini photo analysis fails cleanly with 503 code
  const photoRes = await fetch(`${h.api}/api/ai/analyze-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ base64: 'data:image/jpeg;base64,/9j/4AAQ', mimeType: 'image/jpeg' }),
  });
  assert.equal(photoRes.status, 503);
  const photoErr = await photoRes.json();
  assert.equal(photoErr.code, 'gemini-not-configured');
});
