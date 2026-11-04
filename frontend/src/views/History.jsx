import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t, tn } from '../lib/i18n.js'
import { WorkoutRow, DayNoteRow, workoutDetailSheet, logPastWorkoutSheet } from '../sheets.jsx'
import { ActivityRow, openActivitySheet } from '../components/Activities.jsx'
import { Button } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { dayNoteOf } from '../lib/day-notes.js'
import { reportSheet } from '../components/ReportSheet.jsx'

// Newest first: every workout, custom activities, and in between them the days off you left a note on (#261).
// A note on a day that has a workout too stays in the day sheet; the workout speaks for that day.
export function historyRows(S) {
  const workouts = S?.workouts || []
  const activities = S?.activities || []
  const trained = new Set(workouts.map(w => w?.d))
  const notes = Object.keys(S?.dayNotes || {}).filter(d => !trained.has(d)).map(d => ({ d, note: dayNoteOf(S, d) })).filter(x => x.note)
  const rows = [
    ...workouts.map(w => ({ d: w.d, w })),
    ...activities.map(a => ({ d: a.d, a })),
    ...notes,
  ]
  // Stable, so workouts and activities keep the order they are stored in within a day.
  return rows.map((r, i) => [r, i]).sort((a, b) => (a[0].d < b[0].d ? 1 : a[0].d > b[0].d ? -1 : b[1] - a[1])).map(([r]) => r)
}

export const HISTORY_PAGE = 60
let grownTo = HISTORY_PAGE

export default function History() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const workouts = S.workouts || []
  const activities = S.activities || []
  const rows = historyRows(S)
  const [shown, setShown] = useState(() => Math.max(HISTORY_PAGE, grownTo))
  const end = useRef(null)
  const more = rows.length > shown
  useEffect(() => { grownTo = Math.max(grownTo, shown) }, [shown])
  useEffect(() => {
    if (!more) return
    const IO = typeof window !== 'undefined' ? window.IntersectionObserver : undefined
    if (typeof IO !== 'function') { setShown(Infinity); return }
    const io = new IO(es => { if (es.some(e => e.isIntersecting)) setShown(n => n + HISTORY_PAGE) }, { rootMargin: '0px 0px 1200px 0px' })
    if (end.current) io.observe(end.current)
    return () => io.disconnect()
  }, [more, shown])

  const subText = activities.length > 0
    ? `${tn('{0} workout', '{0} workouts', workouts.length)} · ${tn('{0} activity', '{0} activities', activities.length)}`
    : tn('{0} workout', '{0} workouts', workouts.length)

  return <>
    <div className="hdr"><button className="iconbtn" data-back="/stats" data-tour="history-back" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('History')}</h1><div className="sub">{subText}</div></div>
      {workouts.length > 0 && <button className="iconbtn" onClick={reportSheet} aria-label={t('Performance report')} title={t('Performance report')}><Icon name="note" /></button>}</div>
    {rows.length > 0 && (
      <div className="history-actions">
        <Button icon="plus" data-tour="history-add" onClick={logPastWorkoutSheet}>{t('Log a past workout')}</Button>
        <Button icon="figureRun" variant="tinted" onClick={() => openActivitySheet()}>{t('Log activity')}</Button>
      </div>
    )}
    {rows.length ? <><div className="list">{(more ? rows.slice(0, shown) : rows).map((r, i) => r.w
      ? <WorkoutRow key={r.w.id} w={r.w} tour={i === 0 ? 'history-row' : undefined} onClick={() => workoutDetailSheet(r.w)} />
      : r.a
        ? <ActivityRow key={'act-' + r.a.id} a={r.a} onClick={() => openActivitySheet(r.a)} />
        : <DayNoteRow key={'note-' + r.d} iso={r.d} note={r.note} />)}</div>
      {more && <div ref={end} aria-hidden="true" style={{ height: 1 }} />}</>
      : <EmptyState icon="history" text={t('No workouts yet. Your first one will land here.')}>
        <Button variant="tinted" icon="plus" data-tour="history-add" onClick={logPastWorkoutSheet}>{t('Log a past workout')}</Button>
        <Button variant="plain" icon="figureRun" onClick={() => openActivitySheet()}>{t('Log activity')}</Button>
      </EmptyState>}
  </>
}

