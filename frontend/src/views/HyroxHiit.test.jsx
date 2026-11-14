// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Modals from '../components/Modals.jsx'
import Sports from './Sports.jsx'
import {
  computeBmi,
  evaluateSafetyProfile,
  adaptHyroxStations,
  totalHiitSeconds,
} from '../lib/conditioning.js'

const clone = v => JSON.parse(JSON.stringify(v))

function setInputVal(el, val) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
  setter.call(el, String(val))
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('Hyrox, HIIT Timer & Pre-Workout Health & Safety Profile', () => {
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
        bodyweight: [],
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
  })

  it('calculates BMI accurately and flags joint load, medications, and painful area swaps', () => {
    const normal = computeBmi(72, 175)
    expect(normal.bmi).toBe(23.5)
    expect(normal.impactCaution).toBe(false)

    const highLoad = computeBmi(98, 175)
    expect(highLoad.bmi).toBe(32)
    expect(highLoad.impactCaution).toBe(true)

    const incomplete = evaluateSafetyProfile({ weightKg: 72 }, { unit: 'kg', bodyweight: [] })
    expect(incomplete.complete).toBe(false)
    expect(incomplete.missingFields).toEqual(['Height', 'Safety confirmation'])

    const full = evaluateSafetyProfile({
      weightKg: 98,
      heightCm: 175,
      medicationFlags: ['beta_blockers', 'insulin'],
      medications: 'Metoprolol 25mg',
      painAreas: ['knees', 'shoulders'],
      painNotes: 'Mild right knee ache',
      clearanceConfirmed: true,
    })
    expect(full.complete).toBe(true)
    expect(full.preferLowImpact).toBe(true)
    expect(full.warnings.some(w => w.title.includes('Beta-blockers'))).toBe(true)
    expect(full.warnings.some(w => w.title.includes('Insulin'))).toBe(true)
    expect(full.warnings.some(w => w.title.includes('Knees'))).toBe(true)

    const stations = adaptHyroxStations(full)
    expect(stations.find(s => s.key === 'sled_push').needsSwap).toBe(true)
    expect(stations.find(s => s.key === 'wall_balls').needsSwap).toBe(true)
    expect(stations[0].runNote).toContain('BikeErg')

    expect(totalHiitSeconds({ warmupSec: 180, workSec: 20, restSec: 10, rounds: 8, cooldownSec: 120 })).toBe(530)
  })

  it('blocks HIIT Timer until Weight, Height, BMI, Medications, Painful Areas & Confirmation are completed, then runs & logs', () => {
    vi.useFakeTimers()

    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    // Switch to HIIT Timer tab
    const hiitTab = [...host.querySelectorAll('[data-sports-subnav] button')].find(b => b.textContent.includes('HIIT Timer'))
    act(() => hiitTab.click())
    expect(host.querySelector('[data-hiit-timer]')).toBeTruthy()
    expect(host.querySelector('[data-timer-clock]').textContent).toBe('03:00')

    // Trying to start without completing Health & Safety Profile must open Safety Gate sheet
    const startBtn = host.querySelector('[data-timer-start]')
    act(() => startBtn.click())

    const sheet = document.querySelector('[data-health-safety-sheet]')
    expect(sheet).toBeTruthy()

    // Try saving before entering weight/height/confirm -> shows error
    const saveBtn = [...sheet.querySelectorAll('button')].find(b => b.textContent.includes('Save & confirm'))
    act(() => saveBtn.click())
    expect(sheet.querySelector('[role="alert"]')).toBeTruthy()

    // Enter weight 92 kg, height 172 cm -> live BMI 31.1 (High joint load)
    act(() => {
      setInputVal(sheet.querySelector('#hs-weight'), '92')
      setInputVal(sheet.querySelector('#hs-height'), '172')
    })
    expect(sheet.querySelector('#hs-bmi').value).toBe('31.1')
    expect(sheet.querySelector('[data-live-bmi]').textContent).toContain('High joint load')

    // Select medication & painful area
    act(() => {
      sheet.querySelector('[data-med-flag="beta_blockers"]').click()
      setInputVal(sheet.querySelector('#hs-meds'), 'Propranolol 20mg')
      sheet.querySelector('[data-pain-area="knees"]').click()
      setInputVal(sheet.querySelector('#hs-pain-notes'), 'Left meniscus sensitivity')
    })
    expect(sheet.querySelector('[data-safety-warnings-preview]').textContent).toContain('Beta-blockers')
    expect(sheet.querySelector('[data-safety-warnings-preview]').textContent).toContain('Knees protection')

    // Toggle safety confirmation and save -> auto-starts HIIT timer
    act(() => {
      sheet.querySelector('[data-safety-confirm-switch]').click()
    })
    act(() => saveBtn.click())

    expect(document.querySelector('[data-health-safety-sheet]')).toBeNull()
    const saved = useStore.getState().S.healthProfile
    expect(saved.weightKg).toBe(92)
    expect(saved.heightCm).toBe(172)
    expect(saved.bmi).toBe(31.1)
    expect(saved.painAreas).toEqual(['knees'])
    expect(saved.medicationFlags).toEqual(['beta_blockers'])
    expect(saved.clearanceConfirmed).toBe(true)

    // Banner now shows verified safety & active alerts
    const banner = host.querySelector('[data-health-safety-banner]')
    expect(banner.textContent).toContain('92 kg')
    expect(banner.textContent).toContain('172 cm')
    expect(banner.textContent).toContain('BMI 31.1')
    expect(host.querySelector('[data-active-safety-alerts]').textContent).toContain('Knees protection')

    // Timer is running and counting down
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(host.querySelector('[data-timer-clock]').textContent).toBe('02:57')

    // Pause and log HIIT workout
    act(() => host.querySelector('[data-timer-pause]').click())
    act(() => host.querySelector('[data-timer-log]').click())

    const acts = useStore.getState().S.activities
    expect(acts).toHaveLength(1)
    expect(acts[0].sportKey).toBe('hiit')
    expect(acts[0].bwKg).toBe(92)
    expect(acts[0].note).toContain('BMI 31.1')
  })

  it('displays Hyrox stations with joint-safe substitutions and logs Hyrox workout to S.activities', () => {
    useStore.setState(state => ({
      ...state,
      S: {
        ...state.S,
        healthProfile: {
          weightKg: 80,
          heightCm: 178,
          bmi: 25.2,
          medications: '',
          medicationFlags: ['asthma'],
          painAreas: ['shoulders', 'knees'],
          painNotes: '',
          clearanceConfirmed: true,
          updatedAt: Date.now(),
        },
      },
    }))

    act(() => {
      root.render(
        <MemoryRouter>
          <Sports />
          <Modals />
        </MemoryRouter>
      )
    })

    const hyroxTab = [...host.querySelectorAll('[data-sports-subnav] button')].find(b => b.textContent.includes('Hyrox'))
    act(() => hyroxTab.click())

    expect(host.querySelector('[data-hyrox-panel]')).toBeTruthy()
    expect(host.querySelectorAll('[data-hyrox-station]')).toHaveLength(8)
    expect(host.querySelector('[data-station-swap="wall_balls"]').textContent).toContain('Careful (Knees, Shoulders)')
    expect(host.querySelector('[data-active-safety-alerts]').textContent).toContain('Asthma')

    act(() => host.querySelector('[data-log-hyrox]').click())
    const acts = useStore.getState().S.activities
    expect(acts).toHaveLength(1)
    expect(acts[0].sportKey).toBe('hyrox')
    expect(acts[0].bwKg).toBe(80)
  })
})
