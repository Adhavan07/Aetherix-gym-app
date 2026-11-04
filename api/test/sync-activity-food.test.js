/* Two devices syncing activities, food library, daily food log, and calorieTarget over real HTTP
   against api/server.js: optimistic concurrency (`baseRev` -> 409 Conflict + current document),
   field-level `_f` merge, per-setting `edited` stamp merge, and `deleted` tombstones. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';
import { mergeStates, stampChange } from '../../frontend/src/lib/sync-merge.js';
import { buildActivity, dailyActivitySummary } from '../../frontend/src/lib/activities.js';
import { buildFoodItem, buildFoodLogEntry, dailyNutritionSummary } from '../../frontend/src/lib/nutrition.js';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
const clone = x => JSON.parse(JSON.stringify(x));

function mintSession(uid, sv = 0) {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

const headers = uid => ({
  Cookie: `gymsid=${mintSession(uid)}`,
  Origin: 'http://localhost:8080',
  'Content-Type': 'application/json',
});

async function startServer(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-sync-af-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [{ id: 'u_sync_1', name: 'SyncUser', created: new Date().toISOString() }],
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
      ORIGIN: 'http://localhost:8080',
      RP_ID: 'localhost',
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

function emptyProfile() {
  return {
    unit: 'kg',
    workouts: [],
    routines: [],
    bodyweight: [{ d: '2026-11-01', w: 72, t: 900 }],
    activities: [],
    calorieTarget: null,
    foods: [],
    foodLog: [],
  };
}

test('two offline devices converge without loss across activities, foods, foodLog, and calorieTarget on 409 conflict', async t => {
  const h = await startServer(t);
  const uid = 'u_sync_1';
  const get = async () => {
    const r = await fetch(`${h.api}/api/data`, { headers: headers(uid) });
    return { status: r.status, body: await r.json() };
  };
  const put = async body => {
    const r = await fetch(`${h.api}/api/data`, {
      method: 'PUT',
      headers: headers(uid),
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  };

  // Seed initial shared baseline at rev 1 with one activity, one food item, and one old food log entry
  const seed = emptyProfile();
  const prevSeed = clone(seed);
  seed.activities = [
    buildActivity({
      id: 'act-shared',
      name: 'Badminton',
      sportKey: 'badminton',
      d: '2026-11-03',
      durationMin: 45,
      mode: 'met',
      met: 5.5,
      at: 1000,
    }, seed).activity,
  ];
  seed.foods = [
    buildFoodItem({
      id: 'food-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      fav: false,
      at: 1000,
    }).food,
  ];
  seed.foodLog = [
    buildFoodLogEntry({
      id: 'log-stale',
      d: '2026-11-02',
      foodId: 'food-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 2,
      at: 1000,
    }).entry,
  ];
  seed._ts = stampChange(prevSeed, seed, 1000);

  const initRes = await put({ state: seed, baseRev: 0, stamped: true });
  assert.equal(initRes.status, 200);
  assert.equal(initRes.body.rev, 1);

  // Both Device A and Device B pull rev 1 before going offline
  const pullA = await get();
  const pullB = await get();
  assert.equal(pullA.body.rev, 1);
  assert.equal(pullB.body.rev, 1);

  const devA = clone(pullA.body.state);
  const baseRevA = pullA.body.rev;
  const devB = clone(pullB.body.state);
  const baseRevB = pullB.body.rev;

  // Device A offline edits (wall = 2000):
  // - Sets daily calorieTarget = 1800
  // - Stars Idli (fav = true)
  // - Logs Idli x 3 = 150 kcal on 2026-11-03
  // - Logs Football (60 min, MET 7.0 * 72 kg * 1 h = 504 kcal) on 2026-11-03
  // - Adds a note to act-shared
  {
    const before = clone(devA);
    devA.calorieTarget = 1800;
    devA.foods[0].fav = true;
    devA.foods[0].category = 'Breakfast';
    devA.foodLog.push(buildFoodLogEntry({
      id: 'log-idli-3',
      d: '2026-11-03',
      foodId: 'food-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 3,
      at: 2000,
    }).entry);
    devA.activities.push(buildActivity({
      id: 'act-football',
      name: 'Football',
      sportKey: 'football',
      d: '2026-11-03',
      durationMin: 60,
      mode: 'met',
      met: 7.0,
      at: 2000,
    }, devA).activity);
    devA.activities.find(a => a.id === 'act-shared').note = 'Doubles court 2';
    devA._ts = stampChange(before, devA, 2000);
  }

  // Device B offline edits (wall = 3000):
  // - Updates act-shared durationMin to 60 and kcal to 297 (MET 5.5 * 72 * 1)
  // - Updates food-idli kcalPerUnit to 55
  // - Adds new food "Sambar" (130 kcal / bowl) and logs Sambar x 1 on 2026-11-03
  // - Deletes log-stale from 2026-11-02
  {
    const before = clone(devB);
    const sharedAct = devB.activities.find(a => a.id === 'act-shared');
    sharedAct.durationMin = 60;
    sharedAct.kcal = 297;
    devB.foods[0].kcalPerUnit = 55;
    const sambar = buildFoodItem({
      id: 'food-sambar',
      name: 'Sambar',
      category: 'Lunch',
      unitLabel: 'bowl',
      kcalPerUnit: 130,
      fav: false,
      at: 3000,
    }).food;
    devB.foods.push(sambar);
    devB.foodLog = devB.foodLog.filter(e => e.id !== 'log-stale');
    devB.foodLog.push(buildFoodLogEntry({
      id: 'log-sambar-1',
      d: '2026-11-03',
      foodId: 'food-sambar',
      name: 'Sambar',
      unitLabel: 'bowl',
      kcalPerUnit: 130,
      qty: 1,
      at: 3000,
    }).entry);
    devB._ts = stampChange(before, devB, 3000);
  }

  // Device A reconnects first and pushes against baseRev 1 -> 200 OK (rev 2)
  const pushA = await put({ state: devA, baseRev: baseRevA, stamped: true });
  assert.equal(pushA.status, 200);
  assert.equal(pushA.body.rev, 2);

  // Device B reconnects and pushes against stale baseRev 1 -> 409 Conflict with server state at rev 2
  const conflictB = await put({ state: devB, baseRev: baseRevB, stamped: true });
  assert.equal(conflictB.status, 409);
  assert.equal(conflictB.body.rev, 2);
  assert.ok(conflictB.body.state);

  // Device B merges its local copy with the 409 server document and retries against conflictB.body.rev
  const mergedOnB = mergeStates(devB, conflictB.body.state);
  const retryB = await put({ state: mergedOnB, baseRev: conflictB.body.rev, stamped: true });
  assert.equal(retryB.status, 200);
  assert.equal(retryB.body.rev, 3);

  // Device A pulls rev 3 and sees the exact converged document
  const finalPullA = await get();
  assert.equal(finalPullA.status, 200);
  assert.equal(finalPullA.body.rev, 3);
  const converged = finalPullA.body.state;

  // 1. calorieTarget from Device A survived Device B's newer write
  assert.equal(converged.calorieTarget, 1800);

  // 2. Shared activity kept BOTH Device A's note AND Device B's updated duration/kcal, plus Football from A
  assert.equal(converged.activities.length, 2);
  const convSharedAct = converged.activities.find(a => a.id === 'act-shared');
  assert.equal(convSharedAct.note, 'Doubles court 2');
  assert.equal(convSharedAct.durationMin, 60);
  assert.equal(convSharedAct.kcal, 297);
  const actDay = dailyActivitySummary(converged, '2026-11-03');
  assert.equal(actDay.kcal, 297 + 504);

  // 3. Shared food item kept Device A's fav: true + category: 'Breakfast' AND Device B's kcalPerUnit: 55, plus Sambar ('Lunch')
  assert.equal(converged.foods.length, 2);
  const convIdli = converged.foods.find(f => f.id === 'food-idli');
  assert.equal(convIdli.fav, true);
  assert.equal(convIdli.category, 'Breakfast');
  assert.equal(convIdli.kcalPerUnit, 55);
  assert.equal(converged.foods.find(f => f.id === 'food-sambar').category, 'Lunch');

  // 4. Stale log entry deleted on Device B stayed deleted, while both new 2026-11-03 logs survived
  assert.equal(converged.foodLog.some(e => e.id === 'log-stale'), false);
  const foodDay = dailyNutritionSummary(converged, '2026-11-03');
  assert.equal(foodDay.count, 2);
  assert.equal(foodDay.eaten, 150 + 130);
  assert.equal(foodDay.remaining, 1800 - 280);
});
