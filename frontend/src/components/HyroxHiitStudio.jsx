import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtNum, todayISO } from '../lib/format.js'
import { buildActivity, LB_TO_KG, resolveBodyWeightKg, sortActivities, weightToKg } from '../lib/activities.js'
import { logWeighIn } from '../lib/bodyweight.js'
import { beep, chime, unlock, alertBuzz } from '../lib/sound.js'
import {
  PAIN_AREAS,
  MEDICATION_FLAGS,
  HYROX_DIVISIONS,
  HIIT_PRESETS,
  computeBmi,
  evaluateSafetyProfile,
  adaptHyroxStations,
  totalHiitSeconds,
  estimateSessionKcal,
} from '../lib/conditioning.js'
import { adaptJvrStations, BATMAN_SUBLIFTS } from '../lib/jvr-round.js'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { Button, Check, NumberField, Stepper, Switch, TextArea, TextField } from './ui.jsx'

function fmtMMSS(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function cmToFeetInches(cm) {
  const n = Number(cm)
  if (!Number.isFinite(n) || n <= 0) return ''
  const totalInches = Math.round(n / 2.54)
  const ft = Math.floor(totalInches / 12)
  const inch = totalInches % 12
  return `${ft}' ${inch}"`
}

function displayWeightFromKg(kg, unit) {
  if (!(Number(kg) > 0)) return null
  const val = unit === 'lb' ? Number(kg) / LB_TO_KG : Number(kg)
  return Math.round(val * 10) / 10
}

function buildSafetyNote(safety) {
  const parts = []
  if (safety.bmiInfo) parts.push(`BMI ${safety.bmiInfo.bmi}`)
  if (safety.painAreas.length > 0) parts.push(`Pain care: ${safety.painAdjustments.map(p => p.label).join(', ')}`)
  if (safety.medicationFlags.length > 0 || safety.medicationsText) parts.push('Med precautions active')
  return parts.join(' · ')
}

export function HealthSafetySheet({ reason = '', onSaved = null, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const hp = S.healthProfile && typeof S.healthProfile === 'object' ? S.healthProfile : {}

  const initialKg = Number(hp.weightKg) > 0 ? Number(hp.weightKg) : resolveBodyWeightKg(S)
  const [weightInput, setWeightInput] = useState(() => displayWeightFromKg(initialKg, unit))
  const [heightCm, setHeightCm] = useState(() => (Number(hp.heightCm) > 0 ? Number(hp.heightCm) : null))
  const [manualBmi, setManualBmi] = useState(null)
  const [medFlags, setMedFlags] = useState(() => (Array.isArray(hp.medicationFlags) ? hp.medicationFlags : []))
  const [medText, setMedText] = useState(() => String(hp.medications || ''))
  const [painAreas, setPainAreas] = useState(() => (Array.isArray(hp.painAreas) ? hp.painAreas : []))
  const [painNotes, setPainNotes] = useState(() => String(hp.painNotes || ''))
  const [confirmed, setConfirmed] = useState(() => Boolean(hp.clearanceConfirmed))
  const [err, setErr] = useState('')

  const liveWeightKg = weightInput > 0 ? weightToKg(weightInput, unit) : null
  const calcBmi = computeBmi(liveWeightKg, heightCm)
  const activeBmiVal = manualBmi != null && manualBmi > 0 ? Math.round(manualBmi * 10) / 10 : calcBmi?.bmi ?? null
  const liveBmi = useMemo(() => {
    if (calcBmi && (manualBmi == null || Math.abs(manualBmi - calcBmi.bmi) < 0.05)) return calcBmi
    if (!(activeBmiVal > 0)) return null
    let category = 'Normal weight'
    let tone = 'good'
    let impactCaution = false
    if (activeBmiVal < 18.5) {
      category = 'Underweight'
      tone = 'warn'
    } else if (activeBmiVal >= 30) {
      category = 'Obese (High joint load)'
      tone = 'danger'
      impactCaution = true
    } else if (activeBmiVal >= 25) {
      category = 'Overweight'
      tone = 'warn'
    }
    return { bmi: activeBmiVal, category, tone, impactCaution }
  }, [calcBmi, manualBmi, activeBmiVal])
  const previewSafety = useMemo(
    () =>
      evaluateSafetyProfile(
        {
          weightKg: liveWeightKg,
          heightCm,
          bmi: activeBmiVal,
          medicationFlags: medFlags,
          medications: medText,
          painAreas,
          painNotes,
          clearanceConfirmed: confirmed,
        },
        S
      ),
    [liveWeightKg, heightCm, activeBmiVal, medFlags, medText, painAreas, painNotes, confirmed, S]
  )

  const toggleMed = key => {
    setMedFlags(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
    setErr('')
  }

  const togglePain = key => {
    setPainAreas(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
    setErr('')
  }

  const onSave = () => {
    if (!(liveWeightKg > 0 && liveWeightKg >= 20 && liveWeightKg <= 400)) {
      setErr(t('Enter a valid body weight ({0}) before starting.', unit))
      return
    }
    if (!(Number(heightCm) >= 80 && Number(heightCm) <= 260)) {
      setErr(t('Enter a valid height in cm (80–260 cm) to calculate BMI.'))
      return
    }
    if (!confirmed) {
      setErr(t('Confirm the pre-workout medical & pain safety check below before starting.'))
      return
    }

    const nextProfile = {
      weightKg: liveWeightKg,
      heightCm: Math.round(Number(heightCm) * 10) / 10,
      bmi: activeBmiVal,
      medications: medText.trim().slice(0, 240),
      medicationFlags: medFlags,
      painAreas,
      painNotes: painNotes.trim().slice(0, 240),
      clearanceConfirmed: true,
      updatedAt: Date.now(),
    }

    update(s => {
      const prevKg = Number(s.healthProfile?.weightKg) || 0
      s.healthProfile = nextProfile
      if (Math.abs(prevKg - liveWeightKg) >= 0.05) {
        logWeighIn(s, weightInput)
      }
    })

    close()
    ui.toast(t('Health & safety profile saved'))
    if (typeof onSaved === 'function') onSaved(nextProfile)
  }

  return (
    <div className="sheet-form sp-safety-sheet" data-health-safety-sheet>
      <div className="sp-safety-sheet-head">
        <span className="lrow-i sp-safety-ic" aria-hidden="true">
          <Icon name="shield" />
        </span>
        <div>
          <h3>{t('Pre-Workout Health & Safety Check')}</h3>
          <p className="sp-sheet-copy">
            {reason || t('Required before Hyrox or HIIT intervals so pacing, calorie burn, and joint-safe swaps protect your body.')}
          </p>
        </div>
      </div>

      <div className="sp-metrics-row">
        <div className="sheet-field">
          <label className="sheet-label" htmlFor="hs-weight">
            {t('Weight ({0})', unit)} <span className="req">*</span>
          </label>
          <NumberField
            id="hs-weight"
            nullable
            value={weightInput}
            placeholder={unit === 'lb' ? '160' : '72'}
            onChange={v => {
              setWeightInput(v)
              setManualBmi(null)
              setErr('')
            }}
          />
        </div>

        <div className="sheet-field">
          <label className="sheet-label" htmlFor="hs-height">
            {t('Height (cm)')} <span className="req">*</span>
          </label>
          <NumberField
            id="hs-height"
            nullable
            decimal={false}
            value={heightCm}
            placeholder="175"
            onChange={v => {
              setHeightCm(v)
              setManualBmi(null)
              setErr('')
            }}
          />
          {Number(heightCm) >= 80 && Number(heightCm) <= 260 && (
            <span className="sp-field-hint">{cmToFeetInches(heightCm)}</span>
          )}
        </div>

        <div className="sheet-field">
          <label className="sheet-label" htmlFor="hs-bmi">
            {t('BMI')}
          </label>
          <div className={'sp-bmi-input-wrap' + (liveBmi ? ` is-${liveBmi.tone}` : '')} data-live-bmi>
            <NumberField
              id="hs-bmi"
              nullable
              value={activeBmiVal}
              placeholder="23.5"
              onChange={v => {
                setManualBmi(v)
                setErr('')
              }}
            />
            <span className="sp-bmi-cat">
              {liveBmi ? t(liveBmi.category) : t('Auto-calculated')}
            </span>
          </div>
        </div>
      </div>

      <div className="sheet-field">
        <div className="sp-field-top">
          <span className="sheet-label">{t('Medical medications')}</span>
          {(medFlags.length > 0 || medText) && (
            <button
              type="button"
              className="sp-clear-link"
              onClick={() => {
                setMedFlags([])
                setMedText('')
              }}
            >
              {t('Clear')}
            </button>
          )}
        </div>
        <div className="sp-flag-grid" role="group" aria-label={t('Medication categories')}>
          {MEDICATION_FLAGS.map(m => {
            const on = medFlags.includes(m.key)
            return (
              <button
                type="button"
                key={m.key}
                data-med-flag={m.key}
                aria-pressed={on}
                className={'sp-flag-btn' + (on ? ' on is-med' : '')}
                onClick={() => toggleMed(m.key)}
              >
                <Icon name={on ? 'check' : 'plus'} size={14} />
                <span>{t(m.label)}</span>
              </button>
            )
          })}
        </div>
        <TextField
          id="hs-meds"
          placeholder={t('List specific medications/doses or write "None" (e.g. Metoprolol 25mg, Inhaler)')}
          value={medText}
          onChange={e => {
            setMedText(e.target.value)
            setErr('')
          }}
        />
      </div>

      <div className="sheet-field">
        <div className="sp-field-top">
          <span className="sheet-label">{t('Painful or injured areas')}</span>
          {(painAreas.length > 0 || painNotes) && (
            <button
              type="button"
              className="sp-clear-link"
              onClick={() => {
                setPainAreas([])
                setPainNotes('')
              }}
            >
              {t('Clear')}
            </button>
          )}
        </div>
        <div className="sp-flag-grid" role="group" aria-label={t('Painful body areas')}>
          {PAIN_AREAS.map(p => {
            const on = painAreas.includes(p.key)
            return (
              <button
                type="button"
                key={p.key}
                data-pain-area={p.key}
                aria-pressed={on}
                className={'sp-flag-btn' + (on ? ' on is-pain' : '')}
                onClick={() => togglePain(p.key)}
              >
                <Icon name={on ? 'warning' : 'plus'} size={14} />
                <span>{t(p.label)}</span>
              </button>
            )
          })}
        </div>
        <TextArea
          id="hs-pain-notes"
          rows={2}
          placeholder={t('Describe side, severity, or movements to avoid (e.g. right knee soreness on deep squats)')}
          value={painNotes}
          onChange={e => {
            setPainNotes(e.target.value)
            setErr('')
          }}
        />
      </div>

      {previewSafety.warnings.length > 0 && (
        <div className="sp-safety-preview" data-safety-warnings-preview>
          <div className="sp-safety-prev-title">
            <Icon name="warning" size={16} />
            <span>{t('Active coaching cautions & automatic swaps')}</span>
          </div>
          <ul>
            {previewSafety.warnings.map((w, i) => (
              <li key={i}>
                <strong>{t(w.title)}:</strong> {t(w.detail)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={'sp-confirm-row' + (confirmed ? ' on' : '')}
        role="button"
        tabIndex={0}
        onClick={() => {
          setConfirmed(v => !v)
          setErr('')
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setConfirmed(v => !v)
            setErr('')
          }
        }}
      >
        <div className="sp-confirm-copy">
          <div className="sp-confirm-t">{t('Safety readiness confirmation')}</div>
          <div className="sp-confirm-s">
            {t('I verify my weight, height, medications, and painful areas are current. I will slow down or stop immediately on sharp pain, dizziness, or chest discomfort.')}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <Switch
            checked={confirmed}
            onChange={v => {
              setConfirmed(v)
              setErr('')
            }}
            aria-label={t('Confirm pre-workout safety readiness')}
            data-safety-confirm-switch
          />
        </div>
      </div>

      {err && (
        <div className="sheet-err" role="alert">
          {err}
        </div>
      )}

      <div className="sheet-actions">
        <Button variant="primary" icon="shield" onClick={onSave}>
          {t('Save & confirm safety profile')}
        </Button>
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

export function openHealthSafetySheet(options = {}) {
  return useUI.getState().openSheet(close => (
    <HealthSafetySheet reason={options.reason || ''} onSaved={options.onSaved || null} close={close} />
  ))
}

export function HealthSafetyBanner({ S, safety, compact = false }) {
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const shownW = displayWeightFromKg(safety.weightKg, unit)

  return (
    <div
      className={'card sp-safety-banner' + (safety.complete ? ' is-ready' : ' is-incomplete')}
      data-health-safety-banner
    >
      <div className="sp-sb-top">
        <div className="sp-sb-lead">
          <span
            className={'lrow-i ' + (safety.complete ? 'sp-sb-ic-ok' : 'sp-sb-ic-warn')}
            aria-hidden="true"
          >
            <Icon name={safety.complete ? 'shield' : 'warning'} />
          </span>
          <div>
            <div className="sp-sb-eyebrow">
              {safety.complete ? t('Safety check verified') : t('Pre-workout safety check required')}
            </div>
            <div className="sp-sb-title">
              {safety.complete ? (
                <>
                  <span>{shownW ? `${fmtNum(shownW)} ${unit}` : '—'}</span>
                  <span> · {fmtNum(safety.heightCm)} cm</span>
                  <span> · BMI {safety.bmiInfo ? `${fmtNum(safety.bmiInfo.bmi)} (${t(safety.bmiInfo.category)})` : '—'}</span>
                </>
              ) : (
                <span>{t('Missing: {0}', safety.missingFields.join(', '))}</span>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant={safety.complete ? 'tinted' : 'primary'}
          icon={safety.complete ? 'pencil' : 'shield'}
          onClick={() => openHealthSafetySheet()}
          data-open-safety-sheet
        >
          {safety.complete ? t('Edit check') : t('Complete check')}
        </Button>
      </div>

      {!compact && safety.warnings.length > 0 && (
        <div className="sp-sb-alerts" data-active-safety-alerts>
          {safety.warnings.slice(0, 4).map((w, idx) => (
            <div key={idx} className={'sp-sb-alert is-' + w.level}>
              <strong>{t(w.title)}:</strong> <span>{t(w.detail)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function HyroxWorkoutPanel({ S, safety, onLaunchTimer }) {
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const [divisionKey, setDivisionKey] = useState('open_men')
  const [doneStations, setDoneStations] = useState([])
  const [durationMin, setDurationMin] = useState(65)

  const division = HYROX_DIVISIONS.find(d => d.key === divisionKey) || HYROX_DIVISIONS[1]
  const stations = useMemo(() => adaptHyroxStations(safety), [safety])
  const bwKg = safety.weightKg || 72
  const estKcal = estimateSessionKcal(9.0, bwKg, durationMin * 60)
  const swappedCount = stations.filter(s => s.needsSwap).length

  const toggleStation = key => {
    setDoneStations(prev => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]))
  }

  const runWithSafety = action => {
    if (!safety.complete) {
      openHealthSafetySheet({
        reason: t('Complete your Weight, Height, BMI, medications & painful-area check before starting Hyrox.'),
        onSaved: action,
      })
      return
    }
    action()
  }

  const doLogHyrox = savedProfile => {
    const activeSafety = savedProfile ? evaluateSafetyProfile(savedProfile, S) : safety
    const activeBw = activeSafety.weightKg || bwKg
    const note = [
      `${division.label}`,
      `${doneStations.length}/8 stations`,
      buildSafetyNote(activeSafety),
    ]
      .filter(Boolean)
      .join(' · ')

    const { activity, error } = buildActivity(
      {
        name: `Hyrox (${division.label})`,
        sportKey: 'hyrox',
        d: todayISO(),
        durationMin,
        mode: 'met',
        met: 9.0,
        bwKg: activeBw,
        note,
      },
      S
    )
    if (error || !activity) {
      ui.toast(t(error || 'Could not log Hyrox session.'))
      return
    }
    update(s => {
      s.activities = sortActivities([...(Array.isArray(s.activities) ? s.activities : []), activity])
    })
    ui.toast(t('Hyrox session logged ({0} kcal)', activity.kcal))
  }

  return (
    <div className="sp-hyrox-wrap" data-hyrox-panel>
      <div className="card sp-hyrox-hero">
        <CardHead
          icon="bolt"
          tint="var(--orange)"
          eyebrow={t('Hybrid fitness racing · 8 × 1 km + 8 Stations')}
          title={t('Hyrox Race & Station Planner')}
          sub={
            swappedCount > 0
              ? t('{0} stations automatically adapted for your painful areas / joint protection.', swappedCount)
              : t('Standard race order: alternate 1 km endurance runs with functional power stations.')
          }
        />

        <div className="sp-div-row" role="group" aria-label={t('Hyrox division')}>
          {HYROX_DIVISIONS.map(d => (
            <button
              type="button"
              key={d.key}
              className={'sp-filter-btn' + (divisionKey === d.key ? ' on' : '')}
              aria-pressed={divisionKey === d.key}
              onClick={() => setDivisionKey(d.key)}
            >
              {t(d.label)}
            </button>
          ))}
        </div>

        <div className="sp-hyrox-specs">
          <div className="sp-spec-cell">
            <span className="k">{t('Sled Push / Pull')}</span>
            <span className="v">{division.sledPushKg} / {division.sledPullKg} kg</span>
          </div>
          <div className="sp-spec-cell">
            <span className="k">{t('Farmers Carry')}</span>
            <span className="v">{division.carryKg} kg</span>
          </div>
          <div className="sp-spec-cell">
            <span className="k">{t('Sandbag Lunges')}</span>
            <span className="v">{division.lungeKg} kg</span>
          </div>
          <div className="sp-spec-cell">
            <span className="k">{t('Wall Balls')}</span>
            <span className="v">{division.wallBallReps} × {division.wallBallKg} kg</span>
          </div>
        </div>

        <div className="sp-hyrox-actions">
          <div className="sp-dur-box">
            <span className="sp-dur-lbl">{t('Est. session duration')}</span>
            <Stepper
              value={durationMin}
              step={5}
              min={15}
              max={180}
              decimal={false}
              unit="min"
              ariaLabel={t('Hyrox session duration in minutes')}
              onChange={setDurationMin}
            />
          </div>
          <div className="sp-hyrox-cta">
            <div className="sp-kcal-est">
              {t('Est. burn')}: <strong>{estKcal} kcal</strong> ({fmtNum(bwKg)} kg · 9.0 MET)
            </div>
            <div className="sp-btn-pair">
              <Button
                variant="tinted"
                icon="timer"
                onClick={() => runWithSafety(() => onLaunchTimer('hyrox_emom'))}
              >
                {t('Hyrox 45/15 Timer')}
              </Button>
              <Button
                variant="primary"
                icon="check"
                onClick={() => runWithSafety(() => doLogHyrox())}
                data-log-hyrox
              >
                {t('Log Hyrox ({0}/8)', doneStations.length)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="card sp-stations-card">
        <div className="sp-stations-head">
          <div>
            <div className="sp-matrix-title">{t('8 Race Stations')}</div>
            <div className="sp-matrix-sub">{t('Check stations as you finish; pain alerts show safe substitutions automatically.')}</div>
          </div>
          {doneStations.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setDoneStations([])}>
              {t('Reset checks')}
            </Button>
          )}
        </div>

        <div className="sp-stations-list">
          {stations.map(st => {
            const checked = doneStations.includes(st.key)
            return (
              <div
                key={st.key}
                data-hyrox-station={st.key}
                className={
                  'sp-station-row' +
                  (checked ? ' is-done' : '') +
                  (st.needsSwap ? ' has-caution' : '')
                }
              >
                <Check
                  checked={checked}
                  onChange={() => toggleStation(st.key)}
                  label={t('Mark {0} complete', st.name)}
                />
                <div className="sp-station-body">
                  <div className="sp-station-top">
                    <span className="sp-station-num">#{st.num}</span>
                    <span className="sp-station-name">{t(st.name)}</span>
                    <span className="sp-station-focus">{t(st.focus)}</span>
                  </div>
                  <div className="sp-station-run">
                    <Icon name="figureRun" size={13} />
                    <span>{t('Before station')}: {t(st.runNote)}</span>
                  </div>
                  {st.needsSwap && (
                    <div className="sp-station-swap" data-station-swap={st.key}>
                      <Icon name="warning" size={14} />
                      <span>
                        <strong>
                          {st.triggeredLabels.length > 0
                            ? t('Careful ({0})', st.triggeredLabels.join(', '))
                            : t('Joint load caution')}
                          :
                        </strong>{' '}
                        {t(st.safeSwap)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function HiitWorkoutAndTimerPanel({ S, safety, initialPresetKey = 'tabata' }) {
  const update = useStore(s => s.update)
  const ui = useUI.getState()

  const defaultPreset = HIIT_PRESETS.find(p => p.key === initialPresetKey) || HIIT_PRESETS[0]
  const [presetKey, setPresetKey] = useState(defaultPreset.key)
  const [warmupSec, setWarmupSec] = useState(defaultPreset.warmupSec)
  const [workSec, setWorkSec] = useState(defaultPreset.workSec)
  const [restSec, setRestSec] = useState(defaultPreset.restSec)
  const [rounds, setRounds] = useState(defaultPreset.rounds)
  const [cooldownSec, setCooldownSec] = useState(defaultPreset.cooldownSec)
  const [met, setMet] = useState(defaultPreset.met)

  // Live timer state: 'idle' | 'running' | 'paused' | 'done'
  const [status, setStatus] = useState('idle')
  // Phase: 'warmup' | 'work' | 'rest' | 'cooldown'
  const [phase, setPhase] = useState('warmup')
  const [round, setRound] = useState(1)
  const [secLeft, setSecLeft] = useState(defaultPreset.warmupSec || defaultPreset.workSec)
  const [elapsedSec, setElapsedSec] = useState(0)

  const soundRef = useRef({ enabled: S.sound !== false, kind: S.restSound })
  soundRef.current = { enabled: S.sound !== false, kind: S.restSound }

  const applyPreset = p => {
    setPresetKey(p.key)
    setWarmupSec(p.warmupSec)
    setWorkSec(p.workSec)
    setRestSec(p.restSec)
    setRounds(p.rounds)
    setCooldownSec(p.cooldownSec)
    setMet(p.met)
    setStatus('idle')
    setRound(1)
    setElapsedSec(0)
    if (p.warmupSec > 0) {
      setPhase('warmup')
      setSecLeft(p.warmupSec)
    } else {
      setPhase('work')
      setSecLeft(p.workSec)
    }
  }

  // Sync incoming preset switch (e.g. "Hyrox 45/15 Timer")
  useEffect(() => {
    const target = HIIT_PRESETS.find(p => p.key === initialPresetKey)
    if (target && status === 'idle') {
      applyPreset(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPresetKey])

  const resetTimer = () => {
    setStatus('idle')
    setRound(1)
    setElapsedSec(0)
    if (warmupSec > 0) {
      setPhase('warmup')
      setSecLeft(warmupSec)
    } else {
      setPhase('work')
      setSecLeft(workSec)
    }
  }

  // Keep idle display synchronized with stepper changes
  const updateConfig = (setter, value) => {
    setter(value)
    setPresetKey('custom')
    if (status === 'idle') {
      setRound(1)
      setElapsedSec(0)
    }
  }

  useEffect(() => {
    if (status !== 'idle') return
    if (warmupSec > 0) {
      setPhase('warmup')
      setSecLeft(warmupSec)
    } else {
      setPhase('work')
      setSecLeft(workSec)
    }
  }, [warmupSec, workSec, status])

  const advancePhase = () => {
    const { enabled, kind } = soundRef.current
    if (phase === 'warmup') {
      chime(enabled, kind)
      alertBuzz(180)
      setPhase('work')
      setRound(1)
      setSecLeft(workSec)
      return
    }
    if (phase === 'work') {
      chime(enabled, kind)
      alertBuzz(180)
      if (round < rounds && restSec > 0) {
        setPhase('rest')
        setSecLeft(restSec)
        return
      }
      if (round < rounds && restSec === 0) {
        setRound(r => r + 1)
        setPhase('work')
        setSecLeft(workSec)
        return
      }
      if (cooldownSec > 0) {
        setPhase('cooldown')
        setSecLeft(cooldownSec)
        return
      }
      alertBuzz([120, 80, 200])
      setStatus('done')
      setSecLeft(0)
      return
    }
    if (phase === 'rest') {
      chime(enabled, kind)
      alertBuzz(180)
      setRound(r => r + 1)
      setPhase('work')
      setSecLeft(workSec)
      return
    }
    if (phase === 'cooldown') {
      chime(enabled, kind)
      alertBuzz([120, 80, 200])
      setStatus('done')
      setSecLeft(0)
    }
  }

  useEffect(() => {
    if (status !== 'running') return undefined
    const id = window.setInterval(() => {
      setElapsedSec(e => e + 1)
      setSecLeft(prev => {
        const next = prev - 1
        if (next >= 1 && next <= 3) {
          beep(soundRef.current.enabled, next === 1 ? 880 : 660, 0.14, 0)
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === 'running' && secLeft <= 0) {
      advancePhase()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secLeft, status])

  const beginRunning = () => {
    unlock(S.sound !== false)
    if (status === 'done') {
      resetTimer()
    }
    setStatus('running')
  }

  const handleStart = () => {
    if (!safety.complete) {
      openHealthSafetySheet({
        reason: t('Enter and confirm your Weight, Height, BMI, medications & painful areas before starting HIIT intervals.'),
        onSaved: () => beginRunning(),
      })
      return
    }
    beginRunning()
  }

  const activePreset = HIIT_PRESETS.find(p => p.key === presetKey)
  const jvrStations = useMemo(() => adaptJvrStations(safety), [safety])
  const isJvrMode = presetKey === 'jvr_round'
  const jvrIdx = Math.min(Math.max(1, round), jvrStations.length) - 1
  const currentJvrStation = isJvrMode ? jvrStations[jvrIdx] : null
  const nextJvrStation = isJvrMode && jvrIdx + 1 < jvrStations.length ? jvrStations[jvrIdx + 1] : null

  const totalSec = totalHiitSeconds({ warmupSec, workSec, restSec, rounds, cooldownSec })
  const pct = totalSec > 0 ? Math.min(100, Math.round((elapsedSec / totalSec) * 100)) : 0
  const bwKg = safety.weightKg || 72
  const estTotalKcal = estimateSessionKcal(met, bwKg, totalSec)
  const logDurationSec = elapsedSec >= 60 ? elapsedSec : totalSec
  const logMinutes = Math.max(1, Math.round(logDurationSec / 60))

  const phaseLabel =
    status === 'done'
      ? t('Session Complete')
      : phase === 'warmup'
        ? t('Warm-up')
        : phase === 'work'
          ? t('Work Interval')
          : phase === 'rest'
            ? t('Recovery Rest')
            : t('Cool-down')

  const doLogHiit = savedProfile => {
    const activeSafety = savedProfile ? evaluateSafetyProfile(savedProfile, S) : safety
    const activeBw = activeSafety.weightKg || bwKg
    const label = activePreset ? activePreset.name : `Custom ${workSec}/${restSec} × ${rounds}`
    const note = [label, `${rounds} rounds (${workSec}s/${restSec}s)`, buildSafetyNote(activeSafety)]
      .filter(Boolean)
      .join(' · ')

    const { activity, error } = buildActivity(
      {
        name: `HIIT: ${label}`,
        sportKey: 'hiit',
        d: todayISO(),
        durationMin: logMinutes,
        mode: 'met',
        met,
        bwKg: activeBw,
        note,
      },
      S
    )
    if (error || !activity) {
      ui.toast(t(error || 'Could not log HIIT session.'))
      return
    }
    update(s => {
      s.activities = sortActivities([...(Array.isArray(s.activities) ? s.activities : []), activity])
    })
    ui.toast(t('HIIT workout logged ({0} min · {1} kcal)', logMinutes, activity.kcal))
  }

  const handleLogHiit = () => {
    if (!safety.complete) {
      openHealthSafetySheet({
        reason: t('Confirm your Weight, Height & Health Safety check before logging HIIT conditioning.'),
        onSaved: doLogHiit,
      })
      return
    }
    doLogHiit()
  }

  return (
    <div className="sp-hiit-wrap" data-hiit-panel>
      {/* Live HIIT Interval Timer Console */}
      <div className={'card sp-timer-card is-phase-' + (status === 'done' ? 'done' : phase)} data-hiit-timer>
        <div className="sp-timer-top">
          <div>
            <div className="sp-timer-phase" data-timer-phase>{phaseLabel}</div>
            <div className="sp-timer-round">
              {t('Round {0} of {1}', Math.min(round, rounds), rounds)} · {activePreset ? t(activePreset.name) : t('Custom HIIT')}
            </div>
          </div>
          <div className="sp-timer-meta">
            <span>{fmtMMSS(totalSec)} {t('total')}</span>
            <span>~{estTotalKcal} kcal</span>
          </div>
        </div>

        <div className="sp-timer-clock" data-timer-clock>
          {fmtMMSS(secLeft)}
        </div>

        <div className="sp-goal-bar sp-timer-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>

        {currentJvrStation && (
          <div className={'sp-jvr-cue' + (currentJvrStation.needsSwap ? ' has-caution' : '')} data-jvr-active-station>
            <div className="sp-jvr-cue-top">
              <span className="sp-jvr-cue-k">
                {t('Station {0}/14 · {1} · 40s rest', currentJvrStation.num, currentJvrStation.prescription)}
              </span>
              {nextJvrStation && (
                <span className="sp-jvr-cue-next">
                  {t('Next')}: #{nextJvrStation.num} {t(nextJvrStation.name)}
                </span>
              )}
            </div>
            <div className="sp-jvr-cue-name">{t(currentJvrStation.name)}</div>
            <div className="sp-jvr-cue-focus">{t(currentJvrStation.focus)}</div>
            {currentJvrStation.id === 'jvr_batman_complex' && (
              <div className="sp-jvr-batman-seq" data-jvr-batman-cue>
                {BATMAN_SUBLIFTS.map((m, idx) => (
                  <span key={m.key}>
                    {idx > 0 ? ' -> ' : ''}
                    {t(m.name)} ({m.r})
                  </span>
                ))}
              </div>
            )}
            {currentJvrStation.needsSwap && (
              <div className="sp-station-swap">
                <Icon name="warning" size={14} />
                <span>
                  <strong>
                    {currentJvrStation.triggeredLabels.length > 0
                      ? t('Careful ({0})', currentJvrStation.triggeredLabels.join(', '))
                      : t('Joint load caution')}
                    :
                  </strong>{' '}
                  {t(currentJvrStation.safeSwap)}
                </span>
              </div>
            )}
          </div>
        )}

        {activePreset && !currentJvrStation && (
          <div className="sp-timer-drills">
            <strong>{safety.preferLowImpact ? t('Joint-safe drill focus') : t('Interval drills')}:</strong>{' '}
            <span>
              {safety.preferLowImpact && activePreset.highImpact
                ? t('Use stationary bike, Rowing, or controlled step-ups instead of jumps or hard sprints.')
                : activePreset.drills.join(' · ')}
            </span>
          </div>
        )}

        <div className="sp-timer-controls">
          {status !== 'running' ? (
            <Button
              variant="primary"
              icon="play"
              onClick={handleStart}
              data-timer-start
            >
              {status === 'paused' ? t('Resume') : status === 'done' ? t('Restart') : t('Start Timer')}
            </Button>
          ) : (
            <Button
              variant="tinted"
              icon="pause"
              onClick={() => setStatus('paused')}
              data-timer-pause
            >
              {t('Pause')}
            </Button>
          )}
          <Button
            variant="ghost"
            icon="skipForward"
            disabled={status === 'idle' || status === 'done'}
            onClick={advancePhase}
            data-timer-skip
          >
            {t('Skip')}
          </Button>
          <Button
            variant="ghost"
            icon="reset"
            onClick={resetTimer}
            data-timer-reset
          >
            {t('Reset')}
          </Button>
          <Button
            variant="tinted"
            icon="check"
            onClick={handleLogHiit}
            data-timer-log
          >
            {t('Log ({0} min)', logMinutes)}
          </Button>
        </div>
      </div>

      {/* Presets & Custom Interval Config */}
      <div className="card sp-hiit-config">
        <CardHead
          icon="stopwatch"
          tint="var(--acc)"
          eyebrow={t('Interval protocols')}
          title={t('HIIT Workout Presets & Builder')}
          sub={
            safety.preferLowImpact
              ? t('Joint protection active — Low-Impact Joint Saver or low-impact ergs are recommended.')
              : t('Pick a proven protocol or adjust work, rest, warm-up, and rounds below.')
          }
        />

        <div className="sp-preset-grid" data-hiit-presets>
          {HIIT_PRESETS.map(p => {
            const on = presetKey === p.key
            const pTotal = totalHiitSeconds(p)
            const recommended = safety.preferLowImpact && p.key === 'joint_saver'
            return (
              <button
                type="button"
                key={p.key}
                data-hiit-preset={p.key}
                className={'sp-preset-btn' + (on ? ' on' : '') + (recommended ? ' is-recommended' : '')}
                aria-pressed={on}
                onClick={() => applyPreset(p)}
              >
                <div className="sp-preset-top">
                  <span className="sp-preset-name">{t(p.name)}</span>
                  <span className="sp-preset-time">{Math.round(pTotal / 60)}m</span>
                </div>
                <div className="sp-preset-sub">
                  {p.workSec}s / {p.restSec}s × {p.rounds} · {p.met} MET
                </div>
                {recommended && (
                  <div className="sp-preset-tag">{t('Recommended for your joints / BMI')}</div>
                )}
                {safety.preferLowImpact && p.highImpact && (
                  <div className="sp-preset-caution">{t('Modify jumps -> bike/row')}</div>
                )}
              </button>
            )
          })}
        </div>

        <div className="sp-steppers-grid">
          <Stepper
            label={t('Warm-up (sec)')}
            value={warmupSec}
            step={30}
            min={0}
            max={600}
            decimal={false}
            unit="s"
            disabled={status === 'running'}
            onChange={v => updateConfig(setWarmupSec, v)}
          />
          <Stepper
            label={t('Work (sec)')}
            value={workSec}
            step={5}
            min={5}
            max={600}
            decimal={false}
            unit="s"
            disabled={status === 'running'}
            onChange={v => updateConfig(setWorkSec, v)}
          />
          <Stepper
            label={t('Rest (sec)')}
            value={restSec}
            step={5}
            min={0}
            max={300}
            decimal={false}
            unit="s"
            disabled={status === 'running'}
            onChange={v => updateConfig(setRestSec, v)}
          />
          <Stepper
            label={t('Rounds')}
            value={rounds}
            step={1}
            min={1}
            max={30}
            decimal={false}
            disabled={status === 'running'}
            onChange={v => updateConfig(setRounds, v)}
          />
          <Stepper
            label={t('Cool-down (sec)')}
            value={cooldownSec}
            step={30}
            min={0}
            max={600}
            decimal={false}
            unit="s"
            disabled={status === 'running'}
            onChange={v => updateConfig(setCooldownSec, v)}
          />
          <Stepper
            label={t('Intensity (MET)')}
            value={met}
            step={0.5}
            min={3}
            max={15}
            decimal
            unit="MET"
            disabled={status === 'running'}
            onChange={v => updateConfig(setMet, v)}
          />
        </div>
      </div>

      {isJvrMode && (
        <div className="card sp-jvr-queue" data-jvr-hiit-queue>
          <CardHead
            icon="bolt"
            tint="var(--orange)"
            eyebrow={t('14-Station Circuit · 40s rest between exercises')}
            title={t('JVR Round Station Sequence')}
            sub={t('Tap any station while paused or idle to jump directly to that round.')}
          />
          <div className="sp-stations-list">
            {jvrStations.map((st, idx) => {
              const active = idx === jvrIdx
              return (
                <button
                  type="button"
                  key={st.id}
                  data-jvr-station={st.id}
                  aria-current={active ? 'step' : undefined}
                  disabled={status === 'running'}
                  onClick={() => {
                    setRound(st.num)
                    setPhase('work')
                    setSecLeft(workSec)
                  }}
                  className={
                    'sp-station-row sp-jvr-row' +
                    (active ? ' is-current' : '') +
                    (st.needsSwap ? ' has-caution' : '')
                  }
                >
                  <span className="sp-station-num">#{st.num}</span>
                  <div className="sp-station-body">
                    <div className="sp-station-top">
                      <span className="sp-station-name">{t(st.name)}</span>
                      <span className="sp-station-focus">{t(st.prescription)}</span>
                    </div>
                    <div className="sp-station-run">
                      <span>{t(st.focus)}</span>
                    </div>
                    {st.needsSwap && (
                      <div className="sp-station-swap">
                        <Icon name="warning" size={14} />
                        <span>
                          <strong>
                            {st.triggeredLabels.length > 0
                              ? t('Careful ({0})', st.triggeredLabels.join(', '))
                              : t('Joint load caution')}
                            :
                          </strong>{' '}
                          {t(st.safeSwap)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
