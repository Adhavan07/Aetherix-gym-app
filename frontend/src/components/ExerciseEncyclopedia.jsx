import { useDeferredValue, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXIDX } from '../lib/exercises.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from './Media.jsx'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'
import { addToRoutineSheet } from '../sheets.jsx'
import {
  DISCIPLINES,
  ENCYCLOPEDIA_SECTIONS,
  MOVEMENT_PATTERNS,
  ensureEncyclopediaExerciseRegistered,
  filterEncyclopedia,
  getEncyclopediaIndex,
  getEncyclopediaSummary,
  getMovementPatternVariations,
  resolveEncyclopediaDetail,
} from '../lib/encyclopedia.js'

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Adaptive']

export default function ExerciseEncyclopedia({ onBackToCatalog }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [section, setSection] = useState(0)
  const [disciplineId, setDisciplineId] = useState('')
  const [patternId, setPatternId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [equipment, setEquipment] = useState('')
  const [packOnly, setPackOnly] = useState(false)
  const [directoryOpen, setDirectoryOpen] = useState(true)
  const [benchmarksOpen, setBenchmarksOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [shown, setShown] = useState(40)

  const entries = useMemo(() => getEncyclopediaIndex(), [])
  const summary = useMemo(() => getEncyclopediaSummary(entries), [entries])

  const equipmentOptions = useMemo(() => {
    const counts = {}
    for (const e of entries) {
      if (e.equipment) counts[e.equipment] = (counts[e.equipment] || 0) + 1
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
  }, [entries])

  const visibleDisciplines = useMemo(
    () => (section ? DISCIPLINES.filter(d => d.section === section) : DISCIPLINES),
    [section]
  )

  const filtered = useMemo(
    () => filterEncyclopedia(entries, {
      section,
      disciplineId,
      patternId,
      difficulty,
      equipment,
      packOnly,
      query: deferredQuery,
    }),
    [entries, section, disciplineId, patternId, difficulty, equipment, packOnly, deferredQuery]
  )

  const selectedEntry = useMemo(
    () => (selectedId ? entries.find(e => e.id === selectedId) || null : null),
    [entries, selectedId]
  )

  const selectedDetail = useMemo(
    () => (selectedEntry ? resolveEncyclopediaDetail(selectedEntry, entries) : null),
    [selectedEntry, entries]
  )

  const patternVariations = useMemo(
    () => (selectedEntry ? getMovementPatternVariations(selectedEntry, entries).slice(0, 12) : []),
    [selectedEntry, entries]
  )

  const handleAddToRoutine = entry => {
    const ex = ensureEncyclopediaExerciseRegistered(entry, S, update)
    if (ex) addToRoutineSheet(ex)
  }

  const resetFilters = () => {
    setQuery('')
    setSection(0)
    setDisciplineId('')
    setPatternId('')
    setDifficulty('')
    setEquipment('')
    setPackOnly(false)
    setShown(40)
  }

  const selectDiscipline = id => {
    setDisciplineId(cur => (cur === id ? '' : id))
    setShown(40)
  }

  const hasActiveFilter = !!(query.trim() || section || disciplineId || patternId || difficulty || equipment || packOnly)

  if (selectedDetail) {
    const catalogEx = selectedDetail.catalogId ? EXIDX[selectedDetail.catalogId] : null
    return (
      <section className="enc-shell" aria-label={selectedDetail.name}>
        <div className="enc-detail-bar">
          <Button size="sm" variant="tinted" icon="chevronL" onClick={() => setSelectedId('')}>
            {t('Back to directory')}
          </Button>
          <Button size="sm" variant="primary" icon="plus" onClick={() => handleAddToRoutine(selectedDetail)}>
            {t('Add to Routine')}
          </Button>
        </div>

        <article className="enc-detail-card">
          <div className="enc-detail-head">
            {catalogEx && <Thumb ex={catalogEx} />}
            <div className="enc-detail-titleblock">
              <div className="enc-eyebrow enc-nums">
                {selectedDetail.id} · {selectedDetail.patternLabel} · {selectedDetail.variationLabel}
              </div>
              <h2 className="enc-detail-title">{selectedDetail.name}</h2>
              <div className="enc-meta-line">
                <span>{selectedDetail.category}</span>
                <span>·</span>
                <span>{selectedDetail.difficulty}</span>
                <span>·</span>
                <span className="capitalize">{selectedDetail.equipment}</span>
              </div>
            </div>
          </div>

          {patternVariations.length > 0 && (
            <div className="enc-variations">
              <div className="enc-subhead">
                {t('Same movement pattern ({0}) — distinct equipment variations', selectedDetail.patternLabel)}
              </div>
              <div className="enc-var-grid">
                {patternVariations.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className="enc-var-btn"
                    onClick={() => setSelectedId(v.id)}
                  >
                    <span className="enc-var-name">{v.name}</span>
                    <span className="enc-var-sub capitalize">{v.id} · {v.equipment}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <dl className="enc-fields">
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">01</span> {t('Unique exercise ID')}</dt>
              <dd className="enc-field-v enc-nums">{selectedDetail.id}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">02</span> {t('Exercise name')}</dt>
              <dd className="enc-field-v">{selectedDetail.name}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">03</span> {t('Alternative names')}</dt>
              <dd className="enc-field-v">{selectedDetail.alternativeNames.join(' · ')}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">04</span> {t('Exercise category')}</dt>
              <dd className="enc-field-v">{selectedDetail.category}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">05</span> {t('Primary target muscles')}</dt>
              <dd className="enc-field-v">{selectedDetail.primaryMuscles.join(', ')}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">06</span> {t('Secondary target muscles')}</dt>
              <dd className="enc-field-v">{selectedDetail.secondaryMuscles.join(', ')}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">07</span> {t('Equipment required')}</dt>
              <dd className="enc-field-v capitalize">{selectedDetail.equipment}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">08</span> {t('Difficulty level')}</dt>
              <dd className="enc-field-v">{selectedDetail.difficulty}</dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">09</span> {t('Starting position')}</dt>
              <dd className="enc-field-v">{selectedDetail.startingPosition}</dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">10</span> {t('Step-by-step execution')}</dt>
              <dd className="enc-field-v">
                <ol className="enc-steps">
                  {selectedDetail.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">11</span> {t('Breathing technique')}</dt>
              <dd className="enc-field-v">{selectedDetail.breathing}</dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">12</span> {t('Common mistakes')}</dt>
              <dd className="enc-field-v">
                <ul className="enc-bullets">
                  {selectedDetail.commonMistakes.map((m, idx) => <li key={idx}>{m}</li>)}
                </ul>
              </dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">13</span> {t('Safety considerations')}</dt>
              <dd className="enc-field-v enc-safety">{selectedDetail.safetyConsiderations}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">14</span> {t('Easier alternatives')}</dt>
              <dd className="enc-field-v">{selectedDetail.easierAlternatives.join(' · ')}</dd>
            </div>
            <div className="enc-field">
              <dt className="enc-field-k"><span className="enc-nums">15</span> {t('Advanced variations')}</dt>
              <dd className="enc-field-v">{selectedDetail.advancedVariations.join(' · ')}</dd>
            </div>
            <div className="enc-field enc-field-wide">
              <dt className="enc-field-k"><span className="enc-nums">16</span> {t('Related exercises')}</dt>
              <dd className="enc-field-v">{selectedDetail.relatedExercises.join(' · ')}</dd>
            </div>
          </dl>

          <div className="enc-detail-foot">
            <Button variant="primary" icon="plus" onClick={() => handleAddToRoutine(selectedDetail)}>
              {t('Add “{0}” to Routine', selectedDetail.name)}
            </Button>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className="enc-shell" aria-label={t('Worldwide Exercise Encyclopedia')}>
      <div className="enc-overview">
        <div className="enc-overview-top">
          <div>
            <div className="enc-eyebrow">{t('Worldwide Exercise Encyclopedia')}</div>
            <h2 className="enc-overview-title enc-nums">
              {fmtNum(summary.totalEntries)} {t('documented entries')} · {summary.coveredDisciplines}/{summary.totalDisciplines} {t('disciplines')}
            </h2>
            <div className="enc-meta-line enc-nums">
              <span>{t('Collection target')}: {fmtNum(summary.target)}+</span>
              <span>·</span>
              <span>{summary.uniquePatternCount} {t('movement patterns')}</span>
              <span>·</span>
              <span>{summary.flagshipCount} {t('Section 1–4 flagship entries')}</span>
            </div>
          </div>
          <div className="enc-overview-actions">
            <button
              type="button"
              className="enc-toggle-btn"
              aria-expanded={benchmarksOpen}
              onClick={() => setBenchmarksOpen(v => !v)}
            >
              {benchmarksOpen ? t('Hide benchmarks') : t('Reference benchmarks')}
            </button>
            {onBackToCatalog && (
              <button type="button" className="enc-toggle-btn" onClick={onBackToCatalog}>
                {t('Animated catalog')}
              </button>
            )}
          </div>
        </div>

        {benchmarksOpen && (
          <div className="enc-bench">
            <div className="enc-bench-note">
              {t('There is no single verified worldwide exercise total; published databases provide reference scales while equipment variations remain grouped by movement pattern to avoid double-counting.')}
            </div>
            <div className="enc-bench-grid enc-nums">
              {summary.benchmarks.map(b => (
                <div key={b.id} className="enc-bench-item">
                  <div className="enc-bench-name">{b.name}</div>
                  <div className="enc-bench-val">{fmtNum(b.count)}</div>
                </div>
              ))}
              <div className="enc-bench-item is-target">
                <div className="enc-bench-name">{t('Target / Indexed')}</div>
                <div className="enc-bench-val">{fmtNum(summary.target)}+ / {fmtNum(summary.totalEntries)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="enc-controls">
        <div className="search-row">
          <div className={'search' + (query ? ' has-clear' : '')}>
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="input"
              placeholder={t('Search exercise, ID, muscle, pattern or alias…')}
              value={query}
              onChange={e => { setQuery(e.target.value); setShown(40) }}
            />
            {query && (
              <button type="button" className="clear" aria-label={t('Clear')} onClick={() => { setQuery(''); setShown(40) }}>
                <Icon name="xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="enc-section-tabs" role="group" aria-label={t('Numbered collection sections')}>
          <button
            type="button"
            className={'enc-tab-btn' + (section === 0 ? ' is-on' : '')}
            aria-pressed={section === 0}
            onClick={() => { setSection(0); setShown(40) }}
          >
            {t('All 4 sections')}
          </button>
          {ENCYCLOPEDIA_SECTIONS.map(sec => (
            <button
              key={sec.id}
              type="button"
              className={'enc-tab-btn' + (section === sec.id ? ' is-on' : '')}
              aria-pressed={section === sec.id}
              onClick={() => { setSection(sec.id); setDisciplineId(''); setShown(40) }}
            >
              {sec.code} ({fmtNum(summary.sectionCounts[sec.id] || 0)})
            </button>
          ))}
        </div>

        <div className="enc-filter-grid">
          <label className="enc-select-wrap">
            <span className="enc-select-lbl">{t('Movement pattern')}</span>
            <select
              className="enc-select"
              aria-label={t('Movement pattern')}
              value={patternId}
              onChange={e => { setPatternId(e.target.value); setShown(40) }}
            >
              <option value="">{t('All movement patterns ({0})', MOVEMENT_PATTERNS.length)}</option>
              {MOVEMENT_PATTERNS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className="enc-select-wrap">
            <span className="enc-select-lbl">{t('Difficulty')}</span>
            <select
              className="enc-select"
              aria-label={t('Difficulty')}
              value={difficulty}
              onChange={e => { setDifficulty(e.target.value); setShown(40) }}
            >
              <option value="">{t('All difficulty levels')}</option>
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="enc-select-wrap">
            <span className="enc-select-lbl">{t('Equipment')}</span>
            <select
              className="enc-select"
              aria-label={t('Equipment')}
              value={equipment}
              onChange={e => { setEquipment(e.target.value); setShown(40) }}
            >
              <option value="">{t('All equipment')}</option>
              {equipmentOptions.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </label>

          <div className="enc-filter-toggles">
            <button
              type="button"
              className={'enc-tab-btn' + (packOnly ? ' is-on' : '')}
              aria-pressed={packOnly}
              onClick={() => { setPackOnly(v => !v); setShown(40) }}
            >
              {t('Section 1–4 packs only')}
            </button>
            {hasActiveFilter && (
              <button type="button" className="enc-tab-btn" onClick={resetFilters}>
                {t('Reset filters')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="enc-directory-box">
        <div className="enc-directory-head">
          <div>
            <div className="enc-subhead enc-nums">
              {t('44-Discipline Directory')} · {visibleDisciplines.length} {t('shown')}
            </div>
            <div className="enc-meta-line">
              {t('Select any discipline to focus results without losing pattern or difficulty filters.')}
            </div>
          </div>
          <button
            type="button"
            className="enc-toggle-btn"
            aria-expanded={directoryOpen}
            onClick={() => setDirectoryOpen(v => !v)}
          >
            {directoryOpen ? t('Collapse directory') : t('Show all 44 disciplines')}
          </button>
        </div>

        {directoryOpen && (
          <div className="enc-disc-grid">
            {visibleDisciplines.map(d => {
              const active = disciplineId === d.id
              const count = summary.disciplineCounts[d.id] || 0
              return (
                <button
                  key={d.id}
                  type="button"
                  className={'enc-disc-btn' + (active ? ' is-on' : '')}
                  aria-pressed={active}
                  onClick={() => selectDiscipline(d.id)}
                >
                  <div className="enc-disc-top enc-nums">
                    <span>{String(d.num).padStart(2, '0')}</span>
                    <span>{fmtNum(count)}</span>
                  </div>
                  <div className="enc-disc-name">{d.name}</div>
                  <div className="enc-disc-cov">{d.coverage}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="enc-results-head">
        <div className="enc-subhead enc-nums">
          {fmtNum(filtered.length)} {t('matching records')}
        </div>
        <div className="enc-meta-line">
          {t('Tap any entry for all 16 reference fields and linked movement-pattern variations.')}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="ico"><Icon name="magnifier" /></div>
          <div>{t('No matching encyclopedia entries')}</div>
          <div style={{ height: 10 }} />
          <Button size="sm" variant="tinted" onClick={resetFilters}>{t('Reset filters')}</Button>
        </div>
      ) : (
        <div className="enc-list">
          {filtered.slice(0, shown).map(entry => {
            const catEx = entry.catalogId ? EXIDX[entry.catalogId] : null
            return (
              <div key={entry.id} className="enc-row">
                {catEx && <Thumb ex={catEx} />}
                <button
                  type="button"
                  className="enc-row-main"
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="enc-row-id enc-nums">
                    {entry.id} · {String(entry.disciplineNum).padStart(2, '0')} {entry.disciplineName}
                    {entry.isFlagship ? ` · ${t('Section {0} Pack', entry.section)}` : ''}
                  </div>
                  <div className="enc-row-title">{entry.name}</div>
                  <div className="enc-row-meta">
                    <span>{entry.patternLabel}</span>
                    <span>·</span>
                    <span>{entry.difficulty}</span>
                    <span>·</span>
                    <span className="capitalize">{entry.equipment}</span>
                    <span>·</span>
                    <span>{entry.primaryMuscles.join(', ')}</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="enc-row-add"
                  aria-label={t('Add “{0}” to Routine', entry.name)}
                  onClick={() => handleAddToRoutine(entry)}
                >
                  <Icon name="plus" />
                  <span>{t('Add')}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > shown && (
        <div className="enc-more">
          <Button onClick={() => setShown(s => s + 40)}>
            {t('Show more ({0} remaining)', fmtNum(filtered.length - shown))}
          </Button>
        </div>
      )}
    </section>
  )
}
