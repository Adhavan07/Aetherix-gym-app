import { describe, expect, it } from 'vitest'
import {
  MACRO_FIELDS,
  MICRO_FIELDS,
  searchNutritionCatalog,
  analyzeFoodText,
  resolveEntryNutrition,
  dailyNutrientTotals,
  macroCalorieSplit,
  percentDV,
} from './nutrition-facts.js'

describe('nutrition-facts dataset & meal analyzer', () => {
  it('searches exact and fuzzy food aliases such as doasa -> Plain Dosa', () => {
    const dosaMatches = searchNutritionCatalog('doasa', 5)
    expect(dosaMatches.length).toBeGreaterThan(0)
    expect(dosaMatches[0].id).toBe('dosa')
    expect(dosaMatches[0].name).toBe('Plain Dosa')

    const curryMatches = searchNutritionCatalog('fish curry', 5)
    expect(curryMatches[0].id).toBe('fish-curry')
  })

  it('analyzes multi-item meal "3 doasa and fish curry" with macro and micronutrient totals', () => {
    const res = analyzeFoodText('3 doasa and fish curry')
    expect(res.matched).toBe(true)
    expect(res.items.map(x => x.id)).toEqual(['dosa', 'fish-curry'])
    expect(res.items[0].qty).toBe(3)
    // 3 * 133 + 245 = 644 kcal
    expect(res.estimatedKcal).toBe(644)
    expect(res.kcal).toBe(644)
    // Macros: 3 * 3.6 + 22.8 = 33.6g protein; 3 * 23.2 + 7.4 = 77g carbs; 3 * 2.9 + 13.8 = 22.5g fat
    expect(res.nutrients.proteinG).toBeCloseTo(33.6, 1)
    expect(res.nutrients.carbsG).toBeCloseTo(77.0, 1)
    expect(res.nutrients.fatG).toBeCloseTo(22.5, 1)
    // Micronutrients: iron 3*1.1 + 1.9 = 5.2mg, calcium 3*18 + 58 = 112mg, vitB12 3.6mcg
    expect(res.nutrients.ironMg).toBeCloseTo(5.2, 1)
    expect(res.nutrients.calciumMg).toBe(112)
    expect(res.nutrients.vitB12Mcg).toBeCloseTo(3.6, 1)

    // Scales cleanly when user enters a custom calorie override (e.g. 366 kcal)
    const scaled = analyzeFoodText('3 doasa and fish curry', 366)
    expect(scaled.kcal).toBe(366)
    expect(scaled.estimatedKcal).toBe(644)
    expect(scaled.nutrients.proteinG).toBeLessThan(res.nutrients.proteinG)
    expect(scaled.nutrients.proteinG).toBeGreaterThan(15)
  })

  it('analyzes word-number combo meal "rice and fish curry and two eggs"', () => {
    const res = analyzeFoodText('rice and fish curry and two eggs')
    expect(res.matched).toBe(true)
    expect(res.items.map(x => x.id)).toEqual(['cooked-rice', 'fish-curry', 'boiled-egg'])
    expect(res.items[2].qty).toBe(2)
    // 234 + 245 + 2*78 = 635 kcal
    expect(res.estimatedKcal).toBe(635)
    // Cholesterol includes fish curry (68mg) + 2 eggs (2*186 = 372mg) = 440mg
    expect(res.nutrients.cholesterolMg).toBe(440)
    expect(res.nutrients.potassiumMg).toBeGreaterThan(600)
  })

  it('resolves logged entry nutrition, scales by qty, and falls back for legacy entries', () => {
    const perUnit = analyzeFoodText('Idli', 58).nutrients
    const entry = {
      id: 'log-1',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 58,
      qty: 3,
      kcal: 174,
      nutrients: perUnit,
    }
    const r3 = resolveEntryNutrition(entry, [])
    expect(r3.source).toBe('stored')
    expect(r3.nutrients.proteinG).toBeCloseTo(perUnit.proteinG * 3, 1)
    expect(r3.nutrients.carbsG).toBeCloseTo(perUnit.carbsG * 3, 1)

    // Legacy entry with no stored `nutrients` still resolves from food name
    const legacy = resolveEntryNutrition({
      id: 'legacy-1',
      name: 'rice and fish curry and two eggs',
      unitLabel: 'piece',
      kcalPerUnit: 840,
      qty: 1,
      kcal: 840,
    }, [])
    expect(legacy.nutrients.proteinG).toBeGreaterThan(35)
    expect(legacy.nutrients.vitB12Mcg).toBeGreaterThan(3)
    expect(MACRO_FIELDS.length).toBe(6)
    expect(MICRO_FIELDS.length).toBe(11)

    const split = macroCalorieSplit(legacy.nutrients)
    expect(split.proteinPct + split.carbsPct + split.fatPct).toBe(100)
    expect(percentDV('ironMg', 9)).toBe(50)

    const dayTotals = dailyNutrientTotals([entry, { ...entry, id: 'log-2', qty: 1, kcal: 58 }], [])
    expect(dayTotals.proteinG).toBeCloseTo(perUnit.proteinG * 4, 1)
  })
})
