import { uid, todayISO } from './format.js'
import { EXIDX } from './exercises.js'
import { workoutAt } from './history.js'
import { fatiguedMuscles } from './recovery.js'
import { isWarmupRow } from './workout-model.js'
import { stampRoutines } from './sync-merge.js'

export const COACH_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'division_coach', label: 'Division Coaches' },
  { id: 'inspiration', label: 'Inspirations' },
  { id: 'exceptional', label: 'Exceptionals' },
]

export const DIVISION_GROUPS = [
  {
    division: 'Open Bodybuilding',
    subtitle: 'Maximum muscularity, contest conditioning & density',
    coachIds: ['coach_chris_aceto', 'coach_matt_jansen'],
  },
  {
    division: 'Natural Bodybuilding',
    subtitle: 'Drug-free hypertrophy, autoregulated RIR & joint longevity',
    coachIds: ['coach_alberto_nunez', 'coach_jeff_alberts'],
  },
  {
    division: "Men's Physique",
    subtitle: '3D delts, upper-chest sweep, V-taper & tight waist control',
    coachIds: ['coach_hany_rambod', 'coach_jeremy_buendia'],
  },
]

export const SORENESS_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
]

export const ENERGY_LEVELS = [
  { value: 'fresh', label: 'Fresh' },
  { value: 'good', label: 'Good' },
  { value: 'drained', label: 'Drained' },
]

export const PHYSIQUE_BLUEPRINTS = [
  /* ===================== 1. DIVISION COACHES ===================== */
  {
    id: 'coach_chris_aceto',
    name: 'Chris Aceto',
    category: 'division_coach',
    division: 'Open Bodybuilding',
    coachSlot: 'Coach 1',
    tagline: 'Precision 6–12 hypertrophy, full recovery windows & nutrition-driven growth',
    philosophy: 'Aceto blends strict mechanical-tension bodybuilding sets (6–12 reps, 2–4 hard working sets per exercise) with disciplined rest between sets and proactive systemic rest days whenever flatness or lethargy sets in.',
    splitSummary: '2-on / 1-off or 4-on / 1-off rotating split (every muscle once per 5–7 days)',
    daysPerWeek: 5,
    targetWeeklySets: 65,
    repRange: '6–12 reps',
    rirTarget: '0–1 RIR',
    restSec: 150,
    restRangeSec: [120, 180],
    finisherRestSec: 90,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 8,
    recoveryHabits: [
      'Take 2–3 full days off training whenever systemic lethargy or strength flatness lingers.',
      'Hold 120–180s rest between primary sets so load and bar speed stay high across every set.',
      'Pair carb intake around training sessions to replenish glycogen before the next rotation.',
    ],
    nutritionFocus: 'High-protein meals anchored around peri-workout carbohydrates and steady hydration.',
    cautionNote: 'Do not turn a rotating mass split into 7 days straight; unrecovered CNS kills hypertrophy.',
    routineTemplate: {
      name: 'Chris Aceto — Open Mass Blueprint',
      emoji: 'barbell',
      ex: [
        { id: '0314', sets: 3, reps: 10, restSec: 150, note: 'Controlled 3s eccentric, full stretch at bottom' },
        { id: '0025', sets: 3, reps: 8, restSec: 150, note: 'Heavy compound chest press, 1 RIR' },
        { id: '0027', sets: 3, reps: 8, restSec: 150, note: 'Hard mid-back thickness pull' },
        { id: '0150', sets: 3, reps: 10, restSec: 120, note: 'Full lat stretch, controlled peak contraction' },
        { id: '0334', sets: 3, reps: 12, restSec: 90, note: 'Strict medial delt sweep' },
        { id: '0447', sets: 3, reps: 10, restSec: 90, note: 'Strict biceps flexion, zero momentum' },
      ],
    },
  },
  {
    id: 'coach_matt_jansen',
    name: 'Matt Jansen',
    category: 'division_coach',
    division: 'Open Bodybuilding',
    coachSlot: 'Coach 2',
    tagline: 'Biomechanics-aligned movement sequencing, controlled negatives & neural recovery',
    philosophy: 'Camp Jansen prioritizes high-output low-fluff execution: stretch-biased movement first, mid-range compound second, peak contraction last — paired with obsessive sleep, digestion, and nervous-system recovery tracking.',
    splitSummary: 'Push / Pull / Off / Legs / Arms & Weak-Point Rotation (4–5 days/wk)',
    daysPerWeek: 5,
    targetWeeklySets: 60,
    repRange: '8–12 reps',
    rirTarget: '0–1 RIR',
    restSec: 135,
    restRangeSec: [120, 165],
    finisherRestSec: 75,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Sequence exercises cleanly (lengthened -> compound -> shortened) instead of adding junk sets.',
      'Track morning readiness, sleep quality, and digestion before pushing intensity techniques.',
      'Keep 120–150s rest on heavy compounds so neural drive rebounds cleanly.',
    ],
    nutritionFocus: 'Digestible whole-food meals spaced evenly to support high-output hypertrophy and gut health.',
    cautionNote: 'Reserve double-drop or rest-pause finishers for your final set only.',
    routineTemplate: {
      name: 'Matt Jansen — Biomechanics Upper',
      emoji: 'barbell',
      ex: [
        { id: '3868', sets: 2, reps: 12, restSec: 120, note: 'Lengthened chest bias warm-up & prime' },
        { id: '0314', sets: 3, reps: 9, restSec: 150, note: '2s pause & stretch, explosive drive' },
        { id: '1349', sets: 3, reps: 9, restSec: 150, note: 'Supported upper-back row, squeeze 1s' },
        { id: '0238', sets: 2, reps: 12, restSec: 90, note: 'Lat-isolated shortened-position pull' },
        { id: '0178', sets: 3, reps: 12, restSec: 90, note: 'Constant tension cable lateral sweep' },
        { id: '0200', sets: 2, reps: 12, restSec: 75, note: 'Final set rest-pause if recovery is green' },
      ],
    },
  },
  {
    id: 'coach_alberto_nunez',
    name: 'Alberto Nuñez',
    category: 'division_coach',
    division: 'Natural Bodybuilding',
    coachSlot: 'Coach 1',
    tagline: '3DMJ autoregulated Upper/Lower, 1–3 RIR mastery & 3 weekly recovery days',
    philosophy: 'Nuñez coaches natural athletes to accumulate years of uninterrupted progression: train 4 days/week on an Upper/Lower split, leave 1–3 reps in reserve on most compounds, rest 2.5–3+ min on big lifts, and use 3 rest days/week to protect joints and CNS.',
    splitSummary: '4-Day Upper / Lower + 3 Planned Recovery Days',
    daysPerWeek: 4,
    targetWeeklySets: 52,
    repRange: '6–12 reps',
    rirTarget: '1–3 RIR',
    restSec: 180,
    restRangeSec: [120, 240],
    finisherRestSec: 90,
    targetRestDays: 3,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Protect 3 rest days per week — natural lifters grow between sessions, not inside marathon splits.',
      'Hold 1–3 RIR on heavy barbell and squat patterns; save 0 RIR for safe single-joint machines.',
      'Take a proactive deload every 4–6 weeks or when sleep/mood dips.',
    ],
    nutritionFocus: 'Slow, patient surplus (+150–250 kcal) or disciplined natural prep with 1.8–2.2 g/kg protein.',
    cautionNote: 'Chasing 0 RIR on every barbell compound stalls natural weekly volume.',
    routineTemplate: {
      name: 'Alberto Nuñez — 3DMJ Upper / Lower Hybrid',
      emoji: 'dumbbell',
      ex: [
        { id: '0314', sets: 3, reps: 8, restSec: 180, note: '1–2 RIR, strict full range' },
        { id: '1326', sets: 3, reps: 8, restSec: 180, note: 'Controlled chin-up for lat width' },
        { id: '0043', sets: 3, reps: 6, restSec: 210, note: '2 RIR clean depth squat' },
        { id: '0085', sets: 3, reps: 8, restSec: 180, note: 'Romanian deadlift, 2 RIR' },
        { id: '0334', sets: 3, reps: 12, restSec: 90, note: '0–1 RIR V-taper lateral delt builder' },
        { id: '2487', sets: 3, reps: 14, restSec: 90, note: 'Rear delt cap & shoulder health' },
      ],
    },
  },
  {
    id: 'coach_jeff_alberts',
    name: 'Jeff Alberts',
    category: 'division_coach',
    division: 'Natural Bodybuilding',
    coachSlot: 'Coach 2',
    tagline: '3DMJ minimum effective dose, zero junk volume & decade-long joint durability',
    philosophy: 'Known as "The Godfather of Natural Bodybuilding," Alberts proves longevity beats burnout: modest effective volume (2–3 crisp sets), full eccentric control, 1–2 RIR, and unhurried rest so connective tissue thrives for decades.',
    splitSummary: '4-Day Upper / Lower or Torso / Limbs (3 rest days/wk)',
    daysPerWeek: 4,
    targetWeeklySets: 48,
    repRange: '6–12 reps',
    rirTarget: '1–2 RIR',
    restSec: 150,
    restRangeSec: [120, 210],
    finisherRestSec: 90,
    targetRestDays: 3,
    targetSleepHours: 8,
    deloadWeeks: 8,
    recoveryHabits: [
      'Stop adding sets once stimulus is achieved — more junk volume only slows natural recovery.',
      'Rest 150–180s between compound sets so technique never degrades.',
      'Maintain 7.5–8.5 hours sleep and steady daily steps for active recovery.',
    ],
    nutritionFocus: 'Sustainable year-round protein consistency without extreme off-season fat gain.',
    cautionNote: 'Joint aches signal excessive frequency or bounced eccentrics; smooth your tempo first.',
    routineTemplate: {
      name: 'Jeff Alberts — Natural Aesthetics Session',
      emoji: 'dumbbell',
      ex: [
        { id: '0289', sets: 3, reps: 8, restSec: 150, note: 'Smooth eccentric, zero bounce' },
        { id: '0180', sets: 3, reps: 10, restSec: 150, note: 'Scapular retraction, 1–2 RIR' },
        { id: '8375', sets: 3, reps: 10, restSec: 180, note: 'Deep knee flexion quad work, joint-friendly' },
        { id: '0599', sets: 3, reps: 10, restSec: 120, note: 'Seated hamstring squeeze, 1 RIR' },
        { id: '0334', sets: 3, reps: 12, restSec: 90, note: 'Crisp lateral raise, zero swing' },
        { id: '1372', sets: 3, reps: 12, restSec: 90, note: '2s pause at bottom stretch on calves' },
      ],
    },
  },
  {
    id: 'coach_hany_rambod',
    name: 'Hany Rambod',
    category: 'division_coach',
    division: "Men's Physique",
    coachSlot: 'Coach 1',
    tagline: 'FST-7 fascia-stretch finishers (7 × 8–12 with 30–45s rest) for 3D V-taper',
    philosophy: 'The Pro Creator’s FST-7 pairs 2–3 heavy multi-joint openers (90–120s rest) with a ruthless 7-set isolation finisher at 30–45s rest — flooding target fascia with blood and stretching/posing between sets.',
    splitSummary: '5-Day Split (Shoulders/Chest/Back/Arms/Controlled Legs) + 2 Rest Days',
    daysPerWeek: 5,
    targetWeeklySets: 66,
    repRange: '8–12 reps',
    rirTarget: '0–1 RIR',
    restSec: 45,
    restRangeSec: [30, 90],
    finisherRestSec: 40,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Hold 30–45s strict clock rest during 7-set FST-7 finishers and sip hydration electrolytes.',
      'Sleep 7.5–9 hours — high cellular pump volume demands real overnight protein synthesis.',
      'Use light LISS (20–30 min incline walk) rather than punishing HIIT that flattens fullness.',
    ],
    nutritionFocus: 'Clean carb timing before and after pump sessions to maximize cell volumization.',
    cautionNote: 'Never run FST-7 finishers on more than 1–2 lagging muscles per workout.',
    routineTemplate: {
      name: 'Hany Rambod — FST-7 V-Taper Finisher',
      emoji: 'flame',
      ex: [
        { id: '0314', sets: 3, reps: 10, restSec: 90, note: 'Upper-chest mass opener' },
        { id: '0150', sets: 3, reps: 10, restSec: 90, note: 'Wide lat sweep pull' },
        { id: '3972', sets: 3, reps: 10, restSec: 90, note: '3D anterior/medial shoulder press' },
        { id: '0178', sets: 7, reps: 12, restSec: 40, note: 'FST-7 Finisher: 7 sets × 30–45s rest + pose stretch' },
        { id: '1030', sets: 7, reps: 12, restSec: 40, note: 'FST-7 Finisher: chest fascia stretch pump' },
      ],
    },
  },
  {
    id: 'coach_jeremy_buendia',
    name: 'Jeremy Buendia',
    category: 'division_coach',
    division: "Men's Physique",
    coachSlot: 'Coach 2',
    tagline: 'Upper-chest & capped-shoulder proportions, tight waistlines & crisp 45–75s pacing',
    philosophy: '4× Olympia Men’s Physique champion Jeremy Buendia pairs FST-7 upper-body density with relentless waist control: frequent upper chest, medial/rear delts, wide lats, and core vacuum work while keeping rest snappy.',
    splitSummary: '5-Day Proportion Split + 3×/wk Core & Vacuum Control',
    daysPerWeek: 5,
    targetWeeklySets: 64,
    repRange: '10–15 reps',
    rirTarget: '0–1 RIR',
    restSec: 60,
    restRangeSec: [40, 90],
    finisherRestSec: 45,
    targetRestDays: 2,
    targetSleepHours: 7.5,
    deloadWeeks: 6,
    recoveryHabits: [
      'Practice 3–5 minutes of stomach vacuums 3×/week on empty stomach for waistline tightness.',
      'Keep inter-set rest around 45–75s to maintain metabolic density and stage conditioning.',
      'Hit 7.5–8h sleep + low-stress LISS cardio instead of heavy oblique loading that thickens the waist.',
    ],
    nutritionFocus: 'Lean protein + clean carbs with sodium/hydration consistency to stay crisp year-round.',
    cautionNote: 'Skip heavy side bends if your goal is a sharp Men’s Physique X-frame waist.',
    routineTemplate: {
      name: "Jeremy Buendia — Men's Physique Proportion",
      emoji: 'trophy',
      ex: [
        { id: '0314', sets: 4, reps: 10, restSec: 75, note: 'Incline focus for upper chest shelf' },
        { id: '1047', sets: 4, reps: 10, restSec: 75, note: 'Upper-lat flare without waist bloat' },
        { id: '0334', sets: 4, reps: 15, restSec: 45, note: 'High-rep capped lateral delts' },
        { id: '11060', sets: 3, reps: 15, restSec: 45, note: 'Posture & rear-delt balance' },
        { id: '0200', sets: 3, reps: 12, restSec: 45, note: 'Tricep horseshoe detail' },
        { id: '0472', sets: 3, reps: 15, restSec: 45, note: 'Tight waist control (pair w/ stomach vacuums)' },
      ],
    },
  },

  /* ===================== 2. BODYBUILDING INSPIRATIONS ===================== */
  {
    id: 'insp_ronnie_coleman',
    name: 'Ronnie Coleman',
    category: 'inspiration',
    goal: 'Maximum muscle mass',
    tagline: 'Goal: Maximum muscle mass · Heavy powerbuilding + relentless compound overload',
    philosophy: 'Eight-time Mr. Olympia Ronnie Coleman built unmatched size on basic barbell free weights pushed at heavy 8–12 rep working weights, 5–6 days per week, hitting major muscle groups twice weekly with big-compound rest intervals.',
    splitSummary: '6-Day High-Volume Powerbuilding (Chest/Back/Legs twice in 8–9 days)',
    daysPerWeek: 6,
    targetWeeklySets: 78,
    repRange: '8–12 reps',
    rirTarget: '0–1 RIR',
    restSec: 150,
    restRangeSec: [120, 210],
    finisherRestSec: 90,
    targetRestDays: 1,
    targetSleepHours: 8.5,
    deloadWeeks: 5,
    recoveryHabits: [
      'Heavy free-weight powerbuilding demands 8–9h sleep + planned deloads every 4–5 weeks.',
      'Respect 150–180s rest between squats, rows, and deadlifts so spinal bracing stays locked.',
      'Scale back max singles when lower-back or knee fatigue climbs above moderate.',
    ],
    nutritionFocus: 'Substantial caloric surplus + steady protein & electrolytes to fuel 6-day compound output.',
    cautionNote: 'Inspired by Coleman’s compound selection — scale working volume & spinal load to your recovery.',
    routineTemplate: {
      name: 'Ronnie Coleman — Maximum Mass Compounds',
      emoji: 'barbell',
      ex: [
        { id: '0043', sets: 4, reps: 8, restSec: 180, note: 'Heavy barbell squat, crisp bracing' },
        { id: '0027', sets: 4, reps: 10, restSec: 150, note: 'Thick barbell bent-over row' },
        { id: '0047', sets: 4, reps: 10, restSec: 150, note: 'Incline barbell chest thickness' },
        { id: '0032', sets: 3, reps: 6, restSec: 180, note: 'Heavy deadlift, stop with 1 rep in reserve' },
        { id: '0091', sets: 3, reps: 10, restSec: 120, note: 'Overhead press mass builder' },
        { id: '0031', sets: 3, reps: 10, restSec: 90, note: 'Strict standing barbell curl' },
      ],
    },
  },
  {
    id: 'insp_dorian_yates',
    name: 'Dorian Yates',
    category: 'inspiration',
    goal: 'Muscle density and back',
    tagline: 'Goal: Muscle density and back · Blood & Guts 45-min HIT & full week-per-muscle recovery',
    philosophy: 'Six-time Mr. Olympia Dorian Yates proved you do not live in the gym to grow granite density: 4 days/week, under 50 minutes per session, 1–2 progressive warm-ups followed by 1 all-out working set taken to true failure (rest-pause / forced slow negatives), then 6–7 days of recovery per muscle.',
    splitSummary: '4-Day Blood & Guts HIT Split (1× every 6–7 days per muscle + 3 rest days/wk)',
    daysPerWeek: 4,
    targetWeeklySets: 28,
    repRange: '6–10 reps',
    rirTarget: '0 RIR (All-out set)',
    restSec: 150,
    restRangeSec: [120, 180],
    finisherRestSec: 120,
    targetRestDays: 3,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Never train more than 2 days in a row; protect all 3 weekly rest days so tissues actually remodel.',
      'Finish lifts inside 45–55 minutes — cortisol spikes if you add extra fluff sets after all-out effort.',
      'Take a complete 5–7 day low-stress deload every 6 weeks.',
    ],
    nutritionFocus: 'Dense high-protein meals with zero skipped post-training recovery feedings.',
    cautionNote: 'Because working sets are 1–2 all-out top sets, warm up thoroughly before loading 100% effort.',
    routineTemplate: {
      name: 'Dorian Yates — Blood & Guts Back Density',
      emoji: 'plate',
      ex: [
        { id: '0238', sets: 2, reps: 10, restSec: 120, note: 'Pre-exhaust lats, 1 warm-up + 1 all-out set' },
        { id: '1349', sets: 2, reps: 8, restSec: 150, note: 'Warm-up then 1 heavy top set to technical failure' },
        { id: '0027', sets: 2, reps: 8, restSec: 180, note: 'Yates-angle row, 1 top set + 2s negative' },
        { id: '0180', sets: 2, reps: 10, restSec: 150, note: 'Close-grip seated row for mid-back thickness' },
        { id: '2487', sets: 2, reps: 10, restSec: 120, note: 'Posterior delt tie-in to upper back' },
        { id: '0032', sets: 2, reps: 6, restSec: 180, note: 'Controlled spinal erector lock-in' },
      ],
    },
  },
  {
    id: 'insp_jeff_alberts',
    name: 'Jeff Alberts',
    category: 'inspiration',
    goal: 'Natural aesthetics',
    tagline: 'Goal: Natural aesthetics · Symmetrical natural lines & sustainable 1–2 RIR pacing',
    philosophy: 'Study Alberts for balanced drug-free proportions without beating up shoulders, knees, or lower back: crisp tempo, balanced push/pull/leg ratios, moderate effective volume, and generous rest days.',
    splitSummary: '4-Day Balanced Natural Split (3 recovery days/wk)',
    daysPerWeek: 4,
    targetWeeklySets: 48,
    repRange: '8–12 reps',
    rirTarget: '1–2 RIR',
    restSec: 150,
    restRangeSec: [120, 210],
    finisherRestSec: 90,
    targetRestDays: 3,
    targetSleepHours: 8,
    deloadWeeks: 8,
    recoveryHabits: [
      'Match horizontal/vertical pulling volume 1:1 with pressing for balanced natural posture.',
      'Hold 1–2 RIR and 150s rest to keep every rep clean and aesthetically symmetrical.',
      'Prioritize 3 full rest days and 8h sleep weekly.',
    ],
    nutritionFocus: 'Measured macro tracking with slow, clean adjustments across months.',
    cautionNote: 'Aesthetics vanish when fatigue forces sloppy form — protect execution quality first.',
    routineTemplate: {
      name: 'Jeff Alberts — Natural Aesthetics Blueprint',
      emoji: 'dumbbell',
      ex: [
        { id: '0314', sets: 3, reps: 10, restSec: 150, note: 'Upper chest fullness' },
        { id: '0150', sets: 3, reps: 10, restSec: 150, note: 'Balanced lat width' },
        { id: '0042', sets: 3, reps: 8, restSec: 180, note: 'Quad sweep & upright torso' },
        { id: '1459', sets: 3, reps: 10, restSec: 150, note: 'Hamstring-glute tie-in' },
        { id: '0334', sets: 3, reps: 12, restSec: 90, note: 'Clean capped delts' },
        { id: '0313', sets: 2, reps: 12, restSec: 90, note: 'Arm symmetry finisher' },
      ],
    },
  },
  {
    id: 'insp_alberto_nunez',
    name: 'Alberto Nuñez',
    category: 'inspiration',
    goal: 'Natural V-taper',
    tagline: 'Goal: Natural V-taper · Wide lats, 3D delts & high-RIR technical precision',
    philosophy: 'Study Nuñez for building a striking natural V-taper on a drug-free recovery budget: bias vertical pulling, lateral/rear delts, and upper-chest shelf work while rotating rest days so every pull session hits fresh.',
    splitSummary: '4-Day V-Taper Specialization + 3 Rest Days',
    daysPerWeek: 4,
    targetWeeklySets: 54,
    repRange: '8–15 reps',
    rirTarget: '1–2 RIR',
    restSec: 150,
    restRangeSec: [105, 210],
    finisherRestSec: 75,
    targetRestDays: 3,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Rotate heavy vertical pulls and lateral-delt isolation with at least 48–72h shoulder recovery.',
      'Rest 150s on vertical pulls and 75–90s on lateral/rear raises.',
      'Keep 3 weekly rest days + 8h sleep so upper-back strength climbs month over month.',
    ],
    nutritionFocus: 'High protein + lean body-composition control to make the V-taper pop visually.',
    cautionNote: 'Do not overload front delts on top of incline pressing — prioritize side and rear heads.',
    routineTemplate: {
      name: 'Alberto Nuñez — Natural V-Taper',
      emoji: 'pullup',
      ex: [
        { id: '1326', sets: 3, reps: 8, restSec: 180, note: 'Full dead-hang stretch to chest' },
        { id: '1047', sets: 3, reps: 10, restSec: 135, note: 'Elbows driven down for outer-lat flare' },
        { id: '0314', sets: 3, reps: 10, restSec: 150, note: 'Upper pec shelf balance' },
        { id: '0178', sets: 4, reps: 15, restSec: 75, note: 'Strict cable lateral raise for shoulder width' },
        { id: '11060', sets: 3, reps: 15, restSec: 75, note: 'External-rotation rear delt cap' },
        { id: '0472', sets: 3, reps: 12, restSec: 75, note: 'Clean midline control' },
      ],
    },
  },
  {
    id: 'insp_jeremy_buendia',
    name: 'Jeremy Buendia',
    category: 'inspiration',
    goal: "Classic Men's Physique",
    tagline: "Goal: Classic Men's Physique · Sharp V-frame, FST-7 pumps & tiny waist",
    philosophy: "Study Buendia for timeless Men's Physique flow — prominent upper chest, round delts, sweeping lats, and razor-tight core control achieved through controlled density and smart LISS conditioning.",
    splitSummary: '5-Day Classic Mens Physique Split (2 rest days/wk)',
    daysPerWeek: 5,
    targetWeeklySets: 64,
    repRange: '10–15 reps',
    rirTarget: '0–1 RIR',
    restSec: 60,
    restRangeSec: [40, 90],
    finisherRestSec: 40,
    targetRestDays: 2,
    targetSleepHours: 7.5,
    deloadWeeks: 6,
    recoveryHabits: [
      'Hold 45–60s between hypertrophy sets for dense sarcoplasmic fullness.',
      'Add daily fasted or post-lift stomach vacuums + 2 full rest days.',
      'Use low-impact cardio instead of heavy loaded obliques.',
    ],
    nutritionFocus: 'Measured carbohydrate cycling around upper-body pump days.',
    cautionNote: 'High-density pacing still requires 7.5–8h sleep; never stack chronic sleep debt.',
    routineTemplate: {
      name: "Jeremy Buendia — Classic Men's Physique",
      emoji: 'trophy',
      ex: [
        { id: '0314', sets: 4, reps: 10, restSec: 75, note: 'Upper chest flare' },
        { id: '0308', sets: 3, reps: 12, restSec: 60, note: 'Stretch pec sweep' },
        { id: '0150', sets: 4, reps: 10, restSec: 60, note: 'Wide lat pulldown' },
        { id: '0334', sets: 4, reps: 15, restSec: 45, note: 'Shoulder cap width' },
        { id: '0294', sets: 3, reps: 12, restSec: 45, note: 'Clean biceps peak' },
        { id: '0472', sets: 3, reps: 15, restSec: 45, note: 'Waist-tightening leg raise' },
      ],
    },
  },
  {
    id: 'insp_ryan_terry',
    name: 'Ryan Terry',
    category: 'inspiration',
    goal: "Modern Men's Physique",
    tagline: "Goal: Modern Men's Physique · 3D shoulders, etched serratus & sculpted mid-section",
    philosophy: 'Olympia Men’s Physique champion Ryan Terry exemplifies modern athletic conditioning: relentless upper-back & shoulder detail, sculpted abs/serratus, balanced leg athletic work, and high-consistency daily LISS + 8h sleep.',
    splitSummary: '5-Day Modern Physique + Daily Core & Conditioning (2 rest days)',
    daysPerWeek: 5,
    targetWeeklySets: 66,
    repRange: '10–15 reps',
    rirTarget: '0–1 RIR',
    restSec: 60,
    restRangeSec: [45, 90],
    finisherRestSec: 45,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 6,
    recoveryHabits: [
      'Hold 8h sleep nightly so sculpted physique conditioning stays full rather than stringy.',
      'Keep hypertrophy rest crisp (45–75s) while dedicating 2 full weight-room rest days/wk.',
      'Pair lifting with low-impact LISS / steps and mobility to stay camera-ready without burnout.',
    ],
    nutritionFocus: 'Consistent whole-food macros year-round — stay within striking distance of stage shape.',
    cautionNote: 'Daily ab/serratus work should stay crisp (12–20 reps), never heavily weighted side twists.',
    routineTemplate: {
      name: "Ryan Terry — Modern Men's Physique",
      emoji: 'abs',
      ex: [
        { id: '0091', sets: 3, reps: 10, restSec: 90, note: 'Overhead shoulder fullness' },
        { id: '0178', sets: 4, reps: 15, restSec: 45, note: '3D lateral sweep' },
        { id: '0180', sets: 4, reps: 10, restSec: 75, note: 'Deep upper/mid back detail' },
        { id: '0251', sets: 3, reps: 12, restSec: 75, note: 'Lower-chest line & triceps sweep' },
        { id: '0175', sets: 4, reps: 15, restSec: 45, note: 'Deep etched abdominal wall' },
        { id: '2269', sets: 3, reps: 12, restSec: 45, note: 'Serratus & anti-extension core control' },
      ],
    },
  },

  /* ===================== 3. EXCEPTIONALS ===================== */
  {
    id: 'exc_cristiano_ronaldo',
    name: 'Cristiano Ronaldo',
    category: 'exceptional',
    goal: 'Elite football conditioning, unilateral power & lean symmetry',
    tagline: 'Exceptional Athlete · Plyometric sprint power, single-leg resilience & polyphasic sleep',
    philosophy: 'Ronaldo trains for durability and explosive speed rather than stage bulk: unilateral lower-body power, high-velocity plyometrics & sprint intervals, rotational core stability, and famously structured sleep + cold/hot recovery.',
    splitSummary: '5-Day Hybrid Athletic Split (Unilateral Strength + Sprint/HIIT + Core + Mobility)',
    daysPerWeek: 5,
    targetWeeklySets: 52,
    repRange: '6–12 / explosive intervals',
    rirTarget: '1–2 RIR (speed focused)',
    restSec: 75,
    restRangeSec: [45, 90],
    finisherRestSec: 45,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 4,
    recoveryHabits: [
      'Target 7.5–9h total daily sleep (Ronaldo famously splits recovery into structured 90-min sleep cycles/naps).',
      'Always combine contrast hydrotherapy / stretching and dedicated mobility drills after sprint sessions.',
      'Train unilateral legs & anti-rotation core so sprint deceleration stays injury-proof.',
    ],
    nutritionFocus: 'High lean protein, omega-rich fish, fresh vegetables, zero alcohol & disciplined hydration.',
    cautionNote: 'Never push plyometric box/hurdle jumps when joints feel stiff or fatigued — prioritize landing mechanics.',
    routineTemplate: {
      name: 'Cristiano Ronaldo — Match Speed & Core',
      emoji: 'figureRun',
      ex: [
        { id: '7551', sets: 3, reps: 10, restSec: 75, note: 'Unilateral quad & glute drive' },
        { id: '4295', sets: 3, reps: 12, restSec: 75, note: 'Stride power & hip stability' },
        { id: '10738', sets: 3, reps: 8, restSec: 90, note: 'Explosive vertical leap + soft landing' },
        { id: '5990', sets: 4, reps: 6, restSec: 75, note: 'Sprint cut agility & deceleration' },
        { id: '0211', sets: 3, reps: 14, restSec: 45, note: 'Rotational core power' },
        { id: '2466', sets: 3, reps: 20, restSec: 45, note: 'Fast dynamic core conditioning' },
      ],
    },
  },
  {
    id: 'exc_chris_bumstead',
    name: 'Chris Bumstead',
    category: 'exceptional',
    goal: 'Classic Physique Olympia Pro · Sweep, vacuum & eccentric mastery',
    tagline: 'Exceptional Champion · Slow-eccentric hypertrophy, FST-7 finishers & bodywork recovery',
    philosophy: 'Six-time Classic Physique Olympia champion CBum pairs disciplined 6–12 rep compound basics (3-second controlled negatives) with FST-7 pump finishers, waistline vacuums, and pro-level recovery: 8+h sleep, massage/bodywork, and deliberate deloads.',
    splitSummary: '4–5 Day Classic Split (3-on/1-off or 5-day rotation, heavy eccentrics + FST-7)',
    daysPerWeek: 5,
    targetWeeklySets: 62,
    repRange: '6–12 reps',
    rirTarget: '0–1 RIR',
    restSec: 120,
    restRangeSec: [90, 150],
    finisherRestSec: 40,
    targetRestDays: 2,
    targetSleepHours: 8,
    deloadWeeks: 5,
    recoveryHabits: [
      'Protect 8+ hours of sleep plus mobility/soft-tissue bodywork for lower back, hips, and knees.',
      'Control every eccentric (2–3s down) instead of ego loading — spares joints while maximizing hypertrophy.',
      'Pair heavy quad/lat sweeps with daily stomach vacuums and regular deload weeks.',
    ],
    nutritionFocus: 'Clean nutrient-dense meals engineered around training blocks and gut health.',
    cautionNote: 'Do not skip warm-up sets on heavy squats or Romanian deadlifts — longevity wins titles.',
    routineTemplate: {
      name: 'Chris Bumstead — Classic Physique Blueprint',
      emoji: 'crown',
      ex: [
        { id: '0314', sets: 4, reps: 10, restSec: 120, note: '3s slow negative incline dumbbell press' },
        { id: '0027', sets: 3, reps: 10, restSec: 120, note: 'Classic back thickness row' },
        { id: '0150', sets: 3, reps: 12, restSec: 90, note: 'Wide lat flare stretch' },
        { id: '0043', sets: 3, reps: 8, restSec: 150, note: 'Deep quad sweep squat, crisp form' },
        { id: '0585', sets: 3, reps: 12, restSec: 60, note: 'Quad separation extension + squeeze' },
        { id: '0178', sets: 7, reps: 12, restSec: 40, note: 'Classic FST-7 lateral delt width finisher' },
      ],
    },
  },
]

export function findBlueprint(id) {
  return PHYSIQUE_BLUEPRINTS.find(b => b.id === id) || PHYSIQUE_BLUEPRINTS[0]
}

export function filterBlueprints(category = 'all') {
  if (!category || category === 'all') return PHYSIQUE_BLUEPRINTS
  return PHYSIQUE_BLUEPRINTS.filter(b => b.category === category)
}

export function findCoachRoutine(S, blueprint) {
  const bp = typeof blueprint === 'string' ? findBlueprint(blueprint) : blueprint
  if (!bp) return null
  const byTag = (S?.routines || []).find(r => r && r.coachBlueprintId === bp.id)
  if (byTag) return byTag
  return (S?.routines || []).find(r => r && r.name === bp.routineTemplate.name) || null
}

export function installCoachRoutine(s, blueprintId) {
  const bp = findBlueprint(blueprintId)
  if (!bp) return null
  if (!Array.isArray(s.routines)) s.routines = []
  s.physiqueCoach = {
    ...(s.physiqueCoach || {}),
    activeId: bp.id,
    updatedAt: Date.now(),
  }
  const existing = findCoachRoutine(s, bp)
  if (existing) {
    return { id: existing.id, created: false, routine: existing, blueprint: bp }
  }
  const exSlots = bp.routineTemplate.ex
    .filter(slot => !!EXIDX[slot.id])
    .map(slot => ({
      id: slot.id,
      sets: slot.sets,
      mode: 'reps',
      reps: slot.reps,
      weight: 0,
      restSec: slot.restSec,
      prog: 'off',
      note: slot.note || '',
    }))
  const routine = {
    id: uid(),
    name: bp.routineTemplate.name,
    emoji: bp.routineTemplate.emoji || 'trophy',
    prog: 'off',
    coachBlueprintId: bp.id,
    ex: exSlots,
  }
  s.routines.push(routine)
  stampRoutines?.(s, [routine.id])
  return { id: routine.id, created: true, routine, blueprint: bp }
}

export function applyCoachRestTimer(s, blueprintId) {
  const bp = findBlueprint(blueprintId)
  if (!bp) return 90
  s.restSec = bp.restSec
  s.physiqueCoach = {
    ...(s.physiqueCoach || {}),
    activeId: bp.id,
    updatedAt: Date.now(),
  }
  return bp.restSec
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Live Gap Audit comparing the user's logged workouts, sports/conditioning activities,
 * active inter-set rest timer, muscle fatigue state, and recovery check-in against the
 * selected coach / bodybuilder / exceptional blueprint.
 */
export function auditUserAgainstBlueprint(S, blueprintOrId, now = Date.now()) {
  const bp = typeof blueprintOrId === 'string' ? findBlueprint(blueprintOrId) : (blueprintOrId || findBlueprint())
  const pc = S?.physiqueCoach || {}
  const workouts = Array.isArray(S?.workouts) ? S.workouts : []
  const activities = Array.isArray(S?.activities) ? S.activities : []

  const cutoff7d = now - 7 * DAY_MS
  const recentWorkouts = workouts.filter(w => {
    const ts = workoutAt(w)
    return Number.isFinite(ts) && ts >= cutoff7d && ts <= now + DAY_MS
  })

  let workingSets7d = 0
  for (const w of recentWorkouts) {
    for (const entry of w?.entries || []) {
      for (const set of entry?.sets || []) {
        if (set?.done && !isWarmupRow(set)) workingSets7d += 1
      }
    }
  }

  const today = todayISO()
  const recentActivities = activities.filter(a => {
    if (!a?.d) return false
    const tMs = Date.parse(a.d + 'T12:00:00')
    return Number.isFinite(tMs) ? tMs >= cutoff7d && tMs <= now + DAY_MS : a.d === today
  })
  const sportMinutes7d = recentActivities.reduce((sum, a) => sum + (Number(a?.durationMin) || 0), 0)

  const workouts7d = recentWorkouts.length
  const currentRestSec = Math.max(15, Number(S?.restSec) || 90)
  const sleepHours = Number.isFinite(Number(pc.sleepHours)) ? Number(pc.sleepHours) : 7.5
  const restDaysPerWeek = Number.isFinite(Number(pc.restDaysPerWeek)) ? Number(pc.restDaysPerWeek) : 2
  const soreness = pc.soreness || 'moderate'
  const energy = pc.energy || 'good'

  const tiredMuscles = fatiguedMuscles(workouts, now, { unit: S?.unit || 'kg' })
  const painAreas = Array.isArray(S?.healthProfile?.painAreas) ? S.healthProfile.painAreas : []
  const routineInstalled = !!findCoachRoutine(S, bp)

  // 1. Weekly session frequency check
  const sessionDiff = workouts7d - bp.daysPerWeek
  let sessionsStatus = 'aligned'
  if (workouts7d < bp.daysPerWeek - 1) sessionsStatus = 'gap'
  else if (workouts7d !== bp.daysPerWeek) sessionsStatus = 'close'

  // 2. Inter-set rest check
  const [minRest, maxRest] = bp.restRangeSec || [Math.max(30, bp.restSec - 20), bp.restSec + 20]
  let restStatus = 'aligned'
  if (currentRestSec < minRest - 15 || currentRestSec > maxRest + 30) restStatus = 'gap'
  else if (currentRestSec < minRest || currentRestSec > maxRest) restStatus = 'close'

  // 3. Sleep check
  let sleepStatus = 'aligned'
  if (sleepHours <= bp.targetSleepHours - 1) sleepStatus = 'gap'
  else if (sleepHours < bp.targetSleepHours) sleepStatus = 'close'

  // 4. Recovery days check (critical for Dorian Yates / Alberto Nuñez / Jeff Alberts / Chris Aceto)
  let recoveryDaysStatus = 'aligned'
  if (restDaysPerWeek < bp.targetRestDays) recoveryDaysStatus = 'gap'
  else if (restDaysPerWeek > bp.targetRestDays + 1 && workouts7d < bp.daysPerWeek) recoveryDaysStatus = 'close'

  // 5. Fatigue & readiness check
  let readinessStatus = 'aligned'
  if (energy === 'drained' || (soreness === 'high' && tiredMuscles.length >= 2)) {
    readinessStatus = 'gap'
  } else if (soreness === 'high' || tiredMuscles.length >= 3 || painAreas.length > 0) {
    readinessStatus = 'close'
  }

  const statuses = [sessionsStatus, restStatus, sleepStatus, recoveryDaysStatus, readinessStatus]
  const score = Math.round(
    statuses.reduce((sum, st) => sum + (st === 'aligned' ? 20 : st === 'close' ? 12 : 4), 0)
  )

  const recommendations = []
  if (sessionsStatus !== 'aligned') {
    if (sessionDiff < 0) {
      recommendations.push(
        workouts7d === 0
          ? `No workouts logged in the last 7 days — install ${bp.name}'s routine and build toward ${bp.daysPerWeek} sessions/wk (~${bp.targetWeeklySets} working sets).`
          : `You logged ${workouts7d} session${workouts7d === 1 ? '' : 's'} in 7 days vs ${bp.name}'s ${bp.daysPerWeek}-day target. Add ${Math.abs(sessionDiff)} focused session${Math.abs(sessionDiff) === 1 ? '' : 's'}.`
      )
    } else {
      recommendations.push(
        `You logged ${workouts7d} workouts in 7 days vs ${bp.name}'s ${bp.daysPerWeek}-day structure — trim excess frequency so each session stays sharp.`
      )
    }
  }

  if (restStatus !== 'aligned') {
    recommendations.push(
      `Your active rest timer is ${currentRestSec}s, whereas ${bp.name} prescribes ${minRest}–${maxRest}s (default ${bp.restSec}s) for ${bp.repRange}. Sync timer to match the method.`
    )
  }

  if (sleepStatus !== 'aligned') {
    const deficit = Math.max(0.5, Number((bp.targetSleepHours - sleepHours).toFixed(1)))
    recommendations.push(
      `Sleep is ${sleepHours}h/night (${deficit}h short of ${bp.targetSleepHours}h target). Add sleep before increasing sets or load.`
    )
  }

  if (recoveryDaysStatus === 'gap') {
    recommendations.push(
      `${bp.name}'s method relies on ${bp.targetRestDays} full rest day${bp.targetRestDays === 1 ? '' : 's'}/week (you entered ${restDaysPerWeek}). Schedule another rest day for tissue remodeling.`
    )
  }

  if (readinessStatus !== 'aligned') {
    if (tiredMuscles.length > 0) {
      recommendations.push(
        `Recent logs show elevated fatigue in ${tiredMuscles.slice(0, 3).join(', ')} — keep 1–2 RIR or take a deload day before pushing failure.`
      )
    } else if (energy === 'drained' || soreness === 'high') {
      recommendations.push(
        `High soreness / drained readiness detected — trigger a ${bp.deloadWeeks ? `Week ${bp.deloadWeeks} style ` : ''}recovery day or drop top-set load by 15%.`
      )
    }
  }

  if (painAreas.length > 0) {
    recommendations.push(
      `Health profile flags ${painAreas.join(', ')} — swap risky barbell paths for stable machines or controlled-tempo dumbbells.`
    )
  }

  if (!recommendations.length) {
    recommendations.push(
      `Aligned with ${bp.name}'s blueprint — keep hitting ${bp.repRange} at ${bp.rirTarget} and log progressive reps or load.`
    )
  }

  return {
    blueprint: bp,
    score,
    routineInstalled,
    metrics: {
      workouts7d,
      workingSets7d,
      sportMinutes7d,
      currentRestSec,
      sleepHours,
      restDaysPerWeek,
      soreness,
      energy,
      tiredMuscles,
    },
    checks: {
      sessions: { status: sessionsStatus, current: `${workouts7d} / wk`, target: `${bp.daysPerWeek} / wk` },
      sets: {
        status: workingSets7d >= Math.round(bp.targetWeeklySets * 0.75) ? 'aligned' : workingSets7d > 0 ? 'close' : 'gap',
        current: `${workingSets7d} sets`,
        target: `~${bp.targetWeeklySets} sets`,
      },
      restTimer: { status: restStatus, current: `${currentRestSec}s`, target: `${minRest}–${maxRest}s` },
      sleep: { status: sleepStatus, current: `${sleepHours}h`, target: `${bp.targetSleepHours}h+` },
      restDays: { status: recoveryDaysStatus, current: `${restDaysPerWeek} days`, target: `${bp.targetRestDays} days` },
      readiness: { status: readinessStatus, current: `${soreness} soreness · ${energy}`, target: 'Low–mod · Good/Fresh' },
    },
    recommendations,
  }
}
