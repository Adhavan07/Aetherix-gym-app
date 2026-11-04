// Client-side helper for querying backend public nutrition dataset APIs
// (Edamam, Nutritionix, USDA FoodData Central, OpenFoodFacts) and enriching
// food log & library entries automatically when a food item is logged.
import { appBase, remoteAuth } from './api.js'
import { MOBILE } from './mobile.js'
import { sanitizeNutrients } from './nutrition-facts.js'
import { sortFoods, sortFoodLog } from './nutrition.js'
import { useStore } from '../store/useStore.js'

const LIVE_API_SOURCES = new Set([
  'edamam',
  'nutritionix',
  'usda',
  'openfoodfacts',
  'curated+usda',
  'curated+openfoodfacts',
  'curated+edamam',
  'curated+nutritionix',
])

export function isLiveApiSource(src) {
  return LIVE_API_SOURCES.has(String(src || '').toLowerCase())
}

export function formatNutrientSourceLabel(src, t = x => x) {
  const s = String(src || '').toLowerCase()
  switch (s) {
    case 'edamam':
    case 'curated+edamam':
      return t('Edamam Nutrition API')
    case 'nutritionix':
    case 'curated+nutritionix':
      return t('Nutritionix API')
    case 'usda':
      return t('USDA FoodData Central API')
    case 'curated+usda':
      return t('USDA FoodData Central + IFCT')
    case 'openfoodfacts':
      return t('OpenFoodFacts API')
    case 'curated+openfoodfacts':
      return t('OpenFoodFacts + IFCT')
    case 'estimated':
      return t('Category macro/micro estimate')
    case 'curated':
    case 'database':
    case 'stored':
    case 'library':
    default:
      return t('USDA & IFCT nutrition dataset')
  }
}

export function shortProviderBadge(src) {
  const s = String(src || '').toLowerCase()
  if (s.includes('edamam')) return 'Edamam'
  if (s.includes('nutritionix')) return 'Nutritionix'
  if (s.includes('usda')) return 'USDA'
  if (s.includes('openfoodfacts')) return 'OpenFoodFacts'
  return 'IFCT'
}

function nutritionEndpointUrl(path) {
  const remote = remoteAuth()
  if (remote?.base) return { url: remote.base + path, headers: remote.headers || {} }
  if (MOBILE) return null
  return { url: appBase().replace(/\/$/, '') + path, headers: {} }
}

export async function searchNutritionApi(query, limit = 12, signal) {
  if (typeof fetch !== 'function') return null
  const target = nutritionEndpointUrl(`/api/nutrition/search?q=${encodeURIComponent(query || '')}&limit=${limit}`)
  if (!target) return null
  try {
    const res = await fetch(target.url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...target.headers },
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data && Array.isArray(data.items) ? data : null
  } catch {
    return null
  }
}

export async function analyzeNutritionApi({ query, kcal = null, qty = 1, category = 'General' } = {}, signal) {
  const q = String(query || '').trim()
  if (!q || typeof fetch !== 'function') return null
  const target = nutritionEndpointUrl('/api/nutrition/analyze')
  if (!target) return null
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...target.headers,
      },
      body: JSON.stringify({ query: q, kcal, qty, category }),
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data && data.nutrients ? data : null
  } catch {
    return null
  }
}

/**
 * Fetches detailed macro and micro-nutrient profiles from the backend public nutrition
 * dataset API when a food item is logged or saved, and persists the per-unit profile onto
 * the corresponding `foodLog` entry and/or personal `foods` library item.
 */
export async function enrichLoggedFoodFromApi({
  entryId = null,
  foodId = null,
  query = '',
  kcalPerUnit = null,
  category = 'General',
} = {}) {
  const data = await analyzeNutritionApi({
    query,
    kcal: kcalPerUnit,
    qty: 1,
    category,
  })
  const perUnitNutrients = sanitizeNutrients(data?.nutrients)
  if (!perUnitNutrients) return null

  const sourceTag = String(data.source || data.provider || 'curated').slice(0, 40)

  useStore.getState().update(s => {
    if (entryId && Array.isArray(s.foodLog)) {
      const idx = s.foodLog.findIndex(e => e && e.id === entryId)
      if (idx >= 0) {
        s.foodLog = sortFoodLog(
          s.foodLog.map((e, i) => (
            i === idx
              ? { ...e, nutrients: perUnitNutrients, nutrientSource: sourceTag }
              : e
          ))
        )
      }
    }
    if (foodId && Array.isArray(s.foods)) {
      const fIdx = s.foods.findIndex(f => f && f.id === foodId)
      if (fIdx >= 0) {
        s.foods = sortFoods(
          s.foods.map((f, i) => (
            i === fIdx
              ? { ...f, nutrients: perUnitNutrients, nutrientSource: sourceTag }
              : f
          ))
        )
      }
    }
  })

  return { nutrients: perUnitNutrients, source: sourceTag, items: data.items || [] }
}
