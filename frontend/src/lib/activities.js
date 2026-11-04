import { uid, todayISO, weekKey, weekStartOf } from './format.js'

export const LB_TO_KG = 0.45359237
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const SPORT_PRESETS = [
  { key: 'badminton', label: 'Badminton', met: 5.5, icon: 'figureRun' },
  { key: 'football', label: 'Football', met: 7.0, icon: 'figureRun' },
  { key: 'running', label: 'Running', met: 9.8, icon: 'figureRun' },
  { key: 'cycling', label: 'Cycling', met: 7.5, icon: 'bike' },
  { key: 'swimming', label: 'Swimming', met: 8.0, icon: 'swim' },
  { key: 'basketball', label: 'Basketball', met: 6.5, icon: 'figureRun' },
  { key: 'tennis', label: 'Tennis', met: 7.3, icon: 'figureRun' },
  { key: 'walking', label: 'Brisk walking', met: 4.3, icon: 'figureRun' },
  { key: 'rowing', label: 'Rowing', met: 7.0, icon: 'machine' },
  { key: 'jumprope', label: 'Jump rope', met: 11.0, icon: 'bolt' },
  { key: 'boxing', label: 'Boxing', met: 7.8, icon: 'boxing' },
  { key: 'yoga', label: 'Yoga', met: 3.0, icon: 'stretch' },
  { key: 'hiit', label: 'HIIT', met: 8.0, icon: 'bolt' },
]

export function presetForKey(key) {
  if (!key || typeof key !== 'string') return null
  return SPORT_PRESETS.find(p => p.key === key) || null
}

export function activityIconFor(activity) {
  const preset = presetForKey(activity?.sportKey)
  return preset ? preset.icon : 'figureRun'
}

export function weightToKg(weight, unit = 'kg') {
  const n = Number(weight)
  if (!Number.isFinite(n) || n <= 0) return null
  const kg = unit === 'lb' ? n * LB_TO_KG : n
  return Math.round(kg * 100) / 100
}

/**
 * Resolves stored body weight from the profile on or before `dateISO` (falling back to the latest
 * stored weigh-in or session weigh-in), returning `{ kg, raw, unit, date }` or `null`.
 */
export function resolveBodyWeightInfo(S, dateISO) {
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  const entries = (Array.isArray(S?.bodyweight) ? S.bodyweight : [])
    .filter(e => e && ISO_DATE.test(e.d || '') && Number(e.w) > 0)
    .slice()
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))

  if (entries.length > 0) {
    const target = ISO_DATE.test(dateISO || '') ? dateISO : null
    const onOrBefore = target ? entries.filter(e => e.d <= target) : entries
    const chosen = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : entries[0]
    const kg = weightToKg(chosen.w, unit)
    if (kg) return { kg, raw: Number(chosen.w), unit, date: chosen.d }
  }

  const workoutBws = (Array.isArray(S?.workouts) ? S.workouts : [])
    .filter(w => w && ISO_DATE.test(w.d || '') && Number(w.bw) > 0)
    .slice()
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  if (workoutBws.length > 0) {
    const target = ISO_DATE.test(dateISO || '') ? dateISO : null
    const onOrBefore = target ? workoutBws.filter(w => w.d <= target) : workoutBws
    const chosen = onOrBefore.length > 0 ? onOrBefore[onOrBefore.length - 1] : workoutBws[0]
    const kg = weightToKg(chosen.bw, unit)
    if (kg) return { kg, raw: Number(chosen.bw), unit, date: chosen.d }
  }

  return null
}

export function resolveBodyWeightKg(S, dateISO) {
  const info = resolveBodyWeightInfo(S, dateISO)
  return info ? info.kg : null
}

/**
 * Estimates calories burned using the Compendium formula:
 *   kcal = MET * bodyWeightKg * (durationMin / 60)
 */
export function estimateActivityKcal(met, weightKg, durationMin) {
  const m = Number(met)
  const w = Number(weightKg)
  const dur = Number(durationMin)
  if (!Number.isFinite(m) || m <= 0) return 0
  if (!Number.isFinite(w) || w <= 0) return 0
  if (!Number.isFinite(dur) || dur <= 0) return 0
  return Math.round(m * w * (dur / 60))
}

/**
 * Validates and builds a conflict-safe activity entry for `S.activities`.
 * Returns `{ activity, error }`.
 */
export function buildActivity(input, S) {
  const name = String(input?.name ?? '').trim().slice(0, 80)
  if (!name) return { activity: null, error: 'Enter an activity name.' }

  const d = ISO_DATE.test(String(input?.d ?? '')) ? String(input.d) : todayISO()
  const durationMin = Math.round(Number(input?.durationMin) || 0)
  if (!(durationMin >= 1 && durationMin <= 1440)) {
    return { activity: null, error: 'Duration must be between 1 and 1440 minutes.' }
  }

  const mode = input?.mode === 'manual' ? 'manual' : 'met'
  const sportKey = presetForKey(input?.sportKey)?.key || (input?.sportKey === 'custom' ? 'custom' : undefined)
  const note = String(input?.note ?? '').trim().slice(0, 240)
  const id = typeof input?.id === 'string' && input.id ? input.id : uid()
  const at = Number.isFinite(Number(input?.at)) && Number(input.at) > 0 ? Number(input.at) : Date.now()

  if (mode === 'met') {
    const met = Math.round((Number(input?.met) || 0) * 10) / 10
    if (!(met > 0 && met <= 30)) {
      return { activity: null, error: 'MET value must be between 0.5 and 30.' }
    }
    const explicitBwKg = weightToKg(input?.bwKg, 'kg')
    const bwKg = explicitBwKg || resolveBodyWeightKg(S, d)
    if (!bwKg) {
      return { activity: null, error: 'Log your body weight first or enter calories manually.' }
    }
    const kcal = estimateActivityKcal(met, bwKg, durationMin)
    if (!(kcal > 0)) {
      return { activity: null, error: 'Estimated calories must be greater than zero.' }
    }
    const activity = {
      id,
      name,
      ...(sportKey ? { sportKey } : {}),
      d,
      durationMin,
      mode: 'met',
      met,
      bwKg,
      kcal,
      ...(note ? { note } : {}),
      at,
    }
    return { activity, error: null }
  }

  const kcal = Math.round(Number(input?.kcal) || 0)
  if (!(kcal >= 1 && kcal <= 20000)) {
    return { activity: null, error: 'Calories burned must be between 1 and 20,000 kcal.' }
  }
  const activity = {
    id,
    name,
    ...(sportKey ? { sportKey } : {}),
    d,
    durationMin,
    mode: 'manual',
    kcal,
    ...(note ? { note } : {}),
    at,
  }
  return { activity, error: null }
}

export function sortActivities(list) {
  return (Array.isArray(list) ? list : [])
    .filter(a => a && typeof a === 'object' && a.id != null)
    .slice()
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : (Number(a.at) || 0) - (Number(b.at) || 0) || String(a.id).localeCompare(String(b.id))))
}

export function activitiesOnDate(S, dateISO) {
  const list = Array.isArray(S?.activities) ? S.activities : []
  return list
    .filter(a => a && a.d === dateISO)
    .slice()
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0) || String(a.id).localeCompare(String(b.id)))
}

function workoutMinutes(w) {
  const ms = (Number(w?.end) || 0) - (Number(w?.start) || 0)
  return ms > 0 ? Math.max(1, Math.round(ms / 60000)) : 0
}

/**
 * Daily activity and workout totals side by side for `dateISO`.
 */
export function dailyActivitySummary(S, dateISO = todayISO()) {
  const items = activitiesOnDate(S, dateISO)
  const workouts = (Array.isArray(S?.workouts) ? S.workouts : []).filter(w => w && w.d === dateISO)
  const durationMin = items.reduce((sum, a) => sum + (Number(a.durationMin) || 0), 0)
  const kcal = items.reduce((sum, a) => sum + (Number(a.kcal) || 0), 0)
  const workoutDurationMin = workouts.reduce((sum, w) => sum + workoutMinutes(w), 0)
  return {
    date: dateISO,
    count: items.length,
    durationMin,
    kcal,
    workoutCount: workouts.length,
    workoutDurationMin,
    items,
  }
}

/**
 * Weekly activity and workout totals side by side for the week containing `refDateISO`.
 */
export function weeklyActivitySummary(S, refDateISO = todayISO(), weekStart) {
  const ws = weekStart ?? weekStartOf(S)
  const wk = weekKey(refDateISO, ws)
  const items = sortActivities(S?.activities).filter(a => ISO_DATE.test(a.d || '') && weekKey(a.d, ws) === wk)
  const workouts = (Array.isArray(S?.workouts) ? S.workouts : []).filter(w => w && ISO_DATE.test(w.d || '') && weekKey(w.d, ws) === wk)
  const durationMin = items.reduce((sum, a) => sum + (Number(a.durationMin) || 0), 0)
  const kcal = items.reduce((sum, a) => sum + (Number(a.kcal) || 0), 0)
  const workoutDurationMin = workouts.reduce((sum, w) => sum + workoutMinutes(w), 0)
  const activeDays = new Set([...items.map(a => a.d), ...workouts.map(w => w.d)]).size
  return {
    weekStartISO: wk,
    count: items.length,
    durationMin,
    kcal,
    workoutCount: workouts.length,
    workoutDurationMin,
    activeDays,
    items,
  }
}
