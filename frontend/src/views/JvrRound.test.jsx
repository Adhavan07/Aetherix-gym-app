// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Modals from '../components/Modals.jsx'
import Plan from './Plan.jsx'
import Workout from './Workout.jsx'
import Sports from './Sports.jsx'
import { EXIDX } from '../lib/exercises.js'
import { buildSessionEntries } from '../lib/session-start.js'
import { buildSets, exLine, sessionVolume, setLabel } from '../lib/history.js'
import { completedVolumeOf } from '../lib/workout-model.js'
import {
  BATMAN_SUBLIFTS,
  JVR_REST_SEC,
  JVR_ROUTINE_NAME,
  JVR_STATIONS,
  adaptJvrStations,
  installJvrRoundRoutine,
} from '../lib/jvr-round.js'

const clone = v => JSON.parse(JSON.stringify(v))

function setInputVal(el, val) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
  setter.call(el, String(val))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('JVR Round routine, Batman Complex & 40s HIIT protocol', () => {
  let host, root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useUI.getState().closeAll()
    useUI.setState({ timer: null, work: null })
    useStore.setState({
      S: {
        ...clone(DEF),
        unit: 'kg',
        routines: [],
        customEx: [],
        workouts: [],
        activities: [],
      },
      user: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    act(() => root.unmount())
    host.remove()
    useUI.getState().closeAll()
    useUI.setState({ timer: null, work: null })
  })

  it('installs all 14 JVR Round exercises with 40s rest, separate broad/tuck jumps, and idempotency', () => {
    const draft = clone(useStore.getState().S)
    const first = installJvrRoundRoutine(draft)
    expect(first.created).toBe(true)
    expect(first.routine.name).toBe(JVR_ROUTINE_NAME)
    expect(first.routine.ex).toHaveLength(14)

    const ids = first.routine.ex.map(x => x.id)
    expect(ids).toEqual([
      '1160',
      'jvr_inchworm_broad_jump',
      'jvr_forward_tuck_jump',
      '3543',
      '1533',
      'jvr_batman_complex',
      'jvr_db_burpee',
      'jvr_db_mountain_climber',
      'jvr_db_squat_press',
      'jvr_single_leg_deadlift',
      'jvr_step_up_jumps',
      'jvr_broad_jumps',
      'jvr_split_squat_jumps',
      'jvr_skater_jumps',
    ])

    for (const slot of first.routine.ex) {
      expect(slot.sets).toBe(3)
      expect(slot.restSec).toBe(JVR_REST_SEC)
      expect(EXIDX[slot.id]).toBeTruthy()
      if (slot.id !== 'jvr_batman_complex') {
        expect(slot.reps).toBe(10)
      }
    }

    const batman = first.routine.ex.find(x => x.id === 'jvr_batman_complex')
    expect(batman.subLifts).toHaveLength(5)
    expect(batman.subLifts.map(m => m.r)).toEqual([5, 5, 5, 5, 5])

    // Second call is idempotent
    const second = installJvrRoundRoutine(draft)
    expect(second.created).toBe(false)
    expect(second.id).toBe(first.id)
    expect(draft.routines).toHaveLength(1)
  })

  it('builds and calculates multi-weight volume for Batman Barbell Complex sets', () => {
    const cfg = {
      id: 'jvr_batman_complex',
      sets: 3,
      mode: 'reps',
      reps: 25,
      weight: 0,
      restSec: 40,
      subLifts: BATMAN_SUBLIFTS.map(m => ({ ...m })),
    }
    expect(exLine(cfg)).toContain('3 × 5 moves (5 reps ea) · 40s rest')

    const sets = buildSets({ workouts: [], exWeights: {} }, cfg)
    expect(sets).toHaveLength(3)
    expect(sets[0].subLifts).not.toBe(sets[1].subLifts)

    sets[0].subLifts[0].w = 30
    sets[0].subLifts[1].w = 50
    sets[0].subLifts[2].w = 80
    sets[0].subLifts[3].w = 60
    sets[0].subLifts[4].w = 0
    expect(completedVolumeOf(sets[0])).toBe(0)

    sets[0].done = true
    // (30+50+80+60+0) * 5 = 1100
    expect(completedVolumeOf(sets[0])).toBe(1100)
    expect(setLabel('jvr_batman_complex', sets[0])).toContain('30×5')
    expect(setLabel('jvr_batman_complex', sets[0])).toContain('80×5')
  })

  it('adds JVR Round from Plan -> Routines tab and opens it', () => {
    let currentRoute = '/plan'
    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/plan']}>
          <Routes>
            <Route path="/plan" element={<Plan />} />
            <Route path="/plan/r/:id" element={<div data-routine-opened>Opened</div>} />
          </Routes>
          <Modals />
        </MemoryRouter>
      )
    })

    const routinesSeg = [...host.querySelectorAll('.plan-views button')].find(b => b.textContent.includes('Routines'))
    act(() => routinesSeg.click())

    expect(host.querySelector('[data-jvr-plan-card]')).toBeTruthy()
    const installBtn = host.querySelector('[data-install-jvr]')
    act(() => installBtn.click())

    const routines = useStore.getState().S.routines
    expect(routines).toHaveLength(1)
    expect(routines[0].name).toBe('JVR Round')
    expect(routines[0].ex).toHaveLength(14)
    expect(host.querySelector('[data-routine-opened]')).toBeTruthy()
    expect(currentRoute).toBe('/plan')
  })

  it('tracks independent Batman Barbell Complex weights/reps per set and starts 40s rest in Workout', () => {
    const nextState = clone(useStore.getState().S)
    const { routine } = installJvrRoundRoutine(nextState)
    const entries = buildSessionEntries(nextState, routine)
    const batmanIdx = entries.findIndex(e => e.id === 'jvr_batman_complex')
    expect(batmanIdx).toBe(5)

    nextState.active = {
      id: 'active_jvr_test',
      rid: routine.id,
      name: routine.name,
      start: Date.now(),
      cur: batmanIdx,
      entries,
    }
    useStore.setState({ S: nextState })

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/workout']}>
          <Workout />
          <Modals />
        </MemoryRouter>
      )
    })

    const set1Card = host.querySelector('[data-complex-set="0"]')
    expect(set1Card).toBeTruthy()
    const moveRows = set1Card.querySelectorAll('[data-complex-move]')
    expect(moveRows).toHaveLength(5)

    const weights = [30, 50, 80, 60, 10]
    act(() => {
      moveRows.forEach((row, idx) => {
        const inputs = row.querySelectorAll('input')
        setInputVal(inputs[0], weights[idx])
      })
    })

    const updatedSubLifts = useStore.getState().S.active.entries[batmanIdx].sets[0].subLifts
    expect(updatedSubLifts.map(m => m.w)).toEqual(weights)

    // Toggle set 1 done -> fires 40s rest timer and counts 5-move complex volume
    const checkBtn = set1Card.querySelector('[data-tour="tick"]')
    act(() => checkBtn.click())

    const liveAfter = useStore.getState().S
    expect(liveAfter.active.entries[batmanIdx].sets[0].done).toBe(true)
    expect(sessionVolume(liveAfter.active, liveAfter)).toBe((30 + 50 + 80 + 60 + 10) * 5)
    expect(useUI.getState().timer?.total).toBe(40)
  })

  it('runs JVR Round in Sports -> HIIT Timer with 40s rest, 14 stations, Batman cue & joint swaps', () => {
    useStore.setState(state => ({
      ...state,
      S: {
        ...state.S,
        healthProfile: {
          weightKg: 98,
          heightCm: 175,
          bmi: 32,
          medications: '',
          medicationFlags: [],
          painAreas: ['knees', 'shoulders'],
          painNotes: '',
          clearanceConfirmed: true,
          updatedAt: Date.now(),
        },
      },
    }))

    const safetyCheck = adaptJvrStations({
      bmiInfo: { impactCaution: true },
      painAreas: ['knees', 'shoulders'],
    })
    expect(safetyCheck.find(s => s.id === '3543').needsSwap).toBe(true)
    expect(safetyCheck.find(s => s.id === '1533').triggeredLabels).toContain('Shoulders')

    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const hiitTab = [...host.querySelectorAll('[data-sports-subnav] button')].find(b => b.textContent.includes('HIIT Timer'))
    act(() => hiitTab.click())

    const jvrPresetBtn = host.querySelector('[data-hiit-preset="jvr_round"]')
    expect(jvrPresetBtn).toBeTruthy()
    expect(jvrPresetBtn.textContent).toContain('45s / 40s × 14')

    act(() => jvrPresetBtn.click())

    const queue = host.querySelector('[data-jvr-hiit-queue]')
    expect(queue).toBeTruthy()
    expect(queue.querySelectorAll('[data-jvr-station]')).toHaveLength(JVR_STATIONS.length)

    // Jump to station #6 (Batman Barbell Complex)
    const batmanBtn = queue.querySelector('[data-jvr-station="jvr_batman_complex"]')
    act(() => batmanBtn.click())

    expect(host.querySelector('[data-jvr-active-station]').textContent).toContain('Batman Barbell Complex')
    expect(host.querySelector('[data-jvr-batman-cue]').textContent).toContain('Barbell Shoulder Press (5)')
    expect(host.querySelector('[data-jvr-batman-cue]').textContent).toContain('Barbell Push-Up (5)')
    expect(host.querySelector('[data-jvr-active-station]').textContent).toContain('Careful (Shoulders, Knees)')
  })
})
