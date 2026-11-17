// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { EXIDX } from '../lib/exercises.js'
import Modals from '../components/Modals.jsx'
import Plan from './Plan.jsx'
import Sports from './Sports.jsx'
import {
  DIVISION_GROUPS,
  PHYSIQUE_BLUEPRINTS,
  applyCoachRestTimer,
  auditUserAgainstBlueprint,
  findBlueprint,
  installCoachRoutine,
} from '../lib/physique-coaches.js'

const clone = v => JSON.parse(JSON.stringify(v))

describe('Physique Coaches, Bodybuilding Inspirations & Live Gap Audit', () => {
  let host, root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.removeItem('gym_plan_view')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useUI.getState().closeAll()
    useStore.setState({
      S: {
        ...clone(DEF),
        unit: 'kg',
        restSec: 90,
        routines: [],
        workouts: [],
        activities: [],
      },
      user: null,
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    useUI.getState().closeAll()
    localStorage.removeItem('gym_plan_view')
  })

  it('contains all requested Division Coaches, Inspirations, and Exceptionals with valid EXIDX exercises', () => {
    expect(DIVISION_GROUPS).toHaveLength(3)
    const divisionCoachNames = PHYSIQUE_BLUEPRINTS
      .filter(b => b.category === 'division_coach')
      .map(b => `${b.division}:${b.name}`)
    expect(divisionCoachNames).toEqual([
      'Open Bodybuilding:Chris Aceto',
      'Open Bodybuilding:Matt Jansen',
      'Natural Bodybuilding:Alberto Nuñez',
      'Natural Bodybuilding:Jeff Alberts',
      "Men's Physique:Hany Rambod",
      "Men's Physique:Jeremy Buendia",
    ])

    const inspirationPairs = PHYSIQUE_BLUEPRINTS
      .filter(b => b.category === 'inspiration')
      .map(b => `${b.goal}=>${b.name}`)
    expect(inspirationPairs).toEqual([
      'Maximum muscle mass=>Ronnie Coleman',
      'Muscle density and back=>Dorian Yates',
      'Natural aesthetics=>Jeff Alberts',
      'Natural V-taper=>Alberto Nuñez',
      "Classic Men's Physique=>Jeremy Buendia",
      "Modern Men's Physique=>Ryan Terry",
    ])

    const exceptionalNames = PHYSIQUE_BLUEPRINTS
      .filter(b => b.category === 'exceptional')
      .map(b => b.name)
    expect(exceptionalNames).toEqual(['Cristiano Ronaldo', 'Chris Bumstead'])

    for (const bp of PHYSIQUE_BLUEPRINTS) {
      expect(bp.routineTemplate.ex.length).toBeGreaterThanOrEqual(5)
      for (const slot of bp.routineTemplate.ex) {
        expect(EXIDX[slot.id], `Missing EXIDX entry for ${bp.id}:${slot.id}`).toBeTruthy()
      }
    }
  })

  it('installs routines idempotently and syncs rest timer', () => {
    const draft = clone(DEF)
    const r1 = installCoachRoutine(draft, 'insp_dorian_yates')
    expect(r1.created).toBe(true)
    expect(draft.routines).toHaveLength(1)
    expect(draft.routines[0].coachBlueprintId).toBe('insp_dorian_yates')
    expect(draft.physiqueCoach.activeId).toBe('insp_dorian_yates')

    const r2 = installCoachRoutine(draft, 'insp_dorian_yates')
    expect(r2.created).toBe(false)
    expect(r2.id).toBe(r1.id)
    expect(draft.routines).toHaveLength(1)

    const synced = applyCoachRestTimer(draft, 'coach_hany_rambod')
    expect(synced).toBe(45)
    expect(draft.restSec).toBe(45)
  })

  it('detects sleep, rest-day, workout frequency, and rest-timer gaps dynamically in auditUserAgainstBlueprint', () => {
    const now = Date.parse('2026-11-14T12:00:00Z')
    const recentDay = '2026-11-13'
    const draft = {
      ...clone(DEF),
      restSec: 45,
      physiqueCoach: {
        activeId: 'insp_dorian_yates',
        sleepHours: 6,
        restDaysPerWeek: 1,
        soreness: 'high',
        energy: 'drained',
        updatedAt: now,
      },
      workouts: [
        {
          id: 'w1',
          d: recentDay,
          start: now - 86400000,
          entries: [
            {
              id: '0027',
              sets: [
                { done: true, w: 80, r: 8 },
                { done: true, w: 80, r: 8 },
              ],
            },
          ],
        },
      ],
      activities: [],
    }

    const gapAudit = auditUserAgainstBlueprint(draft, 'insp_dorian_yates', now)
    expect(gapAudit.checks.sessions.status).toBe('gap')
    expect(gapAudit.checks.restTimer.status).toBe('gap')
    expect(gapAudit.checks.sleep.status).toBe('gap')
    expect(gapAudit.checks.restDays.status).toBe('gap')
    expect(gapAudit.checks.readiness.status).toBe('gap')
    expect(gapAudit.score).toBeLessThan(40)

    const alignedNow = now
    const alignedWorkouts = [0, 1, 2, 3].map(i => ({
      id: `wy-${i}`,
      d: recentDay,
      start: alignedNow - i * 86400000,
      entries: [
        {
          id: '0027',
          sets: Array.from({ length: 6 }, () => ({ done: true, w: 100, r: 8 })),
        },
      ],
    }))
    const alignedDraft = {
      ...draft,
      restSec: findBlueprint('insp_dorian_yates').restSec,
      physiqueCoach: {
        activeId: 'insp_dorian_yates',
        sleepHours: 8,
        restDaysPerWeek: 3,
        soreness: 'low',
        energy: 'fresh',
        updatedAt: alignedNow,
      },
      workouts: alignedWorkouts,
    }

    const okAudit = auditUserAgainstBlueprint(alignedDraft, 'insp_dorian_yates', alignedNow)
    expect(okAudit.checks.sessions.status).toBe('aligned')
    expect(okAudit.checks.restTimer.status).toBe('aligned')
    expect(okAudit.checks.sleep.status).toBe('aligned')
    expect(okAudit.checks.restDays.status).toBe('aligned')
    expect(okAudit.score).toBeGreaterThanOrEqual(80)
  })

  it('renders Coaches hub inside Plan, filters categories, installs routines, and updates recovery gaps', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Plan />
          <Modals />
        </MemoryRouter>
      )
    })

    const coachesTab = [...host.querySelectorAll('.plan-views button')].find(b => b.textContent === 'Coaches')
    expect(coachesTab).toBeTruthy()
    act(() => coachesTab.click())

    expect(host.querySelector('[data-physique-coaches]')).toBeTruthy()
    expect(host.querySelector('[data-division-group="Open Bodybuilding"]')?.textContent).toContain('Chris Aceto')
    expect(host.querySelector('[data-division-group="Open Bodybuilding"]')?.textContent).toContain('Matt Jansen')
    expect(host.querySelector('[data-division-group="Natural Bodybuilding"]')?.textContent).toContain('Alberto Nuñez')
    expect(host.querySelector('[data-division-group="Natural Bodybuilding"]')?.textContent).toContain('Jeff Alberts')
    expect(host.querySelector('[data-division-group="Men\'s Physique"]')?.textContent).toContain('Hany Rambod')
    expect(host.querySelector('[data-division-group="Men\'s Physique"]')?.textContent).toContain('Jeremy Buendia')

    const cbumCard = host.querySelector('[data-blueprint-card="exc_chris_bumstead"]')
    expect(cbumCard).toBeTruthy()
    act(() => cbumCard.click())
    expect(host.querySelector('[data-coach-blueprint="exc_chris_bumstead"]')).toBeTruthy()

    const installBtn = host.querySelector('[data-install-coach-routine]')
    act(() => installBtn.click())
    expect(useStore.getState().S.routines.some(r => r.coachBlueprintId === 'exc_chris_bumstead')).toBe(true)

    const syncRestBtn = host.querySelector('[data-sync-coach-rest]')
    act(() => syncRestBtn.click())
    expect(useStore.getState().S.restSec).toBe(120)

    const highSorenessBtn = host.querySelector('[data-soreness="high"]')
    act(() => highSorenessBtn.click())
    expect(useStore.getState().S.physiqueCoach.soreness).toBe('high')
    expect(host.querySelector('[data-audit-row="readiness"]').getAttribute('data-audit-status')).toBe('close')
  })

  it('renders Coaches hub inside Sports subnav cleanly and switches to Exceptionals', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const coachesTab = [...host.querySelectorAll('[data-sports-subnav] button')].find(b => b.textContent.includes('Coaches'))
    expect(coachesTab).toBeTruthy()
    act(() => coachesTab.click())

    expect(host.querySelector('[data-physique-coaches]')).toBeTruthy()
    const excFilter = host.querySelector('[data-coach-filter="exceptional"]')
    act(() => excFilter.click())

    expect(host.querySelector('[data-blueprint-card="exc_cristiano_ronaldo"]')).toBeTruthy()
    expect(host.querySelector('[data-blueprint-card="exc_chris_bumstead"]')).toBeTruthy()
    expect(host.querySelector('[data-coach-group="division_coach"]')).toBeNull()
  })
})
