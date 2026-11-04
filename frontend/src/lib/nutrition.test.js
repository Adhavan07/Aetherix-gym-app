import { describe, expect, it } from 'vitest'
import {
  SUGGESTED_TARGETS,
  FOOD_CATEGORIES,
  normalizeFoodCategory,
  foodCategoryOf,
  foodCategoriesIn,
  groupFoodsByCategory,
  shiftDateISO,
  validateCalorieTarget,
  calculateFoodKcal,
  buildFoodItem,
  buildFoodLogEntry,
  sortFoods,
  sortFoodLog,
  dailyNutritionSummary,
  frequentFoods,
} from './nutrition.js'

describe('nutrition pure logic', () => {
  it('exposes standard calorie target presets including 1800 kcal and standard food categories', () => {
    expect(SUGGESTED_TARGETS).toContain(1800)
    expect(FOOD_CATEGORIES).toEqual(expect.arrayContaining(['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Protein', 'Drinks', 'General']))
  })

  it('validates daily calorie targets and supports clearing back to null', () => {
    expect(validateCalorieTarget(null)).toEqual({ target: null, error: null })
    expect(validateCalorieTarget('')).toEqual({ target: null, error: null })
    expect(validateCalorieTarget(1800)).toEqual({ target: 1800, error: null })
    expect(validateCalorieTarget('1849.6')).toEqual({ target: 1850, error: null })
    expect(validateCalorieTarget(300).error).toMatch(/500/)
    expect(validateCalorieTarget(20000).error).toMatch(/15,000/)
  })

  it('builds and validates personal food library items with normalized category', () => {
    const { food, error } = buildFoodItem({
      id: 'f-idli',
      name: '  Idli  ',
      category: '  breakfast  ',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      fav: true,
      at: 1000,
    })
    expect(error).toBeNull()
    expect(food).toEqual({
      id: 'f-idli',
      name: 'Idli',
      category: 'Breakfast',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      fav: true,
      at: 1000,
    })

    // Defaults missing category to General and preserves custom category labels
    const { food: uncategorized } = buildFoodItem({ id: 'f-rice', name: 'Rice', kcalPerUnit: 200, at: 1000 })
    expect(uncategorized.category).toBe('General')
    expect(foodCategoryOf({ id: 'legacy', name: 'Old item', kcalPerUnit: 80 })).toBe('General')
    expect(normalizeFoodCategory('Pre-workout')).toBe('Pre-workout')

    expect(buildFoodItem({ name: '   ', kcalPerUnit: 50 }).error).toMatch(/food name/i)
    expect(buildFoodItem({ name: 'Rice', kcalPerUnit: 0 }).error).toMatch(/between 1 and 5,000/i)
    expect(buildFoodItem({ name: 'Rice', category: 'x'.repeat(33), kcalPerUnit: 100 }).error).toMatch(/32 characters/i)
  })

  it('calculates logged food calories accurately for integer and fractional quantities', () => {
    // Idli x 3 = 150 kcal
    expect(calculateFoodKcal(50, 3)).toBe(150)
    // Oats bowl x 1.5 = 225 kcal
    expect(calculateFoodKcal(150, 1.5)).toBe(225)

    const { entry, error } = buildFoodLogEntry({
      id: 'log-1',
      d: '2026-11-03',
      foodId: 'f-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 3,
      at: 5000,
    })
    expect(error).toBeNull()
    expect(entry).toEqual({
      id: 'log-1',
      d: '2026-11-03',
      foodId: 'f-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 3,
      kcal: 150,
      at: 5000,
    })
  })

  it('computes eaten vs remaining strictly from food target minus eaten', () => {
    const S = {
      calorieTarget: 1800,
      // Activity burn present on the same day must NOT alter food remaining budget
      activities: [{ id: 'a1', d: '2026-11-03', name: 'Badminton', durationMin: 60, mode: 'manual', kcal: 400 }],
      foodLog: [
        { id: 'l1', d: '2026-11-03', name: 'Idli', unitLabel: 'piece', kcalPerUnit: 50, qty: 3, kcal: 150, at: 100 },
        { id: 'l2', d: '2026-11-03', name: 'Sambar', unitLabel: 'bowl', kcalPerUnit: 130, qty: 1, kcal: 130, at: 200 },
        { id: 'l3', d: '2026-11-02', name: 'Dosa', unitLabel: 'piece', kcalPerUnit: 180, qty: 2, kcal: 360, at: 50 },
      ],
    }

    const day = dailyNutritionSummary(S, '2026-11-03')
    expect(day.target).toBe(1800)
    expect(day.eaten).toBe(280)
    expect(day.remaining).toBe(1520)
    expect(day.isOver).toBe(false)
    expect(day.overBy).toBe(0)
    expect(day.count).toBe(2)

    // Over-target day
    const overState = {
      calorieTarget: 1800,
      foodLog: [
        { id: 'l4', d: '2026-11-03', name: 'Thali', unitLabel: 'plate', kcalPerUnit: 980, qty: 2, kcal: 1960, at: 300 },
      ],
    }
    const over = dailyNutritionSummary(overState, '2026-11-03')
    expect(over.eaten).toBe(1960)
    expect(over.remaining).toBe(-160)
    expect(over.isOver).toBe(true)
    expect(over.overBy).toBe(160)
    expect(over.barPct).toBe(100)

    // Unset target
    const noTarget = dailyNutritionSummary({ calorieTarget: null, foodLog: S.foodLog }, '2026-11-03')
    expect(noTarget.target).toBeNull()
    expect(noTarget.eaten).toBe(280)
    expect(noTarget.remaining).toBeNull()
    expect(noTarget.isOver).toBe(false)
  })

  it('preserves historical log kcal even if the library item changes later', () => {
    const { food } = buildFoodItem({ id: 'f1', name: 'Idli', unitLabel: 'piece', kcalPerUnit: 50 })
    const { entry } = buildFoodLogEntry({
      id: 'e1',
      d: '2026-11-01',
      foodId: food.id,
      name: food.name,
      unitLabel: food.unitLabel,
      kcalPerUnit: food.kcalPerUnit,
      qty: 3,
    })
    const updatedFood = { ...food, kcalPerUnit: 75 }
    const S = { calorieTarget: 1800, foods: [updatedFood], foodLog: [entry] }
    expect(dailyNutritionSummary(S, '2026-11-01').eaten).toBe(150)
  })

  it('ranks frequentFoods, filters by category, and groups foods by category in canonical order', () => {
    const foods = [
      { id: 'f-apple', name: 'Apple', category: 'Snacks', unitLabel: 'piece', kcalPerUnit: 80, fav: false, at: 100 },
      { id: 'f-idli', name: 'Idli', category: 'Breakfast', unitLabel: 'piece', kcalPerUnit: 50, fav: false, at: 200 },
      { id: 'f-whey', name: 'Whey scoop', category: 'Protein', unitLabel: 'serving', kcalPerUnit: 120, fav: true, at: 50 },
      { id: 'f-oats', name: 'Oats', category: 'Breakfast', unitLabel: 'bowl', kcalPerUnit: 150, fav: false, at: 300 },
      { id: 'f-gel', name: 'Carb gel', category: 'Pre-workout', unitLabel: 'serving', kcalPerUnit: 100, fav: false, at: 120 },
    ]
    const foodLog = [
      { id: '1', d: '2026-11-01', foodId: 'f-idli', name: 'Idli', kcal: 150, at: 1000 },
      { id: '2', d: '2026-11-02', foodId: 'f-idli', name: 'Idli', kcal: 150, at: 2000 },
      { id: '3', d: '2026-11-03', foodId: 'f-apple', name: 'Apple', kcal: 80, at: 3000 },
    ]
    const ranked = frequentFoods({ foods, foodLog }, 5)
    expect(ranked.map(f => f.id)).toEqual(['f-whey', 'f-idli', 'f-apple', 'f-oats', 'f-gel'])

    // Category filter keeps rank order within that category
    const breakfastOnly = frequentFoods({ foods, foodLog }, 5, { category: 'breakfast' })
    expect(breakfastOnly.map(f => f.id)).toEqual(['f-idli', 'f-oats'])

    // Categories list places built-in categories first, then custom categories alphabetically
    expect(foodCategoriesIn(foods)).toEqual(['Breakfast', 'Snacks', 'Protein', 'Pre-workout'])

    // Grouping preserves item rank within each category
    const grouped = groupFoodsByCategory(ranked)
    expect(grouped.map(g => ({ category: g.category, ids: g.items.map(i => i.id) }))).toEqual([
      { category: 'Breakfast', ids: ['f-idli', 'f-oats'] },
      { category: 'Snacks', ids: ['f-apple'] },
      { category: 'Protein', ids: ['f-whey'] },
      { category: 'Pre-workout', ids: ['f-gel'] },
    ])
  })

  it('sorts food items and logs deterministically and shifts ISO dates cleanly', () => {
    expect(shiftDateISO('2026-11-01', -1)).toBe('2026-10-31')
    expect(shiftDateISO('2026-11-01', 2)).toBe('2026-11-03')
    expect(sortFoods([
      { id: '2', name: 'Banana', fav: false },
      { id: '1', name: 'Oats', fav: true },
    ]).map(x => x.id)).toEqual(['1', '2'])
    expect(sortFoodLog([
      { id: 'b', d: '2026-11-03', at: 200 },
      { id: 'a', d: '2026-11-03', at: 100 },
    ]).map(x => x.id)).toEqual(['a', 'b'])
  })
})
