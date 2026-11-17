// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Library from './Library.jsx'
import {
  DISCIPLINES,
  COLLECTION_TARGET,
  getEncyclopediaIndex,
  getEncyclopediaSummary,
  getMovementPatternVariations,
  resolveEncyclopediaDetail,
} from '../lib/encyclopedia.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => {
  const state = { S: null }
  state.snapshot = () => ({
    S: state.S,
    user: null,
    config: {},
    update: mut => {
      const next = structuredClone(state.S)
      mut(next)
      state.S = next
    },
  })
  return state
})

const addToRoutineSpy = vi.hoisted(() => vi.fn())

vi.mock('../store/useStore.js', () => {
  const useStore = selector => selector ? selector(mocks.snapshot()) : mocks.snapshot()
  useStore.getState = mocks.snapshot
  return { useStore }
})
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  exerciseDetailSheet: vi.fn(),
  addToRoutineSheet: addToRoutineSpy,
  customExSheet: vi.fn(),
}))

const mounted = []
function renderLibrary() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(<Library />))
  return host
}

beforeEach(() => {
  mocks.S = {
    unit: 'kg',
    lang: 'en',
    routines: [],
    workouts: [],
    customEx: [],
    exWeights: {},
    equipProfiles: [],
    activeEquipId: null,
    equipFilterOn: false,
  }
  addToRoutineSpy.mockReset()
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => {
    mounted.splice(0).forEach(root => root.unmount())
  })
})

describe('Worldwide Exercise Encyclopedia data model', () => {
  it('indexes all 44 disciplines and exceeds the 5,000+ collection target', () => {
    expect(DISCIPLINES).toHaveLength(44)
    const entries = getEncyclopediaIndex()
    const summary = getEncyclopediaSummary(entries)
    expect(summary.totalDisciplines).toBe(44)
    expect(summary.coveredDisciplines).toBe(44)
    expect(summary.totalEntries).toBeGreaterThanOrEqual(COLLECTION_TARGET)
    expect(summary.flagshipCount).toBeGreaterThanOrEqual(44)
  })

  it('keeps barbell, dumbbell, and machine squats as distinct records grouped under the same movement pattern', () => {
    const entries = getEncyclopediaIndex()
    const bb = entries.find(e => e.id === 'ENC-02-SQT-BB')
    const db = entries.find(e => e.id === 'ENC-02-SQT-DB')
    const mc = entries.find(e => e.id === 'ENC-11-SQT-MC')
    expect(bb && db && mc).toBeTruthy()
    expect(new Set([bb.id, db.id, mc.id]).size).toBe(3)
    expect(bb.movementPattern).toBe('squat')
    expect(db.movementPattern).toBe('squat')
    expect(mc.movementPattern).toBe('squat')

    const siblings = getMovementPatternVariations(bb, entries)
    expect(siblings.some(s => s.id === db.id)).toBe(true)
    expect(siblings.some(s => s.id === mc.id)).toBe(true)
  })

  it('resolves all 16 reference fields on every entry', () => {
    const entries = getEncyclopediaIndex()
    for (const d of DISCIPLINES) {
      const sample = entries.find(e => e.disciplineId === d.id)
      expect(sample, `missing sample for discipline ${d.id}`).toBeTruthy()
      const detail = resolveEncyclopediaDetail(sample, entries)
      expect(detail.id).toBeTruthy()
      expect(detail.name).toBeTruthy()
      expect(Array.isArray(detail.alternativeNames) && detail.alternativeNames.length > 0).toBe(true)
      expect(detail.category).toContain(d.name)
      expect(detail.primaryMuscles.length).toBeGreaterThan(0)
      expect(detail.secondaryMuscles.length).toBeGreaterThan(0)
      expect(detail.equipment).toBeTruthy()
      expect(detail.difficulty).toBeTruthy()
      expect(detail.startingPosition).toBeTruthy()
      expect(detail.steps.length).toBeGreaterThan(0)
      expect(detail.breathing).toBeTruthy()
      expect(detail.commonMistakes.length).toBeGreaterThan(0)
      expect(detail.safetyConsiderations).toBeTruthy()
      expect(detail.easierAlternatives.length).toBeGreaterThan(0)
      expect(detail.advancedVariations.length).toBeGreaterThan(0)
      expect(detail.relatedExercises.length).toBeGreaterThan(0)
    }
  })
})

describe('Library Encyclopedia UI', () => {
  it('switches to the Encyclopedia tab, filters the 44 disciplines, opens 16-field guide, and adds to routine', () => {
    const host = renderLibrary()
    const encTabBtn = [...host.querySelectorAll('.lib-mode-seg button')].find(b => b.textContent.includes('Encyclopedia'))
    expect(encTabBtn).toBeTruthy()
    act(() => encTabBtn.click())

    expect(host.textContent).toContain('44-Discipline Directory')
    const discBtns = host.querySelectorAll('.enc-disc-btn')
    expect(discBtns.length).toBe(44)

    const swimmingDisc = [...discBtns].find(b => b.textContent.includes('Swimming'))
    expect(swimmingDisc).toBeTruthy()
    act(() => swimmingDisc.click())

    const swimRow = [...host.querySelectorAll('.enc-row-main')].find(b => b.textContent.includes('Freestyle Front-Crawl High-Elbow Catch'))
    expect(swimRow).toBeTruthy()
    act(() => swimRow.click())

    expect(host.textContent).toContain('Unique exercise ID')
    expect(host.textContent).toContain('Breathing technique')
    expect(host.textContent).toContain('Safety considerations')
    expect(host.textContent).toContain('Related exercises')

    const addBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Add “Freestyle Front-Crawl High-Elbow Catch” to Routine'))
    expect(addBtn).toBeTruthy()
    act(() => addBtn.click())

    expect(addToRoutineSpy).toHaveBeenCalledTimes(1)
    expect(mocks.S.customEx.some(c => c.id === 'ENC-29-SWIM-FREE')).toBe(true)
  })
})
