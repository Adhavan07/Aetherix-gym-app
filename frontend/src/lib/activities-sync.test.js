import { describe, expect, it } from 'vitest'
import * as ServerStamps from '../../../api/sync-stamps.js'
import { highestStamp, mergeDeletions, mergeStates, stampChange, sinceReset, resetIdsOf } from './sync-merge.js'

const clone = v => JSON.parse(JSON.stringify(v))
const edit = (prev, wall, mut) => {
  const next = clone(prev)
  mut(next)
  next._ts = stampChange(prev, next, wall)
  return next
}

describe('activities: multi-device stamp sync and conflict resolution', () => {
  const T = 1_800_100_000_000
  const baseState = () => ({
    _ts: T,
    unit: 'kg',
    workouts: [],
    routines: [],
    activities: [
      { id: 'a1', name: 'Badminton', sportKey: 'badminton', d: '2026-10-05', durationMin: 45, mode: 'met', met: 5.5, bwKg: 72, kcal: 297, at: T, _ts: T },
    ],
  })

  it('unions concurrent offline activities from two devices without loss', () => {
    const base = baseState()
    const phone = edit(base, T + 1000, s => {
      s.activities.push({ id: 'a2', name: 'Football', sportKey: 'football', d: '2026-10-06', durationMin: 60, mode: 'met', met: 7, bwKg: 72, kcal: 504, at: T + 1000 })
    })
    const laptop = edit(base, T + 2000, s => {
      s.activities.push({ id: 'a3', name: 'Swimming', sportKey: 'swimming', d: '2026-10-06', durationMin: 30, mode: 'manual', kcal: 310, at: T + 2000 })
    })

    for (const merged of [mergeStates(phone, laptop), mergeStates(laptop, phone)]) {
      expect(merged.activities.map(a => a.id)).toEqual(['a1', 'a2', 'a3'])
    }
  })

  it('merges concurrent edits to different fields of the same activity', () => {
    const base = baseState()
    const phone = edit(base, T + 1000, s => {
      s.activities[0] = { ...s.activities[0], durationMin: 60, kcal: 396 }
    })
    const laptop = edit(base, T + 2000, s => {
      s.activities[0] = { ...s.activities[0], note: 'Evening court session' }
    })

    for (const merged of [mergeStates(phone, laptop), mergeStates(laptop, phone)]) {
      expect(merged.activities[0].durationMin).toBe(60)
      expect(merged.activities[0].kcal).toBe(396)
      expect(merged.activities[0].note).toBe('Evening court session')
    }
  })

  it('keeps deleted activities deleted when an offline device reconnects', () => {
    const base = baseState()
    const phone = edit(base, T + 3000, s => {
      s.activities = []
    })
    const laptop = edit(base, T + 1000, s => {
      s.restSec = 120
    })

    expect(phone.deleted.activities.a1).toBeGreaterThan(T)
    for (const merged of [mergeStates(phone, laptop), mergeStates(laptop, phone)]) {
      expect(merged.activities).toEqual([])
      expect(merged.restSec).toBe(120)
    }
  })

  it('agrees with api/sync-stamps.js on highestStamp, mergeDeletions, and unstamped API writes', () => {
    const base = baseState()
    const changed = edit(base, T + 2000, s => {
      s.activities[0] = { ...s.activities[0], kcal: 320 }
    })
    expect(ServerStamps.highestStamp(changed)).toBe(highestStamp(changed))

    const delA = { activities: { a1: T + 500 } }
    const delB = { activities: { a1: -(T + 900), a2: T + 300 } }
    expect(ServerStamps.mergeDeletions(delA, delB)).toEqual(mergeDeletions(delA, delB))

    // Unstamped API client removes a1 while phone logs a2
    const apiDoc = clone(base)
    apiDoc.activities = []
    apiDoc._ts = T + 1500
    ServerStamps.stampPut(base, apiDoc, { overRead: true, now: T + 1500 })

    const phone = edit(base, T + 2500, s => {
      s.activities.push({ id: 'a2', name: 'Running', d: '2026-10-07', durationMin: 30, mode: 'manual', kcal: 340, at: T + 2500 })
    })
    const merged = mergeStates(phone, apiDoc)
    expect(merged.activities.map(a => a.id)).toEqual(['a2'])

    // Reset wipes prior activities while keeping post-reset activities
    const ids = resetIdsOf(base)
    const afterReset = sinceReset(phone, T + 2000, ids)
    expect(afterReset.activities.map(a => a.id)).toEqual(['a2'])
  })
})
