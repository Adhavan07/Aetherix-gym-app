// Collectible anime character sticker badges & achievement progress evaluator.
// Pure functions, zero dependencies, synced across devices via `S.badges` (STAMPED_MAPS).

export const BADGE_CATALOG = [
  {
    id: 'hunter_awakening',
    title: 'Awakened Account',
    character: 'Shadow Recruit',
    subtitle: 'Create an account or sign in to sync your profile',
    howToEarn: 'Sign in or register an account in Settings so your progress syncs across devices.',
    image: 'badges/hunter-awakening.jpg',
    icon: 'bolt',
    accent: '#38bdf8',
    ctaLabel: 'Open account settings',
    route: '/settings',
  },
  {
    id: 'plan_architect',
    title: 'Plan Architect',
    character: 'Tactical Strategist',
    subtitle: 'Create or load a training plan for yourself',
    howToEarn: 'Build your own workout routine or load a starter plan in the Plan tab.',
    image: 'badges/plan-architect.jpg',
    icon: 'calendar',
    accent: '#818cf8',
    ctaLabel: 'Create a plan',
    route: '/plan',
  },
  {
    id: 'guild_envoy',
    title: 'Guild Envoy',
    character: 'Twin-Blade Messenger',
    subtitle: 'Share a workout routine or plan with others',
    howToEarn: 'Share any routine link with a friend or export your plan file from Plan.',
    image: 'badges/guild-envoy.jpg',
    icon: 'share',
    accent: '#fbbf24',
    ctaLabel: 'Open Plan to share',
    route: '/plan',
  },
  {
    id: 'first_gate',
    title: 'First Gate Cleared',
    character: 'Vanguard Striker',
    subtitle: 'Complete your first workout or sport activity',
    howToEarn: 'Finish a gym workout or log a custom sport activity to clear your first session.',
    image: 'badges/first-gate.jpg',
    icon: 'flame',
    accent: '#f87171',
    ctaLabel: 'Start workout',
    route: '/workout',
  },
  {
    id: 'mana_alchemist',
    title: 'Nutrition Alchemist',
    character: 'Elixir Chef',
    subtitle: 'Set a daily calorie target and log a meal',
    howToEarn: 'Set your daily calorie target and log at least one food item in the Food tab.',
    image: 'badges/mana-alchemist.jpg',
    icon: 'utensils',
    accent: '#34d399',
    ctaLabel: 'Open Food log',
    route: '/food',
  },
  {
    id: 'shadow_sovereign',
    title: 'Shadow Sovereign',
    character: 'Monarch Commander',
    subtitle: 'Log 3 sessions or collect 4 other stickers',
    howToEarn: 'Complete 3 total workouts/activities, or unlock at least 4 other sticker badges.',
    image: 'badges/shadow-sovereign.jpg',
    icon: 'crown',
    accent: '#a855f7',
    ctaLabel: 'Keep training',
    route: '/workout',
  },
]

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Records a badge unlock on mutable state `s` with a per-entry `_ts` stamp so
 * `mergeStampedMap` preserves unlocks across offline devices.
 */
export function unlockBadgeInState(s, badgeId, now = Date.now()) {
  if (!s || typeof s !== 'object' || !badgeId) return false
  if (!BADGE_CATALOG.some(b => b.id === badgeId)) return false
  if (!isMap(s.badges)) s.badges = {}
  const existing = s.badges[badgeId]
  if (isMap(existing) && Number(existing.unlockedAt) > 0) return false
  const ts = Math.max(1, Math.round(Number(now) || Date.now()))
  s.badges[badgeId] = { unlockedAt: ts, _ts: ts }
  return true
}

function progressFor(id, S, user, baseUnlockedCount) {
  const workoutsCount = Array.isArray(S?.workouts) ? S.workouts.length : 0
  const activitiesCount = Array.isArray(S?.activities) ? S.activities.length : 0
  const routinesCount = Array.isArray(S?.routines) ? S.routines.length : 0
  const progsCount = isMap(S?.programmes) ? Object.keys(S.programmes).length : 0
  const hasTarget = Number(S?.calorieTarget) > 0 ? 1 : 0
  const hasFoodLog = Array.isArray(S?.foodLog) && S.foodLog.length > 0 ? 1 : 0
  const stored = isMap(S?.badges?.[id]) && Number(S.badges[id].unlockedAt) > 0

  switch (id) {
    case 'hunter_awakening': {
      const done = Boolean(user?.id) || stored
      return {
        unlocked: done,
        current: done ? 1 : 0,
        target: 1,
        label: done ? 'Account synced' : '0 / 1 account connected',
      }
    }
    case 'plan_architect': {
      const totalPlans = routinesCount + progsCount
      const done = totalPlans >= 1 || stored
      return {
        unlocked: done,
        current: done ? 1 : 0,
        target: 1,
        label: done ? `${Math.max(1, totalPlans)} routine${totalPlans === 1 ? '' : 's'} ready` : '0 / 1 routine created',
      }
    }
    case 'guild_envoy': {
      const done = stored
      return {
        unlocked: done,
        current: done ? 1 : 0,
        target: 1,
        label: done ? 'Shared with others' : '0 / 1 routine or plan shared',
      }
    }
    case 'first_gate': {
      const sessions = workoutsCount + activitiesCount
      const done = sessions >= 1 || stored
      return {
        unlocked: done,
        current: Math.min(1, sessions || (done ? 1 : 0)),
        target: 1,
        label: done ? `${Math.max(1, sessions)} session${sessions === 1 ? '' : 's'} logged` : '0 / 1 session logged',
      }
    }
    case 'mana_alchemist': {
      const steps = hasTarget + hasFoodLog
      const done = steps >= 2 || stored
      return {
        unlocked: done,
        current: done ? 2 : steps,
        target: 2,
        label: done
          ? 'Target set & food logged'
          : !hasTarget && !hasFoodLog
            ? 'Set calorie target & log 1 meal'
            : !hasTarget
              ? '1 / 2 · Set a daily calorie target'
              : '1 / 2 · Log your first meal',
      }
    }
    case 'shadow_sovereign': {
      const sessions = workoutsCount + activitiesCount
      const bySessions = sessions >= 3
      const byStickers = baseUnlockedCount >= 4
      const done = bySessions || byStickers || stored
      const sessionPct = Math.min(1, sessions / 3)
      const stickerPct = Math.min(1, baseUnlockedCount / 4)
      const useStickers = stickerPct > sessionPct
      return {
        unlocked: done,
        current: done ? (useStickers ? 4 : 3) : (useStickers ? baseUnlockedCount : sessions),
        target: useStickers ? 4 : 3,
        label: done
          ? 'Sovereign rank achieved'
          : useStickers
            ? `${baseUnlockedCount} / 4 stickers unlocked`
            : `${sessions} / 3 sessions completed`,
      }
    }
    default:
      return { unlocked: stored, current: stored ? 1 : 0, target: 1, label: '' }
  }
}

/**
 * Evaluates all 6 anime character sticker badges against `S` and `user`.
 * Returns badge cards with progress metrics plus `newlyEarnedIds` not yet persisted in `S.badges`.
 */
export function evaluateBadges(S = {}, user = null) {
  const storedMap = isMap(S?.badges) ? S.badges : {}
  const firstPass = BADGE_CATALOG.filter(b => b.id !== 'shadow_sovereign').map(b => {
    const p = progressFor(b.id, S, user, 0)
    return { badge: b, p }
  })
  const baseUnlockedCount = firstPass.filter(x => x.p.unlocked).length

  const list = BADGE_CATALOG.map(b => {
    const found = firstPass.find(x => x.badge.id === b.id)
    const p = found ? found.p : progressFor(b.id, S, user, baseUnlockedCount)
    const pct = p.target > 0 ? Math.min(100, Math.round((p.current / p.target) * 100)) : 0
    const unlockedAt = Number(storedMap[b.id]?.unlockedAt) || null
    return {
      ...b,
      unlocked: p.unlocked,
      unlockedAt,
      progress: {
        current: p.current,
        target: p.target,
        pct,
        label: p.label,
      },
    }
  })

  const unlockedCount = list.filter(x => x.unlocked).length
  const totalCount = list.length
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0
  const newlyEarnedIds = list
    .filter(x => x.unlocked && !(Number(storedMap[x.id]?.unlockedAt) > 0))
    .map(x => x.id)

  return {
    list,
    unlockedCount,
    totalCount,
    pct,
    newlyEarnedIds,
  }
}
