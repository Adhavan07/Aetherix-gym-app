import { evaluateSafetyProfile, PAIN_AREAS } from './conditioning.js'

export const WARMUP_MIN_SEC = 15
export const WARMUP_MAX_SEC = 90
export const WARMUP_STEP_SEC = 5

export const WARMUP_DRILLS = [
  {
    id: 'wu_ankle_wrist',
    name: 'Ankle Bounce & Wrist Circles',
    defaultSec: 30,
    focus: 'Ankles · Calves · Wrists',
    jvrCarryover: 'Burpees · Step-Up Jumps · Barbell Snatch',
    cue: 'Light elastic ankle hops while rolling wrists in slow full circles both ways.',
    swaps: ['wu_seated_ankle_wrist', 'wu_wall_slide', 'wu_step_back_sprawl'],
    painCautions: ['ankles', 'wrists', 'knees'],
    lowImpact: false,
  },
  {
    id: 'wu_wgs',
    name: "World's Greatest Stretch — Alternating",
    defaultSec: 45,
    focus: 'Hips · Hamstrings · Thoracic Spine',
    jvrCarryover: 'Inchworm to Broad Jump · Split Squat Jumps',
    cue: 'Step into a deep runner lunge, drop inside elbow toward ankle, then rotate chest skyward.',
    swaps: ['wu_half_kneeling_hip', 'wu_cat_camel', 'wu_cossack'],
    painCautions: ['knees'],
    lowImpact: true,
  },
  {
    id: 'wu_inchworm_reach',
    name: 'Inchworm Walkout + Thoracic Reach',
    defaultSec: 45,
    focus: 'Hamstrings · Core · Shoulders',
    jvrCarryover: 'Inchworm to Broad Jump · DB Mountain Climbers',
    cue: 'Hinge with soft knees, walk hands to a strong plank, reach one arm up, then walk feet in.',
    swaps: ['wu_cat_camel', 'wu_glute_bridge_march', 'wu_wall_slide'],
    painCautions: ['wrists', 'shoulders', 'lower_back'],
    lowImpact: true,
  },
  {
    id: 'wu_cossack',
    name: 'Dynamic Cossack Squat Shifts',
    defaultSec: 40,
    focus: 'Adductors · Ankles · Glutes',
    jvrCarryover: 'Lateral Skater Jumps · Jump Squat',
    cue: 'Take a wide stance and glide side to side smoothly, keeping the planted heel flat.',
    swaps: ['wu_lateral_step_reach', 'wu_half_kneeling_hip', 'wu_deep_squat_oh'],
    painCautions: ['knees', 'hips'],
    lowImpact: true,
  },
  {
    id: 'wu_hinge_pull',
    name: 'Good-Morning Scapular Hinge & Pull-Apart',
    defaultSec: 35,
    focus: 'Hamstrings · Posterior Chain · Upper Back',
    jvrCarryover: 'Single-Leg Deadlifts · Batman Lat Row & Deadlift',
    cue: 'Push hips straight back with a braced spine, squeeze shoulder blades open into a Y-T pull.',
    swaps: ['wu_glute_bridge_march', 'wu_cat_camel', 'wu_wall_slide'],
    painCautions: ['lower_back', 'shoulders'],
    lowImpact: true,
  },
  {
    id: 'wu_deep_squat_oh',
    name: 'Deep Squat Hold with Overhead Reach',
    defaultSec: 40,
    focus: 'Hips · Thoracic Extension · Overhead Shoulders',
    jvrCarryover: 'Barbell Snatch · DB Squat + Press · Batman Squat',
    cue: 'Sink into a comfortable squat, press knees out with elbows, and alternate overhead reaches.',
    swaps: ['wu_thruster_groove', 'wu_wall_slide', 'wu_half_kneeling_hip'],
    painCautions: ['knees', 'shoulders'],
    lowImpact: true,
  },
  {
    id: 'wu_a_skip_march',
    name: 'A-Skip / High-Knee March Ramp',
    defaultSec: 35,
    focus: 'Hip Flexors · Heart Rate · Coordination',
    jvrCarryover: 'Forward Tuck Jump · Jump Squat · Burpees',
    cue: 'Drive knee crisp to hip height with opposite arm punch, building rhythm over 35 seconds.',
    swaps: ['wu_step_back_sprawl', 'wu_glute_bridge_march', 'wu_lateral_step_reach'],
    painCautions: ['knees', 'ankles', 'hips'],
    lowImpact: false,
  },
  {
    id: 'wu_pogo_stick',
    name: 'Pogo Hops & Broad-Jump Stick Landings',
    defaultSec: 30,
    focus: 'CNS Snap · Athletic Landing Mechanics',
    jvrCarryover: 'Broad Jumps · Split Squat Jumps · Step-Up Jumps',
    cue: '5 quick stiff-ankle pogo hops into 2 short horizontal bounds, freezing silently on each landing.',
    swaps: ['wu_step_back_sprawl', 'wu_thruster_groove', 'wu_lateral_step_reach'],
    painCautions: ['knees', 'ankles', 'lower_back'],
    lowImpact: false,
  },
  // Curated swaps & low-impact alternatives
  {
    id: 'wu_seated_ankle_wrist',
    name: 'Calf Pumps & Forearm Tendon Glides',
    defaultSec: 30,
    focus: 'Ankles · Calves · Wrists (Zero Impact)',
    jvrCarryover: 'Step-Up Jumps · Barbell Snatch · DB Grips',
    cue: 'Alternate slow heel raises with controlled finger-flexion & wrist rotation waves.',
    swaps: ['wu_ankle_wrist', 'wu_wall_slide', 'wu_step_back_sprawl'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_half_kneeling_hip',
    name: 'Half-Kneeling Hip Flexor & T-Spine Openers',
    defaultSec: 45,
    focus: 'Hip Flexors · Thoracic Mobility',
    jvrCarryover: 'Split Squat Jumps · Forward Tuck Jump',
    cue: 'Tuck pelvis softly under on the back knee and rotate arms open toward the front leg.',
    swaps: ['wu_wgs', 'wu_cossack', 'wu_cat_camel'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_wall_slide',
    name: 'Wall Angels & Overhead Scapular Slides',
    defaultSec: 35,
    focus: 'Rotator Cuff · Thoracic · Overhead Stability',
    jvrCarryover: 'Batman Shoulder Press · Barbell Snatch',
    cue: 'Keep ribs tucked and slide forearms smoothly overhead without shrugging traps.',
    swaps: ['wu_deep_squat_oh', 'wu_hinge_pull', 'wu_thruster_groove'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_cat_camel',
    name: 'Cat-Camel & Bird-Dog Core Bracing',
    defaultSec: 40,
    focus: 'Spine Segmentation · Deep Core · Glutes',
    jvrCarryover: 'Single-Leg Deadlifts · Batman Deadlift',
    cue: 'Alternate 4 slow spinal waves with controlled opposite arm-and-leg reaches without hip twist.',
    swaps: ['wu_inchworm_reach', 'wu_hinge_pull', 'wu_glute_bridge_march'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_lateral_step_reach',
    name: 'Wide Lateral Lunge Steps (No Bounce)',
    defaultSec: 40,
    focus: 'Lateral Hips · Adductors · Knee Tracking',
    jvrCarryover: 'Lateral Skater Jumps · Jump Squat',
    cue: 'Step wide into a controlled side lunge, sit back into the hip, and drive smoothly back upright.',
    swaps: ['wu_cossack', 'wu_half_kneeling_hip', 'wu_glute_bridge_march'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_glute_bridge_march',
    name: 'Glute Bridge Hold & Alternating March',
    defaultSec: 35,
    focus: 'Glutes · Hamstrings · Pelvis Control',
    jvrCarryover: 'Single-Leg Deadlifts · Broad Jumps',
    cue: 'Press heels down into a level hip bridge and lift one knee cleanly without dropping the hips.',
    swaps: ['wu_hinge_pull', 'wu_a_skip_march', 'wu_cat_camel'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_thruster_groove',
    name: 'Bodyweight Tempo Squat to Y-Press',
    defaultSec: 40,
    focus: 'Quads · Overhead Shoulder Patterning',
    jvrCarryover: 'DB Squat + Shoulder Press · Batman Squat & Press',
    cue: 'Lower 2 seconds into a mid-depth squat, stand tall, and punch arms cleanly overhead into a Y.',
    swaps: ['wu_deep_squat_oh', 'wu_wall_slide', 'wu_pogo_stick'],
    painCautions: [],
    lowImpact: true,
  },
  {
    id: 'wu_step_back_sprawl',
    name: 'Controlled Step-Back Planks & Snap-Ins',
    defaultSec: 30,
    focus: 'Conditioning Ramp · Core · Low-Impact Hips',
    jvrCarryover: 'Burpees · DB Burpees · Mountain Climbers',
    cue: 'Step feet back swiftly to a rigid plank and step forward into an athletic squat stance.',
    swaps: ['wu_pogo_stick', 'wu_a_skip_march', 'wu_inchworm_reach'],
    painCautions: [],
    lowImpact: true,
  },
]

export const WARMUP_DRILL_BY_ID = Object.fromEntries(WARMUP_DRILLS.map(d => [d.id, d]))

export const JVR_DEFAULT_ORDER = [
  'wu_ankle_wrist',
  'wu_wgs',
  'wu_inchworm_reach',
  'wu_cossack',
  'wu_hinge_pull',
  'wu_deep_squat_oh',
  'wu_a_skip_march',
  'wu_pogo_stick',
]

export function defaultJvrWarmupPlan() {
  return JVR_DEFAULT_ORDER.map(id => ({
    drillId: id,
    sec: WARMUP_DRILL_BY_ID[id].defaultSec,
  }))
}

export function clampWarmupSec(sec) {
  const n = Math.round(Number(sec) || 30)
  return Math.max(WARMUP_MIN_SEC, Math.min(WARMUP_MAX_SEC, n))
}

export function normalizeWarmupPlan(rawPlan) {
  const base = Array.isArray(rawPlan) && rawPlan.length > 0 ? rawPlan : defaultJvrWarmupPlan()
  return base
    .map(slot => {
      const drill = WARMUP_DRILL_BY_ID[slot?.drillId]
      if (!drill) return null
      return {
        drillId: drill.id,
        sec: clampWarmupSec(slot?.sec ?? drill.defaultSec),
      }
    })
    .filter(Boolean)
}

export function resolveWarmupSequence(S) {
  const plan = normalizeWarmupPlan(S?.warmupPlan)
  const safety = evaluateSafetyProfile(S?.healthProfile, S)
  const activePain = new Set(safety.painAreas || [])
  const highImpactBmi = Boolean(safety.bmiInfo?.impactCaution)

  return plan.map((slot, idx) => {
    const drill = WARMUP_DRILL_BY_ID[slot.drillId]
    const defaultId = JVR_DEFAULT_ORDER[idx] || null
    const triggered = drill.painCautions.filter(p => activePain.has(p))
    const needsCaution = triggered.length > 0 || (highImpactBmi && !drill.lowImpact)
    const triggeredLabels = triggered
      .map(k => PAIN_AREAS.find(p => p.key === k)?.label)
      .filter(Boolean)
    const safeSwapId =
      drill.swaps.find(id => {
        const alt = WARMUP_DRILL_BY_ID[id]
        return alt && alt.lowImpact && !alt.painCautions.some(p => activePain.has(p))
      }) || drill.swaps[0]

    return {
      idx,
      drillId: drill.id,
      sec: slot.sec,
      drill,
      isSwapped: Boolean(defaultId && drill.id !== defaultId),
      isModifiedSec: slot.sec !== drill.defaultSec,
      needsCaution,
      triggeredLabels,
      safeSwap: safeSwapId ? WARMUP_DRILL_BY_ID[safeSwapId] : null,
    }
  })
}

export function totalWarmupSec(seq) {
  return (Array.isArray(seq) ? seq : []).reduce((sum, item) => sum + (Number(item?.sec) || 0), 0)
}

export function isCustomWarmupPlan(S) {
  if (!Array.isArray(S?.warmupPlan) || S.warmupPlan.length === 0) return false
  const cur = normalizeWarmupPlan(S.warmupPlan)
  const def = defaultJvrWarmupPlan()
  if (cur.length !== def.length) return true
  return cur.some((item, i) => item.drillId !== def[i].drillId || item.sec !== def[i].sec)
}

export function getSwapOptionsForDrill(drillId, S) {
  const drill = WARMUP_DRILL_BY_ID[drillId]
  const safety = evaluateSafetyProfile(S?.healthProfile, S)
  const activePain = new Set(safety.painAreas || [])
  const seen = new Set([drillId])
  const curated = []
  const others = []

  for (const id of drill?.swaps || []) {
    const d = WARMUP_DRILL_BY_ID[id]
    if (d && !seen.has(id)) {
      seen.add(id)
      const isJointSafe = d.lowImpact && !d.painCautions.some(p => activePain.has(p))
      curated.push({ ...d, recommended: true, isJointSafe })
    }
  }
  for (const d of WARMUP_DRILLS) {
    if (!seen.has(d.id)) {
      seen.add(d.id)
      const isJointSafe = d.lowImpact && !d.painCautions.some(p => activePain.has(p))
      others.push({ ...d, recommended: false, isJointSafe })
    }
  }
  return { curated, others }
}

export function setWarmupSlotDurationInState(s, idx, nextSec) {
  const plan = normalizeWarmupPlan(s.warmupPlan)
  if (idx < 0 || idx >= plan.length) return plan
  plan[idx] = { ...plan[idx], sec: clampWarmupSec(nextSec) }
  s.warmupPlan = plan
  return plan
}

export function swapWarmupSlotInState(s, idx, newDrillId) {
  const drill = WARMUP_DRILL_BY_ID[newDrillId]
  if (!drill) return normalizeWarmupPlan(s.warmupPlan)
  const plan = normalizeWarmupPlan(s.warmupPlan)
  if (idx < 0 || idx >= plan.length) return plan
  plan[idx] = { drillId: drill.id, sec: drill.defaultSec }
  s.warmupPlan = plan
  return plan
}

export function resetWarmupPlanInState(s) {
  s.warmupPlan = null
  return defaultJvrWarmupPlan()
}
