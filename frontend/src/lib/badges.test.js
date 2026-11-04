import { describe, expect, it } from 'vitest'
import { BADGE_CATALOG, evaluateBadges, unlockBadgeInState } from './badges.js'
import { mergeStates, stampChange } from './sync-merge.js'

const clone = x => JSON.parse(JSON.stringify(x))

describe('Anime character sticker badges evaluator & sync', () => {
  it('evaluates locked progress on a fresh profile and unlocks each milestone cleanly', () => {
    const empty = {
      workouts: [],
      activities: [],
      routines: [],
      programmes: {},
      calorieTarget: null,
      foodLog: [],
      badges: {},
    }

    const base = evaluateBadges(empty, null)
    expect(base.totalCount).toBe(BADGE_CATALOG.length)
    expect(base.unlockedCount).toBe(0)
    expect(base.newlyEarnedIds).toEqual([])

    // 1. Account sign-in unlocks hunter_awakening
    const withUser = evaluateBadges(empty, { id: 'u1', name: 'Jinwoo' })
    expect(withUser.unlockedCount).toBe(1)
    expect(withUser.newlyEarnedIds).toEqual(['hunter_awakening'])

    // 2. Creating a routine + logging 1 workout + setting calorie target & food log + sharing plan
    const rich = {
      workouts: [{ id: 'w1', d: '2026-11-04', ex: [] }],
      activities: [{ id: 'a1', d: '2026-11-04', kcal: 320 }],
      routines: [{ id: 'r1', name: 'Push Day', ex: [] }],
      programmes: {},
      calorieTarget: 2000,
      foodLog: [{ id: 'fl1', d: '2026-11-04', name: 'Idli', kcal: 150 }],
      badges: {},
    }
    expect(unlockBadgeInState(rich, 'guild_envoy', 1500)).toBe(true)
    // Idempotent second call returns false
    expect(unlockBadgeInState(rich, 'guild_envoy', 2500)).toBe(false)
    expect(rich.badges.guild_envoy.unlockedAt).toBe(1500)

    const unlocked = evaluateBadges(rich, { id: 'u1', name: 'Jinwoo' })
    // All 5 base stickers unlocked -> shadow_sovereign also unlocks via >=4 stickers!
    expect(unlocked.unlockedCount).toBe(6)
    expect(unlocked.pct).toBe(100)
    // guild_envoy was already persisted in `rich.badges`, so newlyEarnedIds contains the other 5
    expect(unlocked.newlyEarnedIds).toEqual([
      'hunter_awakening',
      'plan_architect',
      'first_gate',
      'mana_alchemist',
      'shadow_sovereign',
    ])
  })

  it('merges unlocked badges across two offline devices without losing either sticker', () => {
    const seed = { workouts: [], badges: {} }
    const devA = clone(seed)
    const beforeA = clone(devA)
    unlockBadgeInState(devA, 'plan_architect', 2000)
    devA._ts = stampChange(beforeA, devA, 2000)

    const devB = clone(seed)
    const beforeB = clone(devB)
    unlockBadgeInState(devB, 'guild_envoy', 3000)
    devB._ts = stampChange(beforeB, devB, 3000)

    const merged = mergeStates(devA, devB)
    expect(merged.badges.plan_architect.unlockedAt).toBe(2000)
    expect(merged.badges.guild_envoy.unlockedAt).toBe(3000)
  })
})
