import { describe, expect, it } from 'vitest'
import {
  SPORT_PRESETS,
  presetForKey,
  weightToKg,
  resolveBodyWeightKg,
  resolveBodyWeightInfo,
  estimateActivityKcal,
  buildActivity,
  dailyActivitySummary,
  weeklyActivitySummary,
} from './activities.js'

describe('activities: MET presets and calorie estimation', () => {
  it('provides sport presets with positive MET values', () => {
    expect(SPORT_PRESETS.length).toBeGreaterThanOrEqual(10)
    expect(presetForKey('badminton')).toMatchObject({ label: 'Badminton', met: 5.5 })
    expect(presetForKey('football')).toMatchObject({ label: 'Football', met: 7.0 })
    expect(presetForKey('unknown')).toBeNull()
  })

  it('estimates calories as MET * body weight (kg) * hours', () => {
    // Badminton (5.5 MET) * 72 kg * (45 / 60 h) = 297 kcal
    expect(estimateActivityKcal(5.5, 72, 45)).toBe(297)
    // Football (7.0 MET) * 75 kg * 1.5 h (90 min) = 787.5 -> 788 kcal
    expect(estimateActivityKcal(7.0, 75, 90)).toBe(788)
    // Invalid inputs return 0
    expect(estimateActivityKcal(0, 72, 45)).toBe(0)
    expect(estimateActivityKcal(5.5, 0, 45)).toBe(0)
    expect(estimateActivityKcal(5.5, 72, -10)).toBe(0)
  })
})

describe('activities: stored body weight resolution', () => {
  it('resolves kg stored weight on or before the activity date', () => {
    const S = {
      unit: 'kg',
      bodyweight: [
        { d: '2026-10-01', w: 74, t: 1 },
        { d: '2026-10-10', w: 72.5, t: 2 },
        { d: '2026-10-20', w: 71, t: 3 },
      ],
    }
    expect(resolveBodyWeightKg(S, '2026-10-12')).toBe(72.5)
    expect(resolveBodyWeightKg(S, '2026-10-20')).toBe(71)
    // Activity logged before first weigh-in falls back to earliest known weigh-in
    expect(resolveBodyWeightKg(S, '2026-09-15')).toBe(74)
  })

  it('converts lb stored body weight to kg for MET calculations', () => {
    const S = {
      unit: 'lb',
      bodyweight: [{ d: '2026-10-10', w: 154.3, t: 1 }],
    }
    const info = resolveBodyWeightInfo(S, '2026-10-10')
    expect(info.unit).toBe('lb')
    expect(info.raw).toBe(154.3)
    expect(info.kg).toBeCloseTo(69.99, 2)
    expect(weightToKg(165, 'lb')).toBeCloseTo(74.84, 2)
  })

  it('returns null when no body weight is stored', () => {
    expect(resolveBodyWeightKg({ unit: 'kg', bodyweight: [], workouts: [] }, '2026-10-10')).toBeNull()
  })
})

describe('activities: buildActivity validation', () => {
  const state = {
    unit: 'kg',
    bodyweight: [{ d: '2026-10-01', w: 72, t: 100 }],
  }

  it('builds a MET-based activity using stored body weight', () => {
    const { activity, error } = buildActivity({
      id: 'act-1',
      name: 'Badminton',
      sportKey: 'badminton',
      d: '2026-10-05',
      durationMin: 45,
      mode: 'met',
      met: 5.5,
      note: 'Doubles match',
      at: 1000,
    }, state)

    expect(error).toBeNull()
    expect(activity).toEqual({
      id: 'act-1',
      name: 'Badminton',
      sportKey: 'badminton',
      d: '2026-10-05',
      durationMin: 45,
      mode: 'met',
      met: 5.5,
      bwKg: 72,
      kcal: 297,
      note: 'Doubles match',
      at: 1000,
    })
  })

  it('builds a manual-calorie activity without requiring stored body weight', () => {
    const { activity, error } = buildActivity({
      id: 'act-2',
      name: 'Climbing',
      d: '2026-10-05',
      durationMin: 60,
      mode: 'manual',
      kcal: 420,
      at: 2000,
    }, { unit: 'kg', bodyweight: [] })

    expect(error).toBeNull()
    expect(activity).toEqual({
      id: 'act-2',
      name: 'Climbing',
      d: '2026-10-05',
      durationMin: 60,
      mode: 'manual',
      kcal: 420,
      at: 2000,
    })
  })

  it('rejects MET mode when no body weight is stored or provided', () => {
    const res = buildActivity({
      name: 'Badminton',
      d: '2026-10-05',
      durationMin: 45,
      mode: 'met',
      met: 5.5,
    }, { unit: 'kg', bodyweight: [] })
    expect(res.activity).toBeNull()
    expect(res.error).toMatch(/body weight/i)
  })
})

describe('activities: daily and weekly summaries next to workouts', () => {
  // 2026-10-05 is Monday, 2026-10-11 is Sunday
  const S = {
    weekStart: 1,
    activities: [
      { id: 'a1', name: 'Badminton', d: '2026-10-05', durationMin: 45, kcal: 297, at: 1 },
      { id: 'a2', name: 'Football', d: '2026-10-05', durationMin: 60, kcal: 504, at: 2 },
      { id: 'a3', name: 'Cycling', d: '2026-10-08', durationMin: 30, kcal: 270, at: 3 },
      { id: 'a0', name: 'Prev week run', d: '2026-10-04', durationMin: 40, kcal: 450, at: 0 },
    ],
    workouts: [
      { id: 'w1', d: '2026-10-05', start: 1_000_000, end: 1_000_000 + 50 * 60000, name: 'Upper' },
      { id: 'w2', d: '2026-10-07', start: 2_000_000, end: 2_000_000 + 55 * 60000, name: 'Lower' },
      { id: 'w0', d: '2026-10-04', start: 500_000, end: 500_000 + 45 * 60000, name: 'Full' },
    ],
  }

  it('computes daily totals alongside workouts', () => {
    const day = dailyActivitySummary(S, '2026-10-05')
    expect(day.count).toBe(2)
    expect(day.durationMin).toBe(105)
    expect(day.kcal).toBe(801)
    expect(day.workoutCount).toBe(1)
    expect(day.workoutDurationMin).toBe(50)
  })

  it('computes weekly totals respecting weekStart alongside workouts', () => {
    const monWeek = weeklyActivitySummary(S, '2026-10-08', 1)
    expect(monWeek.weekStartISO).toBe('2026-10-05')
    expect(monWeek.count).toBe(3)
    expect(monWeek.durationMin).toBe(135)
    expect(monWeek.kcal).toBe(1071)
    expect(monWeek.workoutCount).toBe(2)
    expect(monWeek.workoutDurationMin).toBe(105)
    expect(monWeek.activeDays).toBe(3) // Oct 5, Oct 7, Oct 8

    // With Sunday start (0), Sunday Oct 4 belongs to the week of Oct 4 - Oct 10
    const sunWeek = weeklyActivitySummary(S, '2026-10-08', 0)
    expect(sunWeek.weekStartISO).toBe('2026-10-04')
    expect(sunWeek.count).toBe(4)
    expect(sunWeek.kcal).toBe(1521)
    expect(sunWeek.workoutCount).toBe(3)
  })
})
