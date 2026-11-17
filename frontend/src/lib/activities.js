import { uid, todayISO, weekKey, weekStartOf } from './format.js'
import { hashId } from './weigh-ins.js'

export const LB_TO_KG = 0.45359237
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const SPORT_PRESETS = [
  { key: 'swimming', label: 'Swimming', met: 8.0, icon: 'swim' },
  { key: 'rowing', label: 'Rowing', met: 7.0, icon: 'machine' },
  { key: 'xc_skiing', label: 'XC Skiing', met: 9.0, icon: 'ski' },
  { key: 'climbing', label: 'Climbing', met: 7.5, icon: 'mountain' },
  { key: 'martial_arts', label: 'Martial Arts', met: 10.3, icon: 'figureStrength' },
  { key: 'tennis', label: 'Tennis', met: 7.3, icon: 'racket' },
  { key: 'yoga', label: 'Yoga', met: 3.0, icon: 'stretch' },
  { key: 'boxing', label: 'Boxing', met: 7.8, icon: 'boxing' },
  { key: 'crossfit', label: 'CrossFit', met: 8.5, icon: 'barbell' },
  { key: 'cycling', label: 'Cycling', met: 7.5, icon: 'bike' },
  { key: 'football', label: 'Football', met: 7.0, icon: 'ball' },
  { key: 'weightlifting', label: 'Weightlifting', met: 6.0, icon: 'barbell' },
  { key: 'gymnastics', label: 'Gymnastics', met: 6.5, icon: 'stretch' },
  { key: 'padel', label: 'Padel', met: 6.5, icon: 'racket' },
  { key: 'hyrox', label: 'Hyrox', met: 9.0, icon: 'bolt' },
  { key: 'basketball', label: 'Basketball', met: 6.5, icon: 'ball' },
  { key: 'running', label: 'Running', met: 9.8, icon: 'figureRun' },
  { key: 'rugby', label: 'Rugby', met: 8.3, icon: 'ball' },
  { key: 'badminton', label: 'Badminton', met: 5.5, icon: 'racket' },
  { key: 'walking', label: 'Brisk walking', met: 4.3, icon: 'figureRun' },
  { key: 'jumprope', label: 'Jump rope', met: 11.0, icon: 'bolt' },
  { key: 'hiit', label: 'HIIT', met: 8.0, icon: 'bolt' },
]

export const SPORTS = ['run', 'ride', 'swim', 'hike', 'row', 'ski', 'football', 'racket', 'ball', 'climb', 'fight', 'yoga', 'dance', 'other']

export const SPORT_LABEL = {
  run: 'Run', ride: 'Ride', swim: 'Swim', hike: 'Hike', row: 'Rowing', ski: 'Skiing', football: 'Football',
  racket: 'Racket sports', ball: 'Ball games', climb: 'Climbing', fight: 'Boxing & martial arts', yoga: 'Yoga & pilates',
  dance: 'Dance', other: 'Other sport',
}

export const SPORT_ICON = {
  run: 'figureRun', ride: 'bike', swim: 'swim', hike: 'tree', row: 'arm', ski: 'snowflake', football: 'target',
  racket: 'bolt', ball: 'trophy', climb: 'pullup', fight: 'boxing', yoga: 'stretch', dance: 'sparkles', other: 'flag',
}

export const ACTIVITY_MIN_MAX = 24 * 60
export const SOURCES = ['hc', 'ah', 'import', 'manual', 'or']
const ACT_TITLE_MAX = 80
const ACT_NOTE_MAX = 500

export const SPORT_LOAD = {
  run: { sets: 3, muscles: { calves: 0.8, quadriceps: 0.6, hamstring: 0.5, gluteal: 0.5, 'hip-flexors': 0.3 } },
  ride: { sets: 2.5, muscles: { quadriceps: 0.9, gluteal: 0.5, hamstring: 0.3, calves: 0.3 } },
  swim: { sets: 2, muscles: { lats: 0.7, 'front-delts': 0.4, 'side-delts': 0.3, triceps: 0.3, 'upper-back': 0.3 } },
  hike: { sets: 1.5, muscles: { quadriceps: 0.6, gluteal: 0.6, calves: 0.5, hamstring: 0.3 } },
  row: { sets: 2.5, muscles: { lats: 0.6, 'upper-back': 0.6, quadriceps: 0.5, gluteal: 0.4, biceps: 0.3, hamstring: 0.3 } },
  ski: { sets: 2.5, muscles: { quadriceps: 0.9, gluteal: 0.5, adductors: 0.4, abs: 0.2 } },
  football: { sets: 3, muscles: { quadriceps: 0.7, hamstring: 0.7, calves: 0.6, gluteal: 0.5, adductors: 0.5, 'hip-flexors': 0.4 } },
  racket: { sets: 2, muscles: { calves: 0.5, quadriceps: 0.5, forearm: 0.5, 'front-delts': 0.3, obliques: 0.3, adductors: 0.3 } },
  ball: { sets: 2.5, muscles: { quadriceps: 0.6, calves: 0.6, gluteal: 0.4, hamstring: 0.4, 'front-delts': 0.2 } },
  climb: { sets: 3.5, muscles: { forearm: 1, lats: 0.7, biceps: 0.6, 'upper-back': 0.5, 'rear-delts': 0.3 } },
  fight: { sets: 2.5, muscles: { 'front-delts': 0.5, 'side-delts': 0.3, triceps: 0.3, obliques: 0.4, abs: 0.3, calves: 0.3 } },
  yoga: { sets: 0.5, muscles: { abs: 0.3, 'hip-flexors': 0.3, hamstring: 0.2 } },
  dance: { sets: 1.5, muscles: { calves: 0.5, quadriceps: 0.4, gluteal: 0.3 } },
  other: { sets: 1, muscles: { quadriceps: 0.3, calves: 0.3 } },
}

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const roundKm = v => Math.round(v * 100) / 100

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

export function readActivity(entry) {
  if (!isMap(entry) || !ISO_DATE.test(String(entry.d || ''))) return null
  const rawSport = entry.sport || entry.sportKey || 'other'
  const sport = SPORTS.includes(rawSport) ? rawSport : (sportOfName(entry.name || rawSport) || 'other')
  const min = Math.round(Number(entry.min ?? entry.durationMin))
  if (!Number.isFinite(min) || min < 1) return null
  const km = Number(entry.km)
  const at = Number(entry.at)
  const rawTitle = entry.title ?? entry.name
  const title = typeof rawTitle === 'string' ? rawTitle.trim().slice(0, ACT_TITLE_MAX) : ''
  const note = typeof entry.note === 'string' ? entry.note.trim().slice(0, ACT_NOTE_MAX) : ''
  return {
    d: entry.d, sport, min: Math.min(ACTIVITY_MIN_MAX, min),
    ...(km > 0 && km < 1000 ? { km: roundKm(km) } : {}),
    ...(at > 0 ? { at } : {}),
    ...(title ? { title } : {}),
    ...(note ? { note } : {}),
    src: SOURCES.includes(entry.src) ? entry.src : 'manual',
  }
}

export function activitiesOf(S) {
  const out = []
  if (Array.isArray(S?.activities)) {
    for (const e of S.activities) {
      const a = readActivity(e)
      if (a) out.push({ id: e.id || uid(), ...a, _ts: Number(e._ts ?? e.at) || 0 })
    }
  } else {
    const map = isMap(S?.activities) ? S.activities : {}
    for (const [id, e] of Object.entries(map)) {
      const a = readActivity(e)
      if (a) out.push({ id, ...a, _ts: Number(e._ts) || 0 })
    }
  }
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : (b.at || 0) - (a.at || 0) || b._ts - a._ts))
}

export const activitiesOn = (S, iso) => activitiesOf(S).filter(a => a.d === iso)
export const activityDays = S => new Set(activitiesOf(S).map(a => a.d))
export const activityCountsStreak = S => S?.activityStreak === true

export function withActivity(map, id, activity, now = Date.now()) {
  const clean = activity ? readActivity(activity) : null
  return { ...(isMap(map) ? map : {}), [id]: clean ? { ...clean, _ts: now } : { _ts: now } }
}

export const activityName = (a, tr = s => s) => (a?.title ? a.title : tr(SPORT_LABEL[a?.sport] || SPORT_LABEL.other))

export function activityLine(a, tr = s => s, dist = km => `${km} km`) {
  if (!a) return ''
  return [activityName(a, tr), tr('{0} min', a.min), a.km ? dist(a.km) : null].filter(Boolean).join(' · ')
}

export function activityTotals(S, from, to) {
  const by = {}
  let min = 0, n = 0, km = 0
  const days = new Set()
  for (const a of activitiesOf(S)) {
    if (a.d < from || a.d > to) continue
    const s = by[a.sport] = by[a.sport] || { sport: a.sport, n: 0, min: 0, km: 0 }
    s.n++; s.min += a.min; s.km += a.km || 0
    n++; min += a.min; km += a.km || 0
    days.add(a.d)
  }
  const sports = Object.values(by).map(s => ({ ...s, km: roundKm(s.km) })).sort((a, b) => b.min - a.min || (a.sport < b.sport ? -1 : 1))
  return { n, min, km: roundKm(km), days: days.size, sports }
}

const localNoon = iso => new Date(iso + 'T12:00:00').getTime()

export function activityStimuli(S, now = Date.now(), windowMs = 30 * 86400e3) {
  if (S?.activityRecovery === false) return []
  const out = []
  for (const a of activitiesOf(S)) {
    const ts = a.at > 0 ? a.at + a.min * 60e3 : localNoon(a.d)
    if (!(ts <= now) || now - ts > windowMs) continue
    const load = SPORT_LOAD[a.sport] || SPORT_LOAD.other
    const scale = load.sets * a.min / 30
    const sets = {}
    for (const [slug, w] of Object.entries(load.muscles)) sets[slug] = scale * w
    out.push({ timestamp: ts, sets })
  }
  return out
}

export const NOT_ACTIVITY = new Set(['strength', 'gym', 'walk'])
const OWN_ORIGIN = /^(ch\.duartesantos\.opengym|ch\.opengym\.app)(\.|$)/
export const isOwnRecord = rec => /^opengym-/.test(String(rec?.clientId || '')) || OWN_ORIGIN.test(String(rec?.origin || ''))
export const healthActivityId = (rec, src) => src + hashId(String(rec?.id || `${rec?.start}|${rec?.sport}`))

function overlapsWorkout(S, start, end) {
  for (const w of Array.isArray(S?.workouts) ? S.workouts : []) {
    const ws = Number(w?.start), we = Number(w?.end) || ws
    if (ws > 0 && start < we && end > ws) return true
  }
  return false
}
const isoLocal = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function activityFromHealth(rec, S, src, now = Date.now()) {
  if (!rec || isOwnRecord(rec)) return null
  const sport = String(rec.sport || '')
  if (NOT_ACTIVITY.has(sport)) return null
  const start = Number(rec.start), end = Number(rec.end)
  if (!(start > 0) || !(end > start) || end > now + 60e3) return null
  const min = Math.round((end - start) / 60e3)
  if (min < 5) return null
  if (overlapsWorkout(S, start, end)) return null
  return readActivity({ d: isoLocal(start), sport: SPORTS.includes(sport) ? sport : 'other', min, at: start, km: Number(rec.km) || 0, title: typeof rec.title === 'string' ? rec.title : '', src })
}

export function mergeHealthActivities(S, records, { src, now = Date.now() } = {}) {
  const map = isMap(S.activities) ? S.activities : {}
  const added = []
  for (const rec of Array.isArray(records) ? records : []) {
    const a = activityFromHealth(rec, S, src, now)
    if (!a) continue
    const id = healthActivityId(rec, src)
    if (Object.hasOwn(map, id)) continue
    map[id] = { ...a, _ts: now }
    added.push(id)
  }
  if (added.length) S.activities = map
  return added
}

const NAME_SPORT = [
  [/\b(padel|tennis|squash|badminton|pickleball|racquetball|table tennis|ping ?pong|tischtennis)\b/, 'racket'],
  [/\b(football|soccer|fu(ss|ß)ball|futsal|futebol|f[uú]tbol|calcio)\b/, 'football'],
  [/\b(basketball|volleyball|handball|rugby|hockey|baseball|softball|cricket|netball|lacrosse|frisbee|water polo|basquete|v[oô]lei)\b/, 'ball'],
  [/\b(climb|climbing|bouldering|boulder|klettern|bouldern|escalade|escalada)\b/, 'climb'],
  [/\b(boxing|kickboxing|muay thai|mma|bjj|jiu.?jitsu|judo|karate|taekwondo|martial arts|wrestling|boxen|kampfsport)\b/, 'fight'],
  [/\b(yoga|pilates)\b/, 'yoga'],
  [/\b(dance|dancing|zumba|salsa|tanzen|danse|dan[cç]a)\b/, 'dance'],
  [/\b(hike|hiking|wandern|trekking|randonn[ée]e|senderismo)\b/, 'hike'],
  [/\b(ski|skiing|snowboard|snowboarding|skifahren|langlauf|cross.?country ski)\b/, 'ski'],
  [/\b(swim|swimming|schwimmen|natation|nata[cç][aã]o|nuoto)\b/, 'swim'],
  [/\b(kayak|canoe|paddle|paddling|sup|rudern)\b/, 'row'],
  [/\b(cycling|bike ride|road bike|mountain bike|mtb|gravel|velo|radfahren|rennrad|outdoor ride)\b/, 'ride'],
  [/\b(running|outdoor run|trail run|jogging|joggen|laufen|course [aà] pied|corrida|run)\b/, 'run'],
]
const GYM_CARDIO = /\b(treadmill|stationary|indoor|spin|elliptical|cross.?trainer|stair|stepper|erg|ergometer|assault|air bike|rowing machine|laufband|hometrainer)\b/

export function sportOfName(name) {
  const s = String(name || '').toLowerCase()
  if (!s || GYM_CARDIO.test(s)) return null
  for (const [re, sport] of NAME_SPORT) if (re.test(s)) return sport
  return null
}

const HK_SPORT = {
  Running: 'run', Cycling: 'ride', HandCycling: 'ride', Swimming: 'swim', SwimBikeRun: 'swim', WaterSports: 'swim', SurfingSports: 'swim',
  Hiking: 'hike', Climbing: 'climb', Rowing: 'row', PaddleSports: 'row', Sailing: 'row',
  DownhillSkiing: 'ski', CrossCountrySkiing: 'ski', Snowboarding: 'ski', SnowSports: 'ski', SkatingSports: 'ski',
  Soccer: 'football',
  Tennis: 'racket', Badminton: 'racket', Squash: 'racket', TableTennis: 'racket', Racquetball: 'racket', Pickleball: 'racket',
  Basketball: 'ball', Volleyball: 'ball', Handball: 'ball', Rugby: 'ball', Hockey: 'ball', Baseball: 'ball', Softball: 'ball',
  Cricket: 'ball', AmericanFootball: 'ball', AustralianFootball: 'ball', Lacrosse: 'ball', WaterPolo: 'ball', DiscSports: 'ball',
  Boxing: 'fight', Kickboxing: 'fight', MartialArts: 'fight', Wrestling: 'fight', Fencing: 'fight',
  Yoga: 'yoga', Pilates: 'yoga', MindAndBody: 'yoga', TaiChi: 'yoga',
  SocialDance: 'dance', CardioDance: 'dance', Dance: 'dance', DanceInspiredTraining: 'dance', Barre: 'dance',
  Walking: 'walk', WheelchairWalkPace: 'walk', WheelchairRunPace: 'walk',
  TraditionalStrengthTraining: 'strength', FunctionalStrengthTraining: 'strength', CoreTraining: 'strength',
  Elliptical: 'gym', StairClimbing: 'gym', Stairs: 'gym', StepTraining: 'gym', HighIntensityIntervalTraining: 'gym',
  MixedCardio: 'gym', MixedMetabolicCardioTraining: 'gym', CrossTraining: 'gym', JumpRope: 'gym', Flexibility: 'gym',
  Cooldown: 'gym', PreparationAndRecovery: 'gym', FitnessGaming: 'gym',
}
export const hkSportName = type => HK_SPORT[String(type || '').replace(/^HKWorkoutActivityType/, '')] || 'other'
const attr = (tag, name) => { const m = new RegExp('\\s' + name + '="([^"]*)"').exec(tag); return m ? m[1] : null }
const UNIT_MIN = { min: 1, s: 1 / 60, sec: 1 / 60, hr: 60, h: 60 }
const UNIT_KM = { km: 1, m: 0.001, mi: 1.609344, ft: 0.0003048, yd: 0.0009144 }

export function activitiesFromHealthExport(text) {
  const s = String(text || '')
  if (!s.includes('<Workout ')) return []
  const out = []
  const re = /<Workout\s[^>]*>/g
  let m
  while ((m = re.exec(s))) {
    const tag = m[0]
    if (/opengym/i.test(attr(tag, 'sourceName') || '')) continue
    const sport = hkSportName(attr(tag, 'workoutActivityType'))
    if (NOT_ACTIVITY.has(sport)) continue
    const start = Date.parse(String(attr(tag, 'startDate') || '').replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'))
    if (!Number.isFinite(start)) continue
    const dur = Number(attr(tag, 'duration'))
    const min = Number.isFinite(dur) ? dur * (UNIT_MIN[attr(tag, 'durationUnit') || 'min'] ?? 1) : NaN
    const dist = Number(attr(tag, 'totalDistance'))
    const km = Number.isFinite(dist) ? dist * (UNIT_KM[attr(tag, 'totalDistanceUnit') || 'km'] ?? 0) : 0
    const a = readActivity({ d: String(attr(tag, 'startDate')).slice(0, 10), sport, min: Math.round(min), at: start, km, src: 'import' })
    if (!a || a.min < 5) continue
    out.push({ id: 'i' + hashId(`${start}|${sport}|${a.min}`), ...a })
  }
  return out
}

export function splitSportWorkouts(workouts, nameOf) {
  const keep = [], activities = []
  for (const w of Array.isArray(workouts) ? workouts : []) {
    const entries = Array.isArray(w?.entries) ? w.entries : []
    const sports = entries.map(e => sportOfName(nameOf(e)))
    const timedOnly = entries.every(e => (e.sets || []).length > 0 && (e.sets || []).every(s => !(s.r > 0) && !(s.w > 0) && Number(s.min) > 0))
    const first = sports.find(Boolean)
    if (!entries.length || !first || sports.some(x => !x) || !timedOnly) { keep.push(w); continue }
    const setMin = entries.reduce((n, e) => n + e.sets.reduce((m, s) => m + Number(s.min), 0), 0)
    const span = Number(w.end) > Number(w.start) ? (w.end - w.start) / 60e3 : 0
    const km = entries.reduce((n, e) => n + e.sets.reduce((m, s) => m + (Number(s.speed) > 0 ? s.speed * s.min / 60 : 0), 0), 0)
    const title = typeof w.name === 'string' && w.name && w.name !== 'Imported' ? w.name : nameOf(entries[0])
    const a = readActivity({ d: w.d, sport: first, min: Math.round(setMin || span), at: Number(w.start) || 0, km, title, note: w.note, src: 'import' })
    if (!a) { keep.push(w); continue }
    activities.push({ id: 'i' + hashId(`${w.d}|${w.start || ''}|${first}|${a.min}`), ...a })
  }
  return { workouts: keep, activities }
}

export function mergeImportedActivities(S, list, now = Date.now()) {
  const map = isMap(S.activities) ? S.activities : {}
  let n = 0
  for (const { id, ...a } of Array.isArray(list) ? list : []) {
    if (!id || Object.hasOwn(map, id)) continue
    const clean = readActivity(a)
    if (!clean) continue
    map[id] = { ...clean, _ts: now }
    n++
  }
  if (n) S.activities = map
  return n
}

