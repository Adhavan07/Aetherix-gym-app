// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { DEF } from '../store/useStore.js'
import { mergeStates, stampChange, stampRestore } from './sync-merge.js'
import { stampPut } from '../../../api/sync-stamps.js'
import { buildFoodItem, buildFoodLogEntry, dailyNutritionSummary } from './nutrition.js'

const clone = x => JSON.parse(JSON.stringify(x))

describe('nutrition offline and multi-device stamp sync', () => {
  it('merges concurrent foodLog additions, field-level food edits, and calorieTarget stamps across devices', () => {
    const base = clone(DEF)
    const { food: idli } = buildFoodItem({
      id: 'food-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      fav: false,
      at: 1000,
    })
    base.foods = [idli]
    base._ts = stampChange(clone(DEF), base, 1000)

    // Device A (offline): sets calorieTarget = 1800, stars Idli, categorizes Idli as 'Breakfast', logs Idli x 3 = 150 kcal
    const devA = clone(base)
    const beforeA = clone(devA)
    devA.calorieTarget = 1800
    devA.foods[0].fav = true
    devA.foods[0].category = 'Breakfast'
    devA.foodLog.push(buildFoodLogEntry({
      id: 'log-a',
      d: '2026-11-03',
      foodId: 'food-idli',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 3,
      at: 2000,
    }).entry)
    devA._ts = stampChange(beforeA, devA, 2000)

    // Device B (offline, later wall clock): updates Idli kcalPerUnit to 55, adds Dosa ('Dinner'), logs Dosa x 2 = 320 kcal
    const devB = clone(base)
    const beforeB = clone(devB)
    devB.foods[0].kcalPerUnit = 55
    const { food: dosa } = buildFoodItem({
      id: 'food-dosa',
      name: 'Dosa',
      category: 'Dinner',
      unitLabel: 'piece',
      kcalPerUnit: 160,
      fav: false,
      at: 3000,
    })
    devB.foods.push(dosa)
    devB.foodLog.push(buildFoodLogEntry({
      id: 'log-b',
      d: '2026-11-03',
      foodId: 'food-dosa',
      name: 'Dosa',
      unitLabel: 'piece',
      kcalPerUnit: 160,
      qty: 2,
      at: 3000,
    }).entry)
    devB._ts = stampChange(beforeB, devB, 3000)

    const mergedAB = mergeStates(devA, devB)
    const mergedBA = mergeStates(devB, devA)
    expect(mergedAB).toEqual(mergedBA)

    // Device A's calorieTarget = 1800 survives even though Device B had a newer _ts!
    expect(mergedAB.calorieTarget).toBe(1800)

    // Field-level merge on food-idli keeps fav: true + category: 'Breakfast' (from A) AND kcalPerUnit: 55 (from B)
    const mergedIdli = mergedAB.foods.find(f => f.id === 'food-idli')
    expect(mergedIdli.fav).toBe(true)
    expect(mergedIdli.category).toBe('Breakfast')
    expect(mergedIdli.kcalPerUnit).toBe(55)
    expect(mergedAB.foods.find(f => f.id === 'food-dosa').category).toBe('Dinner')
    expect(mergedAB.foods).toHaveLength(2)

    // Both foodLog entries are preserved and sum to 150 + 320 = 470 kcal, leaving 1330 kcal remaining
    const summary = dailyNutritionSummary(mergedAB, '2026-11-03')
    expect(summary.eaten).toBe(470)
    expect(summary.remaining).toBe(1330)
  })

  it('honours deletion tombstones for foods and foodLog and supports Undo restore', () => {
    const base = clone(DEF)
    base.foods = [buildFoodItem({ id: 'f1', name: 'Banana', unitLabel: 'piece', kcalPerUnit: 90, at: 1000 }).food]
    base.foodLog = [buildFoodLogEntry({
      id: 'l1',
      d: '2026-11-03',
      foodId: 'f1',
      name: 'Banana',
      unitLabel: 'piece',
      kcalPerUnit: 90,
      qty: 1,
      at: 1000,
    }).entry]
    base._ts = stampChange(clone(DEF), base, 1000)

    // Device A deletes the log entry
    const devA = clone(base)
    const snap = clone(devA.foodLog[0])
    const prevA = clone(devA)
    devA.foodLog = []
    devA._ts = stampChange(prevA, devA, 2000)
    expect(devA.deleted?.foodLog?.l1).toBeGreaterThanOrEqual(2000)

    // Stale offline Device B logs a workout without having seen the deletion
    const devB = clone(base)
    const prevB = clone(devB)
    devB.restSec = 120
    devB._ts = stampChange(prevB, devB, 2500)

    const afterDelete = mergeStates(devA, devB)
    expect(afterDelete.foodLog).toEqual([])

    // Undo on Device A restores the log entry and clears the tombstone
    const undoA = clone(afterDelete)
    const prevUndo = clone(undoA)
    const restored = stampRestore({ foodLog: [snap], deleted: undoA.deleted }, [undoA], 3000)
    undoA.foodLog = restored.foodLog
    undoA.deleted = restored.deleted
    undoA._ts = stampChange(prevUndo, undoA, 3000)

    const afterUndo = mergeStates(undoA, afterDelete)
    expect(afterUndo.foodLog).toHaveLength(1)
    expect(afterUndo.foodLog[0].id).toBe('l1')
  })

  it('keeps server-side stampPut in sync for foods, foodLog, and calorieTarget', () => {
    const cur = clone(DEF)
    cur.calorieTarget = 1800
    cur.foods = [buildFoodItem({ id: 'f1', name: 'Idli', unitLabel: 'piece', kcalPerUnit: 50, at: 1000 }).food]
    cur.foodLog = [buildFoodLogEntry({
      id: 'l1',
      d: '2026-11-03',
      foodId: 'f1',
      name: 'Idli',
      unitLabel: 'piece',
      kcalPerUnit: 50,
      qty: 3,
      at: 1000,
    }).entry]
    cur._ts = stampChange(clone(DEF), cur, 1000)
    cur._rev = 1

    const next = clone(cur)
    const prev = clone(next)
    next.foodLog = []
    next.calorieTarget = 2000
    next._ts = stampChange(prev, next, 2000)

    const report = {}
    stampPut(cur, next, { overRead: true, stamped: true, report })
    expect(next.deleted?.foodLog?.l1).toBeGreaterThanOrEqual(2000)
    expect(next.edited?.calorieTarget).toBeGreaterThanOrEqual(2000)
  })
})
