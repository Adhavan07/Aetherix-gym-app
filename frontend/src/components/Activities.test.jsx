// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Modals from './Modals.jsx'
import { HomeActivityCard, StatsActivityCard, openActivitySheet } from './Activities.jsx'
import History, { historyRows } from '../views/History.jsx'
import { todayISO } from '../lib/format.js'

const clone = v => JSON.parse(JSON.stringify(v))

describe('Activities UI & History integration', () => {
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
        bodyweight: [{ d: '2026-01-01', w: 72, t: 1000 }],
        workouts: [
          {
            id: 'w1',
            d: todayISO(),
            start: Date.now() - 45 * 60000,
            end: Date.now(),
            name: 'Upper A',
            entries: [],
            prs: [],
          },
        ],
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

  it('logs a custom activity with MET preset using stored bodyweight and shows daily/weekly totals beside workouts', () => {
    function Harness() {
      const S = useStore(s => s.S)
      return (
        <MemoryRouter>
          <HomeActivityCard S={S} />
          <StatsActivityCard S={S} />
          <Modals />
        </MemoryRouter>
      )
    }

    act(() => root.render(<Harness />))
    expect(host.querySelector('[data-activity-home]').textContent).toContain('0 kcal')
    expect(host.querySelector('[data-activity-home]').textContent).toContain('1 workout')

    act(() => {
      openActivitySheet()
    })

    const sheet = document.querySelector('[data-activity-sheet]')
    expect(sheet).toBeTruthy()

    const badmintonChip = [...sheet.querySelectorAll('.chip')].find(b => b.textContent.includes('Badminton'))
    act(() => badmintonChip.click())

    // Badminton MET 5.5 * 72 kg * 1 h = 396 kcal
    expect(sheet.querySelector('[data-met-preview]').textContent).toContain('396 kcal')

    const saveBtn = [...sheet.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save activity')
    act(() => saveBtn.click())

    const saved = useStore.getState().S.activities
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Badminton')
    expect(saved[0].kcal).toBe(396)
    expect(saved[0].mode).toBe('met')
    expect(saved[0].met).toBe(5.5)

    expect(host.querySelector('[data-activity-home]').textContent).toContain('396 kcal')
    expect(host.querySelector('[data-activity-stats]').textContent).toContain('396 kcal')
  })

  it('interleaves custom activities into History rows newest-first and supports Undo on delete', () => {
    const today = todayISO()
    useStore.setState(state => ({
      S: {
        ...state.S,
        activities: [
          { id: 'a1', name: 'Football', d: today, durationMin: 90, mode: 'manual', kcal: 680, at: 2000 },
        ],
      },
    }))

    const rows = historyRows(useStore.getState().S)
    expect(rows).toHaveLength(2)
    expect(rows.some(r => r.a?.id === 'a1')).toBe(true)
    expect(rows.some(r => r.w?.id === 'w1')).toBe(true)

    act(() => {
      root.render(
        <MemoryRouter>
          <History />
          <Modals />
        </MemoryRouter>
      )
    })

    expect(host.textContent).toContain('Football')
    expect(host.textContent).toContain('680 kcal')

    act(() => {
      openActivitySheet(useStore.getState().S.activities[0])
    })
    const delBtn = [...document.querySelectorAll('[data-activity-sheet] button')].find(b => b.textContent.includes('Delete activity'))
    act(() => delBtn.click())

    expect(useStore.getState().S.activities).toHaveLength(0)
    expect(useStore.getState().S.deleted.activities.a1).toBeGreaterThan(0)

    // Trigger Undo action from useUI toastAction
    const undo = useUI.getState().toastAction
    expect(undo).toBeTruthy()
    act(() => undo.run())

    expect(useStore.getState().S.activities).toHaveLength(1)
    expect(useStore.getState().S.activities[0].name).toBe('Football')
  })
})
