// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import Modals from '../components/Modals.jsx'
import Plan, { PLAN_VIEW_KEY } from './Plan.jsx'
import {
  defaultJvrWarmupPlan,
  resolveWarmupSequence,
  totalWarmupSec,
} from '../lib/warmup.js'

const clone = v => JSON.parse(JSON.stringify(v))

describe('Plan -> Warm-up 5-minute dynamic stretching module', () => {
  let host, root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    localStorage.removeItem(PLAN_VIEW_KEY)
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    useUI.getState().closeAll()
    useStore.setState({
      S: {
        ...clone(DEF),
        unit: 'kg',
        warmupPlan: null,
        sound: false,
      },
      user: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    act(() => root.unmount())
    host.remove()
    localStorage.removeItem(PLAN_VIEW_KEY)
    useUI.getState().closeAll()
  })

  it('defaults to an exact 5-minute (300s) 8-drill JVR Round dynamic sequence', () => {
    const plan = defaultJvrWarmupPlan()
    expect(plan).toHaveLength(8)
    expect(totalWarmupSec(plan)).toBe(300)

    const seq = resolveWarmupSequence(useStore.getState().S)
    expect(seq[0].drill.name).toBe('Ankle Bounce & Wrist Circles')
    expect(seq[7].drill.name).toBe('Pogo Hops & Broad-Jump Stick Landings')
  })

  it('renders dedicated Warm-up tab in Plan, auto-advances drills, and supports pause/prev/skip/reset', () => {
    vi.useFakeTimers()

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/plan']}>
          <Plan />
          <Modals />
        </MemoryRouter>
      )
    })

    const warmupSeg = [...host.querySelectorAll('.plan-views button')].find(b => b.textContent === 'Warm-up')
    expect(warmupSeg).toBeTruthy()
    act(() => warmupSeg.click())

    expect(localStorage.getItem(PLAN_VIEW_KEY)).toBe('warmup')
    expect(host.querySelector('[data-warmup-panel]')).toBeTruthy()
    expect(host.querySelector('[data-warmup-active-name]').textContent).toBe('Ankle Bounce & Wrist Circles')
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:30')

    // Start auto-advancing timer -> 30s completes Drill 1 and advances to Drill 2 (45s)
    act(() => host.querySelector('[data-warmup-start]').click())
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(host.querySelector('[data-warmup-active-name]').textContent).toBe("World's Greatest Stretch — Alternating")
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:45')

    // Pause keeps drill & decremented time frozen
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:40')
    act(() => host.querySelector('[data-warmup-pause]').click())
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:40')

    // Prev returns to Drill 1, Skip advances forward through all 8 to Done
    act(() => host.querySelector('[data-warmup-prev]').click())
    expect(host.querySelector('[data-warmup-active-name]').textContent).toBe('Ankle Bounce & Wrist Circles')

    for (let i = 0; i < 8; i++) {
      act(() => host.querySelector('[data-warmup-skip]').click())
    }
    expect(host.querySelector('[data-warmup-status]').textContent).toBe('Warm-up complete')
    expect(host.querySelector('[data-warmup-open-routines]')).toBeTruthy()

    // Reset restores Drill 1 (00:30)
    act(() => host.querySelector('[data-warmup-reset]').click())
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:30')

    // Skip to done and jump to Routines (JVR Round)
    for (let i = 0; i < 8; i++) {
      act(() => host.querySelector('[data-warmup-skip]').click())
    }
    act(() => host.querySelector('[data-warmup-open-routines]').click())
    expect(host.querySelector('[data-jvr-plan-card]')).toBeTruthy()
  })

  it('supports custom durations, movement swaps, safety quick-swaps, and restoring 5:00 default', () => {
    localStorage.setItem(PLAN_VIEW_KEY, 'warmup')
    useStore.setState(state => ({
      ...state,
      S: {
        ...state.S,
        healthProfile: {
          weightKg: 76,
          heightCm: 175,
          medications: '',
          medicationFlags: [],
          painAreas: ['knees', 'ankles'],
          painNotes: '',
          clearanceConfirmed: true,
          updatedAt: Date.now(),
        },
      },
    }))

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/plan']}>
          <Plan />
          <Modals />
        </MemoryRouter>
      )
    })

    // Safety profile flags Ankle Bounce & offers quick swap
    expect(host.querySelector('[data-warmup-caution]').textContent).toContain('Careful (Ankles & shins, Knees)')

    // Increase Drill 1 duration (+5s -> 35s)
    act(() => host.querySelector('[data-warmup-inc="0"]').click())
    expect(host.querySelector('[data-warmup-dur="0"]').textContent).toBe('35s')
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:35')
    expect(useStore.getState().S.warmupPlan[0].sec).toBe(35)

    // Open Swap sheet on Drill 2 and pick Half-Kneeling Hip Flexor & T-Spine Openers
    act(() => host.querySelector('[data-warmup-swap="1"]').click())
    const sheet = document.querySelector('[data-warmup-swap-sheet]')
    expect(sheet).toBeTruthy()
    act(() => sheet.querySelector('[data-warmup-swap-option="wu_half_kneeling_hip"]').click())
    expect(document.querySelector('[data-warmup-swap-sheet]')).toBeNull()
    expect(useStore.getState().S.warmupPlan[1].drillId).toBe('wu_half_kneeling_hip')

    // Quick swap on Drill 1 resolves joint caution cleanly
    act(() => host.querySelector('[data-warmup-quick-swap]').click())
    expect(host.querySelector('[data-warmup-active-name]').textContent).toBe('Calf Pumps & Forearm Tendon Glides')
    expect(host.querySelector('[data-warmup-caution]')).toBeNull()

    // Restore 5:00 JVR default
    const restoreBtn = host.querySelector('[data-warmup-reset-plan]')
    expect(restoreBtn).toBeTruthy()
    act(() => restoreBtn.click())
    expect(useStore.getState().S.warmupPlan).toBeNull()
    expect(host.querySelector('[data-warmup-active-name]').textContent).toBe('Ankle Bounce & Wrist Circles')
    expect(host.querySelector('[data-warmup-clock]').textContent).toBe('00:30')
  })
})
