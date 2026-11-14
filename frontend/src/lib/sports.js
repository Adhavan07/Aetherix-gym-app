import { todayISO, weekKey, weekStartOf } from './format.js'
import { estimateActivityKcal, resolveBodyWeightKg, sortActivities } from './activities.js'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const SPORT_PILLARS = [
  { key: 'bigEngine', label: 'Big Engine', shortLabel: 'Engine', desc: 'Aerobic conditioning, VO2 max & sustained cardiovascular output.' },
  { key: 'fullStrength', label: 'Full Strength', shortLabel: 'Strength', desc: 'Whole-body muscular tension across upper, core & lower musculature.' },
  { key: 'power', label: 'Power', shortLabel: 'Power', desc: 'Explosive force production, sprint speed & fast-twitch recruitment.' },
  { key: 'mobility', label: 'Mobility', shortLabel: 'Mobility', desc: 'Active joint range of motion, coordination & dynamic flexibility.' },
  { key: 'easyJoints', label: 'Easy Joints', shortLabel: 'Joints', desc: 'Low repetitive impact & joint-preserving movement mechanics.' },
  { key: 'forLife', label: 'For Life', shortLabel: 'For Life', desc: 'Scalable intensity & sustainable lifelong practice at any age.' },
]

export const SPORTS_RANKING = [
  {
    key: 'swimming',
    rank: 1,
    name: 'Swimming',
    total: 11,
    pillars: { bigEngine: 2, fullStrength: 2, power: 1, mobility: 2, easyJoints: 2, forLife: 2 },
    injuryRisk: 'low',
    met: 8.0,
    icon: 'swim',
    category: 'Endurance',
    summary: 'Near-zero joint impact combined with full-body water resistance, shoulder mobility, and elite aerobic capacity.',
    pairsWellWith: ['weightlifting', 'climbing'],
  },
  {
    key: 'rowing',
    rank: 2,
    name: 'Rowing',
    total: 9,
    pillars: { bigEngine: 2, fullStrength: 2, power: 1, mobility: 1, easyJoints: 1, forLife: 2 },
    injuryRisk: 'some',
    met: 7.0,
    icon: 'machine',
    category: 'Endurance',
    summary: 'Posterior-chain powerhouse pairing high-output cardio with rhythmic leg-and-back strength across all ages.',
    pairsWellWith: ['yoga', 'swimming'],
  },
  {
    key: 'xc_skiing',
    rank: 3,
    name: 'XC Skiing',
    total: 9,
    pillars: { bigEngine: 2, fullStrength: 2, power: 1, mobility: 1, easyJoints: 1, forLife: 2 },
    injuryRisk: 'low',
    met: 9.0,
    icon: 'ski',
    category: 'Endurance',
    summary: 'Full-body gliding endurance delivering peak VO2 max demands with minimal impact stress.',
    pairsWellWith: ['yoga', 'climbing'],
  },
  {
    key: 'climbing',
    rank: 4,
    name: 'Climbing',
    total: 8,
    pillars: { bigEngine: 0, fullStrength: 2, power: 1, mobility: 2, easyJoints: 1, forLife: 2 },
    injuryRisk: 'some',
    met: 7.5,
    icon: 'mountain',
    category: 'Skill & Strength',
    summary: 'Exceptional relative strength, grip, core control, and hip/shoulder mobility; pair with cardio for full coverage.',
    pairsWellWith: ['swimming', 'cycling'],
  },
  {
    key: 'martial_arts',
    rank: 5,
    name: 'Martial Arts',
    total: 7,
    pillars: { bigEngine: 1, fullStrength: 2, power: 2, mobility: 2, easyJoints: 0, forLife: 1 },
    injuryRisk: 'some',
    met: 10.3,
    icon: 'figureStrength',
    category: 'Combat',
    summary: 'High explosive power, rotational strength, and active flexibility balanced against contact and sparring wear.',
    pairsWellWith: ['swimming', 'yoga'],
  },
  {
    key: 'tennis',
    rank: 6,
    name: 'Tennis',
    total: 7,
    pillars: { bigEngine: 1, fullStrength: 1, power: 2, mobility: 1, easyJoints: 0, forLife: 2 },
    injuryRisk: 'some',
    met: 7.3,
    icon: 'racket',
    category: 'Racket & Court',
    summary: 'Lifelong rotational agility, sprint power, and interval conditioning with moderate knee/elbow load.',
    pairsWellWith: ['swimming', 'weightlifting'],
  },
  {
    key: 'yoga',
    rank: 7,
    name: 'Yoga',
    total: 7,
    pillars: { bigEngine: 0, fullStrength: 1, power: 0, mobility: 2, easyJoints: 2, forLife: 2 },
    injuryRisk: 'low',
    met: 3.0,
    icon: 'stretch',
    category: 'Mobility',
    summary: 'Unmatched joint preservation, end-range control, and longevity; ideal recovery anchor for strength or runners.',
    pairsWellWith: ['running', 'boxing'],
  },
  {
    key: 'boxing',
    rank: 8,
    name: 'Boxing',
    total: 6,
    pillars: { bigEngine: 2, fullStrength: 1, power: 2, mobility: 0, easyJoints: 1, forLife: 0 },
    injuryRisk: 'high',
    met: 7.8,
    icon: 'boxing',
    category: 'Combat',
    summary: 'Elite anaerobic engine and rotational punch power paired with elevated sparring and hand/wrist injury exposure.',
    pairsWellWith: ['yoga', 'swimming'],
  },
  {
    key: 'crossfit',
    rank: 9,
    name: 'CrossFit',
    total: 6,
    pillars: { bigEngine: 1, fullStrength: 2, power: 2, mobility: 1, easyJoints: 0, forLife: 0 },
    injuryRisk: 'high',
    met: 8.5,
    icon: 'barbell',
    category: 'Hybrid & Strength',
    summary: 'Broad strength and explosive conditioning density, tempered by high fatigue and technical load injury risk.',
    pairsWellWith: ['swimming', 'yoga'],
  },
  {
    key: 'cycling',
    rank: 10,
    name: 'Cycling',
    total: 6,
    pillars: { bigEngine: 2, fullStrength: 0, power: 1, mobility: 0, easyJoints: 1, forLife: 2 },
    injuryRisk: 'some',
    met: 7.5,
    icon: 'bike',
    category: 'Endurance',
    summary: 'Joint-kind aerobic base builder for decades; needs upper-body strength and hip extension work to stay balanced.',
    pairsWellWith: ['climbing', 'weightlifting'],
  },
  {
    key: 'football',
    rank: 11,
    name: 'Football',
    total: 6,
    pillars: { bigEngine: 2, fullStrength: 1, power: 2, mobility: 1, easyJoints: 0, forLife: 0 },
    injuryRisk: 'some',
    met: 7.0,
    icon: 'ball',
    category: 'Field & Court',
    summary: 'Repeated sprint power and match endurance paired with high ankle, hamstring, and knee deceleration load.',
    pairsWellWith: ['yoga', 'swimming'],
  },
  {
    key: 'weightlifting',
    rank: 12,
    name: 'Weightlifting',
    total: 6,
    pillars: { bigEngine: 0, fullStrength: 2, power: 2, mobility: 1, easyJoints: 0, forLife: 1 },
    injuryRisk: 'some',
    met: 6.0,
    icon: 'barbell',
    category: 'Hybrid & Strength',
    summary: 'Peak full-body strength and explosive triple-extension power; pair with low-impact aerobic work for 12/12.',
    pairsWellWith: ['swimming', 'xc_skiing'],
  },
  {
    key: 'gymnastics',
    rank: 13,
    name: 'Gymnastics',
    total: 5,
    pillars: { bigEngine: 1, fullStrength: 2, power: 2, mobility: 2, easyJoints: 0, forLife: 0 },
    injuryRisk: 'high',
    met: 6.5,
    icon: 'stretch',
    category: 'Skill & Strength',
    summary: 'Extraordinary strength-to-weight, power, and mobility offset by demanding tendon, wrist, and landing forces.',
    pairsWellWith: ['swimming', 'cycling'],
  },
  {
    key: 'padel',
    rank: 14,
    name: 'Padel',
    total: 5,
    pillars: { bigEngine: 1, fullStrength: 0, power: 1, mobility: 1, easyJoints: 0, forLife: 2 },
    injuryRisk: 'some',
    met: 6.5,
    icon: 'racket',
    category: 'Racket & Court',
    summary: 'Social, highly repeatable court sport ideal for long-term adherence; benefits from added strength and mobility.',
    pairsWellWith: ['weightlifting', 'yoga'],
  },
  {
    key: 'hyrox',
    rank: 15,
    name: 'Hyrox',
    total: 5,
    pillars: { bigEngine: 2, fullStrength: 1, power: 1, mobility: 0, easyJoints: 0, forLife: 1 },
    injuryRisk: 'some',
    met: 9.0,
    icon: 'bolt',
    category: 'Hybrid & Strength',
    summary: 'High-engine hybrid racing mixing heavy running volume with sleds and ergs; requires joint and mobility care.',
    pairsWellWith: ['yoga', 'swimming'],
  },
  {
    key: 'basketball',
    rank: 16,
    name: 'Basketball',
    total: 5,
    pillars: { bigEngine: 1, fullStrength: 1, power: 2, mobility: 1, easyJoints: 0, forLife: 0 },
    injuryRisk: 'some',
    met: 6.5,
    icon: 'ball',
    category: 'Field & Court',
    summary: 'Explosive jumping, lateral cutting, and anaerobic bursts offset by frequent ankle and knee impact forces.',
    pairsWellWith: ['swimming', 'yoga'],
  },
  {
    key: 'running',
    rank: 17,
    name: 'Running',
    total: 4,
    pillars: { bigEngine: 2, fullStrength: 0, power: 1, mobility: 0, easyJoints: 0, forLife: 1 },
    injuryRisk: 'some',
    met: 9.8,
    icon: 'figureRun',
    category: 'Endurance',
    callout: true,
    summary: 'Builds a massive aerobic engine quickly, yet misses upper-body strength, mobility, and joint friendliness on its own.',
    pairsWellWith: ['climbing', 'yoga'],
  },
  {
    key: 'rugby',
    rank: 18,
    name: 'Rugby',
    total: 3,
    pillars: { bigEngine: 1, fullStrength: 2, power: 2, mobility: 0, easyJoints: 0, forLife: 0 },
    injuryRisk: 'high',
    met: 8.3,
    icon: 'ball',
    category: 'Field & Court',
    summary: 'Unrivaled collision power and physical strength alongside the highest cumulative contact injury exposure.',
    pairsWellWith: ['swimming', 'yoga'],
  },
]

const RISK_ORDER = { low: 0, some: 1, high: 2 }

export function sportByKey(key) {
  if (!key || typeof key !== 'string') return null
  return SPORTS_RANKING.find(s => s.key === key) || null
}

/**
 * Matches a stored activity entry (`sportKey` or free-text `name`) back to one of the 18 ranked sports.
 */
export function matchActivityToSport(activity) {
  if (!activity || typeof activity !== 'object') return null
  if (activity.sportKey) {
    const direct = sportByKey(activity.sportKey)
    if (direct) return direct
    if (activity.sportKey === 'hiit') return sportByKey('crossfit')
    if (activity.sportKey === 'badminton') return sportByKey('padel')
    if (activity.sportKey === 'jumprope') return sportByKey('boxing')
  }
  const n = String(activity.name || '').trim().toLowerCase()
  if (!n) return null
  return SPORTS_RANKING.find(s =>
    s.key === n ||
    s.name.toLowerCase() === n ||
    n.includes(s.name.toLowerCase()) ||
    (s.key === 'xc_skiing' && (n.includes('ski') || n.includes('cross country'))) ||
    (s.key === 'martial_arts' && (n.includes('mma') || n.includes('bjj') || n.includes('judo') || n.includes('karate') || n.includes('martial'))) ||
    (s.key === 'football' && n.includes('soccer')) ||
    (s.key === 'weightlifting' && (n.includes('lift') || n.includes('strength')))
  ) || null
}

export function filterAndSortSports(sports = SPORTS_RANKING, {
  query = '',
  filter = 'all',
  sortBy = 'rank',
  sortDir = 'asc',
} = {}) {
  const q = String(query || '').trim().toLowerCase()
  const filtered = sports.filter(s => {
    if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false
    if (filter === 'top5') return s.rank <= 5
    if (filter === 'low_risk') return s.injuryRisk === 'low'
    if (filter === 'joint_friendly') return s.pillars.easyJoints >= 1
    if (filter === 'for_life') return s.pillars.forLife === 2
    return true
  })

  const dir = sortDir === 'desc' ? -1 : 1
  return filtered.slice().sort((a, b) => {
    let cmp = 0
    if (sortBy === 'rank') {
      cmp = a.rank - b.rank
    } else if (sortBy === 'total') {
      cmp = (a.total - b.total) || (b.rank - a.rank)
    } else if (sortBy === 'injuryRisk') {
      cmp = (RISK_ORDER[a.injuryRisk] - RISK_ORDER[b.injuryRisk]) || (b.total - a.total) || (a.rank - b.rank)
    } else if (sortBy === 'met') {
      cmp = (a.met - b.met) || (b.total - a.total)
    } else if (SPORT_PILLARS.some(p => p.key === sortBy)) {
      cmp = (a.pillars[sortBy] - b.pillars[sortBy]) || (a.total - b.total) || (b.rank - a.rank)
    }
    return cmp * dir || (a.rank - b.rank)
  })
}

export function combineSportsCoverage(selectedSports = []) {
  const coverage = {}
  for (const p of SPORT_PILLARS) {
    coverage[p.key] = selectedSports.reduce((mx, s) => Math.max(mx, s?.pillars?.[p.key] || 0), 0)
  }
  const combinedTotal = SPORT_PILLARS.reduce((sum, p) => sum + coverage[p.key], 0)
  const lowestRisk = selectedSports.length
    ? selectedSports.reduce((best, s) => (RISK_ORDER[s.injuryRisk] < RISK_ORDER[best] ? s.injuryRisk : best), selectedSports[0].injuryRisk)
    : 'low'
  const highestRisk = selectedSports.length
    ? selectedSports.reduce((worst, s) => (RISK_ORDER[s.injuryRisk] > RISK_ORDER[worst] ? s.injuryRisk : worst), selectedSports[0].injuryRisk)
    : 'low'
  return { coverage, combinedTotal, lowestRisk, highestRisk }
}

/**
 * Computes weekly sport & conditioning minutes, burned kcal, per-sport session breakdown,
 * live 6-pillar hybrid coverage (combining gym workouts + logged sports), and next best recommendation.
 */
export function weeklyHybridSportsSummary(S, refDateISO = todayISO()) {
  const ws = weekStartOf(S)
  const wk = weekKey(refDateISO, ws)
  const activities = sortActivities(S?.activities).filter(a => ISO_DATE.test(a.d || '') && weekKey(a.d, ws) === wk)
  const workouts = (Array.isArray(S?.workouts) ? S.workouts : []).filter(w => w && ISO_DATE.test(w.d || '') && weekKey(w.d, ws) === wk)

  const goalMinRaw = Number(S?.sportGoalMin)
  const goalMin = Number.isFinite(goalMinRaw) && goalMinRaw >= 15 ? Math.round(goalMinRaw) : 150

  const coverage = {
    bigEngine: 0,
    fullStrength: 0,
    power: 0,
    mobility: 0,
    easyJoints: 0,
    forLife: 0,
  }

  // Strength workouts in the gym already contribute Strength, partial Power, and baseline Mobility on multi-lift days
  if (workouts.length > 0) {
    coverage.fullStrength = Math.max(coverage.fullStrength, 2)
    coverage.power = Math.max(coverage.power, workouts.length >= 2 ? 2 : 1)
    const maxExCount = workouts.reduce((mx, w) => Math.max(mx, Array.isArray(w.entries) ? w.entries.length : 0), 0)
    if (maxExCount >= 4) coverage.mobility = Math.max(coverage.mobility, 1)
    coverage.forLife = Math.max(coverage.forLife, 1)
  }

  const bySport = {}
  for (const a of activities) {
    const matched = matchActivityToSport(a)
    if (matched) {
      bySport[matched.key] = bySport[matched.key] || { count: 0, durationMin: 0, kcal: 0 }
      bySport[matched.key].count += 1
      bySport[matched.key].durationMin += Number(a.durationMin) || 0
      bySport[matched.key].kcal += Number(a.kcal) || 0
      for (const p of SPORT_PILLARS) {
        coverage[p.key] = Math.max(coverage[p.key], matched.pillars[p.key] || 0)
      }
    } else {
      // Unmapped custom cardio/activity still provides baseline conditioning
      coverage.bigEngine = Math.max(coverage.bigEngine, 1)
    }
  }

  const sportMinutes = activities.reduce((sum, a) => sum + (Number(a.durationMin) || 0), 0)
  const sportKcal = activities.reduce((sum, a) => sum + (Number(a.kcal) || 0), 0)
  const coverageScore = SPORT_PILLARS.reduce((sum, p) => sum + coverage[p.key], 0)
  const missingPillars = SPORT_PILLARS.filter(p => coverage[p.key] < 2)

  // Suggest top sport that adds the most uncovered pillar points with lowest injury exposure
  let recommended = SPORTS_RANKING[0]
  if (missingPillars.length > 0) {
    let bestGain = -1
    for (const s of SPORTS_RANKING) {
      if (bySport[s.key]) continue
      const gain = missingPillars.reduce((sum, p) => sum + Math.max(0, s.pillars[p.key] - coverage[p.key]), 0)
      const score = gain * 10 - RISK_ORDER[s.injuryRisk] * 2 + s.total * 0.1
      if (score > bestGain) {
        bestGain = score
        recommended = s
      }
    }
  }

  const bwKg = resolveBodyWeightKg(S, refDateISO) || 72

  return {
    weekStartISO: wk,
    goalMin,
    sportMinutes,
    sportKcal,
    activityCount: activities.length,
    workoutCount: workouts.length,
    pctGoal: Math.min(100, Math.round((sportMinutes / goalMin) * 100)),
    coverage,
    coverageScore,
    missingPillars,
    bySport,
    recommended,
    bwKg,
    hourlyKcalFor: sport => estimateActivityKcal(sport.met, bwKg, 60),
    recentActivities: sortActivities(S?.activities).slice().reverse().slice(0, 8),
  }
}

export function riskLabel(risk) {
  if (risk === 'low') return 'Low risk'
  if (risk === 'high') return 'High risk'
  return 'Some risk'
}

export function pillarLevelLabel(v) {
  if (v >= 2) return 'Strong'
  if (v === 1) return 'A bit'
  return 'Minimal'
}
