import { resolveBodyWeightKg, estimateActivityKcal } from './activities.js'

export const PAIN_AREAS = [
  {
    key: 'knees',
    label: 'Knees',
    caution: 'Avoid deep weighted knee flexion, heavy jumping, and high-volume concrete running.',
    swap: 'Use BikeErg/Rowing instead of 1km runs, shallow box squats, and step-back lunges.',
  },
  {
    key: 'lower_back',
    label: 'Lower back',
    caution: 'Limit heavy spinal flexion, fatigue-induced deadlift rounding, and sled-pull jerking.',
    swap: 'Keep torso braced; swap burpees/sled pull for BikeErg sprints and incline marches.',
  },
  {
    key: 'shoulders',
    label: 'Shoulders',
    caution: 'Watch overhead fatigue on Wall Balls, high-volume SkiErg pulls, and push-ups.',
    swap: 'Lower Wall Ball target/weight, keep elbows tucked, or swap to lower-body ergs.',
  },
  {
    key: 'ankles',
    label: 'Ankles & shins',
    caution: 'High plyometric and 8km run impact can aggravate Achilles or shin splints.',
    swap: 'Substitute runs with Cycling or Rowing and replace Broad Jumps with fast marches.',
  },
  {
    key: 'hips',
    label: 'Hips & groin',
    caution: 'Deep Sandbag Lunges and rapid lateral cuts increase hip flexor/groin strain.',
    swap: 'Shorten lunge stride, warm up glutes thoroughly, and favor steady ergometer pulls.',
  },
  {
    key: 'wrists',
    label: 'Wrists & hands',
    caution: 'Floor burpees and extended heavy Farmers Carries stress wrist extension & grip.',
    swap: 'Use push-up handles or elevated box burpees, and strap/shorten heavy carries.',
  },
  {
    key: 'neck',
    label: 'Neck & upper traps',
    caution: 'Avoid breath-holding strain during heavy carries or craning up at Wall Ball targets.',
    swap: 'Keep gaze neutral, breathe rhythmically, and moderate carry weight.',
  },
  {
    key: 'elbows',
    label: 'Elbows',
    caution: 'Repeated high-pull SkiErg/Rowing locks and sled pulls can flare tendonitis.',
    swap: 'Pull with lats rather than biceps, avoid snapping elbow lockout, or pick BikeErg.',
  },
]

export const MEDICATION_FLAGS = [
  {
    key: 'beta_blockers',
    label: 'Beta-blockers / HR meds',
    warning: 'Beta-blockers blunt heart-rate response—judge HIIT & Hyrox effort by RPE / talk test (7–8/10), never % max HR.',
  },
  {
    key: 'blood_pressure',
    label: 'Blood pressure meds',
    warning: 'Avoid abrupt stop-and-stand transitions or prolonged breath-holding (Valsalva); extend cool-down to 5+ minutes.',
  },
  {
    key: 'insulin',
    label: 'Insulin / diabetes meds',
    warning: 'Check blood glucose before and after intense intervals; keep 15–20 g fast carbohydrates nearby for lows.',
  },
  {
    key: 'asthma',
    label: 'Asthma / inhaler',
    warning: 'Perform a gradual 6–10 minute progressive warm-up and keep your rescue inhaler within reach.',
  },
  {
    key: 'blood_thinners',
    label: 'Blood thinners',
    warning: 'Avoid fall-risk, collision, or high-impact floor-slamming stations where bruising or cuts could occur.',
  },
  {
    key: 'painkillers',
    label: 'NSAIDs / painkillers',
    warning: 'Pain medication can mask real joint or tendon strain—stop immediately if form or joint mechanics degrade.',
  },
]

export const HYROX_DIVISIONS = [
  { key: 'open_women', label: 'Open Women', sledPushKg: 102, sledPullKg: 78, carryKg: '2×16', lungeKg: 10, wallBallKg: 4, wallBallReps: 75 },
  { key: 'open_men', label: 'Open Men', sledPushKg: 152, sledPullKg: 103, carryKg: '2×24', lungeKg: 20, wallBallKg: 6, wallBallReps: 100 },
  { key: 'pro', label: 'Pro Division', sledPushKg: 202, sledPullKg: 153, carryKg: '2×32', lungeKg: 30, wallBallKg: 9, wallBallReps: 100 },
]

export const HYROX_STATIONS = [
  { num: 1, key: 'skierg', name: '1,000 m SkiErg', runKm: 1, focus: 'Lats, core & aerobic pacing', painTriggers: ['shoulders', 'lower_back', 'elbows'], safeSwap: 'Seated SkiErg or 1,000 m Bike/Row @ Zone 3' },
  { num: 2, key: 'sled_push', name: '50 m Sled Push', runKm: 1, focus: 'Quads, calves & horizontal drive', painTriggers: ['knees', 'lower_back', 'ankles'], safeSwap: 'Lighter sled (50% load) or 60s high-resistance BikeErg drive' },
  { num: 3, key: 'sled_pull', name: '50 m Sled Pull', runKm: 1, focus: 'Hamstrings, upper back & grip', painTriggers: ['lower_back', 'elbows', 'wrists'], safeSwap: 'Seated cable/band row intervals (2×25 reps, neutral spine)' },
  { num: 4, key: 'burpee_jump', name: '80 m Burpee Broad Jumps', runKm: 1, focus: 'Full-body power & anaerobic grit', painTriggers: ['knees', 'ankles', 'wrists', 'lower_back'], safeSwap: 'Elevated step-back burpees + brisk 80 m walk/march' },
  { num: 5, key: 'rowing', name: '1,000 m Rowing', runKm: 1, focus: 'Cardio recovery & posterior chain', painTriggers: ['lower_back', 'elbows', 'knees'], safeSwap: 'BikeErg 2,000 m or upright low-drag Row with shorter stroke' },
  { num: 6, key: 'farmers_carry', name: '200 m Farmers Carry', runKm: 1, focus: 'Grip, traps & postural bracing', painTriggers: ['wrists', 'neck', 'lower_back'], safeSwap: 'Lighter dumbbell carry (100 m split sets) or dead-hang holds' },
  { num: 7, key: 'sandbag_lunges', name: '100 m Sandbag Lunges', runKm: 1, focus: 'Single-leg stamina & glutes', painTriggers: ['knees', 'hips', 'ankles', 'lower_back'], safeSwap: 'Bodyweight box step-ups or shallow split squats (50 reps)' },
  { num: 8, key: 'wall_balls', name: 'Wall Balls', runKm: 1, focus: 'Squat + shoulder stamina finish', painTriggers: ['knees', 'shoulders', 'neck'], safeSwap: 'Light dumbbell goblet squats + chest-height medicine ball press' },
]

export const HIIT_PRESETS = [
  {
    key: 'tabata',
    name: 'Tabata Sprint',
    desc: 'Classic anaerobic burst protocol for peak intensity.',
    warmupSec: 180,
    workSec: 20,
    restSec: 10,
    rounds: 8,
    cooldownSec: 120,
    met: 9.5,
    highImpact: true,
    drills: ['Bike sprint / Shuttle run', 'Mountain climbers (or elevated)', 'Kettlebell / Squat pulses', 'SkiErg / Shadow boxing'],
  },
  {
    key: 'sprint_30_30',
    name: '30/30 Conditioning',
    desc: 'Balanced 1:1 work-to-rest intervals for repeatable power.',
    warmupSec: 180,
    workSec: 30,
    restSec: 30,
    rounds: 10,
    cooldownSec: 120,
    met: 8.5,
    highImpact: false,
    drills: ['Rowing or BikeErg surge', 'Tempo step-ups / Kettlebell swings', 'Incline power walk or SkiErg'],
  },
  {
    key: 'norwegian_4x4',
    name: 'Norwegian 4×4',
    desc: 'Gold-standard VO2 max protocol (4 min hard / 3 min easy).',
    warmupSec: 300,
    workSec: 240,
    restSec: 180,
    rounds: 4,
    cooldownSec: 180,
    met: 9.2,
    highImpact: false,
    drills: ['BikeErg / Treadmill incline / Swimming at 85–95% effort'],
  },
  {
    key: 'hyrox_emom',
    name: 'Hyrox 45/15 Engine',
    desc: 'Simulates compromised threshold pacing across 8 stations.',
    warmupSec: 240,
    workSec: 45,
    restSec: 15,
    rounds: 8,
    cooldownSec: 120,
    met: 9.0,
    highImpact: true,
    drills: ['SkiErg', 'Sled/Bike drive', 'Rowing', 'Carry/Step-ups', 'Wall ball / Thrusters'],
  },
  {
    key: 'joint_saver',
    name: 'Low-Impact Joint Saver',
    desc: 'Zero-jump conditioning built for sensitive knees, ankles, or back.',
    warmupSec: 240,
    workSec: 40,
    restSec: 20,
    rounds: 8,
    cooldownSec: 180,
    met: 7.2,
    highImpact: false,
    drills: ['Stationary bike surge', 'Seated battle ropes / shadow boxing', 'Controlled sled walk / Erg pull'],
  },
  {
    key: 'jvr_round',
    name: 'JVR Round (40s Rest)',
    desc: '14-exercise explosive & Batman Barbell Complex circuit with 40s rest between stations.',
    warmupSec: 180,
    workSec: 45,
    restSec: 40,
    rounds: 14,
    cooldownSec: 120,
    met: 9.5,
    highImpact: true,
    drills: [
      'Burpees 3×10',
      'Inchworm to Broad Jump & Forward Tuck Jump',
      'Jump Squat & Barbell Snatch',
      'Batman Barbell Complex (5×5)',
      'DB Burpees, Climbers & Thrusters',
      'Explosive Lower Finisher',
    ],
  },
]

export function computeBmi(weightKg, heightCm) {
  const w = Number(weightKg)
  const h = Number(heightCm)
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h < 80 || h > 260) {
    return null
  }
  const hm = h / 100
  const raw = w / (hm * hm)
  const bmi = Math.round(raw * 10) / 10
  let category = 'Normal weight'
  let tone = 'good'
  let impactCaution = false
  if (bmi < 18.5) {
    category = 'Underweight'
    tone = 'warn'
  } else if (bmi >= 30) {
    category = 'Obese (High joint load)'
    tone = 'danger'
    impactCaution = true
  } else if (bmi >= 25) {
    category = 'Overweight'
    tone = 'warn'
  }
  return { bmi, category, tone, impactCaution }
}

export function evaluateSafetyProfile(healthProfile, S) {
  const hp = healthProfile && typeof healthProfile === 'object' ? healthProfile : {}
  const storedBwKg = resolveBodyWeightKg(S)
  const weightKg = Number(hp.weightKg) > 0 ? Number(hp.weightKg) : storedBwKg
  const heightCm = Number(hp.heightCm) > 0 ? Number(hp.heightCm) : null
  const calcBmi = computeBmi(weightKg, heightCm)
  const overrideBmi = Number(hp.bmi) > 0 ? Math.round(Number(hp.bmi) * 10) / 10 : null
  const bmiInfo =
    overrideBmi && (!calcBmi || Math.abs(overrideBmi - calcBmi.bmi) >= 0.2)
      ? {
          bmi: overrideBmi,
          category:
            overrideBmi < 18.5
              ? 'Underweight'
              : overrideBmi >= 30
                ? 'Obese (High joint load)'
                : overrideBmi >= 25
                  ? 'Overweight'
                  : 'Normal weight',
          tone: overrideBmi < 18.5 || (overrideBmi >= 25 && overrideBmi < 30) ? 'warn' : overrideBmi >= 30 ? 'danger' : 'good',
          impactCaution: overrideBmi >= 30,
        }
      : calcBmi

  const painAreas = Array.isArray(hp.painAreas)
    ? hp.painAreas.filter(k => PAIN_AREAS.some(p => p.key === k))
    : []
  const medicationFlags = Array.isArray(hp.medicationFlags)
    ? hp.medicationFlags.filter(k => MEDICATION_FLAGS.some(m => m.key === k))
    : []
  const medicationsText = String(hp.medications || '').trim()
  const painNotes = String(hp.painNotes || '').trim()

  const missingFields = []
  if (!(Number(hp.weightKg) > 0)) missingFields.push('Weight')
  if (!(Number(hp.heightCm) > 0)) missingFields.push('Height')
  if (!hp.clearanceConfirmed) missingFields.push('Safety confirmation')

  const warnings = []

  if (bmiInfo?.impactCaution) {
    warnings.push({
      level: 'caution',
      title: `BMI ${bmiInfo.bmi} — Joint impact protection active`,
      detail: 'Swap plyometric Broad Jumps and heavy 8km pavement running for BikeErg, Rowing, or Swimming intervals to protect knees & ankles.',
    })
  } else if (bmiInfo && bmiInfo.bmi < 18.5) {
    warnings.push({
      level: 'info',
      title: `BMI ${bmiInfo.bmi} — Fueling & recovery note`,
      detail: 'Ensure pre-session carbohydrates and keep HIIT to 1–2 sessions/week to preserve lean strength mass.',
    })
  }

  for (const key of medicationFlags) {
    const m = MEDICATION_FLAGS.find(x => x.key === key)
    if (m) {
      warnings.push({
        level: 'med',
        title: m.label,
        detail: m.warning,
      })
    }
  }

  if (medicationsText) {
    warnings.push({
      level: 'med',
      title: `Active medication noted: ${medicationsText}`,
      detail: 'Monitor breathing, dizziness, and heart rate closely; stop immediately if you feel chest tightness or lightheadedness.',
    })
  }

  const painAdjustments = painAreas.map(k => PAIN_AREAS.find(p => p.key === k)).filter(Boolean)
  for (const area of painAdjustments) {
    warnings.push({
      level: 'pain',
      title: `${area.label} protection`,
      detail: `${area.caution} Swap: ${area.swap}`,
    })
  }

  if (painNotes) {
    warnings.push({
      level: 'pain',
      title: 'Personal pain note',
      detail: `${painNotes} — Keep all reps pain-free (≤ 2/10 discomfort) and terminate the station on sharp pain.`,
    })
  }

  const complete = Boolean(Number(hp.weightKg) > 0 && Number(hp.heightCm) > 0 && hp.clearanceConfirmed)
  return {
    complete,
    missingFields,
    weightKg: Number(hp.weightKg) > 0 ? Number(hp.weightKg) : weightKg,
    heightCm,
    bmiInfo,
    painAreas,
    painAdjustments,
    medicationFlags,
    medicationsText,
    painNotes,
    warnings,
    preferLowImpact: Boolean(bmiInfo?.impactCaution || painAreas.some(p => ['knees', 'ankles', 'lower_back', 'hips'].includes(p))),
  }
}

export function adaptHyroxStations(safety) {
  const activePain = new Set(safety?.painAreas || [])
  const highImpactBmi = Boolean(safety?.bmiInfo?.impactCaution)
  return HYROX_STATIONS.map(st => {
    const triggered = st.painTriggers.filter(p => activePain.has(p))
    const runCaution = highImpactBmi || activePain.has('knees') || activePain.has('ankles')
    return {
      ...st,
      needsSwap: triggered.length > 0 || (highImpactBmi && (st.key === 'burpee_jump' || st.key === 'sandbag_lunges')),
      triggeredLabels: triggered.map(k => PAIN_AREAS.find(p => p.key === k)?.label).filter(Boolean),
      runNote: runCaution ? 'Swap 1 km run → 1,000 m BikeErg or 500 m Row (low joint impact)' : '1 km run @ Zone 3–4 threshold pace',
    }
  })
}

export function totalHiitSeconds(config) {
  const warm = Math.max(0, Number(config?.warmupSec) || 0)
  const work = Math.max(5, Number(config?.workSec) || 20)
  const rest = Math.max(0, Number(config?.restSec) || 0)
  const rounds = Math.max(1, Number(config?.rounds) || 1)
  const cool = Math.max(0, Number(config?.cooldownSec) || 0)
  const intervals = rounds * work + Math.max(0, rounds - 1) * rest
  return warm + intervals + cool
}

export function estimateSessionKcal(met, weightKg, durationSec) {
  const mins = Math.max(1, Math.round((Number(durationSec) || 0) / 60))
  return estimateActivityKcal(met, weightKg || 72, mins)
}
