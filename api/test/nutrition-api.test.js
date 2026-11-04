/* Integration tests for GET /api/nutrition/search and POST /api/nutrition/analyze
   against api/server.js over real HTTP, covering:
   - Offline curated IFCT/USDA dataset fallback
   - USDA FoodData Central v1 public API mapping + disk cache
   - Edamam Nutrition Analysis & Food Database v2 API mapping
   - Nutritionix Track v2 Natural Language & Instant Search API mapping */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startMockUpstream(t) {
  let hits = { usda: 0, edamamAnalyze: 0, edamamSearch: 0, nxAnalyze: 0, nxSearch: 0 };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    res.setHeader('Content-Type', 'application/json');

    if (u.pathname === '/fdc/v1/foods/search') {
      hits.usda++;
      res.end(JSON.stringify({
        foods: [
          {
            fdcId: 170567,
            description: 'Quinoa, cooked',
            dataType: 'SR Legacy',
            foodMeasures: [{ disseminationText: '1 cup', gramWeight: 185, rank: 1 }],
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', unitName: 'KCAL', value: 120 },
              { nutrientId: 1003, nutrientNumber: '203', unitName: 'G', value: 4.4 },
              { nutrientId: 1005, nutrientNumber: '205', unitName: 'G', value: 21.3 },
              { nutrientId: 1004, nutrientNumber: '204', unitName: 'G', value: 1.92 },
              { nutrientId: 1079, nutrientNumber: '291', unitName: 'G', value: 2.8 },
              { nutrientId: 2000, nutrientNumber: '269', unitName: 'G', value: 0.87 },
              { nutrientId: 1258, nutrientNumber: '606', unitName: 'G', value: 0.23 },
              { nutrientId: 1087, nutrientNumber: '301', unitName: 'MG', value: 17 },
              { nutrientId: 1089, nutrientNumber: '303', unitName: 'MG', value: 1.49 },
              { nutrientId: 1090, nutrientNumber: '304', unitName: 'MG', value: 64 },
              { nutrientId: 1092, nutrientNumber: '306', unitName: 'MG', value: 172 },
              { nutrientId: 1093, nutrientNumber: '307', unitName: 'MG', value: 7 },
              { nutrientId: 1095, nutrientNumber: '309', unitName: 'MG', value: 1.09 },
              { nutrientId: 1106, nutrientNumber: '320', unitName: 'UG', value: 1 },
              { nutrientId: 1162, nutrientNumber: '401', unitName: 'MG', value: 0 },
              { nutrientId: 1114, nutrientNumber: '328', unitName: 'UG', value: 0 },
              { nutrientId: 1178, nutrientNumber: '418', unitName: 'UG', value: 0 },
              { nutrientId: 1253, nutrientNumber: '601', unitName: 'MG', value: 0 },
            ],
          },
        ],
      }));
      return;
    }

    if (u.pathname === '/api/nutrition-data') {
      hits.edamamAnalyze++;
      res.end(JSON.stringify({
        calories: 390,
        totalNutrients: {
          ENERC_KCAL: { quantity: 390 },
          PROCNT: { quantity: 32.4 },
          CHOCDF: { quantity: 24.0 },
          FIBTG: { quantity: 6.5 },
          SUGAR: { quantity: 3.1 },
          FAT: { quantity: 18.2 },
          FASAT: { quantity: 3.4 },
          NA: { quantity: 410 },
          K: { quantity: 780 },
          CA: { quantity: 95 },
          FE: { quantity: 3.2 },
          MG: { quantity: 72 },
          ZN: { quantity: 2.1 },
          VITA_RAE: { quantity: 140 },
          VITC: { quantity: 18.5 },
          VITD: { quantity: 4.8 },
          VITB12: { quantity: 2.7 },
          CHOLE: { quantity: 195 },
        },
        ingredients: [
          {
            parsed: [
              {
                foodId: 'food_salmon',
                foodMatch: 'Atlantic salmon',
                quantity: 1,
                measure: 'fillet',
                nutrients: { ENERC_KCAL: { quantity: 390 }, PROCNT: { quantity: 32.4 } },
              },
            ],
          },
        ],
      }));
      return;
    }

    if (u.pathname === '/api/food-database/v2/parser') {
      hits.edamamSearch++;
      res.end(JSON.stringify({
        parsed: [],
        hints: [
          {
            food: {
              foodId: 'ed_chia',
              label: 'Chia Seeds',
              nutrients: { ENERC_KCAL: 486, PROCNT: 16.5, CHOCDF: 42.1, FAT: 30.7, FIBTG: 34.4, CA: 631, FE: 7.7 },
            },
            measures: [{ label: 'Tablespoon', weight: 28 }],
          },
        ],
      }));
      return;
    }

    if (u.pathname === '/v2/natural/nutrients') {
      hits.nxAnalyze++;
      res.end(JSON.stringify({
        foods: [
          {
            food_name: 'turkey breast',
            serving_qty: 1,
            serving_unit: 'slice',
            serving_weight_grams: 85,
            nf_calories: 125,
            nf_protein: 25.6,
            nf_total_carbohydrate: 0,
            nf_dietary_fiber: 0,
            nf_sugars: 0,
            nf_total_fat: 1.8,
            nf_saturated_fat: 0.5,
            nf_sodium: 185,
            nf_potassium: 245,
            nf_cholesterol: 68,
            full_nutrients: [
              { attr_id: 301, value: 14 },
              { attr_id: 303, value: 1.2 },
              { attr_id: 304, value: 27 },
              { attr_id: 309, value: 1.8 },
              { attr_id: 418, value: 1.4 },
            ],
          },
        ],
      }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'unknown mock route' }));
  });

  await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
  t.after(() => srv.close());
  const { port } = srv.address();
  return { base: `http://127.0.0.1:${port}`, hits };
}

async function startServer(t, extraEnv = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-nutri-api-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [],
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

test('offline curated dataset search & multi-item meal analysis work without network', async t => {
  const h = await startServer(t, { NUTRITION_OFFLINE: '1' });
  const searchRes = await fetch(`${h.api}/api/nutrition/search?q=doasa&limit=5`);
  assert.equal(searchRes.status, 200);
  const searchBody = await searchRes.json();
  assert.equal(searchBody.items[0].id, 'dosa');
  assert.equal(searchBody.items[0].name, 'Plain Dosa');

  const analyzeRes = await fetch(`${h.api}/api/nutrition/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ query: '3 doasa and fish curry', qty: 1 }),
  });
  assert.equal(analyzeRes.status, 200);
  const body = await analyzeRes.json();
  assert.equal(body.matched, true);
  assert.equal(body.estimatedKcal, 644);
  assert.equal(body.items.length, 2);
  assert.ok(body.nutrients.proteinG > 30);
  assert.ok(body.nutrients.vitB12Mcg > 3);
});

test('USDA FoodData Central public API integration fetches macro & micronutrients and caches on disk', async t => {
  const mock = await startMockUpstream(t);
  const h = await startServer(t, {
    NUTRITION_OFFLINE: '',
    USDA_API_BASE: mock.base,
    USDA_API_KEY: 'DEMO_KEY',
    EDAMAM_APP_ID: '',
    EDAMAM_APP_KEY: '',
    NUTRITIONIX_APP_ID: '',
    NUTRITIONIX_API_KEY: '',
  });

  const r1 = await fetch(`${h.api}/api/nutrition/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ query: 'quinoa', qty: 1 }),
  });
  assert.equal(r1.status, 200);
  const b1 = await r1.json();
  assert.equal(b1.matched, true);
  assert.equal(b1.source, 'usda');
  assert.equal(b1.provider, 'usda');
  // 1 cup = 185g -> 120 * 1.85 = 222 kcal; protein 4.4 * 1.85 = 8.1g; iron 1.49 * 1.85 = 2.8mg; magnesium 64 * 1.85 = 118mg
  assert.equal(b1.estimatedKcal, 222);
  assert.equal(b1.unitLabel, 'cup');
  assert.equal(b1.nutrients.proteinG, 8.1);
  assert.equal(b1.nutrients.ironMg, 2.8);
  assert.equal(b1.nutrients.magnesiumMg, 118);
  assert.equal(mock.hits.usda, 1);

  // Second call hits persistent disk cache without calling upstream again
  const r2 = await fetch(`${h.api}/api/nutrition/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ query: 'quinoa', qty: 1 }),
  });
  assert.equal(r2.status, 200);
  assert.equal(mock.hits.usda, 1);
  assert.ok(fs.existsSync(path.join(h.dataDir, 'nutrition-cache.json')));
});

test('Edamam and Nutritionix API adapters map full macro and micronutrient profiles when configured', async t => {
  const mock = await startMockUpstream(t);

  // 1. Edamam configured
  const edServer = await startServer(t, {
    NUTRITION_OFFLINE: '',
    EDAMAM_API_BASE: mock.base,
    EDAMAM_APP_ID: 'test-ed-id',
    EDAMAM_APP_KEY: 'test-ed-key',
  });
  const edRes = await fetch(`${edServer.api}/api/nutrition/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ query: '1 atlantic salmon fillet', qty: 1 }),
  });
  assert.equal(edRes.status, 200);
  const edBody = await edRes.json();
  assert.equal(edBody.provider, 'edamam');
  assert.equal(edBody.estimatedKcal, 390);
  assert.equal(edBody.nutrients.proteinG, 32.4);
  assert.equal(edBody.nutrients.vitDMcg, 4.8);
  assert.equal(edBody.nutrients.vitB12Mcg, 2.7);
  assert.equal(edBody.nutrients.potassiumMg, 780);

  const edSearch = await fetch(`${edServer.api}/api/nutrition/search?q=chia&limit=5`);
  const edSearchBody = await edSearch.json();
  assert.ok(edSearchBody.items.some(x => x.source === 'edamam' && x.name === 'Chia Seeds'));

  // 2. Nutritionix configured
  const nxServer = await startServer(t, {
    NUTRITION_OFFLINE: '',
    NUTRITIONIX_API_BASE: mock.base,
    NUTRITIONIX_APP_ID: 'test-nx-id',
    NUTRITIONIX_API_KEY: 'test-nx-key',
  });
  const nxRes = await fetch(`${nxServer.api}/api/nutrition/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8080' },
    body: JSON.stringify({ query: '1 slice turkey breast', qty: 1 }),
  });
  assert.equal(nxRes.status, 200);
  const nxBody = await nxRes.json();
  assert.equal(nxBody.provider, 'nutritionix');
  assert.equal(nxBody.estimatedKcal, 125);
  assert.equal(nxBody.nutrients.proteinG, 25.6);
  assert.equal(nxBody.nutrients.zincMg, 1.8);
  assert.equal(nxBody.nutrients.vitB12Mcg, 1.4);
});
