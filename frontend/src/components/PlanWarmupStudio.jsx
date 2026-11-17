import { useEffect, useMemo, useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { beep, chime, unlock, alertBuzz, restSoundOf } from '../lib/sound.js'
import {
  WARMUP_MIN_SEC,
  WARMUP_MAX_SEC,
  WARMUP_STEP_SEC,
  resolveWarmupSequence,
  totalWarmupSec,
  isCustomWarmupPlan,
  getSwapOptionsForDrill,
  setWarmupSlotDurationInState,
  swapWarmupSlotInState,
  resetWarmupPlanInState,
} from '../lib/warmup.js'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { Button } from './ui.jsx'

function fmtMMSS(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function WarmupSwapSheet({ S, slotIdx, currentItem, onPick, close }) {
  const { curated, others } = useMemo(
    () => getSwapOptionsForDrill(currentItem.drillId, S),
    [currentItem.drillId, S]
  )

  const renderOption = d => (
    <button
      key={d.id}
      type="button"
      className="wu-swap-opt"
      data-warmup-swap-option={d.id}
      onClick={() => {
        onPick(d.id)
        close()
      }}
    >
      <div className="wu-swap-opt-top">
        <span className="wu-swap-opt-name">{t(d.name)}</span>
        <span className="wu-swap-opt-sec">{d.defaultSec}s</span>
      </div>
      <div className="wu-swap-opt-meta">
        <span>{t(d.focus)}</span>
        {d.isJointSafe && (
          <>
            <span aria-hidden="true">·</span>
            <span className="wu-safe-text">{t('Joint-friendly')}</span>
          </>
        )}
      </div>
      <div className="wu-swap-opt-cue">{t(d.cue)}</div>
    </button>
  )

  return (
    <div className="sheet-body wu-swap-sheet" data-warmup-swap-sheet>
      <div className="wu-swap-head">
        <div className="wu-swap-eyebrow">{t('Drill {0} replacement', slotIdx + 1)}</div>
        <h3 className="wu-swap-title">{t('Swap “{0}”', t(currentItem.drill.name))}</h3>
        <p className="wu-swap-sub">{t('Choose a dynamic movement or a lower-impact alternative below.')}</p>
      </div>

      <div className="wu-swap-section">
        <div className="wu-swap-sec-lbl">{t('Recommended alternatives')}</div>
        <div className="wu-swap-list">{curated.map(renderOption)}</div>
      </div>

      {others.length > 0 && (
        <div className="wu-swap-section">
          <div className="wu-swap-sec-lbl">{t('All dynamic warm-up drills')}</div>
          <div className="wu-swap-list">{others.map(renderOption)}</div>
        </div>
      )}

      <div className="sheet-actions">
        <Button variant="ghost" onClick={close}>
          {t('Cancel')}
        </Button>
      </div>
    </div>
  )
}

export default function PlanWarmupStudio({ S, update, onOpenRoutines }) {
  const sequence = useMemo(() => resolveWarmupSequence(S), [S])
  const totalSec = useMemo(() => totalWarmupSec(sequence), [sequence])
  const customized = useMemo(() => isCustomWarmupPlan(S), [S])

  const [status, setStatus] = useState('idle') // 'idle' | 'running' | 'paused' | 'done'
  const [activeIdx, setActiveIdx] = useState(0)
  const [secLeft, setSecLeft] = useState(() => sequence[0]?.sec ?? 30)

  const safeIdx = Math.min(activeIdx, Math.max(0, sequence.length - 1))
  const current = sequence[safeIdx] || sequence[0]
  const next = safeIdx + 1 < sequence.length ? sequence[safeIdx + 1] : null

  const seqRef = useRef(sequence)
  const idxRef = useRef(safeIdx)
  const soundRef = useRef({ sound: S?.sound !== false, kind: restSoundOf(S) })
  seqRef.current = sequence
  idxRef.current = safeIdx
  soundRef.current = { sound: S?.sound !== false, kind: restSoundOf(S) }

  useEffect(() => {
    if (status !== 'running') return undefined
    const id = setInterval(() => {
      setSecLeft(prev => {
        if (prev > 1) {
          const nextSec = prev - 1
          if (nextSec <= 3) beep(soundRef.current.sound, 660, 0.08)
          return nextSec
        }
        const seq = seqRef.current
        const curIdx = idxRef.current
        const nextIdx = curIdx + 1
        chime(soundRef.current.sound, soundRef.current.kind)
        alertBuzz(140)
        if (nextIdx >= seq.length) {
          setStatus('done')
          return 0
        }
        setActiveIdx(nextIdx)
        return seq[nextIdx].sec
      })
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  const elapsedSec = useMemo(() => {
    if (status === 'done') return totalSec
    let sum = 0
    for (let i = 0; i < safeIdx; i++) sum += sequence[i]?.sec || 0
    if (current) sum += Math.max(0, current.sec - secLeft)
    return Math.min(totalSec, sum)
  }, [status, totalSec, sequence, safeIdx, current, secLeft])

  const totalRemainingSec = Math.max(0, totalSec - elapsedSec)
  const progressPct = totalSec > 0 ? Math.min(100, Math.round((elapsedSec / totalSec) * 100)) : 0

  const handleStart = () => {
    unlock(S?.sound !== false)
    if (status === 'done') {
      setActiveIdx(0)
      setSecLeft(sequence[0]?.sec ?? 30)
    }
    setStatus('running')
  }

  const handlePause = () => setStatus('paused')

  const handlePrev = () => {
    const prevIdx = Math.max(0, safeIdx - 1)
    setActiveIdx(prevIdx)
    setSecLeft(sequence[prevIdx]?.sec ?? 30)
    if (status === 'done') setStatus('paused')
  }

  const handleSkip = () => {
    const nextIdx = safeIdx + 1
    if (nextIdx >= sequence.length) {
      setStatus('done')
      setSecLeft(0)
      return
    }
    setActiveIdx(nextIdx)
    setSecLeft(sequence[nextIdx].sec)
  }

  const handleReset = () => {
    setStatus('idle')
    setActiveIdx(0)
    setSecLeft(sequence[0]?.sec ?? 30)
  }

  const jumpToSlot = idx => {
    if (status === 'running' || idx < 0 || idx >= sequence.length) return
    setActiveIdx(idx)
    setSecLeft(sequence[idx].sec)
    if (status === 'done') setStatus('idle')
  }

  const adjustSlotDuration = (idx, delta) => {
    const target = sequence[idx]
    if (!target) return
    const nextSec = Math.max(WARMUP_MIN_SEC, Math.min(WARMUP_MAX_SEC, target.sec + delta))
    if (nextSec === target.sec) return
    update(s => {
      setWarmupSlotDurationInState(s, idx, nextSec)
    })
    if (status === 'idle' && idx === safeIdx) {
      setSecLeft(nextSec)
    }
  }

  const applySwap = (idx, newDrillId) => {
    let nextSeq = sequence
    update(s => {
      nextSeq = swapWarmupSlotInState(s, idx, newDrillId)
    })
    const replaced = nextSeq[idx]
    if (replaced && idx === safeIdx && status !== 'running') {
      setSecLeft(replaced.sec)
      if (status === 'done') setStatus('idle')
    }
    if (replaced?.drill) {
      useUI.getState().toast(t('Swapped to {0}', t(replaced.drill.name)))
    }
  }

  const openSwapSheet = idx => {
    const item = sequence[idx]
    if (!item) return
    useUI.getState().openSheet(close => (
      <WarmupSwapSheet
        S={S}
        slotIdx={idx}
        currentItem={item}
        onPick={newDrillId => applySwap(idx, newDrillId)}
        close={close}
      />
    ))
  }

  const handleRestoreDefault = () => {
    let def = null
    update(s => {
      def = resetWarmupPlanInState(s)
    })
    setStatus('idle')
    setActiveIdx(0)
    setSecLeft(def?.[0]?.sec ?? 30)
    useUI.getState().toast(t('Restored 5:00 JVR Round dynamic warm-up'))
  }

  const statusText =
    status === 'running'
      ? t('Active · Drill {0} of {1}', safeIdx + 1, sequence.length)
      : status === 'paused'
        ? t('Paused · Drill {0} of {1}', safeIdx + 1, sequence.length)
        : status === 'done'
          ? t('Warm-up complete')
          : t('Ready · {0} drills for JVR Round', sequence.length)

  return (
    <div className="wu-wrap" data-warmup-panel>
      <div
        className={'card wu-timer-card is-' + status}
        data-warmup-timer
      >
        <div className="wu-timer-top">
          <div>
            <div className="wu-phase" data-warmup-status>{statusText}</div>
            <h3 className="wu-active-name" data-warmup-active-name>
              {status === 'done'
                ? t('Primed & Ready for High-Intensity Circuits')
                : t(current.drill.name)}
            </h3>
          </div>
          <div className="wu-total-meta">
            <span>{fmtMMSS(totalRemainingSec)} {t('left')}</span>
            <span className="wu-meta-sub">{fmtMMSS(totalSec)} {t('total')}</span>
          </div>
        </div>

        <div className="wu-clock-row">
          <div className="wu-clock" data-warmup-clock>
            {fmtMMSS(secLeft)}
          </div>
          {status !== 'done' && (
            <div className="wu-active-copy">
              <div className="wu-active-meta">
                <span>{t(current.drill.focus)}</span>
                <span aria-hidden="true">·</span>
                <span>{t('JVR prep: {0}', t(current.drill.jvrCarryover))}</span>
              </div>
              <p className="wu-active-cue" data-warmup-active-cue>
                {t(current.drill.cue)}
              </p>
            </div>
          )}
        </div>

        <div className="wu-progress-track" aria-hidden="true">
          <span className="wu-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {status !== 'done' && current.needsCaution && current.safeSwap && (
          <div className="wu-caution-bar" data-warmup-caution>
            <div className="wu-caution-msg">
              <Icon name="warning" size={15} />
              <span>
                <strong>
                  {current.triggeredLabels.length > 0
                    ? t('Careful ({0})', current.triggeredLabels.join(', '))
                    : t('Joint load caution')}
                  :
                </strong>{' '}
                {t('Swap to {0}', t(current.safeSwap.name))}
              </span>
            </div>
            <button
              type="button"
              className="wu-caution-btn"
              data-warmup-quick-swap
              onClick={() => applySwap(safeIdx, current.safeSwap.id)}
            >
              {t('Use swap')}
            </button>
          </div>
        )}

        <div className="wu-next-line">
          {status === 'done' ? (
            <span>{t('All {0} dynamic mobility drills complete. Ready for Round 1.', sequence.length)}</span>
          ) : next ? (
            <span>
              <strong>{t('Next up')}:</strong> #{safeIdx + 2} {t(next.drill.name)} ({next.sec}s)
            </span>
          ) : (
            <span>{t('Final drill — transition smoothly into your first working set.')}</span>
          )}
        </div>

        <div className="wu-controls">
          {status !== 'running' ? (
            <Button
              variant="primary"
              icon="play"
              onClick={handleStart}
              data-warmup-start
            >
              {status === 'paused' ? t('Resume') : status === 'done' ? t('Run again') : t('Start 5:00 Warm-up')}
            </Button>
          ) : (
            <Button
              variant="tinted"
              icon="pause"
              onClick={handlePause}
              data-warmup-pause
            >
              {t('Pause')}
            </Button>
          )}
          <Button
            variant="ghost"
            icon="chevronLeft"
            disabled={safeIdx === 0 || status === 'done'}
            onClick={handlePrev}
            data-warmup-prev
          >
            {t('Prev')}
          </Button>
          <Button
            variant="ghost"
            icon="skipForward"
            disabled={status === 'done'}
            onClick={handleSkip}
            data-warmup-skip
          >
            {t('Skip')}
          </Button>
          <Button
            variant="ghost"
            icon="reset"
            onClick={handleReset}
            data-warmup-reset
          >
            {t('Reset')}
          </Button>
        </div>

        {status === 'done' && onOpenRoutines && (
          <div className="wu-done-cta">
            <Button variant="tinted" icon="bolt" onClick={onOpenRoutines} data-warmup-open-routines>
              {t('Open JVR Round in Routines')}
            </Button>
          </div>
        )}
      </div>

      <div className="card wu-list-card" data-warmup-list>
        <div className="wu-list-head">
          <CardHead
            icon="stretch"
            tint="var(--acc)"
            eyebrow={t('JVR Round & HIIT Prep')}
            title={t('Dynamic Stretching Sequence')}
            sub={t('{0} total across {1} movements · Adjust seconds or swap any drill', fmtMMSS(totalSec), sequence.length)}
          />
          {customized && (
            <Button
              size="sm"
              variant="ghost"
              icon="reset"
              onClick={handleRestoreDefault}
              data-warmup-reset-plan
            >
              {t('Restore 5:00 default')}
            </Button>
          )}
        </div>

        <div className="wu-slots">
          {sequence.map((item, idx) => {
            const isCurrent = status !== 'done' && idx === safeIdx
            const isDone = status === 'done' || idx < safeIdx
            return (
              <div
                key={`${item.drillId}-${idx}`}
                data-warmup-slot={idx}
                className={
                  'wu-slot-row' +
                  (isCurrent ? ' is-current' : '') +
                  (isDone ? ' is-done' : '')
                }
              >
                <button
                  type="button"
                  className="wu-slot-lead"
                  disabled={status === 'running'}
                  onClick={() => jumpToSlot(idx)}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="wu-slot-num">
                    {isDone ? <Icon name="check" size={14} /> : String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="wu-slot-copy">
                    <div className="wu-slot-title">{t(item.drill.name)}</div>
                    <div className="wu-slot-meta">
                      <span>{t(item.drill.focus)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t(item.drill.jvrCarryover)}</span>
                      {item.needsCaution && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="wu-slot-warn">
                            {item.triggeredLabels.length > 0
                              ? t('Careful ({0})', item.triggeredLabels.join(', '))
                              : t('High impact')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                <div className="wu-slot-actions">
                  <div className="wu-dur-ctrl" aria-label={t('Duration for {0}', t(item.drill.name))}>
                    <button
                      type="button"
                      className="wu-dur-btn"
                      aria-label={t('Decrease {0} duration', t(item.drill.name))}
                      disabled={status === 'running' || item.sec <= WARMUP_MIN_SEC}
                      onClick={() => adjustSlotDuration(idx, -WARMUP_STEP_SEC)}
                      data-warmup-dec={idx}
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <span className="wu-dur-val" data-warmup-dur={idx}>{item.sec}s</span>
                    <button
                      type="button"
                      className="wu-dur-btn"
                      aria-label={t('Increase {0} duration', t(item.drill.name))}
                      disabled={status === 'running' || item.sec >= WARMUP_MAX_SEC}
                      onClick={() => adjustSlotDuration(idx, WARMUP_STEP_SEC)}
                      data-warmup-inc={idx}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="wu-swap-btn"
                    disabled={status === 'running'}
                    onClick={() => openSwapSheet(idx)}
                    data-warmup-swap={idx}
                    aria-label={t('Swap {0}', t(item.drill.name))}
                  >
                    <Icon name="swap" size={15} />
                    <span>{t('Swap')}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
