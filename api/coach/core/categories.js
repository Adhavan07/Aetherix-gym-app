/* The data categories the consent screen names (FR-09/10).
 *
 * Its own tiny module so a screen that only needs to *say* what would leave — the mobile setup
 * screen, before anything AI-related has been loaded — can import five strings without pulling
 * the payload builder and the exercise catalogue behind it. payload.js re-exports it, and
 * builds from it, so the screen cannot drift from the payload. */
export const DATA_CATEGORIES = Object.freeze([
  'plan',        // routines, exercises, sets/reps, schedule, progression settings
  'training',    // logged sets, targets, effort ratings, durations, PRs, session notes in the review window
  'bodyweight',  // weigh-ins in the window and your goal weight
  'profile',     // the intake answers you gave the Coach, including any limitations
  'prefs'        // unit, language, effort scale
]);

export const OPTIONAL_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'records', on: true }),
  Object.freeze({ id: 'measurements', on: true }),
  Object.freeze({ id: 'health', on: false }),
]);

export function shareOf(S) {
  const set = S && S.coach && S.coach.share && typeof S.coach.share === 'object' ? S.coach.share : {};
  const out = {};
  for (const c of OPTIONAL_CATEGORIES) out[c.id] = typeof set[c.id] === 'boolean' ? set[c.id] : c.on;
  return out;
}

