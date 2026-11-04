import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, tn } from '../lib/i18n.js'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'
import { nav } from '../lib/nav.js'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { stampRestore } from '../lib/sync-merge.js'
import { dailyActivitySummary } from '../lib/activities.js'
import {
  SUGGESTED_TARGETS,
  UNIT_PRESETS,
  FOOD_CATEGORIES,
  DEFAULT_FOOD_CATEGORY,
  foodCategoryOf,
  foodCategoriesIn,
  groupFoodsByCategory,
  shiftDateISO,
  validateCalorieTarget,
  calculateFoodKcal,
  buildFoodItem,
  buildFoodLogEntry,
  sortFoods,
  sortFoodLog,
  dailyNutritionSummary,
  frequentFoods,
} from '../lib/nutrition.js'
import {
  MACRO_FIELDS,
  MICRO_FIELDS,
  scaleNutrients,
  percentDV,
  macroCalorieSplit,
  searchNutritionCatalog,
  analyzeFoodText,
  resolveEntryNutrition,
} from '../lib/nutrition-facts.js'
import {
  isLiveApiSource,
  formatNutrientSourceLabel,
  shortProviderBadge,
  searchNutritionApi,
  analyzeNutritionApi,
  enrichLoggedFoodFromApi,
} from '../lib/nutrition-api.js'
import Icon from '../components/Icon.jsx'
import CardHead from '../components/CardHead.jsx'
import DateField from '../components/DateField.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { Button, SearchField, Segmented, Stepper, Switch, TextField } from '../components/ui.jsx'

function fmtNutrientAmount(val, unit) {
  const n = Number(val) || 0
  if (unit === 'mcg' || unit === 'mg') {
    return n >= 10 || Number.isInteger(n) ? `${Math.round(n)} ${unit}` : `${Math.round(n * 10) / 10} ${unit}`
  }
  return `${Math.round(n * 10) / 10} ${unit}`
}

export function NutritionFactsPanel({
  nutrients,
  items = [],
  source = 'database',
  totalKcal = 0,
  syncing = false,
  onSyncApi = null,
}) {
  const split = useMemo(() => macroCalorieSplit(nutrients), [nutrients])

  return (
    <div className="nutri-panel" data-food-nutrition-inspector>
      <div className="nutri-summary-bar">
        <div>
          <div className="nutri-eyebrow">{t('Nutritional value · Whole portion')}</div>
          <div className="nutri-kcal-line">
            <strong>{totalKcal} kcal</strong>
            <span className="dim" data-nutrient-source={source || 'database'}>
              {' · '}
              {formatNutrientSourceLabel(source, t)}
            </span>
          </div>
        </div>
        {onSyncApi && (
          <button
            type="button"
            className="nutri-sync-btn"
            disabled={syncing}
            data-sync-api-nutrients
            onClick={onSyncApi}
          >
            {syncing ? t('Syncing…') : t('Sync API')}
          </button>
        )}
      </div>

      {Array.isArray(items) && items.length > 0 && (
        <div className="nutri-detected" data-nutri-detected-items>
          <span className="nutri-detected-k">{t('Matched foods')}:</span>{' '}
          <span>
            {items.map(it => `${it.name}${it.qty && it.qty !== 1 ? ` × ${fmtNum(it.qty)}` : ''}`).join(' · ')}
          </span>
        </div>
      )}

      <div className="nutri-section" data-macro-section>
        <div className="nutri-sec-head">
          <h4>{t('Macronutrients')}</h4>
          <span className="nutri-split-legend">
            {t('Protein')} {split.proteinPct}% · {t('Carbs')} {split.carbsPct}% · {t('Fat')} {split.fatPct}%
          </span>
        </div>

        <div className="nutri-macro-bar" aria-hidden="true">
          <span className="seg-p" style={{ width: `${Math.max(split.proteinPct, 2)}%` }} />
          <span className="seg-c" style={{ width: `${Math.max(split.carbsPct, 2)}%` }} />
          <span className="seg-f" style={{ width: `${Math.max(split.fatPct, 2)}%` }} />
        </div>

        <div className="nutri-rows">
          {MACRO_FIELDS.map(f => {
            const val = Number(nutrients?.[f.key]) || 0
            const dv = percentDV(f.key, val)
            return (
              <div
                key={f.key}
                className={'nutri-row' + (f.subOf ? ' is-sub' : '')}
                data-nutrient-row={f.key}
              >
                <div className="nutri-row-main">
                  <span className="nutri-name">{t(f.label)}</span>
                  <span className="nutri-val">
                    <strong>{fmtNutrientAmount(val, f.unit)}</strong>
                    <span className="nutri-dv">{dv}% DV</span>
                  </span>
                </div>
                <div className="nutri-dv-bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, dv)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="nutri-section" data-micro-section>
        <div className="nutri-sec-head">
          <h4>{t('Micronutrients')}</h4>
          <span className="nutri-split-legend">{t('Vitamins & minerals')}</span>
        </div>

        <div className="nutri-rows">
          {MICRO_FIELDS.map(f => {
            const val = Number(nutrients?.[f.key]) || 0
            const dv = percentDV(f.key, val)
            return (
              <div key={f.key} className="nutri-row" data-nutrient-row={f.key}>
                <div className="nutri-row-main">
                  <span className="nutri-name">{t(f.label)}</span>
                  <span className="nutri-val">
                    <strong>{fmtNutrientAmount(val, f.unit)}</strong>
                    <span className="nutri-dv">{dv}% DV</span>
                  </span>
                </div>
                <div className="nutri-dv-bar is-micro" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, dv)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CalorieTargetSheet({ currentTarget, close }) {
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const [val, setVal] = useState(currentTarget || 1800)
  const [err, setErr] = useState('')

  const save = () => {
    const { target, error } = validateCalorieTarget(val)
    if (error) {
      setErr(t(error))
      return
    }
    update(s => {
      s.calorieTarget = target
    })
    close()
    ui.toast(t('Daily calorie target saved'))
  }

  const clear = () => {
    update(s => {
      s.calorieTarget = null
    })
    close()
    ui.toast(t('Daily calorie target cleared'))
  }

  return (
    <div className="sheet-form" data-food-target-sheet>
      <h3>{t('Daily calorie target')}</h3>

      <div className="sheet-field">
        <span className="sheet-label">{t('Quick presets')}</span>
        <div className="chips" role="group" aria-label={t('Calorie target presets')}>
          {SUGGESTED_TARGETS.map(preset => (
            <button
              type="button"
              key={preset}
              className={'chip' + (Number(val) === preset ? ' on' : '')}
              onClick={() => { setVal(preset); setErr('') }}
            >
              {preset} kcal
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-field">
        <span className="sheet-label">{t('Target (kcal per day)')}</span>
        <Stepper
          value={val}
          step={50}
          min={500}
          max={15000}
          decimal={false}
          unit="kcal"
          ariaLabel={t('Daily calorie target')}
          onChange={v => { setVal(v); setErr('') }}
        />
      </div>

      {err && <div className="sheet-err" role="alert">{err}</div>}

      <div className="sheet-actions">
        <Button variant="primary" onClick={save}>
          {t('Save target')}
        </Button>
        {currentTarget != null && (
          <Button variant="danger" icon="trash" onClick={clear}>
            {t('Clear target')}
          </Button>
        )}
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

function FoodItemSheet({ existing = null, onSaved, close }) {
  const update = useStore(s => s.update)
  const ui = useUI.getState()

  const [name, setName] = useState(existing?.name || '')
  const [category, setCategory] = useState(existing ? foodCategoryOf(existing) : DEFAULT_FOOD_CATEGORY)
  const [unitLabel, setUnitLabel] = useState(existing?.unitLabel || 'piece')
  const [kcalPerUnit, setKcalPerUnit] = useState(existing?.kcalPerUnit || 100)
  const [pickedNutrients, setPickedNutrients] = useState(existing?.nutrients || null)
  const [pickedSource, setPickedSource] = useState(existing?.nutrientSource || null)
  const [apiSuggestions, setApiSuggestions] = useState([])
  const [fav, setFav] = useState(Boolean(existing?.fav))
  const [err, setErr] = useState('')

  useEffect(() => {
    const q = name.trim()
    if (q.length < 2) {
      setApiSuggestions([])
      return
    }
    const ctl = typeof AbortController === 'function' ? new AbortController() : null
    const timer = setTimeout(() => {
      searchNutritionApi(q, 5, ctl?.signal).then(data => {
        if (data?.items?.length) setApiSuggestions(data.items)
      })
    }, 240)
    return () => {
      clearTimeout(timer)
      ctl?.abort()
    }
  }, [name])

  const suggestions = useMemo(() => {
    const q = name.trim()
    if (q.length < 2) return []
    if (apiSuggestions.length > 0) return apiSuggestions.slice(0, 5)
    return searchNutritionCatalog(q, 5)
  }, [name, apiSuggestions])

  const applyCatalogSuggestion = item => {
    setName(item.name)
    setCategory(item.category || DEFAULT_FOOD_CATEGORY)
    setUnitLabel(item.unitLabel || 'serving')
    setKcalPerUnit(item.kcal)
    setPickedNutrients(item.nutrients)
    setPickedSource(item.source || 'curated')
    setErr('')
  }

  const save = () => {
    const resolvedNutrients = pickedNutrients || analyzeFoodText(name, kcalPerUnit, category).nutrients
    const { food, error } = buildFoodItem({
      id: existing?.id,
      name,
      category,
      unitLabel,
      kcalPerUnit,
      nutrients: resolvedNutrients,
      nutrientSource: pickedSource,
      fav,
      at: existing?.at || Date.now(),
    })
    if (error || !food) {
      setErr(t(error || 'Check food details.'))
      return
    }
    update(s => {
      const prev = Array.isArray(s.foods) ? s.foods : []
      const idx = prev.findIndex(x => x && x.id === food.id)
      const next = idx >= 0
        ? prev.map((x, i) => (i === idx ? { ...(x._f ? { _f: x._f } : {}), ...food } : x))
        : [...prev, food]
      s.foods = sortFoods(next)
    })
    if (!isLiveApiSource(food.nutrientSource)) {
      enrichLoggedFoodFromApi({
        foodId: food.id,
        query: food.name,
        kcalPerUnit: food.kcalPerUnit,
        category: food.category,
      }).catch(() => {})
    }
    close()
    ui.toast(existing ? t('Food item updated') : t('Food added to library'))
    if (onSaved) onSaved(food)
  }

  const remove = () => {
    if (!existing) return
    const snapshot = JSON.parse(JSON.stringify(existing))
    update(s => {
      s.foods = (s.foods || []).filter(x => x && x.id !== existing.id)
    })
    close()
    ui.toast(t('Food removed from library'), {
      action: t('Undo'),
      onAction: () => {
        useStore.getState().update(s => {
          const restored = stampRestore({ foods: [snapshot], deleted: s.deleted }, [s]).foods[0]
          s.foods = sortFoods([...(s.foods || []).filter(x => x && x.id !== restored.id), restored])
          if (s.deleted?.foods) delete s.deleted.foods[restored.id]
        })
      },
    })
  }

  return (
    <div className="sheet-form" data-food-item-sheet>
      <h3>{existing ? t('Edit food item') : t('New food item')}</h3>

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="food-item-name">{t('Food name')}</label>
        <TextField
          id="food-item-name"
          placeholder={t('e.g. Idli, Boiled egg, Oats')}
          value={name}
          onChange={e => { setName(e.target.value); setPickedNutrients(null); setPickedSource(null); setErr('') }}
        />
        {suggestions.length > 0 && (
          <div className="nutri-suggest-row">
            <span className="nutri-suggest-k">{t('Autofill nutrition')}:</span>
            <div className="chips" role="group" aria-label={t('Database suggestions')}>
              {suggestions.map(s => (
                <button
                  type="button"
                  key={s.id}
                  className="chip nocap"
                  onClick={() => applyCatalogSuggestion(s)}
                >
                  {s.name} ({s.kcal} kcal · {shortProviderBadge(s.source)})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="food-item-category">{t('Category')}</label>
        <div className="chips" role="group" aria-label={t('Food category presets')} data-food-category-presets>
          {FOOD_CATEGORIES.map(cat => (
            <button
              type="button"
              key={cat}
              className={'chip nocap' + (category.trim().toLowerCase() === cat.toLowerCase() ? ' on' : '')}
              onClick={() => { setCategory(cat); setErr('') }}
            >
              {t(cat)}
            </button>
          ))}
        </div>
        <TextField
          id="food-item-category"
          placeholder={t('Breakfast, Snacks, Pre-workout')}
          maxLength={32}
          value={category}
          onChange={e => { setCategory(e.target.value); setErr('') }}
        />
      </div>

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="food-item-unit">{t('Serving unit')}</label>
        <div className="chips" role="group" aria-label={t('Serving unit presets')}>
          {UNIT_PRESETS.map(u => (
            <button
              type="button"
              key={u}
              className={'chip nocap' + (unitLabel === u ? ' on' : '')}
              onClick={() => { setUnitLabel(u); setErr('') }}
            >
              {t(u)}
            </button>
          ))}
        </div>
        <TextField
          id="food-item-unit"
          placeholder={t('piece, bowl, 100g')}
          value={unitLabel}
          onChange={e => { setUnitLabel(e.target.value); setErr('') }}
        />
      </div>

      <div className="sheet-field">
        <span className="sheet-label">{t('Calories per unit (kcal)')}</span>
        <Stepper
          value={kcalPerUnit}
          step={10}
          min={1}
          max={5000}
          decimal={false}
          unit="kcal"
          ariaLabel={t('Calories per unit')}
          onChange={v => { setKcalPerUnit(v); setPickedNutrients(null); setPickedSource(null); setErr('') }}
        />
      </div>

      <div className="food-fav-toggle">
        <span className="sheet-label">{t('Pin to Quick-Add')}</span>
        <Switch
          checked={fav}
          onChange={setFav}
          aria-label={t('Pin to Quick-Add')}
        />
      </div>

      {err && <div className="sheet-err" role="alert">{err}</div>}

      <div className="sheet-actions">
        <Button variant="primary" onClick={save}>
          {existing ? t('Save changes') : t('Save food')}
        </Button>
        {existing && (
          <Button variant="danger" icon="trash" onClick={remove}>
            {t('Delete from library')}
          </Button>
        )}
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

function LogFoodSheet({ date, initialFood = null, existingEntry = null, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const foods = useMemo(() => sortFoods(S.foods), [S.foods])
  const libraryCategories = useMemo(() => foodCategoriesIn(foods), [foods])

  const startMode = existingEntry
    ? 'log'
    : initialFood
      ? 'log'
      : foods.length > 0
        ? 'library'
        : 'custom'

  // Subscribe to the latest persisted entry so async API enrichment updates the open inspector live
  const liveExistingEntry = useMemo(() => {
    if (!existingEntry) return null
    return (Array.isArray(S.foodLog) ? S.foodLog.find(e => e && e.id === existingEntry.id) : null) || existingEntry
  }, [S.foodLog, existingEntry])

  const [mode, setMode] = useState(startMode)
  const [sheetCat, setSheetCat] = useState('all')
  const [selectedFoodId, setSelectedFoodId] = useState(existingEntry?.foodId || initialFood?.id || foods[0]?.id || '')
  const [dbQuery, setDbQuery] = useState('')
  const [dbResults, setDbResults] = useState(() => searchNutritionCatalog('', 10))
  const [selectedDbFood, setSelectedDbFood] = useState(() => searchNutritionCatalog('', 1)[0] || null)
  const [customName, setCustomName] = useState(existingEntry?.name || initialFood?.name || '')
  const [customCategory, setCustomCategory] = useState(initialFood ? foodCategoryOf(initialFood) : DEFAULT_FOOD_CATEGORY)
  const [customUnit, setCustomUnit] = useState(existingEntry?.unitLabel || initialFood?.unitLabel || 'piece')
  const [customKcalPerUnit, setCustomKcalPerUnit] = useState(existingEntry?.kcalPerUnit || initialFood?.kcalPerUnit || 100)
  const [remoteAnalysis, setRemoteAnalysis] = useState(null)
  const [syncingApi, setSyncingApi] = useState(false)
  const [saveToLibrary, setSaveToLibrary] = useState(!existingEntry && !initialFood)
  const [qty, setQty] = useState(existingEntry?.qty || 1)
  const [entryDate, setEntryDate] = useState(existingEntry?.d || date || todayISO())
  const [err, setErr] = useState('')

  // Live database search (instant local catalog + backend /api/nutrition/search across Edamam/Nutritionix/USDA/OpenFoodFacts)
  useEffect(() => {
    if (mode !== 'database') return
    const local = searchNutritionCatalog(dbQuery, 12)
    setDbResults(local)
    if (local.length > 0 && (!selectedDbFood || !local.some(x => x.id === selectedDbFood.id))) {
      setSelectedDbFood(local[0])
    }
    const q = dbQuery.trim()
    if (q.length < 2) return
    const ctl = typeof AbortController === 'function' ? new AbortController() : null
    const timer = setTimeout(() => {
      searchNutritionApi(q, 12, ctl?.signal).then(data => {
        if (!Array.isArray(data?.items) || !data.items.length) return
        setDbResults(data.items)
        setSelectedDbFood(prev => data.items.find(x => x.id === prev?.id) || data.items[0])
      })
    }, 220)
    return () => {
      clearTimeout(timer)
      ctl?.abort()
    }
  }, [mode, dbQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live backend API analysis for custom meals (e.g. "3 doasa and fish curry", "2 boiled eggs and avocado")
  useEffect(() => {
    if (mode !== 'custom') return
    const q = customName.trim()
    if (q.length < 2) {
      setRemoteAnalysis(null)
      return
    }
    const ctl = typeof AbortController === 'function' ? new AbortController() : null
    const timer = setTimeout(() => {
      analyzeNutritionApi(
        { query: q, kcal: customKcalPerUnit, qty: 1, category: customCategory },
        ctl?.signal
      ).then(data => {
        if (data?.nutrients) setRemoteAnalysis(data)
      })
    }, 240)
    return () => {
      clearTimeout(timer)
      ctl?.abort()
    }
  }, [mode, customName, customKcalPerUnit, customCategory])

  // Auto-enrich legacy logged entries lacking a public API nutrientSource when opened in the inspector
  useEffect(() => {
    if (!liveExistingEntry || isLiveApiSource(liveExistingEntry.nutrientSource)) return
    let alive = true
    setSyncingApi(true)
    enrichLoggedFoodFromApi({
      entryId: liveExistingEntry.id,
      foodId: liveExistingEntry.foodId || null,
      query: liveExistingEntry.name,
      kcalPerUnit: liveExistingEntry.kcalPerUnit,
      category: DEFAULT_FOOD_CATEGORY,
    }).finally(() => {
      if (alive) setSyncingApi(false)
    })
    return () => { alive = false }
  }, [liveExistingEntry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const manualSyncExistingFromApi = () => {
    if (!liveExistingEntry || syncingApi) return
    setSyncingApi(true)
    enrichLoggedFoodFromApi({
      entryId: liveExistingEntry.id,
      foodId: liveExistingEntry.foodId || null,
      query: liveExistingEntry.name,
      kcalPerUnit: liveExistingEntry.kcalPerUnit,
      category: DEFAULT_FOOD_CATEGORY,
    }).finally(() => setSyncingApi(false))
  }

  const localCustomAnalysis = useMemo(
    () => analyzeFoodText(customName, customKcalPerUnit, customCategory),
    [customName, customKcalPerUnit, customCategory]
  )
  const localUnscaledEstimate = useMemo(
    () => analyzeFoodText(customName, null, customCategory),
    [customName, customCategory]
  )

  const visibleLibraryFoods = useMemo(() => {
    if (sheetCat === 'all') return foods
    return foods.filter(f => foodCategoryOf(f) === sheetCat)
  }, [foods, sheetCat])

  const chosenFood = mode === 'library'
    ? visibleLibraryFoods.find(f => f.id === selectedFoodId) || visibleLibraryFoods[0] || foods[0] || null
    : mode === 'database'
      ? selectedDbFood
      : initialFood

  const activeName = liveExistingEntry
    ? liveExistingEntry.name
    : mode === 'custom'
      ? customName
      : chosenFood?.name || customName
  const activeUnit = liveExistingEntry
    ? liveExistingEntry.unitLabel
    : mode === 'custom'
      ? customUnit
      : chosenFood?.unitLabel || customUnit
  const activeKcalPerUnit = liveExistingEntry
    ? liveExistingEntry.kcalPerUnit
    : mode === 'custom'
      ? customKcalPerUnit
      : chosenFood?.kcal ?? chosenFood?.kcalPerUnit ?? customKcalPerUnit

  const totalKcal = calculateFoodKcal(activeKcalPerUnit, qty)

  // Per-unit nutrient profile + source tag to store immediately when saving
  const activePerUnitProfile = useMemo(() => {
    if (liveExistingEntry) {
      const resolvedSingle = resolveEntryNutrition({ ...liveExistingEntry, qty: 1, kcal: liveExistingEntry.kcalPerUnit }, foods)
      return { nutrients: resolvedSingle.nutrients, source: liveExistingEntry.nutrientSource || resolvedSingle.source }
    }
    if (mode === 'database' && selectedDbFood?.nutrients) {
      return { nutrients: selectedDbFood.nutrients, source: selectedDbFood.source || 'curated' }
    }
    if (chosenFood?.nutrients) {
      return { nutrients: chosenFood.nutrients, source: chosenFood.nutrientSource || chosenFood.source || 'library' }
    }
    if (mode === 'custom') {
      if (remoteAnalysis?.query?.toLowerCase() === customName.trim().toLowerCase() && remoteAnalysis?.nutrients) {
        return {
          nutrients: remoteAnalysis.nutrients,
          source: remoteAnalysis.source || remoteAnalysis.provider || 'curated',
        }
      }
      return { nutrients: localCustomAnalysis.nutrients, source: localCustomAnalysis.source }
    }
    const fallback = analyzeFoodText(activeName, activeKcalPerUnit, customCategory)
    return { nutrients: fallback.nutrients, source: fallback.source }
  }, [
    liveExistingEntry,
    foods,
    mode,
    selectedDbFood,
    chosenFood,
    remoteAnalysis,
    customName,
    localCustomAnalysis,
    activeName,
    activeKcalPerUnit,
    customCategory,
  ])

  const activePerUnitNutrients = activePerUnitProfile.nutrients
  const activeNutrientSource = activePerUnitProfile.source

  // Full portion nutrition when inspecting an existing logged entry (live-scaled by `qty`)
  const inspectedNutrition = useMemo(() => {
    if (!liveExistingEntry) return null
    const liveEntry = {
      ...liveExistingEntry,
      qty,
      kcal: totalKcal,
    }
    return resolveEntryNutrition(liveEntry, foods)
  }, [liveExistingEntry, qty, totalKcal, foods])

  const saveLog = () => {
    let linkedFoodId = liveExistingEntry?.foodId || (mode === 'library' || initialFood ? chosenFood?.id : null) || null
    let libraryFoodToSave = null
    const catToUse = mode === 'database'
      ? selectedDbFood?.category || DEFAULT_FOOD_CATEGORY
      : chosenFood
        ? foodCategoryOf(chosenFood)
        : customCategory

    if (!liveExistingEntry && (mode === 'custom' || mode === 'database') && saveToLibrary) {
      const built = buildFoodItem({
        name: activeName,
        category: catToUse,
        unitLabel: activeUnit,
        kcalPerUnit: activeKcalPerUnit,
        nutrients: activePerUnitNutrients,
        nutrientSource: activeNutrientSource,
        fav: false,
      })
      if (built.error || !built.food) {
        setErr(t(built.error || 'Check food details.'))
        return
      }
      libraryFoodToSave = built.food
      linkedFoodId = built.food.id
    }

    const { entry, error } = buildFoodLogEntry({
      id: liveExistingEntry?.id,
      d: entryDate,
      foodId: linkedFoodId,
      name: activeName,
      unitLabel: activeUnit,
      kcalPerUnit: activeKcalPerUnit,
      qty,
      nutrients: activePerUnitNutrients,
      nutrientSource: activeNutrientSource,
      at: liveExistingEntry?.at || Date.now(),
    })

    if (error || !entry) {
      setErr(t(error || 'Check food log details.'))
      return
    }

    update(s => {
      if (libraryFoodToSave) {
        const prevFoods = Array.isArray(s.foods) ? s.foods : []
        s.foods = sortFoods([...prevFoods, libraryFoodToSave])
      }
      const prevLog = Array.isArray(s.foodLog) ? s.foodLog : []
      const idx = prevLog.findIndex(x => x && x.id === entry.id)
      const nextLog = idx >= 0
        ? prevLog.map((x, i) => (i === idx ? { ...(x._f ? { _f: x._f } : {}), ...entry } : x))
        : [...prevLog, entry]
      s.foodLog = sortFoodLog(nextLog)
    })

    // Fetch detailed macro & micro-nutrient profile from the public nutrition API whenever a food item is logged
    if (!isLiveApiSource(entry.nutrientSource)) {
      enrichLoggedFoodFromApi({
        entryId: entry.id,
        foodId: linkedFoodId,
        query: entry.name,
        kcalPerUnit: entry.kcalPerUnit,
        category: catToUse,
      }).catch(() => {})
    }

    close()
    ui.toast(liveExistingEntry ? t('Food log updated') : t('Logged {0} ({1} kcal)', entry.name, entry.kcal))
  }

  const removeEntry = () => {
    if (!existingEntry) return
    const snapshot = JSON.parse(JSON.stringify(existingEntry))
    update(s => {
      s.foodLog = (s.foodLog || []).filter(x => x && x.id !== existingEntry.id)
    })
    close()
    ui.toast(t('Food entry removed'), {
      action: t('Undo'),
      onAction: () => {
        useStore.getState().update(s => {
          const restored = stampRestore({ foodLog: [snapshot], deleted: s.deleted }, [s]).foodLog[0]
          s.foodLog = sortFoodLog([...(s.foodLog || []).filter(x => x && x.id !== restored.id), restored])
          if (s.deleted?.foodLog) delete s.deleted.foodLog[restored.id]
        })
      },
    })
  }

  const sourceOptions = foods.length > 0
    ? [
        { value: 'library', label: t('From library') },
        { value: 'database', label: t('Database') },
        { value: 'custom', label: t('Custom food') },
      ]
    : [
        { value: 'custom', label: t('Custom food') },
        { value: 'database', label: t('Database') },
      ]

  const livePreviewNutrients = useMemo(
    () => scaleNutrients(activePerUnitNutrients, qty),
    [activePerUnitNutrients, qty]
  )

  return (
    <div className="sheet-form" data-food-log-sheet>
      <h3>{existingEntry ? existingEntry.name : initialFood ? initialFood.name : t('Log food')}</h3>

      {liveExistingEntry && inspectedNutrition && (
        <NutritionFactsPanel
          nutrients={inspectedNutrition.nutrients}
          items={inspectedNutrition.items}
          source={inspectedNutrition.source}
          totalKcal={totalKcal}
          syncing={syncingApi}
          onSyncApi={manualSyncExistingFromApi}
        />
      )}

      {!existingEntry && !initialFood && (
        <div className="sheet-field">
          <span className="sheet-label" id="food-source-label">{t('Source')}</span>
          <Segmented
            ariaLabelledby="food-source-label"
            value={mode}
            onChange={v => { setMode(v); setErr('') }}
            options={sourceOptions}
          />
        </div>
      )}

      {!existingEntry && !initialFood && mode === 'library' && foods.length > 0 && (
        <div className="sheet-field">
          <span className="sheet-label">{t('Choose food')}</span>
          {libraryCategories.length > 1 && (
            <div className="food-filter-bar" role="group" aria-label={t('Filter library by category')}>
              <button
                type="button"
                className={'food-filter-btn' + (sheetCat === 'all' ? ' on' : '')}
                onClick={() => setSheetCat('all')}
              >
                {t('All')}
              </button>
              {libraryCategories.map(cat => (
                <button
                  type="button"
                  key={cat}
                  className={'food-filter-btn' + (sheetCat === cat ? ' on' : '')}
                  onClick={() => setSheetCat(cat)}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          )}
          <div className="chips" role="group" aria-label={t('Library foods')}>
            {visibleLibraryFoods.map(f => (
              <button
                type="button"
                key={f.id}
                className={'chip nocap' + (chosenFood?.id === f.id ? ' on' : '')}
                onClick={() => { setSelectedFoodId(f.id); setErr('') }}
              >
                {f.name} ({f.kcalPerUnit} kcal)
              </button>
            ))}
          </div>
        </div>
      )}

      {!existingEntry && !initialFood && mode === 'database' && (
        <div className="sheet-field" data-food-db-picker>
          <SearchField
            value={dbQuery}
            onChange={e => setDbQuery(e.target.value)}
            onClear={() => setDbQuery('')}
            placeholder={t('Search foods (e.g. Dosa, Fish curry, Oats, Chicken)')}
            aria-label={t('Search nutrition database')}
          />
          <div className="chips" role="group" aria-label={t('Database foods')}>
            {dbResults.map(item => (
              <button
                type="button"
                key={item.id}
                className={'chip nocap' + (selectedDbFood?.id === item.id ? ' on' : '')}
                onClick={() => { setSelectedDbFood(item); setErr('') }}
              >
                {item.name} ({item.kcal} kcal / {item.unitLabel} · {shortProviderBadge(item.source)})
              </button>
            ))}
          </div>
          <div className="food-fav-toggle">
            <span className="sheet-label">{t('Also save to personal library')}</span>
            <Switch
              checked={saveToLibrary}
              onChange={setSaveToLibrary}
              aria-label={t('Also save to personal library')}
            />
          </div>
        </div>
      )}

      {!existingEntry && !initialFood && mode === 'custom' && (
        <>
          <div className="sheet-field">
            <label className="sheet-label" htmlFor="log-custom-name">{t('Food name')}</label>
            <TextField
              id="log-custom-name"
              placeholder={t('e.g. 3 dosa and fish curry, Rice and two eggs')}
              value={customName}
              onChange={e => { setCustomName(e.target.value); setErr('') }}
            />
            {localUnscaledEstimate.matched && (
              <div className="nutri-estimate-hint" data-custom-meal-estimate>
                <span>
                  {localUnscaledEstimate.items.map(it => `${it.name}${it.qty !== 1 ? ` × ${fmtNum(it.qty)}` : ''}`).join(' + ')}
                  {' · '}
                  <strong>{localUnscaledEstimate.estimatedKcal} kcal</strong>
                </span>
                {Number(customKcalPerUnit) !== localUnscaledEstimate.estimatedKcal && (
                  <button
                    type="button"
                    className="nutri-use-kcal-btn"
                    onClick={() => {
                      setCustomKcalPerUnit(localUnscaledEstimate.estimatedKcal)
                      if (localUnscaledEstimate.unitLabel) setCustomUnit(localUnscaledEstimate.unitLabel)
                      if (localUnscaledEstimate.category) setCustomCategory(localUnscaledEstimate.category)
                    }}
                  >
                    {t('Use {0} kcal', localUnscaledEstimate.estimatedKcal)}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="sheet-row-2">
            <div className="sheet-field">
              <label className="sheet-label" htmlFor="log-custom-unit">{t('Serving unit')}</label>
              <TextField
                id="log-custom-unit"
                placeholder={t('piece')}
                value={customUnit}
                onChange={e => { setCustomUnit(e.target.value); setErr('') }}
              />
            </div>
            <div className="sheet-field">
              <span className="sheet-label">{t('Kcal per unit')}</span>
              <Stepper
                value={customKcalPerUnit}
                step={10}
                min={1}
                max={5000}
                decimal={false}
                unit="kcal"
                ariaLabel={t('Calories per unit')}
                onChange={v => { setCustomKcalPerUnit(v); setErr('') }}
              />
            </div>
          </div>
          <div className="food-fav-toggle">
            <span className="sheet-label">{t('Also save to personal library')}</span>
            <Switch
              checked={saveToLibrary}
              onChange={setSaveToLibrary}
              aria-label={t('Also save to personal library')}
            />
          </div>
          {saveToLibrary && (
            <div className="sheet-field">
              <span className="sheet-label">{t('Category')}</span>
              <div className="chips" role="group" aria-label={t('Food category presets')}>
                {FOOD_CATEGORIES.map(cat => (
                  <button
                    type="button"
                    key={cat}
                    className={'chip nocap' + (customCategory === cat ? ' on' : '')}
                    onClick={() => setCustomCategory(cat)}
                  >
                    {t(cat)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {existingEntry && (
        <div className="nutri-edit-divider">{t('Adjust date or portion')}</div>
      )}

      <div className="sheet-row-2">
        <div className="sheet-field">
          <span className="sheet-label">{t('Date')}</span>
          <DateField
            value={entryDate}
            max={todayISO()}
            onChange={d => { setEntryDate(d); setErr('') }}
            label={t('Date')}
          />
        </div>
        <div className="sheet-field">
          <span className="sheet-label">{t('Quantity ({0})', activeUnit || 'unit')}</span>
          <Stepper
            value={qty}
            step={0.5}
            min={0.5}
            max={100}
            decimal
            unit={activeUnit || 'unit'}
            ariaLabel={t('Quantity')}
            onChange={v => { setQty(v); setErr('') }}
          />
        </div>
      </div>

      <div className="act-formula" data-food-preview>
        <div>
          <strong>{activeName || t('Food')}</strong>:{' '}
          <strong>{fmtNum(qty)}</strong> {activeUnit || 'unit'} × <strong>{activeKcalPerUnit || 0} kcal</strong> ={' '}
          <strong>{totalKcal} kcal</strong>
        </div>
        {!liveExistingEntry && activeName.trim() && (
          <div className="nutri-inline-preview">
            {t('Protein')} {livePreviewNutrients.proteinG}g · {t('Carbs')} {livePreviewNutrients.carbsG}g · {t('Fat')} {livePreviewNutrients.fatG}g · {t('Fiber')} {livePreviewNutrients.fiberG}g
            {' · '}
            <span className="dim">{shortProviderBadge(activeNutrientSource)}</span>
          </div>
        )}
      </div>

      {err && <div className="sheet-err" role="alert">{err}</div>}

      <div className="sheet-actions">
        <Button variant="primary" onClick={saveLog}>
          {existingEntry ? t('Save changes') : t('Log {0} kcal', totalKcal)}
        </Button>
        {existingEntry && (
          <Button variant="danger" icon="trash" onClick={removeEntry}>
            {t('Remove entry')}
          </Button>
        )}
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

function QuickFoodRow({ food, showCategory, onOpen, onQuickAdd }) {
  return (
    <div className="food-quick-row" data-quick-food={food.id}>
      <button
        type="button"
        className="food-quick-open"
        onClick={() => onOpen(food)}
      >
        <span className="tt">
          {food.fav && <Icon name="starFill" className="fav-star" />}
          {food.name}
        </span>
        <span className="ss">
          {showCategory ? `${t(foodCategoryOf(food))} · ` : ''}1 {food.unitLabel} · {food.kcalPerUnit} kcal
        </span>
      </button>
      <button
        type="button"
        className="food-quick-add"
        aria-label={t('Quick add 1 {0}', food.name)}
        onClick={() => onQuickAdd(food)}
      >
        +1
      </button>
    </div>
  )
}

export default function Food() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const today = todayISO()

  const [date, setDate] = useState(today)
  const [query, setQuery] = useState('')
  const [quickCategory, setQuickCategory] = useState('all')
  const [quickLayout, setQuickLayout] = useState('ranked')
  const [libCategory, setLibCategory] = useState('all')

  const summary = useMemo(() => dailyNutritionSummary(S, date), [S, date])
  const activityDay = useMemo(() => dailyActivitySummary(S, date), [S, date])
  const allFoods = useMemo(() => sortFoods(S.foods), [S.foods])
  const availableCategories = useMemo(() => foodCategoriesIn(allFoods), [allFoods])

  const activeQuickCat = quickCategory === 'all' || availableCategories.includes(quickCategory)
    ? quickCategory
    : 'all'
  const activeLibCat = libCategory === 'all' || availableCategories.includes(libCategory)
    ? libCategory
    : 'all'

  const quickFoods = useMemo(
    () => frequentFoods(S, quickLayout === 'grouped' ? 20 : 8, { category: activeQuickCat }),
    [S, quickLayout, activeQuickCat]
  )
  const quickGroups = useMemo(() => groupFoodsByCategory(quickFoods), [quickFoods])

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allFoods.filter(f => {
      const cat = foodCategoryOf(f)
      if (activeLibCat !== 'all' && cat !== activeLibCat) return false
      if (!q) return true
      return (
        String(f.name || '').toLowerCase().includes(q) ||
        String(f.unitLabel || '').toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      )
    })
  }, [allFoods, activeLibCat, query])

  const openTargetSheet = () => {
    ui.openSheet(close => <CalorieTargetSheet currentTarget={summary.target} close={close} />)
  }

  const openFoodItemSheet = (existing = null) => {
    ui.openSheet(close => <FoodItemSheet existing={existing} close={close} />)
  }

  const openLogSheet = (opts = {}) => {
    ui.openSheet(close => (
      <LogFoodSheet
        date={date}
        initialFood={opts.initialFood || null}
        existingEntry={opts.existingEntry || null}
        close={close}
      />
    ))
  }

  const quickAddOne = food => {
    const perUnitNutrients = food.nutrients || analyzeFoodText(food.name, food.kcalPerUnit, food.category).nutrients
    const { entry } = buildFoodLogEntry({
      d: date,
      foodId: food.id,
      name: food.name,
      unitLabel: food.unitLabel,
      kcalPerUnit: food.kcalPerUnit,
      qty: 1,
      nutrients: perUnitNutrients,
      nutrientSource: food.nutrientSource || null,
      at: Date.now(),
    })
    if (!entry) return
    update(s => {
      s.foodLog = sortFoodLog([...(Array.isArray(s.foodLog) ? s.foodLog : []), entry])
    })
    if (!isLiveApiSource(food.nutrientSource)) {
      enrichLoggedFoodFromApi({
        entryId: entry.id,
        foodId: food.id,
        query: food.name,
        kcalPerUnit: food.kcalPerUnit,
        category: food.category,
      }).catch(() => {})
    }
    ui.toast(t('Added {0} (+{1} kcal)', food.name, entry.kcal), {
      action: t('Undo'),
      onAction: () => {
        useStore.getState().update(s => {
          s.foodLog = (s.foodLog || []).filter(x => x && x.id !== entry.id)
        })
      },
    })
  }

  const toggleFav = food => {
    update(s => {
      s.foods = sortFoods((s.foods || []).map(x => (
        x && x.id === food.id ? { ...x, fav: !x.fav } : x
      )))
    })
  }

  const heroTextureUrl = `url("${(import.meta.env.BASE_URL || '/')}solo/system-card.jpg")`

  return (
    <div data-food-view>
      <div className="hdr">
        <div>
          <h1>{t('Food')}</h1>
          <div className="sub">
            {summary.target != null
              ? t('Daily target · {0} kcal', summary.target)
              : t('Set a daily calorie target to track remaining intake')}
          </div>
        </div>
        <div className="hdr-actions">
          <button
            type="button"
            className="iconbtn"
            aria-label={t('Hunter badges')}
            title={t('Hunter badges')}
            onClick={() => nav('/badges')}
          >
            <Icon name="medal" />
          </button>
          <Button size="sm" variant="tinted" icon="target" onClick={openTargetSheet}>
            {summary.target != null ? `${summary.target} kcal` : t('Set target')}
          </Button>
        </div>
      </div>

      <div className="food-date-bar">
        <button
          type="button"
          className="iconbtn"
          aria-label={t('Previous day')}
          onClick={() => setDate(d => shiftDateISO(d, -1))}
        >
          <Icon name="chevronLeft" />
        </button>
        <div className="food-date-mid">
          <DateField
            value={date}
            max={today}
            onChange={setDate}
            label={t('Log date')}
          />
        </div>
        <button
          type="button"
          className="iconbtn"
          aria-label={t('Next day')}
          disabled={date >= today}
          onClick={() => setDate(d => shiftDateISO(d, 1))}
        >
          <Icon name="chevronRight" />
        </button>
      </div>

      <div className="card food-hero-card" data-food-budget style={{ '--solo-card-tex': heroTextureUrl }}>
        <CardHead
          icon="utensils"
          tint="var(--green)"
          eyebrow={date === today ? t('Today') : fmtDate(date, true)}
          title={t('Calorie budget')}
          sub={summary.count > 0
            ? tn('{0} entry logged', '{0} entries logged', summary.count)
            : t('Nothing logged on this day yet')}
          action={
            <Button size="sm" variant="primary" icon="plus" onClick={() => openLogSheet()}>
              {t('Log food')}
            </Button>
          }
        />

        <div className="food-budget-grid">
          <div className="food-stat">
            <div className="food-stat-k">{t('Eaten')}</div>
            <div className="food-stat-v" data-food-eaten>{summary.eaten} kcal</div>
          </div>

          <div className="food-stat">
            <div className="food-stat-k">
              {summary.isOver ? t('Over target') : t('Remaining')}
            </div>
            <div
              className={'food-stat-v' + (summary.target != null ? (summary.isOver ? ' is-over' : ' is-rem') : '')}
              data-food-remaining
            >
              {summary.target == null
                ? t('No target')
                : summary.isOver
                  ? `${summary.overBy} kcal`
                  : `${summary.remaining} kcal`}
            </div>
          </div>

          <div className="food-stat">
            <div className="food-stat-k">{t('Target')}</div>
            <div className="food-stat-v" data-food-target>
              {summary.target != null ? `${summary.target} kcal` : t('Not set')}
            </div>
          </div>
        </div>

        {summary.target != null && (
          <svg
            className="food-bar-svg"
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            role="progressbar"
            aria-label={t('Daily calorie progress')}
            aria-valuemin={0}
            aria-valuemax={summary.target}
            aria-valuenow={summary.eaten}
          >
            <rect className="food-bar-bg" x="0" y="0" width="100" height="8" rx="4" />
            <rect
              className={'food-bar-fg' + (summary.isOver ? ' is-over' : '')}
              x="0"
              y="0"
              width={summary.barPct}
              height="8"
              rx="4"
            />
          </svg>
        )}

        {summary.count > 0 && summary.nutrients && (
          <div className="food-day-macros" data-food-day-macros>
            <span>{t('Protein')} <strong>{summary.nutrients.proteinG}g</strong></span>
            <span>·</span>
            <span>{t('Carbs')} <strong>{summary.nutrients.carbsG}g</strong></span>
            <span>·</span>
            <span>{t('Fat')} <strong>{summary.nutrients.fatG}g</strong></span>
            <span>·</span>
            <span>{t('Fiber')} <strong>{summary.nutrients.fiberG}g</strong></span>
          </div>
        )}

        {activityDay.kcal > 0 && (
          <div className="food-burned-note" data-food-burned-note>
            <span>{t('Burned in activities (tracked separately)')}</span>
            <strong>{activityDay.kcal} kcal</strong>
          </div>
        )}
      </div>

      <div className="cols food-cols">
        <div>
          {allFoods.length > 0 && (
            <div className="card" data-food-quick>
              <div className="food-quick-head">
                <h2>{t('Quick add')} <span className="dim">· {t('Tap name for quantity, or +1')}</span></h2>
                <div data-quick-view-mode>
                  <Segmented
                    className="seg-inline food-quick-seg"
                    ariaLabel={t('Quick add layout')}
                    value={quickLayout}
                    onChange={setQuickLayout}
                    options={[
                      { value: 'ranked', label: t('Ranked') },
                      { value: 'grouped', label: t('By category') },
                    ]}
                  />
                </div>
              </div>

              {availableCategories.length > 0 && (
                <div
                  className="food-filter-bar"
                  role="group"
                  aria-label={t('Filter frequent foods by category')}
                  data-quick-category-filters
                >
                  <button
                    type="button"
                    className={'food-filter-btn' + (activeQuickCat === 'all' ? ' on' : '')}
                    data-quick-cat="all"
                    onClick={() => setQuickCategory('all')}
                  >
                    {t('All')}
                  </button>
                  {availableCategories.map(cat => (
                    <button
                      type="button"
                      key={cat}
                      className={'food-filter-btn' + (activeQuickCat === cat ? ' on' : '')}
                      data-quick-cat={cat}
                      onClick={() => setQuickCategory(cat)}
                    >
                      {t(cat)}
                    </button>
                  ))}
                </div>
              )}

              {quickFoods.length > 0 ? (
                quickLayout === 'grouped' ? (
                  <div className="food-cat-groups" data-quick-grouped-list>
                    {quickGroups.map(group => (
                      <div key={group.category} className="food-cat-group" data-quick-group={group.category}>
                        <div className="food-cat-head">
                          <span>{t(group.category)}</span>
                          <span className="food-cat-count">{group.items.length}</span>
                        </div>
                        <div className="food-quick-list">
                          {group.items.map(food => (
                            <QuickFoodRow
                              key={food.id}
                              food={food}
                              showCategory={false}
                              onOpen={f => openLogSheet({ initialFood: f })}
                              onQuickAdd={quickAddOne}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="food-quick-list">
                    {quickFoods.map(food => (
                      <QuickFoodRow
                        key={food.id}
                        food={food}
                        showCategory
                        onOpen={f => openLogSheet({ initialFood: f })}
                        onQuickAdd={quickAddOne}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="small dim">{t('No foods in this category yet.')}</div>
              )}
            </div>
          )}

          <h4 className="sec">{t('Daily log')} · {date === today ? t('Today') : fmtDate(date, true)}</h4>
          {summary.entries.length > 0 ? (
            <div className="list" data-food-log-list>
              {summary.entries.map(entry => {
                const entryNutri = resolveEntryNutrition(entry, allFoods).nutrients
                return (
                  <div
                    key={entry.id}
                    className="item"
                    data-food-log-row={entry.id}
                    {...tappable(() => openLogSheet({ existingEntry: entry }))}
                  >
                    <span className="lrow-i tint-green" aria-hidden="true">
                      <Icon name="utensils" />
                    </span>
                    <div className="grow">
                      <div className="tt">{entry.name}</div>
                      <div className="ss">
                        {fmtNum(entry.qty)} {entry.unitLabel} · {entry.kcalPerUnit} kcal {t('each')}
                      </div>
                      <div className="food-row-macros">
                        P {entryNutri.proteinG}g · C {entryNutri.carbsG}g · F {entryNutri.fatG}g · {t('Tap for nutrients')}
                      </div>
                    </div>
                    <span className="act-inline-v">{entry.kcal} kcal</span>
                    <Icon name="chevronRight" className="chev" />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon="utensils"
              title={t('No food logged yet.')}
              text={t('Add foods to your personal library or log a meal directly.')}
            >
              <Button variant="tinted" icon="plus" onClick={() => openLogSheet()}>
                {t('Log food')}
              </Button>
            </EmptyState>
          )}
        </div>

        <div>
          <h4 className="sec">{t('Personal food library')}</h4>
          <div className="card" data-food-library>
            <div className="food-lib-head">
              <div>
                <div className="tt">{t('Saved foods')}</div>
                <div className="ss">
                  {allFoods.length > 0
                    ? tn('{0} food in your library', '{0} foods in your library', allFoods.length)
                    : t('Save your staple meals once with kcal per serving')}
                </div>
              </div>
              <Button size="sm" variant="tinted" icon="plus" onClick={() => openFoodItemSheet()}>
                {t('New food')}
              </Button>
            </div>

            {availableCategories.length > 1 && (
              <div
                className="food-filter-bar"
                role="group"
                aria-label={t('Filter saved foods by category')}
                data-library-category-filters
              >
                <button
                  type="button"
                  className={'food-filter-btn' + (activeLibCat === 'all' ? ' on' : '')}
                  data-lib-cat="all"
                  onClick={() => setLibCategory('all')}
                >
                  {t('All')}
                </button>
                {availableCategories.map(cat => (
                  <button
                    type="button"
                    key={cat}
                    className={'food-filter-btn' + (activeLibCat === cat ? ' on' : '')}
                    data-lib-cat={cat}
                    onClick={() => setLibCategory(cat)}
                  >
                    {t(cat)}
                  </button>
                ))}
              </div>
            )}

            {allFoods.length > 3 && (
              <div className="sheet-field">
                <SearchField
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onClear={() => setQuery('')}
                  placeholder={t('Search foods or categories')}
                  aria-label={t('Search foods or categories')}
                />
              </div>
            )}

            {filteredFoods.length > 0 ? (
              <div className="act-inline-list">
                {filteredFoods.map(food => (
                  <div key={food.id} className="item tap-host" data-library-food={food.id}>
                    <button
                      type="button"
                      className="grow item-open tap-main"
                      onClick={() => openLogSheet({ initialFood: food })}
                    >
                      <span className="tt">
                        {food.fav && <Icon name="starFill" className="fav-star" />}
                        {food.name}
                      </span>
                      <span className="ss">
                        {t(foodCategoryOf(food))} · {food.kcalPerUnit} kcal / {food.unitLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label={food.fav ? t('Unpin {0}', food.name) : t('Pin {0} to Quick-Add', food.name)}
                      onClick={() => toggleFav(food)}
                    >
                      <Icon name={food.fav ? 'starFill' : 'star'} />
                    </button>
                    <button
                      type="button"
                      className="iconbtn"
                      aria-label={t('Edit {0}', food.name)}
                      onClick={() => openFoodItemSheet(food)}
                    >
                      <Icon name="pencil" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small dim">
                {allFoods.length === 0
                  ? t('No foods saved yet. Add staples like Idli, Oats, or Boiled egg for one-tap logging.')
                  : t('No matching foods in your library.')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
