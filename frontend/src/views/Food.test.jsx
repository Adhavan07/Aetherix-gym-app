// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Food from './Food.jsx'
import Modals from '../components/Modals.jsx'
import { DEF, useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { bindUI } from '../components/ui.jsx'
import { todayISO } from '../lib/format.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let host, root, originalS, originalUser

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeEach(() => {
  bindUI(useUI)
  const st = useStore.getState()
  originalS = st.S
  originalUser = st.user
  useStore.setState({
    S: JSON.parse(JSON.stringify(DEF)),
    user: { id: 'u1', name: 'Tester' },
  })
  useUI.setState({ sheets: [], toasts: [] })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  useStore.setState({ S: originalS, user: originalUser })
  useUI.setState({ sheets: [], toasts: [] })
})

describe('Food calorie tracker view', () => {
  it('sets a daily target, adds Idli to the library, logs Idli x 3 = 150 kcal, and shows remaining separately from activity burn', async () => {
    const today = todayISO()
    // Seed an activity burn of 400 kcal today to verify remaining stays strict intake budget
    useStore.getState().update(s => {
      s.activities = [{
        id: 'act-1',
        name: 'Badminton',
        sportKey: 'badminton',
        d: today,
        durationMin: 60,
        mode: 'manual',
        kcal: 400,
        at: 1000,
      }]
    }, false)

    await act(async () => {
      root.render(
        <>
          <Food />
          <Modals />
        </>
      )
    })

    // 1. Set daily target to 1800 kcal
    const setTargetBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Set target'))
    expect(setTargetBtn).toBeTruthy()
    await act(async () => { setTargetBtn.click() })

    const preset1800 = [...document.querySelectorAll('[data-food-target-sheet] button')].find(b => b.textContent.includes('1800 kcal'))
    expect(preset1800).toBeTruthy()
    await act(async () => { preset1800.click() })

    const saveTargetBtn = [...document.querySelectorAll('[data-food-target-sheet] button')].find(b => b.textContent.includes('Save target'))
    await act(async () => { saveTargetBtn.click() })
    expect(useStore.getState().S.calorieTarget).toBe(1800)

    // 2. Add Idli (Breakfast, 50 kcal / piece) to personal food library
    const newFoodBtn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('New food'))
    await act(async () => { newFoodBtn.click() })

    const nameInput = document.querySelector('#food-item-name')
    await act(async () => { setInputValue(nameInput, 'Idli') })

    const breakfastChip = [...document.querySelectorAll('[data-food-category-presets] button')].find(b => b.textContent.trim() === 'Breakfast')
    expect(breakfastChip).toBeTruthy()
    await act(async () => { breakfastChip.click() })

    const kcalInput = document.querySelector('[data-food-item-sheet] .stp input.num')
    await act(async () => {
      setInputValue(kcalInput, '50')
      kcalInput.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    })

    const saveFoodBtn = [...document.querySelectorAll('[data-food-item-sheet] button')].find(b => b.textContent.includes('Save food'))
    await act(async () => { saveFoodBtn.click() })
    expect(useStore.getState().S.foods).toHaveLength(1)
    expect(useStore.getState().S.foods[0].name).toBe('Idli')
    expect(useStore.getState().S.foods[0].category).toBe('Breakfast')
    expect(useStore.getState().S.foods[0].kcalPerUnit).toBe(50)

    // 3. Tap Idli in Quick-Add to log quantity 3 (= 150 kcal)
    const quickOpenBtn = host.querySelector('[data-food-quick] .food-quick-open')
    expect(quickOpenBtn.textContent).toContain('Idli')
    expect(quickOpenBtn.textContent).toContain('Breakfast')
    await act(async () => { quickOpenBtn.click() })

    const qtyInput = document.querySelector('[data-food-log-sheet] .stp input.num')
    await act(async () => {
      setInputValue(qtyInput, '3')
      qtyInput.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    })

    expect(document.querySelector('[data-food-preview]').textContent).toContain('150 kcal')
    const logSaveBtn = [...document.querySelectorAll('[data-food-log-sheet] button')].find(b => b.textContent.includes('Log 150 kcal'))
    await act(async () => { logSaveBtn.click() })

    // Verify Eaten = 150 kcal, Remaining = 1650 kcal (1800 - 150), and Burned = 400 kcal shown separately
    expect(host.querySelector('[data-food-eaten]').textContent).toBe('150 kcal')
    expect(host.querySelector('[data-food-remaining]').textContent).toBe('1650 kcal')
    expect(host.querySelector('[data-food-burned-note]').textContent).toContain('400 kcal')

    // 4. Test 1-tap +1 quick-add button (+50 kcal -> 200 eaten, 1600 remaining)
    const plusOneBtn = host.querySelector('[data-food-quick] .food-quick-add')
    await act(async () => { plusOneBtn.click() })
    expect(host.querySelector('[data-food-eaten]').textContent).toBe('200 kcal')
    expect(host.querySelector('[data-food-remaining]').textContent).toBe('1600 kcal')
  })

  it('filters and groups frequent foods in Quick-Add and filters the library by category', async () => {
    useStore.getState().update(s => {
      s.foods = [
        { id: 'f-idli', name: 'Idli', category: 'Breakfast', unitLabel: 'piece', kcalPerUnit: 50, fav: true, at: 1000 },
        { id: 'f-oats', name: 'Oats', category: 'Breakfast', unitLabel: 'bowl', kcalPerUnit: 160, fav: false, at: 1100 },
        { id: 'f-whey', name: 'Whey Isolate', category: 'Protein', unitLabel: 'serving', kcalPerUnit: 120, fav: true, at: 1200 },
        { id: 'f-almonds', name: 'Roasted Almonds', category: 'Snacks', unitLabel: 'serving', kcalPerUnit: 170, fav: false, at: 1300 },
      ]
    }, false)

    await act(async () => {
      root.render(
        <>
          <Food />
          <Modals />
        </>
      )
    })

    // Initially 'All' shows all 4 items in Ranked mode
    expect(host.querySelectorAll('[data-food-quick] [data-quick-food]')).toHaveLength(4)

    // Filter Quick-Add to 'Breakfast' -> only Idli and Oats appear
    const breakfastFilter = host.querySelector('[data-quick-category-filters] [data-quick-cat="Breakfast"]')
    expect(breakfastFilter).toBeTruthy()
    await act(async () => { breakfastFilter.click() })
    const filteredIds = [...host.querySelectorAll('[data-food-quick] [data-quick-food]')].map(el => el.getAttribute('data-quick-food'))
    expect(filteredIds).toEqual(['f-idli', 'f-oats'])

    // Reset filter back to 'All' and switch Quick-Add layout to 'By category'
    const allFilter = host.querySelector('[data-quick-category-filters] [data-quick-cat="all"]')
    await act(async () => { allFilter.click() })

    const byCatBtn = [...host.querySelectorAll('[data-quick-view-mode] button')].find(b => b.textContent.includes('By category'))
    expect(byCatBtn).toBeTruthy()
    await act(async () => { byCatBtn.click() })

    const groups = [...host.querySelectorAll('[data-quick-grouped-list] [data-quick-group]')].map(el => el.getAttribute('data-quick-group'))
    expect(groups).toEqual(['Breakfast', 'Snacks', 'Protein'])
    expect(host.querySelectorAll('[data-quick-group="Breakfast"] [data-quick-food]')).toHaveLength(2)
    expect(host.querySelectorAll('[data-quick-group="Protein"] [data-quick-food]')).toHaveLength(1)

    // Filter Personal Food Library to 'Protein'
    const libProteinBtn = host.querySelector('[data-library-category-filters] [data-lib-cat="Protein"]')
    expect(libProteinBtn).toBeTruthy()
    await act(async () => { libProteinBtn.click() })
    const libIds = [...host.querySelectorAll('[data-food-library] [data-library-food]')].map(el => el.getAttribute('data-library-food'))
    expect(libIds).toEqual(['f-whey'])
  })

  it('logs a multi-item meal and opens the Macronutrients & Micronutrients inspector when clicking the logged entry', async () => {
    await act(async () => {
      root.render(
        <>
          <Food />
          <Modals />
        </>
      )
    })

    // 1. Open Log food sheet (starts in Custom food mode when library is empty)
    const logFoodBtn = [...host.querySelectorAll('[data-food-budget] button')].find(b => b.textContent.includes('Log food'))
    expect(logFoodBtn).toBeTruthy()
    await act(async () => { logFoodBtn.click() })

    const customNameInput = document.querySelector('#log-custom-name')
    expect(customNameInput).toBeTruthy()
    await act(async () => { setInputValue(customNameInput, '3 doasa and fish curry') })

    // Verify smart meal estimator recognizes Plain Dosa x 3 + Fish Curry = 644 kcal and applies it on tap
    const estimateHint = document.querySelector('[data-custom-meal-estimate]')
    expect(estimateHint).toBeTruthy()
    expect(estimateHint.textContent).toContain('Plain Dosa')
    expect(estimateHint.textContent).toContain('Fish Curry')
    expect(estimateHint.textContent).toContain('644 kcal')

    const useEstBtn = estimateHint.querySelector('.nutri-use-kcal-btn')
    expect(useEstBtn).toBeTruthy()
    await act(async () => { useEstBtn.click() })

    const saveLogBtn = [...document.querySelectorAll('[data-food-log-sheet] button')].find(b => b.textContent.includes('Log 644 kcal'))
    expect(saveLogBtn).toBeTruthy()
    await act(async () => { saveLogBtn.click() })

    // 2. Click the logged food row in Daily Log to inspect full Macro & Micronutrients
    const loggedRow = host.querySelector('[data-food-log-list] [data-food-log-row]')
    expect(loggedRow).toBeTruthy()
    expect(loggedRow.textContent).toContain('3 doasa and fish curry')
    expect(loggedRow.textContent).toContain('Tap for nutrients')
    await act(async () => { loggedRow.click() })

    const inspector = document.querySelector('[data-food-nutrition-inspector]')
    expect(inspector).toBeTruthy()

    const macroSection = inspector.querySelector('[data-macro-section]')
    const microSection = inspector.querySelector('[data-micro-section]')
    expect(macroSection).toBeTruthy()
    expect(microSection).toBeTruthy()
    expect(macroSection.textContent).toContain('Macronutrients')
    expect(macroSection.textContent).toContain('Protein')
    expect(macroSection.textContent).toContain('Carbohydrates')
    expect(macroSection.textContent).toContain('Total fat')
    expect(macroSection.textContent).toContain('Dietary fiber')

    expect(microSection.textContent).toContain('Micronutrients')
    expect(microSection.textContent).toContain('Iron')
    expect(microSection.textContent).toContain('Calcium')
    expect(microSection.textContent).toContain('Potassium')
    expect(microSection.textContent).toContain('Vitamin B12')

    const proteinRow1 = inspector.querySelector('[data-nutrient-row="proteinG"]').textContent
    expect(proteinRow1).toContain('33.6 g')

    // 3. Changing quantity from 1 -> 2 scales the inspected macro & micronutrient amounts live
    const qtyInput = document.querySelector('[data-food-log-sheet] .stp input.num')
    await act(async () => {
      setInputValue(qtyInput, '2')
      qtyInput.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    })
    const proteinRow2 = document.querySelector('[data-food-nutrition-inspector] [data-nutrient-row="proteinG"]').textContent
    expect(proteinRow2).toContain('67.2 g')
  })

  it('fetches detailed macro and micro-nutrient profiles from the public nutrition API when a food item is logged', async () => {
    const origFetch = globalThis.fetch
    const analyzeCalls = []
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/api/nutrition/analyze')) {
        const payload = JSON.parse(init?.body || '{}')
        analyzeCalls.push(payload)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            query: payload.query,
            matched: true,
            source: 'edamam',
            provider: 'edamam',
            estimatedKcal: 222,
            kcal: payload.kcal || 222,
            category: 'Lunch',
            unitLabel: 'cup',
            items: [{ id: 'ed-quinoa', name: 'Cooked Quinoa', qty: 1, unitLabel: 'cup', kcal: 222 }],
            nutrients: {
              proteinG: 8.4,
              carbsG: 39.4,
              fatG: 3.6,
              fiberG: 5.2,
              sugarG: 1.6,
              satFatG: 0.4,
              sodiumMg: 13,
              potassiumMg: 318,
              calciumMg: 31,
              ironMg: 2.8,
              magnesiumMg: 118,
              zincMg: 2.0,
              vitAMcg: 1,
              vitCMg: 0,
              vitDMcg: 0,
              vitB12Mcg: 0,
              cholesterolMg: 0,
            },
          }),
        }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    }

    try {
      await act(async () => {
        root.render(
          <>
            <Food />
            <Modals />
          </>
        )
      })

      const logFoodBtn = [...host.querySelectorAll('[data-food-budget] button')].find(b => b.textContent.includes('Log food'))
      await act(async () => { logFoodBtn.click() })

      const customNameInput = document.querySelector('#log-custom-name')
      await act(async () => { setInputValue(customNameInput, 'Cooked Quinoa Bowl') })

      // Immediately click Log before debounce settles -> post-log API enrichment fetches detailed nutrients
      const saveLogBtn = [...document.querySelectorAll('[data-food-log-sheet] button')].find(b => b.textContent.includes('Log 100 kcal'))
      expect(saveLogBtn).toBeTruthy()
      await act(async () => {
        saveLogBtn.click()
        await new Promise(r => setTimeout(r, 25))
      })

      expect(analyzeCalls.some(c => c.query === 'Cooked Quinoa Bowl')).toBe(true)
      const storedEntry = useStore.getState().S.foodLog[0]
      expect(storedEntry.nutrientSource).toBe('edamam')
      expect(storedEntry.nutrients.proteinG).toBe(8.4)
      expect(storedEntry.nutrients.magnesiumMg).toBe(118)
      expect(storedEntry.nutrients.ironMg).toBe(2.8)

      // Open the logged entry and confirm the Edamam Nutrition API badge & micronutrients appear
      const loggedRow = host.querySelector('[data-food-log-list] [data-food-log-row]')
      await act(async () => { loggedRow.click() })

      const inspector = document.querySelector('[data-food-nutrition-inspector]')
      expect(inspector.textContent).toContain('Edamam Nutrition API')
      expect(inspector.querySelector('[data-nutrient-row="magnesiumMg"]').textContent).toContain('118 mg')
      expect(inspector.querySelector('[data-nutrient-row="ironMg"]').textContent).toContain('2.8 mg')
    } finally {
      globalThis.fetch = origFetch
    }
  })
})


