import { EXDB, EXIDX, registerCustom } from './exercises.js'
import { MUSCLE_NAME } from './muscles.js'
import { exerciseAliases } from './exercise-aliases.js'
import {
  COLLECTION_TARGET,
  DATABASE_BENCHMARKS,
  DISCIPLINES,
  ENCYCLOPEDIA_SECTIONS,
  FLAGSHIP_ENTRIES,
  MOVEMENT_PATTERNS,
} from './encyclopedia-data.js'

export {
  COLLECTION_TARGET,
  DATABASE_BENCHMARKS,
  DISCIPLINES,
  ENCYCLOPEDIA_SECTIONS,
  FLAGSHIP_ENTRIES,
  MOVEMENT_PATTERNS,
}

const DISCIPLINE_BY_ID = Object.fromEntries(DISCIPLINES.map(d => [d.id, d]))
const PATTERN_BY_ID = Object.fromEntries(MOVEMENT_PATTERNS.map(p => [p.id, p]))
const SECTION_BY_ID = Object.fromEntries(ENCYCLOPEDIA_SECTIONS.map(s => [s.id, s]))

const BODYPART_TO_BP = {
  chest: 'chest',
  back: 'back',
  shoulders: 'shoulders',
  'upper arms': 'upper arms',
  'lower arms': 'lower arms',
  'upper legs': 'upper legs',
  'lower legs': 'lower legs',
  waist: 'waist',
  cardio: 'cardio',
  neck: 'neck',
  'full body': 'full body',
}

function titleCase(str) {
  return String(str || '')
    .trim()
    .replace(/\b([a-z])/g, (_, ch) => ch.toUpperCase())
}

function inferDisciplineId(ex) {
  const name = String(ex?.n || '').toLowerCase()
  const eq = String(ex?.eq || '').toLowerCase()
  const cat = String(ex?.cat || '').toLowerCase()

  if (eq === 'macebell') return 'traditional_practices'
  if (eq === 'sandbag' || eq === 'tire' || eq === 'sled machine' || eq === 'hammer' || /\b(farmer|yoke|stone|log press)\b/.test(name)) return 'strongman'
  if (eq === 'stationary bike' || /\b(cycling|bike|peloton)\b/.test(name)) return 'cycling'
  if (eq === 'skierg machine' || /\brow(er|ing)? erg\b/.test(name)) return 'rowing'
  if (cat === 'yoga') return 'yoga'
  if (cat === 'pilates') return 'pilates'
  if (cat === 'olympic') return 'olympic_weightlifting'
  if (cat === 'plyometrics') {
    if (/\b(hurdle|bound|depth|skip)\b/.test(name)) return 'track_and_field'
    return 'jump_training'
  }
  if (cat === 'combat') {
    if (/\b(jab|cross|hook|uppercut|boxing|shadowbox)\b/.test(name)) return 'boxing'
    if (/\b(sprawl|wrestl|shoot|takedown|grappl)\b/.test(name)) return 'wrestling'
    return 'martial_arts'
  }
  if (cat === 'rehab') {
    if (eq === 'bosu ball' || /\b(balance|single[- ]leg|propriocept)\b/.test(name)) return 'balance_training'
    return eq === 'band' || eq === 'resistance band' ? 'physical_therapy' : 'rehabilitation'
  }
  if (cat === 'mobility') return 'mobility'
  if (cat === 'stretching') return 'flexibility'
  if (cat === 'cardio') {
    if (/\b(sprint|run|jog|shuttle|cone|ladder)\b/.test(name)) {
      return /\b(ladder|cone|shuttle|agility)\b/.test(name) ? 'agility' : 'running'
    }
    if (/\b(jump rope|hiit|burpee|battle rope)\b/.test(name)) return 'cardio'
    return 'endurance'
  }
  if (cat === 'isometric') {
    if (eq === 'bosu ball' || eq === 'stability ball') return 'balance_training'
    return 'calisthenics'
  }
  if (cat === 'calisthenics') {
    if (eq === 'suspension trainer' || /\b(ring|handstand|muscle-up|planche|lever|l-sit)\b/.test(name)) return 'gymnastics'
    return 'calisthenics'
  }

  if (eq === 'kettlebell') return 'kettlebell_training'
  if (eq === 'band' || eq === 'resistance band') return 'resistance_band'
  if (eq === 'leverage machine' || eq === 'smith machine' || eq === 'assisted' || eq === 'cable') return 'machine_training'
  if (eq === 'trap bar' || /\b(powerlifting|bench press|back squat|deadlift|low bar|sumo)\b/.test(name)) return 'powerlifting'
  if (eq === 'medicine ball' || eq === 'suspension trainer' || eq === 'wheel roller' || eq === 'rope') return 'functional_fitness'
  if (eq === 'dumbbell' || eq === 'barbell' || eq === 'ez barbell' || eq === 'weighted') return 'bodybuilding'
  if (eq === 'body weight') return 'home_fitness'
  return 'bodybuilding'
}

export function inferMovementPattern(ex) {
  const name = String(ex?.n || '').toLowerCase()
  const cat = String(ex?.cat || '').toLowerCase()
  const bp = String(ex?.bp || '').toLowerCase()
  const eq = String(ex?.eq || '').toLowerCase()

  if (cat === 'olympic' || /\b(snatch|clean|jerk)\b/.test(name)) return 'olympic_lift'
  if (cat === 'combat' || /\b(punch|jab|kick|sprawl|boxing)\b/.test(name)) return 'combat_grapple'
  if (cat === 'yoga' || cat === 'pilates') return 'yoga_pilates'
  if (cat === 'mobility' || cat === 'stretching') return 'spinal_mobility'
  if (cat === 'rehab' || eq === 'bosu ball') return 'rehab_balance'
  if (/\b(swim|pool|aqua)\b/.test(name)) return 'aquatic_cyclic'
  if (/\b(breath|diaphragm|respirat)\b/.test(name)) return 'respiratory_control'
  if (cat === 'plyometrics' || /\b(jump|hop|bound|plyo|skip)\b/.test(name)) return 'plyometric_jump'
  if (/\b(agility|ladder|shuttle|cone|cut|shuffle)\b/.test(name)) return 'agility_cod'
  if (/\b(carry|walk|farmer|sled|drag|yoke|stone|march)\b/.test(name)) return 'carry_load'
  if (/\b(run|sprint|jog|bike|cycle|elliptical|stepmill|cardio|ergometer)\b/.test(name) || bp === 'cardio') return 'locomotion_gait'
  if (/\b(lunge|split squat|step[- ]?up|pistol|single[- ]leg squat)\b/.test(name)) return 'lunge_unilateral'
  if (/\b(squat|leg press|hack squat|thruster)\b/.test(name)) return 'squat'
  if (/\b(deadlift|rdl|good morning|hip thrust|glute bridge|swing|back extension|hyperextension|leg curl)\b/.test(name)) return 'hinge'
  if (/\b(pulldown|pull[- ]?up|chin[- ]?up|muscle[- ]?up)\b/.test(name)) return 'vertical_pull'
  if (/\b(row|face pull|reverse fly|pull[- ]?apart|inverted row)\b/.test(name)) return 'horizontal_pull'
  if (/\b(overhead press|shoulder press|military press|arnold press|push press|handstand|pike press|lateral raise|front raise)\b/.test(name)) return 'vertical_push'
  if (/\b(bench press|chest press|push[- ]?up|dip|fly|pec deck|floor press)\b/.test(name)) return 'horizontal_push'
  if (/\b(plank|crunch|sit[- ]?up|hollow|rollout|pallof|twist|woodchop|leg raise|v[- ]?up|dead bug|bird dog)\b/.test(name) || bp === 'waist') return 'core_bracing'
  if (/\b(curl|tricep|pushdown|kickback|calf|wrist|shrug|extension)\b/.test(name)) return 'arm_isolation'
  return bp === 'chest' ? 'horizontal_push'
    : bp === 'back' ? 'horizontal_pull'
      : bp === 'shoulders' ? 'vertical_push'
        : bp === 'upper legs' ? 'squat'
          : 'arm_isolation'
}

function inferDifficulty(ex, disciplineId) {
  const name = String(ex?.n || '').toLowerCase()
  const eq = String(ex?.eq || '').toLowerCase()
  if (disciplineId === 'rehabilitation' || disciplineId === 'physical_therapy' || disciplineId === 'senior_fitness' || disciplineId === 'adaptive_exercise' || disciplineId === 'prenatal_postnatal' || disciplineId === 'aquatic_rehab' || disciplineId === 'breathing_exercises') {
    return 'Adaptive'
  }
  if (disciplineId === 'olympic_weightlifting' || /\b(muscle[- ]?up|planche|pistol|dragon flag|snatch|jerk|one arm|single leg jump|depth jump)\b/.test(name)) {
    return 'Advanced'
  }
  if (eq === 'barbell' || eq === 'olympic barbell' || eq === 'kettlebell' || eq === 'suspension trainer' || /\b(bulgarian|incline|decline|clean|plyo|box jump)\b/.test(name)) {
    return 'Intermediate'
  }
  return 'Beginner'
}

function buildVariationLabel(ex) {
  const eq = titleCase(ex?.eq || 'Body weight')
  const n = String(ex?.n || '').toLowerCase()
  const stance = /\b(single[- ]arm|one[- ]arm|unilateral|single[- ]leg)\b/.test(n) ? 'Unilateral'
    : /\b(seated|kneeling|incline|decline)\b/.test(n) ? titleCase(n.match(/\b(seated|kneeling|incline|decline)\b/)[0])
      : 'Standard'
  return `${eq} · ${stance}`
}

function buildCatalogEntry(ex) {
  const disciplineId = inferDisciplineId(ex)
  const disc = DISCIPLINE_BY_ID[disciplineId] || DISCIPLINES[0]
  const movementPattern = inferMovementPattern(ex)
  const difficulty = inferDifficulty(ex, disciplineId)
  const primary = [MUSCLE_NAME[ex?.tg] || titleCase(ex?.tg || ex?.bp || 'Full body')]
  const secondariesRaw = Array.isArray(ex?.sm) ? ex.sm : []
  const secondaryMuscles = [...new Set(secondariesRaw.map(m => MUSCLE_NAME[m] || titleCase(m)).filter(m => !primary.includes(m)))]
  const aliases = exerciseAliases(ex.id)

  return {
    id: `ENC-CAT-${ex.id}`,
    catalogId: ex.id,
    isFlagship: false,
    name: titleCase(ex.n),
    alternativeNames: aliases.length ? aliases.map(titleCase) : [`${titleCase(ex.eq || 'Standard')} ${titleCase(ex.n)}`],
    disciplineId,
    disciplineNum: disc.num,
    disciplineName: disc.name,
    section: disc.section,
    movementPattern,
    patternLabel: PATTERN_BY_ID[movementPattern]?.label || titleCase(movementPattern),
    variationLabel: buildVariationLabel(ex),
    bp: BODYPART_TO_BP[ex.bp] || 'full body',
    primaryMuscles: primary,
    secondaryMuscles: secondaryMuscles.length ? secondaryMuscles : ['Trunk stabilizers'],
    equipment: ex.eq || 'body weight',
    difficulty,
    rawCatalog: ex,
  }
}

function formatFlagshipEntry(item) {
  const disc = DISCIPLINE_BY_ID[item.disciplineId] || DISCIPLINES[0]
  const pat = PATTERN_BY_ID[item.movementPattern]
  return {
    ...item,
    isFlagship: true,
    disciplineNum: disc.num,
    disciplineName: disc.name,
    section: disc.section,
    patternLabel: pat?.label || titleCase(item.movementPattern),
    variationLabel: item.variationLabel || titleCase(item.equipment),
  }
}

let cachedIndex = null
let cachedCatalogById = null

export function getEncyclopediaIndex() {
  if (cachedIndex) return cachedIndex
  const flagships = FLAGSHIP_ENTRIES.map(formatFlagshipEntry)
  const coveredCatalogIds = new Set(flagships.map(e => e.catalogId).filter(Boolean))
  const catalogEntries = []
  cachedCatalogById = {}

  for (const ex of EXDB) {
    if (!ex || !ex.id || coveredCatalogIds.has(ex.id)) continue
    const entry = buildCatalogEntry(ex)
    catalogEntries.push(entry)
    cachedCatalogById[ex.id] = entry
  }

  cachedIndex = [...flagships, ...catalogEntries]
  return cachedIndex
}

export function resolveEncyclopediaDetail(entry, allEntries = getEncyclopediaIndex()) {
  if (!entry) return null
  const disc = DISCIPLINE_BY_ID[entry.disciplineId] || DISCIPLINES[0]
  const sec = SECTION_BY_ID[disc.section] || ENCYCLOPEDIA_SECTIONS[0]
  const category = `${String(disc.num).padStart(2, '0')}. ${disc.name} · ${sec.code}`

  if (entry.startingPosition && Array.isArray(entry.steps) && entry.steps.length) {
    return {
      ...entry,
      category,
      alternativeNames: entry.alternativeNames || [],
      primaryMuscles: entry.primaryMuscles || [],
      secondaryMuscles: entry.secondaryMuscles || [],
      easierAlternatives: entry.easierAlternatives || [],
      advancedVariations: entry.advancedVariations || [],
      relatedExercises: entry.relatedExercises || [],
    }
  }

  const eq = entry.equipment || 'body weight'
  const patLabel = entry.patternLabel || 'compound movement'
  const primText = entry.primaryMuscles.join(', ')
  const secText = entry.secondaryMuscles.join(', ')
  const siblings = getMovementPatternVariations(entry, allEntries)
  const diffEqSiblings = siblings.filter(s => s.equipment !== eq).slice(0, 3).map(s => s.name)
  const sameEqSiblings = siblings.filter(s => s.equipment === eq).slice(0, 3).map(s => s.name)

  const startingPosition = buildDefaultStart(entry, eq, patLabel)
  const steps = buildDefaultSteps(entry, eq, patLabel, primText)
  const breathing = buildDefaultBreathing(entry.movementPattern)
  const commonMistakes = buildDefaultMistakes(entry.movementPattern, eq)
  const safetyConsiderations = buildDefaultSafety(entry.movementPattern, eq, secText)
  const easierAlternatives = entry.difficulty === 'Beginner'
    ? ['Reduced-range controlled tempo version', 'Supported bodyweight / light resistance-band regression']
    : (diffEqSiblings.length ? [diffEqSiblings[0], `Lighter ${eq} tempo control variation`] : [`Light-load ${eq} controlled regression`])
  const advancedVariations = [`Pause / tempo 3-1-1 ${entry.name}`, `Unilateral or increased-ROM ${patLabel} progression`]
  const relatedExercises = [...new Set([...diffEqSiblings, ...sameEqSiblings])].slice(0, 4)

  return {
    ...entry,
    category,
    startingPosition,
    steps,
    breathing,
    commonMistakes,
    safetyConsiderations,
    easierAlternatives,
    advancedVariations,
    relatedExercises: relatedExercises.length ? relatedExercises : [`Related ${patLabel} variation`],
  }
}

function buildDefaultStart(entry, eq, patLabel) {
  if (entry.movementPattern === 'squat') {
    return `Set stance shoulder-width with toes angled lightly outward, organize ${eq} safely over your center of mass, pull ribs over pelvis, and establish a 360-degree core brace.`
  }
  if (entry.movementPattern === 'hinge') {
    return `Stand hip-width over the ${eq} with soft knees, lats depressed, and spine neutral from crown to tailbone before unlocking the hips backward.`
  }
  if (entry.movementPattern === 'horizontal_push' || entry.movementPattern === 'vertical_push') {
    return `Set shoulder blades depressed and stable against the support/bench or stacked overhead line, wrists neutral over forearms, and ${eq} positioned securely before initiating.`
  }
  if (entry.movementPattern === 'horizontal_pull' || entry.movementPattern === 'vertical_pull') {
    return `Take an aligned grip on the ${eq}, start with full comfortable scapular reach/stretch without losing trunk stiffness, and align forearms along the line of pull.`
  }
  if (entry.movementPattern === 'spinal_mobility' || entry.movementPattern === 'yoga_pilates') {
    return `Enter a stable, joint-stacked alignment suitable for ${patLabel}, keeping shoulders relaxed away from ears and breathing smoothly through the nose.`
  }
  return `Adopt a balanced athletic setup using ${eq}, aligning working joints cleanly along the intended ${patLabel.toLowerCase()} path with light midline bracing.`
}

function buildDefaultSteps(entry, eq, patLabel, primText) {
  if (entry.movementPattern === 'spinal_mobility' || entry.movementPattern === 'yoga_pilates') {
    return [
      `Ease gently into the active ${patLabel.toLowerCase()} position until a controlled engagement or stretch registers across ${primText}.`,
      'Move deliberately through pain-free joint range without forcing momentum.',
      'Hold peak end-range briefly for 2–3 calm breaths maintaining postural control.',
      'Return smoothly along the exact same alignment before alternating or repeating.',
    ]
  }
  return [
    `Initiate ${entry.name} smoothly through the primary ${patLabel.toLowerCase()} path while maintaining steady joint stacking and tension in ${primText}.`,
    `Control the lowering / lengthening phase for 2–3 seconds without bouncing or losing ${eq} balance.`,
    'Pause cleanly at peak mechanical stretch or transition point with zero joint collapse.',
    'Drive concentrically back to the starting lockout posture without swinging or compensating through the lower back.',
  ]
}

function buildDefaultBreathing(pattern) {
  if (pattern === 'spinal_mobility' || pattern === 'yoga_pilates' || pattern === 'rehab_balance') {
    return 'Slow nasal inhale before entering position; long calm exhale deepening range or stabilization hold.'
  }
  if (pattern === 'locomotion_gait' || pattern === 'aquatic_cyclic') {
    return 'Steady rhythmic stride- or stroke-matched breathing keeping upper traps relaxed.'
  }
  return 'Inhale and brace trunk gently on the lowering/eccentric phase; exhale smoothly past the hardest sticking point.'
}

function buildDefaultMistakes(pattern, eq) {
  if (pattern === 'squat' || pattern === 'lunge_unilateral') {
    return ['Allowing front knees to collapse inward (valgus)', 'Lifting heels off the floor prematurely', `Rounding lower back under ${eq} fatigue`]
  }
  if (pattern === 'hinge') {
    return ['Flexing the lumbar spine instead of hinging through the hips', `Letting ${eq} drift far forward away from the center of gravity`, 'Hyperextending backward at top lockout']
  }
  if (pattern === 'horizontal_push' || pattern === 'vertical_push') {
    return ['Flaring elbows out 90 degrees or shrugging shoulders to ears', 'Excessive lower-back rib flare during lockout', `Bouncing ${eq} fast out of the bottom stretch`]
  }
  if (pattern === 'horizontal_pull' || pattern === 'vertical_pull') {
    return ['Pulling exclusively with biceps while shrugging upper traps', 'Twisting or swinging torso violently for momentum', 'Cutting bottom range short before scapular lengthen']
  }
  return ['Rushing tempo with uncontrolled momentum', 'Compensating range from the lower back or neck', 'Selecting resistance before mastering alignment']
}

function buildDefaultSafety(pattern, eq, secText) {
  return `Progress ${eq} load or complexity only while maintaining clean joint alignment and steady support from ${secText}. Stop immediately if sharp joint, tendon, or radiating nerve pain occurs.`
}

export function getMovementPatternVariations(entry, allEntries = getEncyclopediaIndex()) {
  if (!entry) return []
  return allEntries.filter(other => other.movementPattern === entry.movementPattern && other.id !== entry.id)
}

export function filterEncyclopedia(entries, {
  section = 0,
  disciplineId = '',
  patternId = '',
  difficulty = '',
  equipment = '',
  packOnly = false,
  query = '',
} = {}) {
  const q = String(query || '').trim().toLowerCase()
  return entries.filter(e => {
    if (packOnly && !e.isFlagship) return false
    if (section && e.section !== Number(section)) return false
    if (disciplineId && e.disciplineId !== disciplineId) return false
    if (patternId && e.movementPattern !== patternId) return false
    if (difficulty && e.difficulty !== difficulty) return false
    if (equipment && e.equipment !== equipment) return false
    if (!q) return true
    const hay = [
      e.id,
      e.name,
      ...(e.alternativeNames || []),
      e.disciplineName,
      e.patternLabel,
      e.variationLabel,
      e.equipment,
      ...(e.primaryMuscles || []),
      ...(e.secondaryMuscles || []),
    ].join(' ').toLowerCase()
    return hay.includes(q)
  })
}

export function getEncyclopediaSummary(entries = getEncyclopediaIndex()) {
  const disciplineCounts = {}
  const sectionCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }
  const patternsCovered = new Set()
  let flagshipCount = 0

  for (const d of DISCIPLINES) disciplineCounts[d.id] = 0
  for (const e of entries) {
    disciplineCounts[e.disciplineId] = (disciplineCounts[e.disciplineId] || 0) + 1
    if (sectionCounts[e.section] != null) sectionCounts[e.section] += 1
    patternsCovered.add(e.movementPattern)
    if (e.isFlagship) flagshipCount += 1
  }

  return {
    totalEntries: entries.length,
    flagshipCount,
    uniquePatternCount: patternsCovered.size,
    totalPatterns: MOVEMENT_PATTERNS.length,
    totalDisciplines: DISCIPLINES.length,
    coveredDisciplines: DISCIPLINES.filter(d => (disciplineCounts[d.id] || 0) > 0).length,
    target: COLLECTION_TARGET,
    targetMet: entries.length >= COLLECTION_TARGET,
    disciplineCounts,
    sectionCounts,
    benchmarks: DATABASE_BENCHMARKS,
  }
}

export function ensureEncyclopediaExerciseRegistered(entry, state, updateFn) {
  if (!entry) return null
  if (entry.catalogId && EXIDX[entry.catalogId]) {
    return EXIDX[entry.catalogId]
  }
  const customList = Array.isArray(state?.customEx) ? state.customEx : []
  const existing = customList.find(c => c && (c.id === entry.id || c.encId === entry.id))
  if (existing) {
    if (!EXIDX[existing.id]) registerCustom([...customList])
    return existing
  }

  const detail = resolveEncyclopediaDetail(entry)
  const bp = BODYPART_TO_BP[entry.bp] || 'full body'
  const prim = (entry.primaryMuscles || []).map(m => m.toLowerCase())
  const sec = (entry.secondaryMuscles || []).map(m => m.toLowerCase())
  const customRecord = {
    id: entry.id,
    encId: entry.id,
    n: entry.name.toLowerCase(),
    aliases: entry.alternativeNames || [],
    bp,
    eq: entry.equipment || 'body weight',
    tg: prim[0] || bp,
    sm: sec,
    muscleGroups: [...new Set([...prim, ...sec])],
    primaries: prim,
    secondaries: sec,
    desc: `${detail.startingPosition} ${detail.steps.join(' ')}`.trim(),
    custom: true,
  }

  if (typeof updateFn === 'function') {
    updateFn(s => {
      s.customEx = Array.isArray(s.customEx) ? s.customEx : []
      if (!s.customEx.some(c => c && c.id === customRecord.id)) {
        s.customEx.push(customRecord)
      }
      registerCustom(s.customEx)
    })
  } else {
    registerCustom([...customList, customRecord])
  }
  return customRecord
}
