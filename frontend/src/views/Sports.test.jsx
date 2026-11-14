// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Modals from '../components/Modals.jsx'
import Sports from './Sports.jsx'
import { SPORTS_RANKING, combineSportsCoverage, filterAndSortSports, sportByKey } from '../lib/sports.js'

const clone = v => JSON.parse(JSON.stringify(v))

describe('Sports Completeness Hub & 18-sport ranking', () => {
  let host, root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useUI.getState().closeAll()
    useStore.setState({
      S: {
        ...clone(DEF),
        unit: 'kg',
        sportGoalMin: 150,
        bodyweight: [{ d: '2026-01-01', w: 72, t: 1000 }],
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
  })

  it('renders all 18 ranked sports in canonical completeness order with Running called out at #17', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const rows = [...host.querySelectorAll('[data-sport-row]')]
    expect(rows).toHaveLength(18)
    expect(rows[0].getAttribute('data-sport-row')).toBe('swimming')
    expect(rows[0].textContent).toContain('Swimming')
    expect(rows[0].textContent).toContain('11')
    expect(rows[16].getAttribute('data-sport-row')).toBe('running')
    expect(rows[16].classList.contains('is-callout')).toBe(true)
    expect(rows[17].getAttribute('data-sport-row')).toBe('rugby')
  })

  it('filters by low risk and search query, and sorts cleanly by individual pillars', () => {
    const lowRisk = filterAndSortSports(SPORTS_RANKING, { filter: 'low_risk' })
    expect(lowRisk.map(s => s.key)).toEqual(['swimming', 'xc_skiing', 'yoga'])

    const byMetDesc = filterAndSortSports(SPORTS_RANKING, { sortBy: 'met', sortDir: 'desc' })
    expect(byMetDesc[0].key).toBe('martial_arts')

    const synergy = combineSportsCoverage([sportByKey('weightlifting'), sportByKey('swimming')])
    expect(synergy.combinedTotal).toBe(12)

    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const lowBtn = [...host.querySelectorAll('.sp-filter-btn')].find(b => b.textContent === 'Low Risk')
    act(() => lowBtn.click())
    expect(host.querySelectorAll('[data-sport-row]')).toHaveLength(3)

    const allBtn = [...host.querySelectorAll('.sp-filter-btn')].find(b => b.textContent === 'All (18)')
    act(() => allBtn.click())
    expect(host.querySelectorAll('[data-sport-row]')).toHaveLength(18)
  })

  it('supports pinning sports for side-by-side comparison and opening synergy comparator', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const swimPin = host.querySelector('[data-sport-row="swimming"] button[aria-label*="Pin Swimming"]')
    const wlPin = host.querySelector('[data-sport-row="weightlifting"] button[aria-label*="Pin Weightlifting"]')
    act(() => swimPin.click())
    act(() => wlPin.click())

    const dock = host.querySelector('[data-sports-compare-dock]')
    expect(dock).toBeTruthy()
    expect(dock.textContent).toContain('Swimming')
    expect(dock.textContent).toContain('Weightlifting')

    const compareBtn = [...dock.querySelectorAll('button')].find(b => b.textContent.trim() === 'Compare')
    act(() => compareBtn.click())

    const cmpSheet = document.querySelector('[data-sport-compare-sheet]')
    expect(cmpSheet).toBeTruthy()
    expect(cmpSheet.textContent).toContain('12')
    expect(cmpSheet.textContent).toContain('Combined synergy coverage')
  })

  it('opens sport inspector, logs a pre-filled session via MET into S.activities, and updates weekly hybrid coverage', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const climbBtn = host.querySelector('[data-sport-row="climbing"] .sp-sport-btn')
    act(() => climbBtn.click())

    const insp = document.querySelector('[data-sport-inspector="climbing"]')
    expect(insp).toBeTruthy()
    expect(insp.textContent).toContain('Climbing')
    expect(insp.textContent).toContain('#4')

    const logBtn = [...insp.querySelectorAll('button')].find(b => b.textContent.includes('Log Climbing session'))
    act(() => logBtn.click())

    const actSheet = document.querySelector('[data-activity-sheet]')
    expect(actSheet).toBeTruthy()
    // Climbing MET 7.5 * 72 kg * 1 h = 540 kcal
    expect(actSheet.querySelector('[data-met-preview]').textContent).toContain('540 kcal')

    const saveBtn = [...actSheet.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save activity')
    act(() => saveBtn.click())

    const state = useStore.getState().S
    expect(state.activities).toHaveLength(1)
    expect(state.activities[0].sportKey).toBe('climbing')
    expect(state.activities[0].kcal).toBe(540)

    expect(host.querySelector('[data-sports-weekly]').textContent).toContain('60 / 150 min')
    expect(host.querySelector('[data-sports-weekly]').textContent).toContain('540 kcal')
    expect(host.querySelector('[data-sports-coverage]').textContent).toContain('8 / 12')
  })

  it('updates weekly conditioning goal in store', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const goalBtn = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Goal')
    act(() => goalBtn.click())

    const goalSheet = document.querySelector('[data-sport-goal-sheet]')
    expect(goalSheet).toBeTruthy()
    const preset210 = [...goalSheet.querySelectorAll('button')].find(b => b.textContent.trim() === '210 min')
    act(() => preset210.click())
    const saveGoal = [...goalSheet.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save goal')
    act(() => saveGoal.click())

    expect(useStore.getState().S.sportGoalMin).toBe(210)
    expect(host.querySelector('[data-sports-weekly]').textContent).toContain('0 / 210 min')
  })
})
