// Universal AI Chat Food & Calorie Sync UI:
//   - openAiConnectSheet(): Connect Gemini, ChatGPT, Grok, or Claude with tailored prompts,
//     clickable Quick-Log instructions, Personal AI Sync Key (ax_...) & OpenAPI schema URL.
//   - openAiMealPreviewSheet(meal): Interactive review & confirmation sheet when opening
//     any clickable AI food link (#/food?ai_log=... or query parameters).
//   - useAiFoodLinks(ready): App-level deep-link listener (boot URL + hashchange).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { copyText } from '../lib/clipboard.js'
import { todayISO } from '../lib/format.js'
import { nav } from '../lib/nav.js'
import {
  FOOD_CATEGORIES,
  buildFoodItem,
  buildFoodLogEntry,
  calculateFoodKcal,
  sortFoodLog,
  sortFoods,
} from '../lib/nutrition.js'
import { scaleNutrients } from '../lib/nutrition-facts.js'
import { formatNutrientSourceLabel } from '../lib/nutrition-api.js'
import {
  AI_PLATFORMS,
  buildAiFoodLink,
  buildAiSetupPrompt,
  fetchAiKeyStatus,
  generateAiSyncKey,
  getPublicOrigin,
  normalizeAiMealInput,
  parseAiFoodLink,
  revokeAiSyncKey,
  stripAiFoodParamsFromUrl,
} from '../lib/ai-food-sync.js'
import DateField from './DateField.jsx'
import Icon from './Icon.jsx'
import { Button, Segmented, Stepper, Switch, TextField } from './ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)

function AiConnectSheet({ close }) {
  const user = useStore(s => s.user)
  const sync = useStore(s => s.sync)
  const pullState = useStore(s => s.pullState)

  const [platform, setPlatform] = useState('gemini')
  const [origin] = useState(() => getPublicOrigin())
  const [keyStatus, setKeyStatus] = useState({ configured: false, preview: '', createdAt: null, loading: Boolean(user), unavailable: false })
  const [freshKey, setFreshKey] = useState('')
  const [busyKey, setBusyKey] = useState(false)
  const [pulling, setPulling] = useState(false)

  useEffect(() => {
    if (!user) return
    let alive = true
    fetchAiKeyStatus()
      .then(data => {
        if (!alive) return
        setKeyStatus({
          configured: Boolean(data?.configured),
          preview: String(data?.preview || ''),
          createdAt: data?.createdAt || null,
          loading: false,
          unavailable: false,
        })
      })
      .catch(() => {
        if (!alive) return
        setKeyStatus(prev => ({ ...prev, loading: false, unavailable: true }))
      })
    return () => { alive = false }
  }, [user?.id])

  const promptText = useMemo(
    () => buildAiSetupPrompt(platform, origin, { aiKey: freshKey || keyStatus.preview }),
    [platform, origin, freshKey, keyStatus.preview]
  )

  const schemaUrl = `${origin}/api/ai/openapi.json?origin=${encodeURIComponent(origin)}`
  const webhookUrl = `${origin}/api/ai/food-log`
  const samplePreviewUrl = useMemo(() => buildAiFoodLink(origin, {
    name: 'Grilled Chicken Bowl',
    kcalPerUnit: 520,
    qty: 1,
    unitLabel: 'bowl',
    category: 'Lunch',
    proteinG: 42,
    carbsG: 48,
    fatG: 16,
    fiberG: 6,
    aiProvider: platform,
  }), [origin, platform])

  const copyPrompt = async () => {
    const ok = await copyText(promptText)
    toast(ok ? t('{0} instructions copied', AI_PLATFORMS.find(p => p.id === platform)?.label || 'AI') : t('Copy from the box above'))
  }

  const copySchema = async () => {
    const ok = await copyText(schemaUrl)
    toast(ok ? t('OpenAPI schema URL copied') : schemaUrl)
  }

  const copyFreshKey = async () => {
    if (!freshKey) return
    const ok = await copyText(freshKey)
    toast(ok ? t('Sync key copied — keep it private') : freshKey)
  }

  const handleGenerateKey = async () => {
    setBusyKey(true)
    try {
      const data = await generateAiSyncKey()
      setFreshKey(String(data?.key || ''))
      setKeyStatus({
        configured: true,
        preview: String(data?.preview || ''),
        createdAt: data?.createdAt || Date.now(),
        loading: false,
        unavailable: false,
      })
      toast(t('Personal AI Sync Key ready'))
    } catch (e) {
      toast(e?.message || t('Could not generate sync key.'))
    } finally {
      setBusyKey(false)
    }
  }

  const handleRevokeKey = async () => {
    setBusyKey(true)
    try {
      await revokeAiSyncKey()
      setFreshKey('')
      setKeyStatus({ configured: false, preview: '', createdAt: null, loading: false, unavailable: false })
      toast(t('AI Sync Key revoked'))
    } catch (e) {
      toast(e?.message || t('Could not revoke sync key.'))
    } finally {
      setBusyKey(false)
    }
  }

  const handlePullNow = async () => {
    if (pulling || !pullState) return
    setPulling(true)
    try {
      await pullState()
      toast(t('Synced latest meals from server'))
    } catch {
      toast(t('Could not reach server right now.'))
    } finally {
      setPulling(false)
    }
  }

  const testSampleLink = () => {
    const parsed = parseAiFoodLink(samplePreviewUrl)
    if (parsed?.meal) {
      close()
      openAiMealPreviewSheet(parsed.meal)
    }
  }

  return (
    <div className="sheet-form" data-ai-connect-sheet>
      <div>
        <h3>{t('Connect AI Chats')}</h3>
        <div className="dim small" style={{ marginTop: 4, lineHeight: 1.4 }}>
          {t('Upload or snap a food photo in Gemini, ChatGPT, Grok, or Claude — calculate calories there and send the meal straight into Aetherix.')}
        </div>
      </div>

      <div className="sheet-field">
        <span className="sheet-label" id="ai-platform-label">{t('Choose your AI chat')}</span>
        <Segmented
          className="ai-plat-seg"
          ariaLabelledby="ai-platform-label"
          value={platform}
          onChange={setPlatform}
          options={AI_PLATFORMS.map(p => ({ value: p.id, label: p.label }))}
        />
      </div>

      <div className="ai-prompt-box" data-ai-prompt-box>
        <div className="ai-box-head">
          <div>
            <div className="ai-box-title">
              {AI_PLATFORMS.find(p => p.id === platform)?.subtitle || t('Instructions')}
            </div>
            <div className="ai-box-sub">
              {platform === 'chatgpt'
                ? t('Paste into a Custom GPT\'s Instructions, or drop at the start of any ChatGPT chat.')
                : platform === 'gemini'
                  ? t('Paste into a Gemini Gem or the start of your Gemini food chat.')
                  : platform === 'grok'
                    ? t('Paste into Grok Custom Instructions or any chat before sending your food photo.')
                    : t('Paste into a Claude Project or chat before uploading your meal photo.')}
            </div>
          </div>
          <Button size="sm" variant="tinted" icon="copy" onClick={copyPrompt} data-copy-ai-prompt>
            {t('Copy')}
          </Button>
        </div>
        <pre className="ai-prompt-pre" data-ai-prompt-text>{promptText}</pre>
        <div className="ai-box-foot">
          <button type="button" className="ai-text-link" onClick={testSampleLink} data-test-sample-link>
            <Icon name="sparkles" />
            <span>{t('Preview how Quick-Log works')}</span>
          </button>
        </div>
      </div>

      <div className="ai-key-box" data-ai-sync-key-box>
        <div className="ai-box-head">
          <div>
            <div className="ai-box-title">{t('Direct Auto-Log (Webhook & Custom GPT Action)')}</div>
            <div className="ai-box-sub">
              {t('Lets ChatGPT Custom GPTs, Claude tools, or Apple Shortcuts log directly in the background.')}
            </div>
          </div>
        </div>

        {!user ? (
          <div className="small dim" style={{ lineHeight: 1.45 }}>
            {t('You are using Aetherix without an account. Quick-Log links and AI reply paste work right now — sign in under Settings to unlock Personal AI Sync Keys.')}
          </div>
        ) : keyStatus.unavailable ? (
          <div className="small dim" style={{ lineHeight: 1.45 }}>
            {t('Connect to your server to manage webhook sync keys. Quick-Log links above still work anywhere.')}
          </div>
        ) : (
          <>
            <div className="ai-meta-line">
              <span>{t('Endpoint')}: <code>POST {webhookUrl}</code></span>
            </div>

            {freshKey ? (
              <div className="ai-secret-row" data-ai-fresh-key>
                <code className="ai-secret-code">{freshKey}</code>
                <Button size="sm" variant="primary" icon="copy" onClick={copyFreshKey}>
                  {t('Copy key')}
                </Button>
              </div>
            ) : keyStatus.configured ? (
              <div className="ai-meta-line" data-ai-key-status>
                <span className="ai-status-ok">{t('Sync Key active')}</span>
                <span>·</span>
                <code>{keyStatus.preview}</code>
              </div>
            ) : (
              <div className="ai-meta-line dim" data-ai-key-status>
                {keyStatus.loading ? t('Checking key status…') : t('No active Sync Key yet')}
              </div>
            )}

            <div className="ai-key-actions">
              <Button
                size="sm"
                variant={keyStatus.configured ? 'tinted' : 'primary'}
                icon="key"
                disabled={busyKey || keyStatus.loading}
                onClick={handleGenerateKey}
                data-generate-ai-key
              >
                {keyStatus.configured ? t('Rotate key') : t('Generate Sync Key')}
              </Button>
              {keyStatus.configured && (
                <Button
                  size="sm"
                  variant="danger"
                  icon="trash"
                  disabled={busyKey}
                  onClick={handleRevokeKey}
                  data-revoke-ai-key
                >
                  {t('Revoke')}
                </Button>
              )}
              <Button size="sm" variant="tinted" icon="link" onClick={copySchema} data-copy-openapi>
                {t('OpenAPI URL')}
              </Button>
              <Button
                size="sm"
                variant="plain"
                icon="reset"
                disabled={pulling || sync?.status === 'syncing'}
                onClick={handlePullNow}
              >
                {pulling ? t('Syncing…') : t('Sync now')}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="sheet-actions">
        <Button variant="primary" onClick={close}>{t('Done')}</Button>
      </div>
    </div>
  )
}

function AiMealPreviewSheet({ initialMeal, close }) {
  const update = useStore(s => s.update)
  const [name, setName] = useState(initialMeal?.name || '')
  const [category, setCategory] = useState(initialMeal?.category || 'General')
  const [unitLabel, setUnitLabel] = useState(initialMeal?.unitLabel || 'serving')
  const [kcalPerUnit, setKcalPerUnit] = useState(initialMeal?.kcalPerUnit || 250)
  const [qty, setQty] = useState(initialMeal?.qty || 1)
  const [entryDate, setEntryDate] = useState(initialMeal?.d || todayISO())
  const [saveToLibrary, setSaveToLibrary] = useState(Boolean(initialMeal?.saveToLibrary))
  const [err, setErr] = useState('')

  const totalKcal = calculateFoodKcal(kcalPerUnit, qty)
  const scaledNutrients = useMemo(() => {
    const ratio = initialMeal?.kcalPerUnit > 0 ? (Number(kcalPerUnit) || initialMeal.kcalPerUnit) / initialMeal.kcalPerUnit : 1
    return scaleNutrients(initialMeal?.nutrients || {}, (Number(qty) || 1) * ratio)
  }, [initialMeal, kcalPerUnit, qty])

  const sourceLabel = formatNutrientSourceLabel(initialMeal?.nutrientSource || 'ai:external', t)

  const confirmLog = () => {
    const cleanName = name.trim()
    if (!cleanName) {
      setErr(t('Enter a food name.'))
      return
    }
    const perUnitRatio = initialMeal?.kcalPerUnit > 0
      ? Math.max(0.1, (Number(kcalPerUnit) || initialMeal.kcalPerUnit) / initialMeal.kcalPerUnit)
      : 1
    const perUnitNutrients = scaleNutrients(initialMeal?.nutrients || {}, perUnitRatio)

    let linkedFoodId = null
    let libraryFoodToSave = null
    if (saveToLibrary) {
      const built = buildFoodItem({
        name: cleanName,
        category,
        unitLabel,
        kcalPerUnit,
        nutrients: perUnitNutrients,
        nutrientSource: initialMeal?.nutrientSource || 'ai:external',
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
      d: entryDate,
      foodId: linkedFoodId,
      name: cleanName,
      unitLabel,
      kcalPerUnit,
      qty,
      nutrients: perUnitNutrients,
      nutrientSource: initialMeal?.nutrientSource || 'ai:external',
      at: Date.now(),
    })

    if (error || !entry) {
      setErr(t(error || 'Check meal details.'))
      return
    }

    update(s => {
      if (libraryFoodToSave) {
        s.foods = sortFoods([...(Array.isArray(s.foods) ? s.foods : []), libraryFoodToSave])
      }
      s.foodLog = sortFoodLog([...(Array.isArray(s.foodLog) ? s.foodLog : []), entry])
    })

    close()
    nav('/food')
    toast(t('Logged {0} ({1} kcal)', entry.name, entry.kcal))
  }

  return (
    <div className="sheet-form" data-ai-meal-preview>
      <div>
        <div className="nutri-eyebrow">{sourceLabel}</div>
        <h3>{t('Confirm AI meal log')}</h3>
        <div className="ai-meta-line" style={{ marginTop: 4 }}>
          <span>{t(category)}</span>
          <span>·</span>
          <strong>{totalKcal} kcal</strong>
          <span>·</span>
          <span>P {scaledNutrients.proteinG}g</span>
          <span>·</span>
          <span>C {scaledNutrients.carbsG}g</span>
          <span>·</span>
          <span>F {scaledNutrients.fatG}g</span>
        </div>
      </div>

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="ai-preview-name">{t('Meal name')}</label>
        <TextField
          id="ai-preview-name"
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
          placeholder={t('e.g. Grilled Chicken Salad')}
        />
      </div>

      <div className="sheet-field">
        <span className="sheet-label">{t('Category')}</span>
        <div className="chips" role="group" aria-label={t('Food category presets')}>
          {FOOD_CATEGORIES.map(cat => (
            <button
              type="button"
              key={cat}
              className={'chip nocap' + (category === cat ? ' on' : '')}
              onClick={() => setCategory(cat)}
            >
              {t(cat)}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-row-2">
        <div className="sheet-field">
          <span className="sheet-label">{t('Calories per unit')}</span>
          <Stepper
            value={kcalPerUnit}
            step={10}
            min={1}
            max={5000}
            decimal={false}
            unit="kcal"
            ariaLabel={t('Calories per unit')}
            onChange={v => { setKcalPerUnit(v); setErr('') }}
          />
        </div>
        <div className="sheet-field">
          <span className="sheet-label">{t('Quantity ({0})', unitLabel)}</span>
          <Stepper
            value={qty}
            step={0.5}
            min={0.5}
            max={100}
            decimal
            unit={unitLabel}
            ariaLabel={t('Quantity')}
            onChange={v => { setQty(v); setErr('') }}
          />
        </div>
      </div>

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
          <label className="sheet-label" htmlFor="ai-preview-unit">{t('Serving unit')}</label>
          <TextField
            id="ai-preview-unit"
            value={unitLabel}
            onChange={e => setUnitLabel(e.target.value)}
            placeholder={t('serving')}
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

      {err && <div className="sheet-err" role="alert">{err}</div>}

      <div className="sheet-actions">
        <Button variant="primary" icon="check" onClick={confirmLog} data-confirm-ai-meal>
          {t('Log {0} kcal', totalKcal)}
        </Button>
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

export function openAiConnectSheet() {
  return ui().openSheet(close => <AiConnectSheet close={close} />)
}

export function openAiMealPreviewSheet(mealInput) {
  const normalized = normalizeAiMealInput(mealInput, mealInput?.aiProvider || 'external')
  if (!normalized) return null
  return ui().openSheet(close => <AiMealPreviewSheet initialMeal={normalized} close={close} />)
}

/* ---------- App-Level Deep-Link Listener (parallel to RoutineShare) ---------- */

let lastOpenedAi = { key: null, at: 0 }

export function openAiFoodUrl(url, now = Date.now()) {
  const parsed = parseAiFoodLink(url)
  if (!parsed) return false
  if (lastOpenedAi.key === parsed.rawKey && now - lastOpenedAi.at < 5000) return false
  lastOpenedAi = { key: parsed.rawKey, at: now }
  openAiMealPreviewSheet(parsed.meal)
  return true
}

const BOOT_AI_MEAL = (() => {
  try {
    const parsed = parseAiFoodLink(globalThis.location?.href || '')
    if (parsed) stripAiFoodParamsFromUrl()
    return parsed
  } catch {
    return null
  }
})()

export function useAiFoodLinks(ready) {
  const readyRef = useRef(ready)
  const pending = useRef(BOOT_AI_MEAL)
  readyRef.current = ready

  useEffect(() => {
    const handleUrl = url => {
      const parsed = parseAiFoodLink(url)
      if (!parsed) return false
      if (readyRef.current) {
        if (lastOpenedAi.key === parsed.rawKey && Date.now() - lastOpenedAi.at < 5000) return true
        lastOpenedAi = { key: parsed.rawKey, at: Date.now() }
        openAiMealPreviewSheet(parsed.meal)
      } else {
        pending.current = parsed
      }
      stripAiFoodParamsFromUrl()
      return true
    }

    const onHash = () => {
      handleUrl(window.location.href)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!ready || !pending.current) return
    const p = pending.current
    pending.current = null
    const now = Date.now()
    if (lastOpenedAi.key === p.rawKey && now - lastOpenedAi.at < 5000) return
    lastOpenedAi = { key: p.rawKey, at: now }
    setTimeout(() => openAiMealPreviewSheet(p.meal), 0)
  }, [ready])
}

export function _resetAiFoodLinksForTests() {
  lastOpenedAi = { key: null, at: 0 }
}
