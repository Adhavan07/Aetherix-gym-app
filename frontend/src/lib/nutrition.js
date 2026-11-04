import { uid, todayISO } from './format.js'
import { sanitizeNutrients, dailyNutrientTotals } from './nutrition-facts.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const SUGGESTED_TARGETS = [1500, 1800, 2000, 2200, 2500]
export const UNIT_PRESETS = ['piece', 'serving', 'bowl', 'cup', '100g', 'slice', 'plate']
export const FOOD_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Protein', 'Drinks', 'General']
export const DEFAULT_FOOD_CATEGORY = 'General'

/**
 * Normalizes a category label. Empty or missing values fall back to 'General';
 * built-in category names normalize to canonical casing while custom labels preserve theirs.
 */
export function normalizeFoodCategory(val) {
  const raw = typeof val === 'string' ? val.trim().replace(/\s+/g, ' ') : ''
  if (!raw) return DEFAULT_FOOD_CATEGORY
  const match = FOOD_CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase())
  return match || raw
}

export function foodCategoryOf(food) {
  return normalizeFoodCategory(food?.category)
}

/**
 * Returns the distinct categories present in `foods`, ordered with `FOOD_CATEGORIES`
 * first followed by any custom categories alphabetically.
 */
export function foodCategoriesIn(foods) {
  const seen = new Map()
  for (const f of Array.isArray(foods) ? foods : []) {
    if (!f || typeof f !== 'object') continue
    const cat = foodCategoryOf(f)
    const key = cat.toLowerCase()
    if (!seen.has(key)) seen.set(key, cat)
  }
  const orderIndex = cat => {
    const idx = FOOD_CATEGORIES.findIndex(c => c.toLowerCase() === cat.toLowerCase())
    return idx >= 0 ? idx : FOOD_CATEGORIES.length
  }
  return [...seen.values()].sort((a, b) => {
    const oa = orderIndex(a)
    const ob = orderIndex(b)
    if (oa !== ob) return oa - ob
    return a.toLowerCase().localeCompare(b.toLowerCase())
  })
}

/**
 * Groups an ordered list of foods by category, preserving item rank within each category
 * and ordering categories by `FOOD_CATEGORIES` then alphabetical custom names.
 */
export function groupFoodsByCategory(foods) {
  const list = Array.isArray(foods) ? foods.filter(x => x && typeof x === 'object') : []
  if (!list.length) return []
  const buckets = new Map()
  for (const item of list) {
    const cat = foodCategoryOf(item)
    const key = cat.toLowerCase()
    if (!buckets.has(key)) buckets.set(key, { category: cat, items: [] })
    buckets.get(key).items.push(item)
  }
  const orderIndex = cat => {
    const idx = FOOD_CATEGORIES.findIndex(c => c.toLowerCase() === cat.toLowerCase())
    return idx >= 0 ? idx : FOOD_CATEGORIES.length
  }
  return [...buckets.values()].sort((a, b) => {
    const oa = orderIndex(a.category)
    const ob = orderIndex(b.category)
    if (oa !== ob) return oa - ob
    return a.category.toLowerCase().localeCompare(b.category.toLowerCase())
  })
}

function isValidISODate(d) {
  if (typeof d !== 'string' || !ISO_DATE.test(d)) return false
  const ms = Date.parse(`${d}T00:00:00Z`)
  return !Number.isNaN(ms)
}

/** Shifts an ISO date ('YYYY-MM-DD') by `deltaDays` at local noon so DST never shifts a day. */
export function shiftDateISO(dateISO, deltaDays) {
  const base = isValidISODate(dateISO) ? dateISO : todayISO()
  const d = new Date(`${base}T12:00:00`)
  d.setDate(d.getDate() + (Number(deltaDays) || 0))
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}

/**
 * Validates a daily calorie target. `null`, `undefined`, or `''` clears the target (`target: null`).
 * Otherwise requires a finite number in `500..15000`.
 */
export function validateCalorieTarget(val) {
  if (val === null || val === undefined || val === '') {
    return { target: null, error: null }
  }
  const n = Number(val)
  if (!Number.isFinite(n) || n < 500 || n > 15000) {
    return { target: null, error: 'Daily target must be between 500 and 15,000 kcal.' }
  }
  return { target: Math.round(n), error: null }
}

/** Computes rounded calories for `qty` units of `kcalPerUnit` (e.g. Idli 50 kcal * 3 = 150 kcal). */
export function calculateFoodKcal(kcalPerUnit, qty) {
  const k = Number(kcalPerUnit)
  const q = Number(qty)
  if (!Number.isFinite(k) || k <= 0 || !Number.isFinite(q) || q <= 0) return 0
  return Math.max(1, Math.round(k * q))
}

/** Validates and constructs a personal food library item. */
export function buildFoodItem(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return { food: null, error: 'Enter a food name.' }
  if (name.length > 80) return { food: null, error: 'Food name must be 80 characters or fewer.' }

  const rawUnit = typeof input.unitLabel === 'string' ? input.unitLabel.trim() : ''
  const unitLabel = rawUnit || 'piece'
  if (unitLabel.length > 24) {
    return { food: null, error: 'Unit label must be 24 characters or fewer.' }
  }

  const rawCategory = typeof input.category === 'string' ? input.category.trim().replace(/\s+/g, ' ') : ''
  if (rawCategory.length > 32) {
    return { food: null, error: 'Category must be 32 characters or fewer.' }
  }
  const category = normalizeFoodCategory(rawCategory)

  const k = Number(input.kcalPerUnit)
  if (!Number.isFinite(k) || k < 1 || k > 5000) {
    return { food: null, error: 'Calories per unit must be between 1 and 5,000 kcal.' }
  }
  const kcalPerUnit = Math.round(k)

  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : uid()
  const at = Number.isFinite(Number(input.at)) && Number(input.at) > 0 ? Math.round(Number(input.at)) : Date.now()
  const nutrients = sanitizeNutrients(input.nutrients)
  const nutrientSource = typeof input.nutrientSource === 'string' && input.nutrientSource.trim()
    ? input.nutrientSource.trim().slice(0, 40)
    : null

  return {
    food: {
      id,
      name,
      category,
      unitLabel,
      kcalPerUnit,
      ...(nutrients ? { nutrients } : {}),
      ...(nutrientSource ? { nutrientSource } : {}),
      fav: Boolean(input.fav),
      at,
    },
    error: null,
  }
}

/**
 * Validates and constructs a daily food log entry. Denormalizes `name`, `unitLabel`, and
 * `kcalPerUnit` so historical daily totals stay accurate even if the food library changes later.
 */
export function buildFoodLogEntry(input = {}) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return { entry: null, error: 'Choose or enter a food name.' }
  if (name.length > 80) return { entry: null, error: 'Food name must be 80 characters or fewer.' }

  const d = input.d || todayISO()
  if (!isValidISODate(d)) return { entry: null, error: 'Pick a valid date (YYYY-MM-DD).' }

  const rawUnit = typeof input.unitLabel === 'string' ? input.unitLabel.trim() : ''
  const unitLabel = rawUnit || 'piece'
  if (unitLabel.length > 24) {
    return { entry: null, error: 'Unit label must be 24 characters or fewer.' }
  }

  const k = Number(input.kcalPerUnit)
  if (!Number.isFinite(k) || k < 1 || k > 5000) {
    return { entry: null, error: 'Calories per unit must be between 1 and 5,000 kcal.' }
  }
  const kcalPerUnit = Math.round(k)

  const rawQty = Number(input.qty)
  if (!Number.isFinite(rawQty) || rawQty < 0.1 || rawQty > 100) {
    return { entry: null, error: 'Quantity must be between 0.1 and 100.' }
  }
  const qty = Math.round(rawQty * 100) / 100
  const kcal = calculateFoodKcal(kcalPerUnit, qty)

  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : uid()
  const at = Number.isFinite(Number(input.at)) && Number(input.at) > 0 ? Math.round(Number(input.at)) : Date.now()
  const foodId = typeof input.foodId === 'string' && input.foodId.trim() ? input.foodId.trim() : null
  const nutrients = sanitizeNutrients(input.nutrients)
  const nutrientSource = typeof input.nutrientSource === 'string' && input.nutrientSource.trim()
    ? input.nutrientSource.trim().slice(0, 40)
    : null

  return {
    entry: {
      id,
      d,
      ...(foodId ? { foodId } : {}),
      name,
      unitLabel,
      kcalPerUnit,
      qty,
      kcal,
      ...(nutrients ? { nutrients } : {}),
      ...(nutrientSource ? { nutrientSource } : {}),
      at,
    },
    error: null,
  }
}

/** Deterministic sort for food library items: favourites first, then alphabetical, then id. */
export function sortFoods(list) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && typeof x === 'object')
    .slice()
    .sort((a, b) => {
      const fa = a.fav === true ? 1 : 0
      const fb = b.fav === true ? 1 : 0
      if (fa !== fb) return fb - fa
      const na = String(a.name || '').toLowerCase()
      const nb = String(b.name || '').toLowerCase()
      if (na !== nb) return na < nb ? -1 : 1
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
}

/** Deterministic chronological sort for daily food log entries: date, timestamp, id. */
export function sortFoodLog(list) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && typeof x === 'object')
    .slice()
    .sort((a, b) => {
      const da = String(a.d || '')
      const db = String(b.d || '')
      if (da !== db) return da < db ? -1 : 1
      const ta = Number(a.at) || 0
      const tb = Number(b.at) || 0
      if (ta !== tb) return ta - tb
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
}

export function foodLogOnDate(S, dateISO) {
  const d = isValidISODate(dateISO) ? dateISO : todayISO()
  return sortFoodLog((Array.isArray(S?.foodLog) ? S.foodLog : []).filter(e => e && e.d === d))
}

/**
 * Computes eaten vs remaining calories for `dateISO`.
 * Remaining is strictly `target - eaten` (activity burn is tracked separately).
 */
export function dailyNutritionSummary(S, dateISO) {
  const date = isValidISODate(dateISO) ? dateISO : todayISO()
  const rawTarget = Number(S?.calorieTarget)
  const target = Number.isFinite(rawTarget) && rawTarget > 0 ? Math.round(rawTarget) : null
  const entries = foodLogOnDate(S, date)
  const eaten = entries.reduce((sum, e) => sum + Math.max(0, Math.round(Number(e.kcal) || 0)), 0)
  const remaining = target != null ? target - eaten : null
  const isOver = remaining != null && remaining < 0
  const overBy = isOver ? Math.abs(remaining) : 0
  const progressPct = target ? Math.max(0, Math.round((eaten / target) * 100)) : 0
  const barPct = Math.min(100, progressPct)

  const nutrients = dailyNutrientTotals(entries, S?.foods)

  return {
    date,
    target,
    eaten,
    remaining,
    isOver,
    overBy,
    progressPct,
    barPct,
    count: entries.length,
    entries,
    nutrients,
  }
}

/**
 * Ranks personal food library items for Quick-Add:
 *   1. Starred (`fav === true`) items first
 *   2. Higher historical log count in `S.foodLog`
 *   3. Most recently logged / added timestamp (`at`)
 *   4. Alphabetical tie-break
 * Optional `opts.category` filters to a single category (case-insensitive) before slicing.
 */
export function frequentFoods(S, limit = 8, opts = {}) {
  const allFoods = Array.isArray(S?.foods) ? S.foods.filter(x => x && typeof x === 'object' && x.id) : []
  if (!allFoods.length || limit <= 0) return []

  const filterCat = typeof opts?.category === 'string' ? opts.category.trim().toLowerCase() : ''
  const foods = filterCat && filterCat !== 'all'
    ? allFoods.filter(f => foodCategoryOf(f).toLowerCase() === filterCat)
    : allFoods
  if (!foods.length) return []

  const counts = new Map()
  const lastAt = new Map()
  const byNameId = new Map()
  for (const f of allFoods) {
    const key = String(f.name || '').trim().toLowerCase()
    if (key && !byNameId.has(key)) byNameId.set(key, f.id)
  }

  for (const e of Array.isArray(S?.foodLog) ? S.foodLog : []) {
    if (!e || typeof e !== 'object') continue
    const fid = e.foodId || byNameId.get(String(e.name || '').trim().toLowerCase())
    if (!fid) continue
    counts.set(fid, (counts.get(fid) || 0) + 1)
    const at = Number(e.at) || 0
    if (at > (lastAt.get(fid) || 0)) lastAt.set(fid, at)
  }

  return foods
    .slice()
    .sort((a, b) => {
      const fa = a.fav === true ? 1 : 0
      const fb = b.fav === true ? 1 : 0
      if (fa !== fb) return fb - fa
      const ca = counts.get(a.id) || 0
      const cb = counts.get(b.id) || 0
      if (ca !== cb) return cb - ca
      const la = Math.max(lastAt.get(a.id) || 0, Number(a.at) || 0)
      const lb = Math.max(lastAt.get(b.id) || 0, Number(b.at) || 0)
      if (la !== lb) return lb - la
      return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase())
    })
    .slice(0, limit)
}
