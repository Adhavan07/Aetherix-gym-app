// Client-side Universal AI Chat Food & Calorie Sync utilities.
// Supports:
//   - Deep-link parsing & building (#/food?ai_log=<base64url> or flat query params)
//   - Smart parser for pasted replies from Gemini, ChatGPT, Grok, and Claude (JSON, Markdown table, or prose)
//   - Per-platform tailored setup prompts & OpenAPI schema URL builder
//   - Personal AI Sync Key management + server-side photo scanner client
import { api, appBase, remoteAuth } from './api.js'
import { todayISO } from './format.js'
import { analyzeFoodText, sanitizeNutrients } from './nutrition-facts.js'
import { FOOD_CATEGORIES, normalizeFoodCategory } from './nutrition.js'

export const AI_PLATFORMS = [
  { id: 'gemini', label: 'Gemini', subtitle: 'Google Gemini & Gems' },
  { id: 'chatgpt', label: 'ChatGPT', subtitle: 'Custom GPT Actions or any chat' },
  { id: 'grok', label: 'Grok', subtitle: 'Grok web, app, or custom instructions' },
  { id: 'claude', label: 'Claude', subtitle: 'Claude Projects, web, or desktop' },
]

const PROVIDER_MAP = {
  gemini: 'gemini',
  google: 'gemini',
  chatgpt: 'chatgpt',
  openai: 'chatgpt',
  gpt: 'chatgpt',
  grok: 'grok',
  xai: 'grok',
  claude: 'claude',
  anthropic: 'claude',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const r1 = n => Math.round((Number(n) || 0) * 10) / 10
const r0 = n => Math.round(Number(n) || 0)

export function normalizeAiProvider(raw) {
  const low = String(raw || '').trim().toLowerCase()
  if (!low) return 'external'
  for (const [k, v] of Object.entries(PROVIDER_MAP)) {
    if (low === k || low.includes(k)) return v
  }
  return low.replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'external'
}

export function inferCategoryClient(name = '', explicitCategory = '', hourHint = new Date().getHours()) {
  const norm = normalizeFoodCategory(explicitCategory)
  if (explicitCategory && norm && norm !== 'General') return norm
  const text = String(name || '').toLowerCase()
  if (/\b(whey|casein|protein\s*shake|protein\s*bar|protein\s*scoop|boiled\s*egg|egg\s*white|chicken\s*breast|grilled\s*chicken|salmon|tuna|prawns|shrimp|tofu|soya\s*chunks|greek\s*yogurt|skyr)\b/.test(text)) {
    return 'Protein'
  }
  if (/\b(coffee|espresso|americano|latte|cappuccino|chai|tea|matcha|milk|lassi|buttermilk|chaas|coconut\s*water|juice|smoothie|soda|cola|shake)\b/.test(text)) {
    return 'Drinks'
  }
  if (/\b(idli|dosa|doasa|upma|pongal|poha|oats|oatmeal|porridge|pancake|waffle|cereal|toast|bagel|muffin|omelette|omelet|scrambled\s*eggs|paratha|breakfast)\b/.test(text)) {
    return 'Breakfast'
  }
  if (/\b(banana|apple|orange|mango|papaya|berries|grapes|dates|avocado|almond|almonds|walnut|walnuts|peanut|peanuts|cashew|cashews|nuts|chips|cookie|biscuit|chocolate|popcorn|vada|samosa|snack|bar)\b/.test(text)) {
    return 'Snacks'
  }
  if (/\b(biryani|rice|curry|dal|daal|rajma|chole|sambar|pasta|spaghetti|noodles|ramen|pizza|burger|sandwich|wrap|burrito|taco|salad|bowl|steak|roti|chapati|naan|parotta|soup|thali)\b/.test(text)) {
    if (typeof hourHint === 'number' && Number.isFinite(hourHint)) {
      return hourHint >= 16 || hourHint < 5 ? 'Dinner' : 'Lunch'
    }
    return 'Lunch'
  }
  const analyzed = analyzeFoodText(name, null, 'General')
  return analyzed?.category && analyzed.category !== 'General' ? analyzed.category : (norm || 'General')
}

function b64uEncodeJson(obj) {
  const json = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64uDecodeJson(str) {
  const padded = String(str || '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  const text = new TextDecoder().decode(bytes)
  return JSON.parse(text)
}

function pickNum(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined || v === '') continue
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return null
}

/**
 * Normalizes any raw AI meal payload (from deep link, pasted reply, or photo scan) into
 * Aetherix food log structure with enriched micronutrients & inferred category.
 */
export function normalizeAiMealInput(raw = {}, fallbackProvider = 'external') {
  const itemsList = Array.isArray(raw.items) ? raw.items.filter(x => x && typeof x === 'object') : []
  let name = String(raw.name || raw.food || raw.meal || raw.title || raw.query || '').trim()
  if (!name && itemsList.length > 0) {
    name = itemsList.map(it => String(it.name || it.food || '').trim()).filter(Boolean).join(' + ')
  }
  name = name.replace(/\s+/g, ' ').slice(0, 80).trim()
  if (!name) return null

  const rawQty = pickNum(raw.qty, raw.quantity, raw.servings)
  const qty = rawQty && rawQty >= 0.1 ? Math.min(100, Math.round(rawQty * 100) / 100) : 1
  const unitLabel = String(raw.unitLabel || raw.unit || raw.servingUnit || raw.serving || '').trim().slice(0, 24) || 'serving'

  const explicitKcalPerUnit = pickNum(raw.kcalPerUnit, raw.kcal_per_unit, raw.caloriesPerUnit)
  const rawTotalKcal = pickNum(raw.kcal, raw.cal, raw.calories, raw.energy)

  const srcMacros = {
    ...(raw.nutrients && typeof raw.nutrients === 'object' ? raw.nutrients : {}),
    ...(raw.macros && typeof raw.macros === 'object' ? raw.macros : {}),
    ...raw,
  }

  const supplied = {
    proteinG: pickNum(srcMacros.proteinG, srcMacros.protein_g, srcMacros.protein, srcMacros.p),
    carbsG: pickNum(srcMacros.carbsG, srcMacros.carbs_g, srcMacros.carbohydrates, srcMacros.carbs, srcMacros.c),
    fatG: pickNum(srcMacros.fatG, srcMacros.fat_g, srcMacros.fat, srcMacros.f),
    fiberG: pickNum(srcMacros.fiberG, srcMacros.fiber_g, srcMacros.fiber),
    sugarG: pickNum(srcMacros.sugarG, srcMacros.sugar_g, srcMacros.sugar, srcMacros.sugars),
    satFatG: pickNum(srcMacros.satFatG, srcMacros.sat_fat_g, srcMacros.satFat),
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
  }

  const macrosArePerUnit = explicitKcalPerUnit != null || qty === 1
  const divisor = macrosArePerUnit ? 1 : qty

  let derivedKcalPerUnit = explicitKcalPerUnit
  if (derivedKcalPerUnit == null && rawTotalKcal != null && rawTotalKcal > 0) {
    derivedKcalPerUnit = rawTotalKcal / qty
  }
  if (derivedKcalPerUnit == null && (supplied.proteinG != null || supplied.carbsG != null || supplied.fatG != null)) {
    const p = (supplied.proteinG || 0) / divisor
    const c = (supplied.carbsG || 0) / divisor
    const f = (supplied.fatG || 0) / divisor
    const calc = p * 4 + c * 4 + f * 9
    if (calc > 0) derivedKcalPerUnit = calc
  }

  const category = inferCategoryClient(name, raw.category || raw.cat || raw.mealType || raw.meal_type)
  const dbFallback = analyzeFoodText(
    name,
    derivedKcalPerUnit != null && derivedKcalPerUnit > 0 ? Math.round(derivedKcalPerUnit) : null,
    category
  )

  const kcalPerUnit = Math.max(
    1,
    Math.min(5000, Math.round(derivedKcalPerUnit != null && derivedKcalPerUnit > 0 ? derivedKcalPerUnit : dbFallback.kcal))
  )

  const mergedNutrients = { ...(dbFallback.nutrients || {}) }
  for (const [k, v] of Object.entries(supplied)) {
    if (v == null) continue
    const perUnit = v / divisor
    mergedNutrients[k] = (k.endsWith('Mg') && !['ironMg', 'zincMg', 'vitCMg'].includes(k)) || k === 'vitAMcg'
      ? r0(perUnit)
      : r1(perUnit)
  }

  const cleanNutrients = sanitizeNutrients(mergedNutrients) || dbFallback.nutrients
  const aiProvider = normalizeAiProvider(raw.sourceAi || raw.aiProvider || raw.ai || raw.provider || raw.source || fallbackProvider)
  const nutrientSource = raw.nutrientSource && String(raw.nutrientSource).startsWith('ai:')
    ? String(raw.nutrientSource).slice(0, 40)
    : `ai:${aiProvider}`

  const dateRaw = String(raw.date || raw.d || '').trim()
  const d = ISO_DATE.test(dateRaw) && !Number.isNaN(Date.parse(`${dateRaw}T00:00:00Z`))
    ? dateRaw
    : todayISO()

  const saveRaw = raw.saveToLibrary ?? raw.save_to_library ?? raw.save
  const saveToLibrary = saveRaw === true || saveRaw === '1' || saveRaw === 'true'
  const totalKcal = Math.max(1, Math.round(kcalPerUnit * qty))

  return {
    name,
    category: FOOD_CATEGORIES.includes(category) ? category : normalizeFoodCategory(category),
    unitLabel,
    kcalPerUnit,
    qty,
    kcal: totalKcal,
    d,
    nutrients: cleanNutrients,
    nutrientSource,
    aiProvider,
    saveToLibrary,
    items: Array.isArray(raw.detectedItems) && raw.detectedItems.length
      ? raw.detectedItems
      : Array.isArray(raw.matchedItems) && raw.matchedItems.length
        ? raw.matchedItems
        : dbFallback.items || [],
    confidenceNote: String(raw.confidenceNote || '').slice(0, 140),
  }
}

export function buildAiFoodLink(origin, meal = {}) {
  const base = String(origin || (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000')).replace(/\/+$/, '')
  const payload = {
    name: meal.name || 'Meal',
    kcalPerUnit: Number(meal.kcalPerUnit || meal.kcal || 250),
    qty: Number(meal.qty || 1),
    unitLabel: meal.unitLabel || 'serving',
    category: meal.category || 'General',
    proteinG: Number(meal.nutrients?.proteinG ?? meal.proteinG ?? 0),
    carbsG: Number(meal.nutrients?.carbsG ?? meal.carbsG ?? 0),
    fatG: Number(meal.nutrients?.fatG ?? meal.fatG ?? 0),
    fiberG: Number(meal.nutrients?.fiberG ?? meal.fiberG ?? 0),
    ai: meal.aiProvider || 'external',
  }
  return `${base}/#/food?ai_log=${b64uEncodeJson(payload)}`
}

/**
 * Extracts and normalizes an AI Quick-Log meal from a URL, search string, or hash route.
 * Accepts BOTH `#/food?ai_log=...` and `?ai_log=...#/food` as well as flat query params
 * (`name`, `kcal`, `p`, `c`, `f`, `cat`, `qty`, `unit`, `ai`).
 */
export function parseAiFoodLink(urlOrHash) {
  const raw = String(urlOrHash || '').trim()
  if (!raw) return null
  try {
    const fakeBase = 'https://aetherix.local'
    const u = /^https?:\/\//i.test(raw)
      ? new URL(raw)
      : raw.startsWith('#')
        ? new URL(fakeBase + '/' + raw)
        : new URL(raw.startsWith('/') ? fakeBase + raw : fakeBase + '/' + raw)

    const hashIdx = u.hash.indexOf('?')
    const hashParams = new URLSearchParams(hashIdx >= 0 ? u.hash.slice(hashIdx + 1) : '')
    const searchParams = u.searchParams

    const getParam = (...keys) => {
      for (const k of keys) {
        const hv = hashParams.get(k)
        if (hv != null && hv !== '') return hv
        const sv = searchParams.get(k)
        if (sv != null && sv !== '') return sv
      }
      return null
    }

    const encoded = getParam('ai_log', 'ailog', 'meal_b64')
    if (encoded) {
      try {
        const obj = b64uDecodeJson(encoded)
        if (obj && typeof obj === 'object') {
          const meal = normalizeAiMealInput(obj, obj.ai || 'external')
          if (meal) return { meal, rawKey: `ai_log:${encoded}` }
        }
      } catch {
        // Fallback to flat query params if base64 payload was malformed
      }
    }

    const name = getParam('name', 'food', 'meal', 'title')
    if (!name) return null

    const hasMealSignals = Boolean(
      getParam('kcal', 'cal', 'calories', 'kcalPerUnit', 'p', 'protein', 'proteinG', 'ai', 'ai_log', 'cat', 'category')
    )
    if (!hasMealSignals) return null

    const flat = {
      name,
      kcal: getParam('kcal', 'cal', 'calories'),
      kcalPerUnit: getParam('kcalPerUnit', 'kcal_per_unit'),
      qty: getParam('qty', 'quantity', 'servings'),
      unitLabel: getParam('unit', 'unitLabel', 'serving'),
      category: getParam('cat', 'category', 'mealType'),
      proteinG: getParam('p', 'protein', 'proteinG', 'protein_g'),
      carbsG: getParam('c', 'carbs', 'carbsG', 'carbs_g'),
      fatG: getParam('f', 'fat', 'fatG', 'fat_g'),
      fiberG: getParam('fiber', 'fiberG', 'fiber_g'),
      sugarG: getParam('sugar', 'sugarG', 'sugar_g'),
      d: getParam('d', 'date'),
      ai: getParam('ai', 'source', 'provider'),
      save: getParam('save', 'saveToLibrary'),
    }

    const meal = normalizeAiMealInput(flat, flat.ai || 'external')
    if (!meal) return null
    return {
      meal,
      rawKey: `${meal.name}:${meal.kcal}:${meal.aiProvider}:${meal.nutrients.proteinG}`,
    }
  } catch {
    return null
  }
}

export function stripAiFoodParamsFromUrl() {
  try {
    if (typeof window === 'undefined' || !window.history?.replaceState) return
    const u = new URL(window.location.href)
    const keys = [
      'ai_log', 'ailog', 'meal_b64', 'name', 'food', 'meal', 'title',
      'kcal', 'cal', 'calories', 'kcalPerUnit', 'kcal_per_unit',
      'qty', 'quantity', 'servings', 'unit', 'unitLabel', 'serving',
      'cat', 'category', 'mealType', 'p', 'protein', 'proteinG', 'protein_g',
      'c', 'carbs', 'carbsG', 'carbs_g', 'f', 'fat', 'fatG', 'fat_g',
      'fiber', 'fiberG', 'fiber_g', 'sugar', 'sugarG', 'sugar_g',
      'd', 'date', 'ai', 'source', 'provider', 'save', 'saveToLibrary',
    ]
    for (const k of keys) u.searchParams.delete(k)
    const search = u.searchParams.toString()
    window.history.replaceState(window.history.state, '', u.pathname + (search ? `?${search}` : '') + '#/food')
  } catch {
    // Non-fatal in test/headless contexts
  }
}

/**
 * Parses a copied response from Gemini, ChatGPT, Grok, or Claude.
 * Handles:
 *   1. Fenced or inline JSON objects
 *   2. Markdown summary tables (`| Meal | Calories | Protein | Carbs | Fat |`)
 *   3. Natural-language / bullet lists ("Grilled Chicken Salad\nCalories: 460 kcal\nProtein: 38g\nCarbs: 22g\nFat: 24g")
 */
export function parseAiChatReplyText(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return null

  // 1. Try fenced ```json ... ``` or raw JSON object
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const jsonCandidate = fenceMatch ? fenceMatch[1].trim() : text
  const firstBrace = jsonCandidate.indexOf('{')
  const lastBrace = jsonCandidate.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const obj = JSON.parse(jsonCandidate.slice(firstBrace, lastBrace + 1))
      if (obj && typeof obj === 'object') {
        const meal = normalizeAiMealInput(obj, obj.sourceAi || obj.ai || 'external')
        if (meal) return meal
      }
    } catch {
      // Continue to Markdown/prose parsing
    }
  }

  // 2. Detect Markdown link embedded in reply: e.g. [Log to Aetherix](https://.../#/food?...)
  const mdLinkMatch = /\((https?:\/\/[^\s)]+\/#\/food\?[^\s)]+|\/#\/food\?[^\s)]+)\)/i.exec(text)
  if (mdLinkMatch) {
    const parsedLink = parseAiFoodLink(mdLinkMatch[1])
    if (parsedLink?.meal) return parsedLink.meal
  }

  // Detect provider mention in text if present
  const detectedProvider = /\bgemini\b/i.test(text)
    ? 'gemini'
    : /\bchatgpt\b/i.test(text)
      ? 'chatgpt'
      : /\bgrok\b/i.test(text)
        ? 'grok'
        : /\bclaude\b/i.test(text)
          ? 'claude'
          : 'external'

  // Extract structured metric fields from prose or bullets
  const numAfter = re => {
    const m = re.exec(text)
    if (!m) return null
    const val = Number(String(m[1]).replace(/,/g, ''))
    return Number.isFinite(val) && val >= 0 ? val : null
  }

  const kcal =
    numAfter(/(?:total\s*)?(?:calories|energy|kcal)\s*[:=\-–~]*\s*~?\s*([\d,]+(?:\.\d+)?)/i) ??
    numAfter(/~?\s*([\d,]+(?:\.\d+)?)\s*(?:kcal|calories)\b/i)

  const proteinG =
    numAfter(/protein\s*[:=\-–~]*\s*~?\s*(\d+(?:\.\d+)?)\s*g?\b/i) ??
    numAfter(/(\d+(?:\.\d+)?)\s*g\s*protein\b/i)

  const carbsG =
    numAfter(/(?:carbohydrates|carbs)\s*[:=\-–~]*\s*~?\s*(\d+(?:\.\d+)?)\s*g?\b/i) ??
    numAfter(/(\d+(?:\.\d+)?)\s*g\s*(?:carbs|carbohydrates)\b/i)

  const fatG =
    numAfter(/(?:total\s*)?fats?\s*[:=\-–~]*\s*~?\s*(\d+(?:\.\d+)?)\s*g?\b/i) ??
    numAfter(/(\d+(?:\.\d+)?)\s*g\s*(?:of\s*)?fat\b/i)

  const fiberG = numAfter(/(?:dietary\s*)?fiber\s*[:=\-–~]*\s*~?\s*(\d+(?:\.\d+)?)\s*g?\b/i)
  const sugarG = numAfter(/sugars?\s*[:=\-–~]*\s*~?\s*(\d+(?:\.\d+)?)\s*g?\b/i)

  const catMatch = /(?:category|meal\s*type)\s*[:=\-–]\s*([a-z\s]{3,24})/i.exec(text)
  const explicitCat = catMatch ? catMatch[1].trim() : ''

  // Extract meal name from explicit label or first meaningful heading/line
  let name = ''
  const nameLabel = /(?:meal|dish|food|item|title)\s*[:=\-–]\s*([^\n|*#`]{2,80})/i.exec(text)
  if (nameLabel) {
    name = nameLabel[1].trim()
  } else {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.replace(/^[\s#>*\-•\d.)]+/, '').replace(/[*_`]+/g, '').trim())
      .filter(Boolean)
    const cleanLine = lines.find(l => {
      if (l.startsWith('|') && l.includes('---')) return false
      if (/^(calories|protein|carbs|carbohydrates|fat|fiber|sugar|total|estimated|macros|breakdown|here'?s|sure|based on)/i.test(l)) return false
      return l.length >= 2
    })
    if (cleanLine) {
      if (cleanLine.startsWith('|')) {
        const cells = cleanLine.split('|').map(c => c.trim()).filter(Boolean)
        name = cells.find(c => !/^(meal|food|item|calories|\d+)/i.test(c)) || cells[0] || ''
      } else {
        name = cleanLine.split(/\s*(?:[-–—]|\()\s*(?:\d+\s*kcal|approx|estimated)/i)[0].trim()
      }
    }
  }

  name = name.replace(/[,:;.\s]+$/, '').slice(0, 80).trim()
  if (!name) return null

  return normalizeAiMealInput(
    {
      name,
      kcal,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      category: explicitCat,
      sourceAi: detectedProvider,
    },
    detectedProvider
  )
}

export function getPublicOrigin() {
  const remote = remoteAuth()
  if (remote?.base) return remote.base.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return 'https://localhost:3000'
}

export function buildAiSetupPrompt(platform, origin, { aiKey = '' } = {}) {
  const cleanOrigin = String(origin || getPublicOrigin()).replace(/\/+$/, '')
  const linkTemplate = `${cleanOrigin}/#/food?name=MEAL_NAME&kcal=CALORIES&p=PROTEIN_G&c=CARBS_G&f=FAT_G&cat=CATEGORY&qty=1&unit=serving&ai=${platform}`

  if (platform === 'chatgpt') {
    if (aiKey) {
      return [
        'You are connected to my Aetherix Calorie Tracker.',
        'When I upload a food photo or describe a meal and ask you to log it:',
        '1. Identify each item & estimate realistic portion calories, proteinG, carbsG, fatG, and fiberG.',
        '2. Pick the matching category: Breakfast, Lunch, Dinner, Snacks, Protein, Drinks, or General.',
        '3. Call the `logFoodMeal` Action immediately (sourceAi: "chatgpt") and confirm what was added.',
        `4. Also include this backup Quick-Log link using URL-encoded values: [Tap to review in Aetherix](${linkTemplate})`,
      ].join('\n')
    }
    return [
      'When I send you a food photo or describe what I ate and ask to add it to my calories tracker:',
      '1. Calculate total calories and grams of protein, carbs, fat, and fiber.',
      '2. Pick a category (Breakfast, Lunch, Dinner, Snacks, Protein, Drinks, General).',
      '3. Reply with a short calorie summary AND a clickable Aetherix Quick-Log link filled with URL-encoded values:',
      `[Log to Aetherix](${linkTemplate})`,
      'Never ask me to do the math myself.',
    ].join('\n')
  }

  if (platform === 'gemini') {
    return [
      'When I upload a photo of food or tell you a meal and say add it to my calorie tracker:',
      '1. Analyze the photo and estimate calories, protein (g), carbs (g), fat (g), fiber (g), and meal category (Breakfast, Lunch, Dinner, Snacks, Protein, Drinks, General).',
      '2. Show a clear breakdown of items and totals.',
      '3. Always end with this clickable Aetherix link (URL-encoded values replaced with your estimate):',
      `[Add to Aetherix](${linkTemplate})`,
    ].join('\n')
  }

  if (platform === 'grok') {
    return [
      'Whenever I share a food photo or meal and ask you to log it to my calories tracker:',
      '1. Estimate realistic calories and macros (protein, carbs, fat) plus category (Breakfast, Lunch, Dinner, Snacks, Protein, Drinks).',
      '2. Output the breakdown clearly and include a clickable link built from this exact template (URL-encode MEAL_NAME):',
      `[Add to Aetherix](${linkTemplate})`,
    ].join('\n')
  }

  // claude
  return [
    'When I upload a meal photo or describe food and ask to log it in Aetherix:',
    '1. Estimate realistic calories, proteinG, carbsG, fatG, fiberG, serving unit, and category (Breakfast, Lunch, Dinner, Snacks, Protein, Drinks, General).',
    '2. Present a concise summary and end with this clickable Quick-Log link (URL-encode values):',
    `[Add to Aetherix](${linkTemplate})`,
    'Or output JSON with keys { name, kcal, proteinG, carbsG, fatG, fiberG, category, unitLabel, qty, sourceAi: "claude" } so I can paste it in Aetherix -> AI Import.',
  ].join('\n')
}

/* ---------- Server API Helpers ---------- */

export async function fetchAiKeyStatus() {
  return api('/api/ai/key', { method: 'GET' })
}

export async function generateAiSyncKey() {
  return api('/api/ai/key', { method: 'POST', body: '{}' })
}

export async function revokeAiSyncKey() {
  return api('/api/ai/key', { method: 'DELETE' })
}

function nutritionTargetUrl(path) {
  const remote = remoteAuth()
  if (remote?.base) return { url: remote.base + path, headers: remote.headers || {} }
  return { url: appBase().replace(/\/$/, '') + path, headers: {} }
}

/**
 * Downscales & JPEG-compresses a user-selected meal photo on-device (max 1280px edge)
 * before sending it to `/api/ai/analyze-photo` so mobile photos upload fast and reliably.
 */
export async function compressFoodPhoto(file) {
  if (!file) throw new Error('Select a food photo first.')
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the selected photo.'))
    reader.readAsDataURL(file)
  })

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return { base64: rawDataUrl, mimeType: file.type || 'image/jpeg' }
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = rawDataUrl
    })
    const maxEdge = 1280
    const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1))
    const w = Math.max(1, Math.round((img.width || 1) * scale))
    const h = Math.max(1, Math.round((img.height || 1) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return { base64: rawDataUrl, mimeType: file.type || 'image/jpeg' }
    ctx.drawImage(img, 0, 0, w, h)
    const jpegUrl = canvas.toDataURL('image/jpeg', 0.85)
    if (jpegUrl && jpegUrl.startsWith('data:image/')) {
      return { base64: jpegUrl, mimeType: 'image/jpeg' }
    }
  } catch {
    // Fallback to raw data URL (e.g. happy-dom tests or unsupported image codec)
  }

  return { base64: rawDataUrl, mimeType: file.type || 'image/jpeg' }
}

export async function analyzeFoodPhotoClient(fileOrPayload, hint = '') {
  const payload = typeof fileOrPayload === 'string'
    ? { base64: fileOrPayload, mimeType: 'image/jpeg', hint }
    : fileOrPayload && typeof fileOrPayload === 'object' && 'base64' in fileOrPayload
      ? { base64: fileOrPayload.base64, mimeType: fileOrPayload.mimeType || 'image/jpeg', hint }
      : { ...(await compressFoodPhoto(fileOrPayload)), hint }

  const { url, headers } = nutritionTargetUrl('/api/ai/analyze-photo')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    err.code = data?.code || 'photo-scan-failed'
    throw err
  }
  const normalized = normalizeAiMealInput(data?.meal || data, 'gemini')
  if (!normalized) throw new Error('Could not read meal details from photo.')
  return normalized
}
