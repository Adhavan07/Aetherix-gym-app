// Shared server-side Universal AI Food & Calorie Sync bridge for both api/server.js and api/vercel.js.
// Handles:
//   - Scoped Personal AI Sync Key minting & HMAC + revocable-key-id verification
//   - Category inference & meal nutrition enrichment (merging AI macros with USDA/IFCT micronutrients)
//   - Appending AI-logged meals safely into user state (`foodLog` + optional `foods` + `_rev`/`_wid`)
//   - Dynamic OpenAPI 3.1 schema generation for ChatGPT Custom GPT Actions & external AI tools
//   - Server-side food photo analysis via `@google/genai` (`gemini-4-hydrogen`)
import crypto from 'node:crypto';
import { analyzeMealNutrition } from './nutrition-engine.mjs';

export const FOOD_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Protein', 'Drinks', 'General'];

export const NUTRIENT_KEYS = [
  'proteinG', 'carbsG', 'fatG', 'fiberG', 'sugarG', 'satFatG',
  'sodiumMg', 'potassiumMg', 'calciumMg', 'ironMg', 'magnesiumMg', 'zincMg',
  'vitAMcg', 'vitCMg', 'vitDMcg', 'vitB12Mcg', 'cholesterolMg',
];

const AI_PROVIDERS = {
  gemini: 'gemini',
  google: 'gemini',
  chatgpt: 'chatgpt',
  openai: 'chatgpt',
  gpt: 'chatgpt',
  grok: 'grok',
  xai: 'grok',
  claude: 'claude',
  anthropic: 'claude',
};

const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const r0 = n => Math.round(Number(n) || 0);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIsoInTz(tz) {
  try {
    if (tz && typeof tz === 'string') {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')?.value;
      const m = parts.find(p => p.type === 'month')?.value;
      const d = parts.find(p => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    }
  } catch {
    // Fallback to UTC ISO date
  }
  return new Date().toISOString().slice(0, 10);
}

export function normalizeCategory(raw) {
  const s = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
  if (!s) return 'General';
  const exact = FOOD_CATEGORIES.find(c => c.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const low = s.toLowerCase();
  if (/breakfast|morning|brunch/.test(low)) return 'Breakfast';
  if (/lunch|midday|noon/.test(low)) return 'Lunch';
  if (/dinner|supper|evening meal/.test(low)) return 'Dinner';
  if (/snack|dessert|fruit|sweet|treat/.test(low)) return 'Snacks';
  if (/protein|supplement|post.?workout/.test(low)) return 'Protein';
  if (/drink|beverage|coffee|tea|juice|smoothie|shake/.test(low)) return 'Drinks';
  return s.slice(0, 32);
}

export function inferFoodCategory(name = '', explicitCategory = '', hourHint = null) {
  const explicit = normalizeCategory(explicitCategory);
  if (explicit && explicit !== 'General') return explicit;

  const text = String(name || '').toLowerCase();
  if (/\b(whey|casein|protein\s*shake|protein\s*bar|protein\s*scoop|boiled\s*egg|egg\s*white|chicken\s*breast|grilled\s*chicken|salmon|tuna|prawns|shrimp|tofu|soya\s*chunks|greek\s*yogurt|skyr)\b/.test(text)) {
    return 'Protein';
  }
  if (/\b(coffee|espresso|americano|latte|cappuccino|chai|tea|matcha|milk|lassi|buttermilk|chaas|coconut\s*water|juice|smoothie|soda|cola|shake)\b/.test(text)) {
    return 'Drinks';
  }
  if (/\b(idli|dosa|doasa|upma|pongal|poha|oats|oatmeal|porridge|pancake|waffle|cereal|toast|bagel|muffin|omelette|omelet|scrambled\s*eggs|paratha|breakfast)\b/.test(text)) {
    return 'Breakfast';
  }
  if (/\b(banana|apple|orange|mango|papaya|berries|grapes|dates|avocado|almond|almonds|walnut|walnuts|peanut|peanuts|cashew|cashews|nuts|chips|cookie|biscuit|chocolate|popcorn|vada|samosa|snack|bar)\b/.test(text)) {
    return 'Snacks';
  }
  if (/\b(biryani|rice|curry|dal|daal|rajma|chole|sambar|pasta|spaghetti|noodles|ramen|pizza|burger|sandwich|wrap|burrito|taco|salad|bowl|steak|roti|chapati|naan|parotta|soup|thali)\b/.test(text)) {
    if (typeof hourHint === 'number' && Number.isFinite(hourHint)) {
      return hourHint >= 16 || hourHint < 5 ? 'Dinner' : 'Lunch';
    }
    return 'Lunch';
  }
  return explicit || 'General';
}

export function normalizeAiProvider(raw) {
  const low = String(raw || '').trim().toLowerCase();
  if (!low) return 'external';
  for (const [k, v] of Object.entries(AI_PROVIDERS)) {
    if (low === k || low.includes(k)) return v;
  }
  return low.replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'external';
}

/* ---------- Scoped Personal AI Sync Key (Signed + Revocable Key ID) ---------- */

export function mintAiSyncKey(userId, secret) {
  if (!userId || !secret) throw new Error('userId and secret required');
  const keyId = crypto.randomBytes(8).toString('hex');
  const createdAt = Date.now();
  const payload = Buffer.from(JSON.stringify({ uid: userId, kid: keyId, typ: 'ai', iat: createdAt }), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`ai:${payload}`).digest('base64url');
  const key = `ax_${payload}.${sig}`;
  return {
    key,
    keyId,
    createdAt,
    preview: `ax_••••${sig.slice(-6)}`,
  };
}

export function verifyAiSyncKey(rawToken, secret, { findUser, requireUserMatch = false } = {}) {
  const token = String(rawToken || '').trim();
  if (!token.startsWith('ax_') || !secret) return null;
  const body = token.slice(3);
  const dot = body.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = body.slice(0, dot);
  const sig = body.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(`ai:${payloadB64}`).digest('base64url');
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (parsed?.typ !== 'ai' || !parsed?.uid || !parsed?.kid) return null;

    const user = typeof findUser === 'function' ? findUser(parsed.uid) : null;
    if (requireUserMatch && !user) return null;
    if (user) {
      if (user.disabled) return null;
      if (!user.aiKeyId || user.aiKeyId !== parsed.kid) return null;
      return user;
    }
    return { id: parsed.uid, name: 'Aetherix User', aiKeyId: parsed.kid };
  } catch {
    return null;
  }
}

export function extractAiKeyFromRequest(req, urlObj = null) {
  const auth = String(req?.headers?.authorization || '');
  if (/^Bearer\s+/i.test(auth)) {
    const tok = auth.replace(/^Bearer\s+/i, '').trim();
    if (tok.startsWith('ax_')) return tok;
  }
  const hdrKey = String(req?.headers?.['x-aetherix-key'] || req?.headers?.['x-api-key'] || '').trim();
  if (hdrKey.startsWith('ax_')) return hdrKey;
  const qKey = urlObj?.searchParams?.get('key') || urlObj?.searchParams?.get('ai_key') || '';
  if (String(qKey).startsWith('ax_')) return String(qKey).trim();
  return null;
}

/* ---------- Nutrient Normalization & Enrichment ---------- */

function pickNum(...candidates) {
  for (const c of candidates) {
    if (c === null || c === undefined || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

function scaleNutrientsObj(nutrients = {}, factor = 1) {
  const out = {};
  const mult = Number.isFinite(Number(factor)) && Number(factor) >= 0 ? Number(factor) : 1;
  for (const key of NUTRIENT_KEYS) {
    const v = (Number(nutrients?.[key]) || 0) * mult;
    out[key] = (key.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(key)) || key === 'vitAMcg'
      ? r0(v)
      : r1(v);
  }
  return out;
}

export async function enrichAiFoodPayload(raw = {}, dataDir = '/tmp', defaultTz = null) {
  const itemsList = Array.isArray(raw.items) ? raw.items.filter(x => x && typeof x === 'object') : [];
  let name = String(raw.name || raw.food || raw.meal || raw.title || raw.query || '').trim();
  if (!name && itemsList.length > 0) {
    name = itemsList.map(it => String(it.name || it.food || '').trim()).filter(Boolean).join(' + ');
  }
  name = name.replace(/\s+/g, ' ').slice(0, 80).trim();
  if (!name) {
    return { error: 'Meal name is required (e.g., "Grilled Chicken Rice Bowl").' };
  }

  const rawQty = pickNum(raw.qty, raw.quantity, raw.servings);
  const qty = rawQty && rawQty >= 0.1 ? Math.min(100, Math.round(rawQty * 100) / 100) : 1;

  const rawUnit = String(raw.unitLabel || raw.unit || raw.servingUnit || raw.serving || '').trim();
  const unitLabel = (rawUnit || 'serving').slice(0, 24);

  const explicitKcalPerUnit = pickNum(raw.kcalPerUnit, raw.kcal_per_unit, raw.caloriesPerUnit, raw.calories_per_serving);
  const rawTotalKcal = pickNum(raw.kcal, raw.calories, raw.energy);

  const srcMacros = {
    ...(raw.nutrients && typeof raw.nutrients === 'object' ? raw.nutrients : {}),
    ...(raw.macros && typeof raw.macros === 'object' ? raw.macros : {}),
    ...raw,
  };

  const explicitMacros = {
    proteinG: pickNum(srcMacros.proteinG, srcMacros.protein_g, srcMacros.protein, srcMacros.p),
    carbsG: pickNum(srcMacros.carbsG, srcMacros.carbs_g, srcMacros.carbohydrates, srcMacros.carbs, srcMacros.c),
    fatG: pickNum(srcMacros.fatG, srcMacros.fat_g, srcMacros.fat, srcMacros.f),
    fiberG: pickNum(srcMacros.fiberG, srcMacros.fiber_g, srcMacros.fiber, srcMacros.dietaryFiber),
    sugarG: pickNum(srcMacros.sugarG, srcMacros.sugar_g, srcMacros.sugar, srcMacros.sugars),
    satFatG: pickNum(srcMacros.satFatG, srcMacros.sat_fat_g, srcMacros.saturatedFat, srcMacros.satFat),
    sodiumMg: pickNum(srcMacros.sodiumMg, srcMacros.sodium_mg, srcMacros.sodium),
    potassiumMg: pickNum(srcMacros.potassiumMg, srcMacros.potassium_mg, srcMacros.potassium),
    calciumMg: pickNum(srcMacros.calciumMg, srcMacros.calcium_mg, srcMacros.calcium),
    ironMg: pickNum(srcMacros.ironMg, srcMacros.iron_mg, srcMacros.iron),
    magnesiumMg: pickNum(srcMacros.magnesiumMg, srcMacros.magnesium_mg, srcMacros.magnesium),
    zincMg: pickNum(srcMacros.zincMg, srcMacros.zinc_mg, srcMacros.zinc),
    vitAMcg: pickNum(srcMacros.vitAMcg, srcMacros.vit_a_mcg, srcMacros.vitaminA),
    vitCMg: pickNum(srcMacros.vitCMg, srcMacros.vit_c_mg, srcMacros.vitaminC),
    vitDMcg: pickNum(srcMacros.vitDMcg, srcMacros.vit_d_mcg, srcMacros.vitaminD),
    vitB12Mcg: pickNum(srcMacros.vitB12Mcg, srcMacros.vit_b12_mcg, srcMacros.vitaminB12),
    cholesterolMg: pickNum(srcMacros.cholesterolMg, srcMacros.cholesterol_mg, srcMacros.cholesterol),
  };

  // Determine whether caller passed per-unit values or total-meal values when qty !== 1
  const macrosArePerUnit = explicitKcalPerUnit != null || qty === 1;
  const macroDivisor = macrosArePerUnit ? 1 : qty;

  let derivedKcalPerUnit = explicitKcalPerUnit;
  if (derivedKcalPerUnit == null && rawTotalKcal != null && rawTotalKcal > 0) {
    derivedKcalPerUnit = rawTotalKcal / qty;
  }
  if (derivedKcalPerUnit == null && (explicitMacros.proteinG != null || explicitMacros.carbsG != null || explicitMacros.fatG != null)) {
    const p = (explicitMacros.proteinG || 0) / macroDivisor;
    const c = (explicitMacros.carbsG || 0) / macroDivisor;
    const f = (explicitMacros.fatG || 0) / macroDivisor;
    const calc = p * 4 + c * 4 + f * 9;
    if (calc > 0) derivedKcalPerUnit = calc;
  }

  const hourNow = new Date().getHours();
  const category = inferFoodCategory(name, raw.category || raw.mealType || raw.meal_type, hourNow);

  const engineResult = await analyzeMealNutrition({
    query: name,
    kcal: derivedKcalPerUnit != null && derivedKcalPerUnit > 0 ? Math.round(derivedKcalPerUnit) : null,
    qty: 1,
    category: category === 'General' ? inferFoodCategory(name) : category,
  }, dataDir);

  const finalCategory = category === 'General' && engineResult?.category && engineResult.category !== 'General'
    ? normalizeCategory(engineResult.category)
    : category;

  const finalKcalPerUnit = Math.max(
    1,
    Math.min(5000, Math.round(derivedKcalPerUnit != null && derivedKcalPerUnit > 0 ? derivedKcalPerUnit : (engineResult?.kcal || 200)))
  );

  const mergedNutrients = {};
  const engineNutrients = scaleNutrientsObj(engineResult?.nutrients || {}, 1);
  for (const key of NUTRIENT_KEYS) {
    const supplied = explicitMacros[key];
    if (supplied != null) {
      const perUnit = supplied / macroDivisor;
      mergedNutrients[key] = (key.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(key)) || key === 'vitAMcg'
        ? r0(perUnit)
        : r1(perUnit);
    } else {
      mergedNutrients[key] = engineNutrients[key] || 0;
    }
  }

  const aiProvider = normalizeAiProvider(raw.sourceAi || raw.ai || raw.provider || raw.source);
  const nutrientSource = `ai:${aiProvider}`.slice(0, 40);

  const dateRaw = String(raw.date || raw.d || '').trim();
  const d = ISO_DATE_RE.test(dateRaw) && !Number.isNaN(Date.parse(`${dateRaw}T00:00:00Z`))
    ? dateRaw
    : todayIsoInTz(defaultTz);

  const saveToLibrary = Boolean(raw.saveToLibrary ?? raw.save_to_library ?? false);
  const totalKcal = Math.max(1, Math.round(finalKcalPerUnit * qty));

  return {
    error: null,
    meal: {
      name,
      category: finalCategory,
      unitLabel,
      kcalPerUnit: finalKcalPerUnit,
      qty,
      kcal: totalKcal,
      d,
      nutrients: mergedNutrients,
      nutrientSource,
      aiProvider,
      saveToLibrary,
      matchedItems: Array.isArray(engineResult?.items) ? engineResult.items : [],
      dbSource: engineResult?.source || 'curated',
    },
  };
}

function makeUid() {
  return crypto.randomBytes(6).toString('hex');
}

export function sortFoods(list) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && typeof x === 'object')
    .slice()
    .sort((a, b) => {
      const fa = a.fav === true ? 1 : 0;
      const fb = b.fav === true ? 1 : 0;
      if (fa !== fb) return fb - fa;
      const na = String(a.name || '').toLowerCase();
      const nb = String(b.name || '').toLowerCase();
      if (na !== nb) return na < nb ? -1 : 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

export function sortFoodLog(list) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && typeof x === 'object')
    .slice()
    .sort((a, b) => {
      const da = String(a.d || '');
      const db = String(b.d || '');
      if (da !== db) return da < db ? -1 : 1;
      const ta = Number(a.at) || 0;
      const tb = Number(b.at) || 0;
      if (ta !== tb) return ta - tb;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

export function summarizeFoodDay(state, dateISO) {
  const S = state && typeof state === 'object' ? state : {};
  const d = ISO_DATE_RE.test(String(dateISO || '')) ? dateISO : todayIsoInTz(S.reminder?.tz);
  const log = sortFoodLog((Array.isArray(S.foodLog) ? S.foodLog : []).filter(e => e && e.d === d));
  const eaten = log.reduce((sum, e) => sum + Math.max(0, Math.round(Number(e.kcal) || 0)), 0);
  const rawTarget = Number(S.calorieTarget);
  const target = Number.isFinite(rawTarget) && rawTarget > 0 ? Math.round(rawTarget) : null;
  const remaining = target != null ? target - eaten : null;

  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;
  for (const e of log) {
    const mult = Number(e.qty) > 0 ? Number(e.qty) : 1;
    const n = e.nutrients || {};
    proteinG += (Number(n.proteinG) || 0) * mult;
    carbsG += (Number(n.carbsG) || 0) * mult;
    fatG += (Number(n.fatG) || 0) * mult;
    fiberG += (Number(n.fiberG) || 0) * mult;
  }

  return {
    date: d,
    target,
    eaten,
    remaining,
    isOver: remaining != null && remaining < 0,
    count: log.length,
    macros: {
      proteinG: r1(proteinG),
      carbsG: r1(carbsG),
      fatG: r1(fatG),
      fiberG: r1(fiberG),
    },
    entries: log.map(e => ({
      id: e.id,
      name: e.name,
      qty: e.qty,
      unitLabel: e.unitLabel,
      kcal: e.kcal,
      nutrientSource: e.nutrientSource || null,
    })),
  };
}

export function appendAiMealToState(curState, meal, { widKeep = 50 } = {}) {
  const now = Date.now();
  const base = curState && typeof curState === 'object' && !Array.isArray(curState)
    ? { ...curState }
    : {};

  const prevFoods = Array.isArray(base.foods) ? base.foods.filter(x => x && typeof x === 'object') : [];
  const prevLog = Array.isArray(base.foodLog) ? base.foodLog.filter(x => x && typeof x === 'object') : [];

  let linkedFoodId = null;
  let nextFoods = prevFoods;
  let savedFood = null;

  if (meal.saveToLibrary) {
    const existing = prevFoods.find(
      f => String(f.name || '').trim().toLowerCase() === meal.name.toLowerCase()
    );
    if (existing) {
      linkedFoodId = existing.id;
      savedFood = {
        ...existing,
        category: meal.category || existing.category || 'General',
        unitLabel: meal.unitLabel || existing.unitLabel,
        kcalPerUnit: meal.kcalPerUnit,
        nutrients: meal.nutrients,
        nutrientSource: meal.nutrientSource,
      };
      nextFoods = sortFoods(prevFoods.map(f => (f.id === existing.id ? savedFood : f)));
    } else {
      linkedFoodId = makeUid();
      savedFood = {
        id: linkedFoodId,
        name: meal.name,
        category: meal.category || 'General',
        unitLabel: meal.unitLabel || 'serving',
        kcalPerUnit: meal.kcalPerUnit,
        nutrients: meal.nutrients,
        nutrientSource: meal.nutrientSource,
        fav: false,
        at: now,
      };
      nextFoods = sortFoods([...prevFoods, savedFood]);
    }
  }

  const entry = {
    id: makeUid(),
    d: meal.d,
    ...(linkedFoodId ? { foodId: linkedFoodId } : {}),
    name: meal.name,
    unitLabel: meal.unitLabel,
    kcalPerUnit: meal.kcalPerUnit,
    qty: meal.qty,
    kcal: meal.kcal,
    nutrients: meal.nutrients,
    nutrientSource: meal.nutrientSource,
    at: now,
  };

  const nextLog = sortFoodLog([...prevLog, entry]);
  const curRev = Number(base._rev) || 0;
  const nextRev = curRev + 1;
  const nextWids = [
    ...(Array.isArray(base._wids) ? base._wids : []),
    ...(base._wid ? [base._wid] : []),
  ]
    .filter(x => typeof x === 'string')
    .slice(-widKeep);
  const nextWid = crypto.randomBytes(8).toString('hex');

  const nextState = {
    ...base,
    foods: nextFoods,
    foodLog: nextLog,
    _ts: now,
    _rev: nextRev,
    _wid: nextWid,
    _wids: nextWids,
  };
  delete nextState.active;

  return {
    nextState,
    entry,
    savedFood,
    rev: nextRev,
    wid: nextWid,
    dailySummary: summarizeFoodDay(nextState, meal.d),
  };
}

/* ---------- OpenAPI 3.1 Schema for ChatGPT Custom GPT Actions & External AI Tools ---------- */

export function buildOpenApiSpec(origin = 'https://localhost:3000') {
  const cleanOrigin = String(origin || 'https://localhost:3000').replace(/\/+$/, '');
  return {
    openapi: '3.1.0',
    info: {
      title: 'Aetherix Food & Calorie Tracker API',
      version: '1.0.0',
      description: 'Log meals calculated from food photos or meal descriptions directly into Aetherix with automatic category inference and micronutrient enrichment.',
    },
    servers: [
      { url: cleanOrigin, description: 'Aetherix Server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Personal Aetherix AI Sync Key generated from Food -> Connect AI',
        },
      },
      schemas: {
        FoodLogRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Concise meal name, e.g. "Grilled Chicken Bowl with Brown Rice"' },
            kcal: { type: 'number', description: 'Total estimated calories for this entry' },
            kcalPerUnit: { type: 'number', description: 'Optional calories per single serving unit' },
            qty: { type: 'number', default: 1, description: 'Number of servings / units eaten' },
            unitLabel: { type: 'string', default: 'serving', description: 'Serving unit such as plate, bowl, piece, cup, 100g' },
            category: {
              type: 'string',
              enum: FOOD_CATEGORIES,
              description: 'Meal category (auto-inferred if omitted)',
            },
            date: { type: 'string', format: 'date', description: 'Optional YYYY-MM-DD date (defaults to today)' },
            proteinG: { type: 'number', description: 'Estimated protein in grams' },
            carbsG: { type: 'number', description: 'Estimated carbohydrates in grams' },
            fatG: { type: 'number', description: 'Estimated fat in grams' },
            fiberG: { type: 'number', description: 'Optional dietary fiber in grams' },
            sugarG: { type: 'number', description: 'Optional sugars in grams' },
            sourceAi: { type: 'string', enum: ['chatgpt', 'gemini', 'grok', 'claude', 'external'], default: 'chatgpt' },
            saveToLibrary: { type: 'boolean', default: false, description: 'Also save as reusable food item in personal library' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/ai/food-log': {
        get: {
          operationId: 'getDailyFoodSummary',
          summary: 'Get eaten calories, daily calorie target, remaining budget, and today\'s food log',
          parameters: [
            {
              name: 'date',
              in: 'query',
              required: false,
              schema: { type: 'string', format: 'date' },
              description: 'ISO date (YYYY-MM-DD); defaults to today',
            },
          ],
          responses: {
            '200': { description: 'Daily food & calorie summary' },
          },
        },
        post: {
          operationId: 'logFoodMeal',
          summary: 'Calculate/enrich and log a meal into the user\'s Aetherix Food Log',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FoodLogRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Meal logged and daily summary returned' },
          },
        },
      },
    },
  };
}

/* ---------- Server-Side Food Photo Vision Analyzer (Gemini) ---------- */

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export async function analyzeFoodPhotoWithGemini({ base64, mimeType = 'image/jpeg', hint = '' } = {}, dataDir = '/tmp') {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('In-app photo scanning requires GEMINI_API_KEY on the server. You can still use Connect AI links with Gemini, ChatGPT, Grok, or Claude, or paste an AI calorie reply.');
    err.status = 503;
    err.code = 'gemini-not-configured';
    throw err;
  }

  let cleanB64 = String(base64 || '').trim();
  let detectedMime = String(mimeType || 'image/jpeg').trim().toLowerCase();
  const dataUrlMatch = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(cleanB64);
  if (dataUrlMatch) {
    detectedMime = dataUrlMatch[1].toLowerCase();
    cleanB64 = dataUrlMatch[2];
  }
  if (!ALLOWED_IMAGE_MIME.has(detectedMime)) {
    const err = new Error('Upload a JPEG, PNG, WebP, or HEIC food photo.');
    err.status = 400;
    err.code = 'invalid-image-type';
    throw err;
  }
  if (!cleanB64 || cleanB64.length > 8 * 1024 * 1024) {
    const err = new Error('Photo is missing or exceeds 6 MB.');
    err.status = 400;
    err.code = 'invalid-image-size';
    throw err;
  }

  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const promptText = [
    'Identify every visible food/drink in this meal photo and estimate realistic nutrition for logging into a fitness calorie tracker.',
    hint ? `User note / context: "${String(hint).slice(0, 200)}".` : '',
    'Return a concise, natural meal title, the most fitting category (Breakfast, Lunch, Dinner, Snacks, Protein, Drinks, General), a natural serving unitLabel (e.g. plate, bowl, serving, piece, cup), qty (usually 1), calories per unit (kcalPerUnit), and grams of proteinG, carbsG, fatG, fiberG, and sugarG per unit.',
  ].filter(Boolean).join(' ');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      {
        role: 'user',
        parts: [
          { text: promptText },
          { inlineData: { mimeType: detectedMime === 'image/jpg' ? 'image/jpeg' : detectedMime, data: cleanB64 } },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          unitLabel: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          kcalPerUnit: { type: Type.NUMBER },
          proteinG: { type: Type.NUMBER },
          carbsG: { type: Type.NUMBER },
          fatG: { type: Type.NUMBER },
          fiberG: { type: Type.NUMBER },
          sugarG: { type: Type.NUMBER },
          confidenceNote: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                kcal: { type: Type.NUMBER },
                qty: { type: Type.NUMBER },
                unitLabel: { type: Type.STRING },
              },
            },
          },
        },
        required: ['name', 'kcalPerUnit', 'proteinG', 'carbsG', 'fatG'],
      },
    },
  });

  const rawText = typeof response?.text === 'string' ? response.text : '';
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const err = new Error('Could not parse nutrition estimate from photo. Try adding a short meal description.');
    err.status = 502;
    err.code = 'ai-parse-error';
    throw err;
  }

  const enriched = await enrichAiFoodPayload({
    ...parsed,
    sourceAi: 'gemini',
  }, dataDir);

  if (enriched.error) {
    const err = new Error(enriched.error);
    err.status = 422;
    throw err;
  }

  return {
    meal: {
      ...enriched.meal,
      confidenceNote: String(parsed?.confidenceNote || '').slice(0, 140),
      detectedItems: Array.isArray(parsed?.items) && parsed.items.length > 0
        ? parsed.items
        : enriched.meal.matchedItems,
    },
  };
}
