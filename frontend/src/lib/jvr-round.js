import { uid } from './format.js'
import { registerCustom } from './exercises.js'
import { PAIN_AREAS } from './conditioning.js'

export const JVR_ROUTINE_NAME = 'JVR Round'
export const JVR_REST_SEC = 40

export const BATMAN_SUBLIFTS = [
  { key: 'shoulder_press', name: 'Barbell Shoulder Press', r: 5, w: 0 },
  { key: 'lat_row', name: 'Barbell Lat / Bent-Over Row', r: 5, w: 0 },
  { key: 'deadlift', name: 'Barbell Deadlift', r: 5, w: 0 },
  { key: 'squat', name: 'Barbell Squat', r: 5, w: 0 },
  { key: 'barbell_pushup', name: 'Barbell Push-Up', r: 5, w: 0 },
]

export const JVR_CUSTOM_EXERCISES = [
  {
    id: 'jvr_inchworm_broad_jump',
    n: 'inchworm to broad jump',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'quads',
    mg: 'legs',
    sm: ['glutes', 'hamstrings', 'shoulders', 'abs'],
    cat: 'plyometrics',
    desc: 'Hinge to walk hands into a plank, walk feet forward, then explode into a broad jump.',
    custom: true,
  },
  {
    id: 'jvr_forward_tuck_jump',
    n: 'forward tuck jump',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'quads',
    mg: 'legs',
    sm: ['calves', 'glutes', 'abs'],
    cat: 'plyometrics',
    desc: 'Jump forward explosively while tucking both knees toward the chest before landing softly.',
    custom: true,
  },
  {
    id: 'jvr_batman_complex',
    n: 'batman barbell complex',
    bp: 'back',
    eq: 'barbell',
    tg: 'upper back',
    mg: 'back',
    sm: ['delts', 'quads', 'hamstrings', 'glutes', 'pectorals', 'abs'],
    cat: 'strength',
    desc: '5-move barbell complex: 5 Shoulder Press -> 5 Lat Row -> 5 Deadlift -> 5 Squat -> 5 Barbell Push-Up as 1 set.',
    custom: true,
  },
  {
    id: 'jvr_db_burpee',
    n: 'dumbbell burpees',
    bp: 'cardio',
    eq: 'dumbbell',
    tg: 'cardiovascular system',
    mg: 'cardio',
    sm: ['pectorals', 'quads', 'shoulders', 'abs'],
    cat: 'strength',
    desc: 'Grip dumbbells on the floor, kick back into a plank/push-up, jump feet in, and stand explosively.',
    custom: true,
  },
  {
    id: 'jvr_db_mountain_climber',
    n: 'dumbbell mountain climbers',
    bp: 'waist',
    eq: 'dumbbell',
    tg: 'abs',
    mg: 'core',
    sm: ['shoulders', 'quads', 'pectorals'],
    cat: 'calisthenics',
    desc: 'Hold a rigid plank on dumbbells and drive knees rapidly toward the chest under tension.',
    custom: true,
  },
  {
    id: 'jvr_db_squat_press',
    n: 'dumbbell squat + shoulder press',
    bp: 'upper legs',
    eq: 'dumbbell',
    tg: 'quads',
    mg: 'legs',
    sm: ['delts', 'glutes', 'triceps', 'abs'],
    cat: 'strength',
    desc: 'Squat with dumbbells at shoulders and drive upward cleanly into a full overhead press (thruster).',
    custom: true,
  },
  {
    id: 'jvr_single_leg_deadlift',
    n: 'single-leg deadlifts',
    bp: 'upper legs',
    eq: 'dumbbell',
    tg: 'hamstrings',
    mg: 'legs',
    sm: ['glutes', 'lower back', 'calves'],
    cat: 'strength',
    desc: 'Hinge on one planted leg with a flat back until torso is parallel, then drive through heel to stand.',
    custom: true,
  },
  {
    id: 'jvr_step_up_jumps',
    n: 'step-up jumps',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'quads',
    mg: 'legs',
    sm: ['glutes', 'calves', 'hamstrings'],
    cat: 'plyometrics',
    desc: 'Place one foot firmly on a sturdy box, drive upward into a vertical hop, switch or repeat cleanly.',
    custom: true,
  },
  {
    id: 'jvr_broad_jumps',
    n: 'broad jumps',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'glutes',
    mg: 'legs',
    sm: ['quads', 'hamstrings', 'calves'],
    cat: 'plyometrics',
    desc: 'Load hips in an athletic quarter-squat, swing arms, and propel horizontally for maximum distance.',
    custom: true,
  },
  {
    id: 'jvr_split_squat_jumps',
    n: 'split squat jumps',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'quads',
    mg: 'legs',
    sm: ['glutes', 'calves', 'hamstrings'],
    cat: 'plyometrics',
    desc: 'Lower into a lunge and explode upward, switching legs mid-air into a soft absorbed landing.',
    custom: true,
  },
  {
    id: 'jvr_skater_jumps',
    n: 'lateral skater jumps',
    bp: 'upper legs',
    eq: 'body weight',
    tg: 'glutes',
    mg: 'legs',
    sm: ['quads', 'calves', 'adductors'],
    cat: 'plyometrics',
    desc: 'Bound laterally from one leg to the opposite leg, stabilizing briefly on each landing.',
    custom: true,
  },
]

export const JVR_STATIONS = [
  {
    num: 1,
    id: '1160',
    name: 'Burpees',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Full-body conditioning engine',
    highImpact: true,
    painTriggers: ['wrists', 'knees', 'lower_back', 'shoulders'],
    safeSwap: 'Elevated hands-on-bench step-back burpees (no chest slam)',
  },
  {
    num: 2,
    id: 'jvr_inchworm_broad_jump',
    name: 'Inchworm to Broad Jump',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Posterior chain mobility + horizontal power',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'wrists', 'lower_back'],
    safeSwap: 'Inchworm walkout + controlled bodyweight squat (skip jump)',
  },
  {
    num: 3,
    id: 'jvr_forward_tuck_jump',
    name: 'Forward Tuck Jump',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Reactive knee drive & hip flexor power',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'hips', 'lower_back'],
    safeSwap: 'Fast marching high-knees or shallow box step-ups (10/side)',
  },
  {
    num: 4,
    id: '3543',
    name: 'Jump Squat',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Quad & glute vertical explosiveness',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'hips'],
    safeSwap: 'Fast concentric box squats to calf raise (feet stay grounded)',
  },
  {
    num: 5,
    id: '1533',
    name: 'Barbell Snatch',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Triple extension speed & overhead stability',
    highImpact: false,
    painTriggers: ['shoulders', 'lower_back', 'wrists'],
    safeSwap: 'Light dumbbell high-pull or kettlebell deadlift-to-shrug',
  },
  {
    num: 6,
    id: 'jvr_batman_complex',
    name: 'Batman Barbell Complex',
    prescription: '3 sets × 5 moves (5 reps ea)',
    sets: 3,
    reps: 25,
    restSec: JVR_REST_SEC,
    focus: 'Press -> Lat Row -> Deadlift -> Squat -> Push-Up unbroken',
    highImpact: false,
    painTriggers: ['lower_back', 'shoulders', 'knees', 'wrists'],
    safeSwap: 'Reduce barbell load 40%, keep incline push-ups & shallow squats',
    subLifts: BATMAN_SUBLIFTS,
  },
  {
    num: 7,
    id: 'jvr_db_burpee',
    name: 'Dumbbell Burpees',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Grip stamina + loaded metabolic surge',
    highImpact: true,
    painTriggers: ['wrists', 'lower_back', 'knees', 'shoulders'],
    safeSwap: 'Neutral-grip step-back burpees with light dumbbells',
  },
  {
    num: 8,
    id: 'jvr_db_mountain_climber',
    name: 'Dumbbell Mountain Climbers',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Anti-rotation core & shoulder endurance',
    highImpact: false,
    painTriggers: ['wrists', 'shoulders', 'hips'],
    safeSwap: 'Hands-elevated slow mountain climbers or dead-bug core presses',
  },
  {
    num: 9,
    id: 'jvr_db_squat_press',
    name: 'Dumbbell Squat + Shoulder Press',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Full-body thruster strength & conditioning',
    highImpact: false,
    painTriggers: ['shoulders', 'knees', 'lower_back'],
    safeSwap: 'Goblet box squat + light alternating neutral-grip press',
  },
  {
    num: 10,
    id: 'jvr_single_leg_deadlift',
    name: 'Single-Leg Deadlifts',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Unilateral hamstring, glute & balance control',
    highImpact: false,
    painTriggers: ['lower_back', 'hips', 'ankles'],
    safeSwap: 'Kickstand B-stance Romanian deadlift (back toe anchored)',
  },
  {
    num: 11,
    id: 'jvr_step_up_jumps',
    name: 'Step-Up Jumps',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Single-leg vertical drive & deceleration',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'hips'],
    safeSwap: 'Controlled weighted box step-ups (zero hop)',
  },
  {
    num: 12,
    id: 'jvr_broad_jumps',
    name: 'Broad Jumps',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Lower-body horizontal explosive finisher',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'lower_back'],
    safeSwap: 'Explosive kettlebell swing or rapid hip-hinge snap jumps (no distance)',
  },
  {
    num: 13,
    id: 'jvr_split_squat_jumps',
    name: 'Split Squat Jumps',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Alternating unilateral plyo power',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'hips'],
    safeSwap: 'Reverse lunges with brisk concentric stand-up',
  },
  {
    num: 14,
    id: 'jvr_skater_jumps',
    name: 'Lateral Skater Jumps',
    prescription: '3 × 10',
    sets: 3,
    reps: 10,
    restSec: JVR_REST_SEC,
    focus: 'Frontal-plane agility & lateral glute power',
    highImpact: true,
    painTriggers: ['knees', 'ankles', 'hips'],
    safeSwap: 'Wide lateral step-outs with controlled single-leg hold',
  },
]

export function adaptJvrStations(safety) {
  const activePain = new Set(safety?.painAreas || [])
  const highImpactBmi = Boolean(safety?.bmiInfo?.impactCaution)
  return JVR_STATIONS.map(st => {
    const triggered = st.painTriggers.filter(p => activePain.has(p))
    const needsSwap = triggered.length > 0 || (highImpactBmi && st.highImpact)
    return {
      ...st,
      needsSwap,
      triggeredLabels: triggered.map(k => PAIN_AREAS.find(p => p.key === k)?.label).filter(Boolean),
    }
  })
}

export function findJvrRoundRoutine(S) {
  return (S?.routines || []).find(r => r && r.name === JVR_ROUTINE_NAME) || null
}

export function ensureJvrCustomExercises(s) {
  if (!Array.isArray(s.customEx)) s.customEx = []
  const now = Date.now()
  for (const ex of JVR_CUSTOM_EXERCISES) {
    if (!s.customEx.some(cur => cur && cur.id === ex.id)) {
      s.customEx.push({ ...ex, sm: [...ex.sm], _ts: now })
    }
  }
  registerCustom(s.customEx)
}

export function buildJvrRoundSlots() {
  return JVR_STATIONS.map(st => {
    const slot = {
      id: st.id,
      sets: st.sets,
      mode: 'reps',
      reps: st.reps,
      weight: 0,
      restSec: st.restSec,
      prog: 'off',
      note: st.focus,
    }
    if (Array.isArray(st.subLifts) && st.subLifts.length) {
      slot.subLifts = st.subLifts.map(m => ({ ...m }))
    }
    return slot
  })
}

export function installJvrRoundRoutine(s) {
  ensureJvrCustomExercises(s)
  if (!Array.isArray(s.routines)) s.routines = []
  const existing = findJvrRoundRoutine(s)
  if (existing) {
    return { id: existing.id, created: false, routine: existing }
  }
  const routine = {
    id: uid(),
    name: JVR_ROUTINE_NAME,
    emoji: 'bolt',
    prog: 'off',
    ex: buildJvrRoundSlots(),
  }
  s.routines.push(routine)
  return { id: routine.id, created: true, routine }
}
