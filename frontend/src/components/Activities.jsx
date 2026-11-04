import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, tn } from '../lib/i18n.js'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { addWeighIn } from '../lib/weigh-ins.js'
import { stampRestore } from '../lib/sync-merge.js'
import {
  SPORT_PRESETS,
  presetForKey,
  activityIconFor,
  weightToKg,
  resolveBodyWeightInfo,
  estimateActivityKcal,
  buildActivity,
  sortActivities,
  dailyActivitySummary,
  weeklyActivitySummary,
} from '../lib/activities.js'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import DateField from './DateField.jsx'
import { Button, NumberField, Segmented, Stepper, TextField } from './ui.jsx'

function ActivitySheet({ existing = null, defaultDate = null, close }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const ui = useUI.getState()

  const [sportKey, setSportKey] = useState(existing?.sportKey || 'custom')
  const [name, setName] = useState(existing?.name || '')
  const [date, setDate] = useState(existing?.d || defaultDate || todayISO())
  const [durationMin, setDurationMin] = useState(existing?.durationMin || 60)
  const [mode, setMode] = useState(existing?.mode === 'manual' ? 'manual' : 'met')
  const [met, setMet] = useState(existing?.met || 6)
  const [manualKcal, setManualKcal] = useState(existing?.kcal || 300)
  const [fallbackBw, setFallbackBw] = useState(null)
  const [note, setNote] = useState(existing?.note || '')
  const [err, setErr] = useState('')

  const bwInfo = resolveBodyWeightInfo(S, date)
  const typedBwKg = !bwInfo && fallbackBw > 0 ? weightToKg(fallbackBw, S.unit) : null
  const effectiveBwKg = bwInfo ? bwInfo.kg : typedBwKg
  const hours = Math.round(((Number(durationMin) || 0) / 60) * 100) / 100
  const estKcal = effectiveBwKg ? estimateActivityKcal(met, effectiveBwKg, durationMin) : 0

  const selectPreset = preset => {
    setSportKey(preset.key)
    setName(t(preset.label))
    setMet(preset.met)
    setMode('met')
    setErr('')
  }

  const selectCustom = () => {
    setSportKey('custom')
    setErr('')
  }

  const onSave = () => {
    const { activity, error } = buildActivity({
      id: existing?.id,
      name,
      sportKey,
      d: date,
      durationMin,
      mode,
      met,
      bwKg: effectiveBwKg,
      kcal: mode === 'manual' ? manualKcal : estKcal,
      note,
      at: Date.now(),
    }, S)

    if (error || !activity) {
      setErr(t(error || 'Check activity details.'))
      return
    }

    update(s => {
      if (!bwInfo && fallbackBw > 0) {
        addWeighIn(s, { d: date, w: fallbackBw })
      }
      const prev = Array.isArray(s.activities) ? s.activities : []
      const idx = prev.findIndex(x => x && x.id === activity.id)
      const next = idx >= 0
        ? prev.map((x, i) => (i === idx ? { ...(x._f ? { _f: x._f } : {}), ...activity } : x))
        : [...prev, activity]
      s.activities = sortActivities(next)
    })

    close()
    ui.toast(existing ? t('Activity updated') : t('Activity logged'))
  }

  const onDelete = () => {
    if (!existing) return
    const snapshot = JSON.parse(JSON.stringify(existing))
    update(s => {
      s.activities = (s.activities || []).filter(x => x && x.id !== existing.id)
    })
    close()
    ui.toast(t('Activity removed'), {
      action: t('Undo'),
      onAction: () => {
        useStore.getState().update(s => {
          const restored = stampRestore(snapshot)
          s.activities = sortActivities([...(s.activities || []).filter(x => x && x.id !== restored.id), restored])
          if (s.deleted?.activities) delete s.deleted.activities[restored.id]
        })
      },
    })
  }

  return (
    <div className="sheet-form" data-activity-sheet>
      <h3>{existing ? t('Edit activity') : t('Log activity')}</h3>

      <div className="sheet-field">
        <span className="sheet-label">{t('Sport or preset')}</span>
        <div className="chips" role="group" aria-label={t('Sport presets')}>
          <button
            type="button"
            className={'chip' + (sportKey === 'custom' ? ' on' : '')}
            onClick={selectCustom}
          >
            {t('Custom')}
          </button>
          {SPORT_PRESETS.map(p => (
            <button
              type="button"
              key={p.key}
              className={'chip ichip' + (sportKey === p.key ? ' on' : '')}
              onClick={() => selectPreset(p)}
            >
              <Icon name={p.icon} />
              <span>{t(p.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="act-name">{t('Activity name')}</label>
        <TextField
          id="act-name"
          placeholder={t('e.g. Badminton, Football, Trail run')}
          value={name}
          onChange={e => { setName(e.target.value); setErr('') }}
        />
      </div>

      <div className="sheet-row-2">
        <div className="sheet-field">
          <span className="sheet-label">{t('Date')}</span>
          <DateField value={date} max={todayISO()} onChange={d => { setDate(d); setErr('') }} label={t('Date')} />
        </div>
        <div className="sheet-field">
          <span className="sheet-label">{t('Duration (minutes)')}</span>
          <Stepper
            value={durationMin}
            step={5}
            min={1}
            max={1440}
            decimal={false}
            unit="min"
            ariaLabel={t('Duration in minutes')}
            onChange={v => { setDurationMin(v); setErr('') }}
          />
        </div>
      </div>

      <div className="sheet-field">
        <span className="sheet-label" id="act-kcal-mode">{t('Calories burned')}</span>
        <Segmented
          ariaLabelledby="act-kcal-mode"
          value={mode}
          onChange={v => { setMode(v); setErr('') }}
          options={[
            { value: 'met', label: t('Estimate (MET)') },
            { value: 'manual', label: t('Manual kcal') },
          ]}
        />
      </div>

      {mode === 'met' ? (
        <>
          <div className="sheet-field">
            <span className="sheet-label">{t('Intensity (MET)')}</span>
            <Stepper
              value={met}
              step={0.5}
              min={0.5}
              max={30}
              decimal
              unit="MET"
              ariaLabel={t('MET intensity')}
              onChange={v => { setMet(v); setErr('') }}
            />
          </div>

          {!bwInfo && (
            <div className="sheet-field">
              <label className="sheet-label" htmlFor="act-bw">
                {t('Body weight ({0}) for MET estimate', S.unit)}
              </label>
              <NumberField
                id="act-bw"
                nullable
                value={fallbackBw}
                placeholder={S.unit === 'lb' ? '160' : '72'}
                onChange={v => { setFallbackBw(v); setErr('') }}
              />
            </div>
          )}

          <div className="act-formula" data-met-preview>
            {effectiveBwKg ? (
              <>
                <div>
                  {t('MET')} <strong>{fmtNum(met)}</strong> × <strong>{fmtNum(effectiveBwKg)} kg</strong> × <strong>{fmtNum(hours)} h</strong> = <strong>{estKcal} kcal</strong>
                </div>
                {bwInfo && bwInfo.unit === 'lb' && (
                  <div>{t('From stored weight: {0} lb ({1})', fmtNum(bwInfo.raw), fmtDate(bwInfo.date, true))}</div>
                )}
              </>
            ) : (
              <div>{t('Enter your body weight above or switch to Manual kcal.')}</div>
            )}
          </div>
        </>
      ) : (
        <div className="sheet-field">
          <span className="sheet-label">{t('Calories burned (kcal)')}</span>
          <Stepper
            value={manualKcal}
            step={25}
            min={1}
            max={20000}
            decimal={false}
            unit="kcal"
            ariaLabel={t('Calories burned')}
            onChange={v => { setManualKcal(v); setErr('') }}
          />
        </div>
      )}

      <div className="sheet-field">
        <label className="sheet-label" htmlFor="act-note">{t('Note (optional)')}</label>
        <TextField
          id="act-note"
          placeholder={t('Court match, 5-a-side, tempo pace')}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {err && <div className="sheet-err" role="alert">{err}</div>}

      <div className="sheet-actions">
        <Button variant="primary" onClick={onSave}>
          {existing ? t('Save changes') : t('Save activity')}
        </Button>
        {existing && (
          <Button variant="danger" icon="trash" onClick={onDelete}>
            {t('Delete activity')}
          </Button>
        )}
        <Button variant="ghost" className="dim" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

export function openActivitySheet(existing = null, defaultDate = null) {
  return useUI.getState().openSheet(close => (
    <ActivitySheet existing={existing} defaultDate={defaultDate} close={close} />
  ))
}

export function ActivityRow({ a, onClick }) {
  const parts = [
    fmtDate(a.d, true),
    `${a.durationMin} min`,
    `${a.kcal} kcal`,
    a.mode === 'met' && a.met ? `MET ${fmtNum(a.met)}` : null,
    a.note || null,
  ].filter(Boolean)

  return (
    <div className="item" data-activity-row={a.id} {...tappable(onClick)}>
      <span className="lrow-i tint-orange" aria-hidden="true">
        <Icon name={activityIconFor(a)} />
      </span>
      <div className="grow">
        <div className="tt">{a.name}</div>
        <div className="ss">{parts.join(' · ')}</div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
  )
}

function workoutSideSummary(count, min) {
  if (!count) return t('0 workouts')
  const base = tn('{0} workout', '{0} workouts', count)
  return min > 0 ? `${base} · ${min} min` : base
}

export function HomeActivityCard({ S }) {
  const today = todayISO()
  const day = dailyActivitySummary(S, today)
  const week = weeklyActivitySummary(S, today)

  return (
    <div className="card" data-activity-home>
      <CardHead
        icon="figureRun"
        tint="var(--orange)"
        eyebrow={t('Calories burned')}
        title={t('Activities')}
        sub={day.count > 0
          ? `${tn('{0} activity', '{0} activities', day.count)} · ${day.durationMin} min`
          : t('Log sports, cardio, or recreational sessions')}
        action={
          <Button size="sm" variant="tinted" icon="plus" onClick={() => openActivitySheet()}>
            {t('Log')}
          </Button>
        }
      />

      <div className="act-grid">
        <div className="act-col">
          <div className="act-col-k">{t('Today')}</div>
          <div className="act-col-v">{day.kcal} kcal</div>
          <div className="act-col-s">
            {day.durationMin} min · {workoutSideSummary(day.workoutCount, day.workoutDurationMin)}
          </div>
        </div>
        <div className="act-col">
          <div className="act-col-k">{t('This week')}</div>
          <div className="act-col-v">{week.kcal} kcal</div>
          <div className="act-col-s">
            {week.durationMin} min · {workoutSideSummary(week.workoutCount, week.workoutDurationMin)}
          </div>
        </div>
      </div>

      {day.items.length > 0 && (
        <div className="act-inline-list">
          {day.items.map(a => (
            <button
              type="button"
              key={a.id}
              className="act-inline-row"
              onClick={() => openActivitySheet(a)}
            >
              <span className="lrow-i tint-orange" aria-hidden="true">
                <Icon name={activityIconFor(a)} />
              </span>
              <span className="act-inline-m">
                <span className="act-inline-t">{a.name}</span>
                <span className="act-inline-s">
                  {[
                    `${a.durationMin} min`,
                    a.mode === 'met' && a.met ? `MET ${fmtNum(a.met)}` : null,
                    a.note || null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="act-inline-v">{a.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatsActivityCard({ S }) {
  const today = todayISO()
  const day = dailyActivitySummary(S, today)
  const week = weeklyActivitySummary(S, today)

  return (
    <div className="card" data-activity-stats>
      <div className="row between">
        <div>
          <h2>
            {t('Activities & calories burned')}{' '}
            <span className="dim">· {t('Alongside workouts')}</span>
          </h2>
        </div>
        <Button size="sm" variant="tinted" icon="plus" onClick={() => openActivitySheet()}>
          {t('Log')}
        </Button>
      </div>

      <div className="act-grid">
        <div className="act-col">
          <div className="act-col-k">{t('Today')}</div>
          <div className="act-col-v">{day.kcal} kcal</div>
          <div className="act-col-s">
            {tn('{0} activity', '{0} activities', day.count)} ({day.durationMin} min) · {workoutSideSummary(day.workoutCount, day.workoutDurationMin)}
          </div>
        </div>
        <div className="act-col">
          <div className="act-col-k">{t('This week')}</div>
          <div className="act-col-v">{week.kcal} kcal</div>
          <div className="act-col-s">
            {tn('{0} activity', '{0} activities', week.count)} ({week.durationMin} min) · {workoutSideSummary(week.workoutCount, week.workoutDurationMin)}
          </div>
        </div>
      </div>
    </div>
  )
}
