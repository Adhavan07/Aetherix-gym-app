import { useMemo, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { EXIDX } from '../lib/exercises.js'
import CardHead from './CardHead.jsx'
import Icon from './Icon.jsx'
import { Button, Stepper } from './ui.jsx'
import {
  COACH_CATEGORIES,
  DIVISION_GROUPS,
  ENERGY_LEVELS,
  PHYSIQUE_BLUEPRINTS,
  SORENESS_LEVELS,
  applyCoachRestTimer,
  auditUserAgainstBlueprint,
  findBlueprint,
  findCoachRoutine,
  installCoachRoutine,
} from '../lib/physique-coaches.js'

const STATUS_LABEL = {
  aligned: 'Aligned',
  close: 'Close',
  gap: 'Gap',
}

function BlueprintCard({ bp, selected, active, installed, onSelect }) {
  const roleLine = bp.division
    ? `${bp.division} · ${bp.coachSlot}`
    : bp.goal
  return (
    <button
      type="button"
      className={'pc-pick-card' + (selected ? ' is-selected' : '')}
      data-blueprint-card={bp.id}
      aria-pressed={selected}
      onClick={() => onSelect(bp.id)}
    >
      <div className="pc-pick-top">
        <span className="pc-pick-name">{bp.name}</span>
        {installed && <span className="pc-pick-state">{t('Installed')}</span>}
        {!installed && active && <span className="pc-pick-state is-active">{t('Active')}</span>}
      </div>
      <div className="pc-pick-role">{t(roleLine)}</div>
      <div className="pc-pick-meta">
        <span>{bp.daysPerWeek}d/wk</span>
        <span aria-hidden="true">·</span>
        <span>{bp.repRange}</span>
        <span aria-hidden="true">·</span>
        <span>{bp.restSec}s {t('rest')}</span>
        <span aria-hidden="true">·</span>
        <span>{bp.targetSleepHours}h {t('sleep')}</span>
      </div>
    </button>
  )
}

export default function PhysiqueCoachesHub({ S, update, onOpenRoutine }) {
  const [category, setCategory] = useState('all')
  const [localSelectedId, setLocalSelectedId] = useState(
    () => S?.physiqueCoach?.activeId || 'coach_alberto_nunez'
  )

  const selectedId = S?.physiqueCoach?.activeId || localSelectedId
  const blueprint = useMemo(() => findBlueprint(selectedId), [selectedId])
  const installedRoutine = useMemo(() => findCoachRoutine(S, blueprint), [S, blueprint])
  const audit = useMemo(() => auditUserAgainstBlueprint(S, blueprint), [S, blueprint])

  const selectBlueprint = id => {
    setLocalSelectedId(id)
    if (update) {
      update(s => {
        s.physiqueCoach = {
          ...(s.physiqueCoach || {}),
          activeId: id,
          updatedAt: Date.now(),
        }
      })
    }
  }

  const updateRecoveryField = (field, val) => {
    if (!update) return
    update(s => {
      s.physiqueCoach = {
        ...(s.physiqueCoach || {}),
        activeId: blueprint.id,
        [field]: val,
        updatedAt: Date.now(),
      }
    })
  }

  const handleInstallRoutine = () => {
    if (!update) return
    let result = null
    update(s => {
      result = installCoachRoutine(s, blueprint.id)
    })
    if (result?.created) {
      useUI.getState().toast(t('Added “{0}” to your routines', blueprint.routineTemplate.name))
    } else if (result?.id && onOpenRoutine) {
      onOpenRoutine(result.id)
    } else {
      useUI.getState().toast(t('“{0}” is already in your routines', blueprint.routineTemplate.name))
    }
  }

  const handleSyncRest = () => {
    if (!update) return
    let sec = blueprint.restSec
    update(s => {
      sec = applyCoachRestTimer(s, blueprint.id)
    })
    useUI.getState().toast(t('Rest timer synced to {0}s for {1}', sec, blueprint.name))
  }

  const handleRestSecChange = nextSec => {
    if (!update) return
    update(s => {
      s.restSec = Math.max(15, Math.min(360, Math.round(Number(nextSec) || 90)))
    })
  }

  const inspirations = useMemo(
    () => PHYSIQUE_BLUEPRINTS.filter(b => b.category === 'inspiration'),
    []
  )
  const exceptionals = useMemo(
    () => PHYSIQUE_BLUEPRINTS.filter(b => b.category === 'exceptional'),
    []
  )

  const showDivisions = category === 'all' || category === 'division_coach'
  const showInspirations = category === 'all' || category === 'inspiration'
  const showExceptionals = category === 'all' || category === 'exceptional'

  const pc = S?.physiqueCoach || {}
  const sleepHours = Number.isFinite(Number(pc.sleepHours)) ? Number(pc.sleepHours) : 7.5
  const restDaysPerWeek = Number.isFinite(Number(pc.restDaysPerWeek)) ? Number(pc.restDaysPerWeek) : 2
  const soreness = pc.soreness || 'moderate'
  const energy = pc.energy || 'good'

  const auditRows = [
    { key: 'sessions', label: 'Weekly workouts', data: audit.checks.sessions },
    { key: 'sets', label: 'Hard sets (7d)', data: audit.checks.sets },
    { key: 'restTimer', label: 'Rest between sets', data: audit.checks.restTimer },
    { key: 'sleep', label: 'Sleep / night', data: audit.checks.sleep },
    { key: 'restDays', label: 'Rest days / week', data: audit.checks.restDays },
    { key: 'readiness', label: 'Soreness & readiness', data: audit.checks.readiness },
  ]

  return (
    <div className="pc-hub" data-physique-coaches>
      {/* Category filter bar */}
      <div className="pc-filters" role="group" aria-label={t('Filter physique blueprints')}>
        {COACH_CATEGORIES.map(c => (
          <button
            type="button"
            key={c.id}
            className={'sp-filter-btn' + (category === c.id ? ' on' : '')}
            aria-pressed={category === c.id}
            data-coach-filter={c.id}
            onClick={() => setCategory(c.id)}
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      {/* Roster Sections */}
      <div className="pc-roster" data-physique-roster>
        {showDivisions && (
          <div className="card pc-group-card" data-coach-group="division_coach">
            <CardHead
              icon="trophy"
              tint="var(--acc)"
              eyebrow={t('Division Coaches')}
              title={t('Open, Natural & Men’s Physique')}
              sub={t('Select a coach to study their workouts, rest intervals & recovery blueprint')}
            />
            <div className="pc-divisions">
              {DIVISION_GROUPS.map(group => {
                const coaches = group.coachIds
                  .map(id => PHYSIQUE_BLUEPRINTS.find(b => b.id === id))
                  .filter(Boolean)
                return (
                  <div key={group.division} className="pc-div-block" data-division-group={group.division}>
                    <div className="pc-div-head">
                      <span className="pc-div-name">{t(group.division)}</span>
                      <span className="pc-div-sub">{t(group.subtitle)}</span>
                    </div>
                    <div className="pc-pick-grid">
                      {coaches.map(bp => (
                        <BlueprintCard
                          key={bp.id}
                          bp={bp}
                          selected={bp.id === blueprint.id}
                          active={bp.id === selectedId}
                          installed={!!findCoachRoutine(S, bp)}
                          onSelect={selectBlueprint}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showInspirations && (
          <div className="card pc-group-card" data-coach-group="inspiration">
            <CardHead
              icon="star"
              tint="var(--orange)"
              eyebrow={t('Goal-Matched Studies')}
              title={t('Bodybuilding Inspirations')}
              sub={t('Match your physique goal to the champion method behind it')}
            />
            <div className="pc-pick-grid">
              {inspirations.map(bp => (
                <BlueprintCard
                  key={bp.id}
                  bp={bp}
                  selected={bp.id === blueprint.id}
                  active={bp.id === selectedId}
                  installed={!!findCoachRoutine(S, bp)}
                  onSelect={selectBlueprint}
                />
              ))}
            </div>
          </div>
        )}

        {showExceptionals && (
          <div className="card pc-group-card" data-coach-group="exceptional">
            <CardHead
              icon="crown"
              tint="var(--green)"
              eyebrow={t('Specialists')}
              title={t('Exceptionals')}
              sub={t('Elite athletic speed & Classic Physique Olympia conditioning blueprints')}
            />
            <div className="pc-pick-grid">
              {exceptionals.map(bp => (
                <BlueprintCard
                  key={bp.id}
                  bp={bp}
                  selected={bp.id === blueprint.id}
                  active={bp.id === selectedId}
                  installed={!!findCoachRoutine(S, bp)}
                  onSelect={selectBlueprint}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Coach / Inspiration Blueprint Detail */}
      <div className="card pc-detail-card" data-coach-blueprint={blueprint.id}>
        <CardHead
          icon={blueprint.routineTemplate.emoji || 'trophy'}
          tint="var(--acc)"
          eyebrow={t(blueprint.division ? `${blueprint.division} · ${blueprint.coachSlot}` : blueprint.goal)}
          title={blueprint.name}
          sub={t(blueprint.tagline)}
        />

        <p className="pc-philosophy">{t(blueprint.philosophy)}</p>

        <div className="pc-specs-grid">
          <div className="pc-spec">
            <span className="pc-spec-k">{t('Weekly Split')}</span>
            <span className="pc-spec-v">{t(blueprint.splitSummary)}</span>
          </div>
          <div className="pc-spec">
            <span className="pc-spec-k">{t('Intensity & Reps')}</span>
            <span className="pc-spec-v">{blueprint.repRange} · {blueprint.rirTarget}</span>
          </div>
          <div className="pc-spec">
            <span className="pc-spec-k">{t('Inter-set Rest')}</span>
            <span className="pc-spec-v">{blueprint.restSec}s {t('primary')} · {blueprint.finisherRestSec}s {t('finisher')}</span>
          </div>
          <div className="pc-spec">
            <span className="pc-spec-k">{t('Recovery Target')}</span>
            <span className="pc-spec-v">
              {blueprint.targetSleepHours}h {t('sleep')} · {blueprint.targetRestDays} {t('rest days/wk')} · {t('Deload q{0}w', blueprint.deloadWeeks)}
            </span>
          </div>
        </div>

        {/* Sample Workout Prescription */}
        <div className="pc-rx-block">
          <div className="pc-subhead">
            <span>{t('Blueprint Session')}: {blueprint.routineTemplate.name}</span>
            <span className="pc-rx-count">{blueprint.routineTemplate.ex.length} {t('exercises')}</span>
          </div>
          <div className="pc-rx-list">
            {blueprint.routineTemplate.ex.map((slot, idx) => {
              const exInfo = EXIDX[slot.id]
              return (
                <div key={`${slot.id}-${idx}`} className="pc-rx-row">
                  <span className="pc-rx-num">{idx + 1}</span>
                  <div className="pc-rx-copy">
                    <div className="pc-rx-name">{exInfo?.n || slot.id}</div>
                    {slot.note && <div className="pc-rx-note">{t(slot.note)}</div>}
                  </div>
                  <div className="pc-rx-dose">
                    {slot.sets} × {slot.reps} · {slot.restSec}s
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recovery & Nutrition Protocol */}
        <div className="pc-recovery-proto">
          <div className="pc-subhead">
            <span>{t('Rest, Recovery & Nutrition Keys')}</span>
          </div>
          <ul className="pc-bullets">
            {blueprint.recoveryHabits.map((h, i) => (
              <li key={i}>{t(h)}</li>
            ))}
          </ul>
          <div className="pc-proto-foot">
            <span><strong>{t('Nutrition')}:</strong> {t(blueprint.nutritionFocus)}</span>
            <span className="pc-caution">{t(blueprint.cautionNote)}</span>
          </div>
        </div>

        <div className="pc-actions">
          <Button
            variant="primary"
            icon={installedRoutine ? 'check' : 'plus'}
            onClick={handleInstallRoutine}
            data-install-coach-routine
          >
            {installedRoutine ? t('Open Routine') : t('Install Routine')}
          </Button>
          <Button
            variant="tinted"
            icon="timer"
            onClick={handleSyncRest}
            data-sync-coach-rest
          >
            {t('Sync Rest Timer ({0}s)', blueprint.restSec)}
          </Button>
        </div>
      </div>

      {/* Live Gap Check against their Workouts, Rest & Recovery */}
      <div className="card pc-audit-card" data-coach-gap-audit>
        <CardHead
          icon="target"
          tint={audit.score >= 80 ? 'var(--green)' : audit.score >= 55 ? 'var(--orange)' : 'var(--acc)'}
          eyebrow={t('Live Routine & Recovery Check')}
          title={t('{0} Alignment · {1}/100', blueprint.name, audit.score)}
          sub={t('Enter your rest & recovery habits below to compare against your logged workouts and {0}’s target', blueprint.name)}
        />

        <div className="pc-checkin-grid">
          <div className="pc-checkin-ctrl">
            <Stepper
              label={t('Sleep / night')}
              value={sleepHours}
              step={0.5}
              min={4}
              max={11}
              decimal
              unit="h"
              ariaLabel={t('Sleep hours per night')}
              onChange={v => updateRecoveryField('sleepHours', v)}
            />
          </div>
          <div className="pc-checkin-ctrl">
            <Stepper
              label={t('Rest days / week')}
              value={restDaysPerWeek}
              step={1}
              min={0}
              max={6}
              decimal={false}
              unit="d"
              ariaLabel={t('Rest days per week')}
              onChange={v => updateRecoveryField('restDaysPerWeek', v)}
            />
          </div>
          <div className="pc-checkin-ctrl">
            <Stepper
              label={t('Your set rest timer')}
              value={S?.restSec || 90}
              step={15}
              min={15}
              max={300}
              decimal={false}
              unit="s"
              ariaLabel={t('Rest timer seconds')}
              onChange={handleRestSecChange}
            />
          </div>
        </div>

        <div className="pc-toggles-row">
          <div className="pc-toggle-group">
            <span className="pc-spec-k">{t('Soreness')}</span>
            <div className="pc-seg-btns" role="group" aria-label={t('Soreness level')}>
              {SORENESS_LEVELS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  data-soreness={opt.value}
                  className={'sp-filter-btn' + (soreness === opt.value ? ' on' : '')}
                  aria-pressed={soreness === opt.value}
                  onClick={() => updateRecoveryField('soreness', opt.value)}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="pc-toggle-group">
            <span className="pc-spec-k">{t('Energy / Readiness')}</span>
            <div className="pc-seg-btns" role="group" aria-label={t('Energy level')}>
              {ENERGY_LEVELS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  data-energy={opt.value}
                  className={'sp-filter-btn' + (energy === opt.value ? ' on' : '')}
                  aria-pressed={energy === opt.value}
                  onClick={() => updateRecoveryField('energy', opt.value)}
                >
                  {t(opt.label)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pc-audit-table">
          {auditRows.map(row => (
            <div key={row.key} className="pc-audit-row" data-audit-row={row.key} data-audit-status={row.data.status}>
              <div className="pc-audit-k">{t(row.label)}</div>
              <div className="pc-audit-vals">
                <span>{t('Yours')}: <strong>{row.data.current}</strong></span>
                <span aria-hidden="true">·</span>
                <span>{t('Target')}: <strong>{row.data.target}</strong></span>
              </div>
              <span className={`pc-status is-${row.data.status}`}>
                {t(STATUS_LABEL[row.data.status])}
              </span>
            </div>
          ))}
        </div>

        <div className="pc-recs" data-coach-recommendations>
          <div className="pc-spec-k">{t('Actionable Adjustments')}</div>
          <ul className="pc-bullets">
            {audit.recommendations.map((rec, i) => (
              <li key={i}>{t(rec)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
