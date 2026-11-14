import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, tn } from '../lib/i18n.js'
import { fmtNum, todayISO } from '../lib/format.js'
import { estimateActivityKcal } from '../lib/activities.js'
import {
  SPORT_PILLARS,
  SPORTS_RANKING,
  sportByKey,
  matchActivityToSport,
  filterAndSortSports,
  combineSportsCoverage,
  weeklyHybridSportsSummary,
  riskLabel,
  pillarLevelLabel,
} from '../lib/sports.js'
import Icon from '../components/Icon.jsx'
import CardHead from '../components/CardHead.jsx'
import { ActivityRow, openActivitySheet } from '../components/Activities.jsx'
import { Button, SearchField, Segmented, Stepper } from '../components/ui.jsx'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All (18)' },
  { key: 'top5', label: 'Top 5' },
  { key: 'low_risk', label: 'Low Risk' },
  { key: 'joint_friendly', label: 'Joint Friendly' },
  { key: 'for_life', label: 'For Life' },
]

const SORT_OPTIONS = [
  { value: 'rank', label: 'Completeness Rank' },
  { value: 'bigEngine', label: 'Big Engine' },
  { value: 'fullStrength', label: 'Full Strength' },
  { value: 'power', label: 'Power' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'easyJoints', label: 'Easy Joints' },
  { value: 'forLife', label: 'For Life' },
  { value: 'injuryRisk', label: 'Lowest Injury Risk' },
  { value: 'met', label: 'Calorie Burn (MET)' },
]

function PillarDot({ level, label }) {
  const cls = level >= 2 ? 'sp-dot is-strong' : level === 1 ? 'sp-dot is-bit' : 'sp-dot is-none'
  const text = label ? `${label}: ${pillarLevelLabel(level)}` : pillarLevelLabel(level)
  return (
    <span className={cls} aria-label={t(text)} title={t(text)}>
      {level === 1 && <span className="sp-dot-core" aria-hidden="true" />}
    </span>
  )
}

function RiskDot({ risk }) {
  const cls = risk === 'high' ? 'sp-risk is-high' : risk === 'some' ? 'sp-risk is-some' : 'sp-risk is-low'
  const text = riskLabel(risk)
  return (
    <span className={cls} aria-label={t(text)} title={t(text)}>
      {risk === 'high' && <span className="sp-risk-minus" aria-hidden="true" />}
      {risk === 'some' && <span className="sp-risk-core" aria-hidden="true" />}
    </span>
  )
}

function WeeklyGoalSheet({ initialGoal, close }) {
  const update = useStore(s => s.update)
  const ui = useUI.getState()
  const [goal, setGoal] = useState(initialGoal || 150)

  const save = () => {
    const clean = Math.max(15, Math.min(2000, Math.round(Number(goal) || 150)))
    update(s => { s.sportGoalMin = clean })
    close()
    ui.toast(t('Weekly sport goal saved'))
  }

  return (
    <div className="sheet-form" data-sport-goal-sheet>
      <h3>{t('Weekly sport & conditioning goal')}</h3>
      <p className="sp-sheet-copy">
        {t('Track weekly sport, cardio, and mobility minutes alongside your strength workouts.')}
      </p>
      <div className="sheet-field">
        <span className="sheet-label">{t('Weekly target (minutes)')}</span>
        <Stepper
          value={goal}
          step={15}
          min={15}
          max={2000}
          decimal={false}
          unit="min"
          ariaLabel={t('Weekly sport target in minutes')}
          onChange={setGoal}
        />
      </div>
      <div className="sp-goal-presets">
        {[90, 150, 210, 300].map(m => (
          <button
            type="button"
            key={m}
            className={'sp-filter-btn' + (goal === m ? ' on' : '')}
            onClick={() => setGoal(m)}
          >
            {m} {t('min')}
          </button>
        ))}
      </div>
      <div className="sheet-actions">
        <Button variant="primary" onClick={save}>{t('Save goal')}</Button>
        <Button variant="ghost" className="dim" onClick={close}>{t('Cancel')}</Button>
      </div>
    </div>
  )
}

function SportInspectorSheet({ sport, S, bwKg, isCompared, onToggleCompare, onOpenCompareWith, close }) {
  const week = weeklyHybridSportsSummary(S, todayISO())
  const weekStats = week.bySport[sport.key] || { count: 0, durationMin: 0, kcal: 0 }
  const allTime = (Array.isArray(S?.activities) ? S.activities : []).filter(a => matchActivityToSport(a)?.key === sport.key)
  const allMin = allTime.reduce((sum, a) => sum + (Number(a.durationMin) || 0), 0)
  const kcal30 = estimateActivityKcal(sport.met, bwKg, 30)
  const kcal60 = estimateActivityKcal(sport.met, bwKg, 60)
  const pairings = (sport.pairsWellWith || []).map(k => sportByKey(k)).filter(Boolean)

  return (
    <div className="sheet-form sp-inspector" data-sport-inspector={sport.key}>
      <div className="sp-insp-head">
        <span className="lrow-i sp-insp-ic" aria-hidden="true">
          <Icon name={sport.icon} />
        </span>
        <div className="sp-insp-titles">
          <div className="sp-insp-rank">
            #{sport.rank} {t('Overall')} · {t(sport.category)}
          </div>
          <h3>{t(sport.name)}</h3>
        </div>
        <div className={'sp-insp-score' + (sport.callout ? ' is-low' : '')}>
          <strong>{sport.total}</strong>
          <span>/ 12</span>
        </div>
      </div>

      <p className="sp-sheet-copy">{t(sport.summary)}</p>

      <div className="sp-insp-stats">
        <div className="sp-insp-stat">
          <span className="k">{t('Injury risk')}</span>
          <span className="v sp-risk-inline">
            <RiskDot risk={sport.injuryRisk} />
            <span>{t(riskLabel(sport.injuryRisk))}</span>
          </span>
        </div>
        <div className="sp-insp-stat">
          <span className="k">{t('Burn rate')} ({fmtNum(sport.met)} MET)</span>
          <span className="v">{kcal30} kcal / 30m · {kcal60} kcal / 60m</span>
        </div>
        <div className="sp-insp-stat">
          <span className="k">{t('This week')}</span>
          <span className="v">
            {weekStats.count > 0 ? `${weekStats.durationMin} min · ${weekStats.kcal} kcal` : t('Not logged yet')}
          </span>
        </div>
        <div className="sp-insp-stat">
          <span className="k">{t('All-time')}</span>
          <span className="v">
            {allTime.length > 0 ? `${tn('{0} session', '{0} sessions', allTime.length)} · ${allMin} min` : t('0 sessions')}
          </span>
        </div>
      </div>

      <div className="sp-pillar-breakdown">
        <div className="sheet-label">{t('Completeness breakdown')}</div>
        {SPORT_PILLARS.map(p => {
          const score = sport.pillars[p.key] || 0
          return (
            <div key={p.key} className="sp-pillar-row">
              <div className="sp-pillar-left">
                <PillarDot level={score} label={p.label} />
                <div>
                  <div className="sp-pillar-name">{t(p.label)}</div>
                  <div className="sp-pillar-desc">{t(p.desc)}</div>
                </div>
              </div>
              <div className="sp-pillar-val">{score}/2 · {t(pillarLevelLabel(score))}</div>
            </div>
          )
        })}
      </div>

      {pairings.length > 0 && (
        <div className="sp-pairings">
          <div className="sheet-label">{t('Best complementary pairings')}</div>
          <div className="sp-pair-row">
            {pairings.map(partner => {
              const synergy = combineSportsCoverage([sport, partner])
              return (
                <button
                  type="button"
                  key={partner.key}
                  className="sp-pair-btn"
                  onClick={() => {
                    close()
                    onOpenCompareWith(sport.key, partner.key)
                  }}
                >
                  <span className="sp-pair-name">
                    <Icon name={partner.icon} />
                    <span>+ {t(partner.name)}</span>
                  </span>
                  <span className="sp-pair-score">{synergy.combinedTotal}/12 {t('combined')}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="sheet-actions">
        <Button
          variant="primary"
          icon="plus"
          onClick={() => {
            close()
            openActivitySheet(null, null, sport.key)
          }}
        >
          {t('Log {0} session', t(sport.name))}
        </Button>
        <Button
          variant="tinted"
          icon={isCompared ? 'check' : 'swap'}
          onClick={() => onToggleCompare(sport.key)}
        >
          {isCompared ? t('Pinned for compare') : t('Add to compare')}
        </Button>
        <Button variant="ghost" className="dim" onClick={close}>{t('Close')}</Button>
      </div>
    </div>
  )
}

function CompareSportsSheet({ sports, bwKg, onRemove, close }) {
  const { coverage, combinedTotal, lowestRisk, highestRisk } = combineSportsCoverage(sports)

  return (
    <div className="sheet-form sp-compare-sheet" data-sport-compare-sheet>
      <h3>{t('Head-to-head sport comparison')}</h3>
      <div className="sp-synergy-card">
        <div className="sp-synergy-top">
          <div>
            <div className="lbl2">{t('Combined synergy coverage')}</div>
            <div className="sp-synergy-title">
              {sports.map(s => t(s.name)).join(' + ')}
            </div>
          </div>
          <div className="sp-synergy-score">
            <strong>{combinedTotal}</strong>
            <span>/ 12</span>
          </div>
        </div>
        <div className="sp-synergy-dots">
          {SPORT_PILLARS.map(p => (
            <div key={p.key} className="sp-synergy-dot-item">
              <PillarDot level={coverage[p.key]} label={p.label} />
              <span>{t(p.shortLabel)}</span>
            </div>
          ))}
        </div>
        <div className="sp-synergy-sub">
          {t('Risk range')}: {t(riskLabel(lowestRisk))} {lowestRisk !== highestRisk ? `→ ${t(riskLabel(highestRisk))}` : ''}
        </div>
      </div>

      <div className="sp-compare-scroll">
        <table className="sp-compare-table">
          <thead>
            <tr>
              <th>{t('Attribute')}</th>
              {sports.map(s => (
                <th key={s.key}>
                  <div className="sp-cmp-col-head">
                    <span className="sp-cmp-name">#{s.rank} {t(s.name)}</span>
                    {sports.length > 2 && (
                      <button
                        type="button"
                        className="sp-cmp-rm"
                        aria-label={t('Remove {0}', t(s.name))}
                        onClick={() => onRemove(s.key)}
                      >
                        <Icon name="xmark" size={14} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('Total score')}</td>
              {sports.map(s => (
                <td key={s.key} className="sp-cmp-num">
                  <strong>{s.total}</strong>/12
                </td>
              ))}
            </tr>
            {SPORT_PILLARS.map(p => (
              <tr key={p.key}>
                <td>{t(p.label)}</td>
                {sports.map(s => (
                  <td key={s.key}>
                    <div className="sp-cmp-cell">
                      <PillarDot level={s.pillars[p.key]} label={p.label} />
                      <span>{s.pillars[p.key]}/2</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td>{t('Injury risk')}</td>
              {sports.map(s => (
                <td key={s.key}>
                  <div className="sp-cmp-cell">
                    <RiskDot risk={s.injuryRisk} />
                    <span>{t(riskLabel(s.injuryRisk))}</span>
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td>{t('Burn / 60 min')}</td>
              {sports.map(s => (
                <td key={s.key} className="sp-cmp-num">
                  {estimateActivityKcal(s.met, bwKg, 60)} kcal
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="sp-cmp-log-row">
        {sports.map(s => (
          <Button
            key={s.key}
            size="sm"
            variant="tinted"
            icon="plus"
            onClick={() => {
              close()
              openActivitySheet(null, null, s.key)
            }}
          >
            {t('Log {0}', t(s.name))}
          </Button>
        ))}
      </div>

      <div className="sheet-actions">
        <Button variant="ghost" className="dim" onClick={close}>{t('Close')}</Button>
      </div>
    </div>
  )
}

export default function Sports() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const openSheet = useUI(s => s.openSheet)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')
  const [viewMode, setViewMode] = useState('matrix')
  const [compareKeys, setCompareKeys] = useState([])

  const today = todayISO()
  const week = useMemo(() => weeklyHybridSportsSummary(S, today), [S, today])

  const visibleSports = useMemo(
    () => filterAndSortSports(SPORTS_RANKING, { query, filter, sortBy, sortDir }),
    [query, filter, sortBy, sortDir]
  )

  const handleSortHeader = key => {
    if (sortBy === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(key)
    setSortDir(key === 'rank' || key === 'injuryRisk' ? 'asc' : 'desc')
  }

  const handleSortSelect = key => {
    setSortBy(key)
    setSortDir(key === 'rank' || key === 'injuryRisk' ? 'asc' : 'desc')
  }

  const toggleCompare = key => {
    setCompareKeys(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= 3) return [...prev.slice(1), key]
      return [...prev, key]
    })
  }

  const openGoalSheet = () => {
    openSheet(close => <WeeklyGoalSheet initialGoal={week.goalMin} close={close} />)
  }

  const openCompareSheet = (overrideKeys = null) => {
    const keys = Array.isArray(overrideKeys) ? overrideKeys : compareKeys
    const selected = keys.map(sportByKey).filter(Boolean)
    if (selected.length < 2) return
    openSheet(close => (
      <CompareSportsSheet
        sports={selected}
        bwKg={week.bwKg}
        onRemove={k => {
          setCompareKeys(prev => {
            const next = prev.filter(x => x !== k)
            if (next.length < 2) close()
            return next
          })
        }}
        close={close}
      />
    ))
  }

  const openInspector = sport => {
    openSheet(close => (
      <SportInspectorSheet
        sport={sport}
        S={S}
        bwKg={week.bwKg}
        isCompared={compareKeys.includes(sport.key)}
        onToggleCompare={toggleCompare}
        onOpenCompareWith={(aKey, bKey) => {
          setCompareKeys([aKey, bKey])
          openCompareSheet([aKey, bKey])
        }}
        close={close}
      />
    ))
  }

  const comparedSports = compareKeys.map(sportByKey).filter(Boolean)

  return (
    <div className="sports-page" data-sports-page>
      <div className="hdr">
        <div>
          <h1>{t('Sports')}</h1>
          <div className="sub">{t('The 18-sport completeness matrix & hybrid tracker')}</div>
        </div>
        <div className="hdr-r">
          <Button size="sm" variant="tinted" icon="target" onClick={openGoalSheet}>
            {t('Goal')}
          </Button>
          <Button size="sm" variant="primary" icon="plus" onClick={() => openActivitySheet()}>
            {t('Log')}
          </Button>
        </div>
      </div>

      {/* Weekly conditioning + Live Hybrid Coverage */}
      <div className="sports-top-grid">
        <div className="card" data-sports-weekly>
          <CardHead
            icon="flame"
            tint="var(--orange)"
            eyebrow={t('This week')}
            title={`${week.sportMinutes} / ${week.goalMin} ${t('min')}`}
            sub={`${week.sportKcal} kcal ${t('burned')} · ${tn('{0} sport session', '{0} sport sessions', week.activityCount)} · ${tn('{0} workout', '{0} workouts', week.workoutCount)}`}
            action={
              <Button size="sm" variant="ghost" onClick={openGoalSheet}>
                {t('Edit')}
              </Button>
            }
          />
          <div className="sp-goal-bar" aria-hidden="true">
            <span style={{ width: `${week.pctGoal}%` }} />
          </div>
          <div className="sp-goal-foot">
            <span>{week.pctGoal}% {t('of weekly target')}</span>
            <span>{t('Avg weight ref')}: {fmtNum(week.bwKg)} kg</span>
          </div>
        </div>

        <div className="card" data-sports-coverage>
          <CardHead
            icon="shield"
            tint="var(--green)"
            eyebrow={t('Weekly hybrid coverage')}
            title={`${week.coverageScore} / 12 ${t('complete')}`}
            sub={week.missingPillars.length > 0
              ? t('Best next addition: {0} (#{1} · {2}/12)', t(week.recommended.name), week.recommended.rank, week.recommended.total)
              : t('All 6 athletic pillars covered this week')}
            action={
              <Button
                size="sm"
                variant="tinted"
                icon="plus"
                onClick={() => openActivitySheet(null, null, week.recommended.key)}
              >
                {t(week.recommended.name)}
              </Button>
            }
          />
          <div className="sp-cov-grid">
            {SPORT_PILLARS.map(p => (
              <button
                type="button"
                key={p.key}
                className="sp-cov-item"
                onClick={() => handleSortSelect(p.key)}
                title={t('Sort matrix by {0}', t(p.label))}
              >
                <PillarDot level={week.coverage[p.key]} label={p.label} />
                <span className="sp-cov-k">{t(p.shortLabel)}</span>
                <span className="sp-cov-v">{week.coverage[p.key]}/2</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls: search, filters, sort, view mode */}
      <div className="card sp-controls-card">
        <div className="sp-controls-top">
          <div className="search">
            <SearchField
              value={query}
              placeholder={t('Search 18 sports or categories...')}
              onChange={e => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              aria-label={t('Search 18 sports')}
            />
          </div>
          <div className="sp-view-controls">
            <label className="sp-sort-wrap">
              <span className="sr-only">{t('Sort sports by')}</span>
              <select
                className="field sp-sort-select"
                value={sortBy}
                onChange={e => handleSortSelect(e.target.value)}
                aria-label={t('Sort sports by')}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{t(o.label)}</option>
                ))}
              </select>
            </label>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              ariaLabelledby={undefined}
              options={[
                { value: 'matrix', label: t('Matrix'), icon: 'grid' },
                { value: 'cards', label: t('Cards'), icon: 'list' },
              ]}
            />
          </div>
        </div>

        <div className="sp-filters" role="group" aria-label={t('Filter sports')}>
          {FILTER_OPTIONS.map(f => (
            <button
              type="button"
              key={f.key}
              className={'sp-filter-btn' + (filter === f.key ? ' on' : '')}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      {/* 18-Sport Matrix or Cards */}
      {visibleSports.length === 0 ? (
        <div className="card sp-empty">
          <div className="tt">{t('No sports match your filters')}</div>
          <div className="ss">{t('Clear your search or try showing all 18 ranked sports.')}</div>
          <Button
            size="sm"
            variant="tinted"
            onClick={() => { setQuery(''); setFilter('all') }}
          >
            {t('Reset filters')}
          </Button>
        </div>
      ) : viewMode === 'matrix' ? (
        <div className="card sp-matrix-card" data-sports-matrix>
          <div className="sp-matrix-head">
            <div>
              <div className="sp-matrix-title">{t('The most complete sport')}</div>
              <div className="sp-matrix-sub">
                {t('Tap any sport for MET calorie rate & logging, or sort by clicking any column.')}
              </div>
            </div>
            <div className="sp-legend" aria-label={t('Scoring legend')}>
              <span className="sp-leg-i"><PillarDot level={2} /><span>{t('Strong (2)')}</span></span>
              <span className="sp-leg-i"><PillarDot level={1} /><span>{t('A bit (1)')}</span></span>
              <span className="sp-leg-i"><PillarDot level={0} /><span>{t('None (0)')}</span></span>
              <span className="sp-leg-i"><RiskDot risk="some" /><span>{t('Some risk')}</span></span>
              <span className="sp-leg-i"><RiskDot risk="high" /><span>{t('High risk')}</span></span>
            </div>
          </div>

          <div className="sp-matrix-scroll">
            <table className="sp-matrix-table">
              <thead>
                <tr>
                  <th className="sp-col-sport">
                    <button
                      type="button"
                      className={'sp-th-btn' + (sortBy === 'rank' ? ' on' : '')}
                      onClick={() => handleSortHeader('rank')}
                    >
                      <span>{t('Sport')}</span>
                      {sortBy === 'rank' && <Icon name={sortDir === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />}
                    </button>
                  </th>
                  {SPORT_PILLARS.map(p => (
                    <th key={p.key} className="sp-col-pillar">
                      <button
                        type="button"
                        className={'sp-th-btn' + (sortBy === p.key ? ' on' : '')}
                        onClick={() => handleSortHeader(p.key)}
                      >
                        <span>{t(p.label)}</span>
                        {sortBy === p.key && <Icon name={sortDir === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />}
                      </button>
                    </th>
                  ))}
                  <th className="sp-col-risk">
                    <button
                      type="button"
                      className={'sp-th-btn is-risk' + (sortBy === 'injuryRisk' ? ' on' : '')}
                      onClick={() => handleSortHeader('injuryRisk')}
                    >
                      <span>{t('Injury risk')}</span>
                      {sortBy === 'injuryRisk' && <Icon name={sortDir === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />}
                    </button>
                  </th>
                  <th className="sp-col-total">
                    <button
                      type="button"
                      className={'sp-th-btn is-total' + (sortBy === 'total' ? ' on' : '')}
                      onClick={() => handleSortHeader('total')}
                    >
                      <span>{t('Total')} <small>/12</small></span>
                    </button>
                  </th>
                  <th className="sp-col-act">
                    <span className="sr-only">{t('Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleSports.map(s => {
                  const weekStats = week.bySport[s.key]
                  const pinned = compareKeys.includes(s.key)
                  return (
                    <tr
                      key={s.key}
                      data-sport-row={s.key}
                      className={
                        'sp-row' +
                        (s.callout ? ' is-callout' : '') +
                        (pinned ? ' is-pinned' : '')
                      }
                    >
                      <td className="sp-col-sport">
                        <button
                          type="button"
                          className="sp-sport-btn"
                          onClick={() => openInspector(s)}
                        >
                          <span className="sp-rank">{s.rank}</span>
                          <span className="sp-sport-ic" aria-hidden="true">
                            <Icon name={s.icon} />
                          </span>
                          <span className="sp-sport-meta">
                            <span className="sp-sport-name">{t(s.name)}</span>
                            <span className="sp-sport-sub">
                              {weekStats
                                ? `${weekStats.durationMin}m ${t('this wk')} · ${s.met} MET`
                                : `${week.hourlyKcalFor(s)} kcal/h · ${s.met} MET`}
                            </span>
                          </span>
                        </button>
                      </td>
                      {SPORT_PILLARS.map(p => (
                        <td key={p.key} className="sp-col-pillar">
                          <button
                            type="button"
                            className="sp-cell-hit"
                            onClick={() => openInspector(s)}
                            aria-label={`${t(s.name)} ${t(p.label)}: ${t(pillarLevelLabel(s.pillars[p.key]))}`}
                          >
                            <PillarDot level={s.pillars[p.key]} label={p.label} />
                          </button>
                        </td>
                      ))}
                      <td className="sp-col-risk">
                        <button
                          type="button"
                          className="sp-cell-hit"
                          onClick={() => openInspector(s)}
                          aria-label={`${t(s.name)} ${t('Injury risk')}: ${t(riskLabel(s.injuryRisk))}`}
                        >
                          <RiskDot risk={s.injuryRisk} />
                        </button>
                      </td>
                      <td className="sp-col-total">
                        <button
                          type="button"
                          className="sp-total-hit"
                          onClick={() => openInspector(s)}
                        >
                          {s.total}
                        </button>
                      </td>
                      <td className="sp-col-act">
                        <div className="sp-row-acts">
                          <button
                            type="button"
                            className={'sp-mini-btn' + (pinned ? ' on' : '')}
                            onClick={() => toggleCompare(s.key)}
                            aria-label={pinned ? t('Unpin {0} from compare', t(s.name)) : t('Pin {0} to compare', t(s.name))}
                            title={t('Compare')}
                          >
                            <Icon name={pinned ? 'check' : 'swap'} size={15} />
                          </button>
                          <button
                            type="button"
                            className="sp-mini-btn is-log"
                            onClick={() => openActivitySheet(null, null, s.key)}
                            aria-label={t('Log {0}', t(s.name))}
                            title={t('Log session')}
                          >
                            <Icon name="plus" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="sp-cards-grid" data-sports-cards>
          {visibleSports.map(s => {
            const pinned = compareKeys.includes(s.key)
            const weekStats = week.bySport[s.key]
            return (
              <div
                key={s.key}
                data-sport-card={s.key}
                className={'card sp-card' + (s.callout ? ' is-callout' : '') + (pinned ? ' is-pinned' : '')}
              >
                <div className="sp-card-top">
                  <button type="button" className="sp-card-main" onClick={() => openInspector(s)}>
                    <span className="sp-rank">#{s.rank}</span>
                    <span className="lrow-i" aria-hidden="true"><Icon name={s.icon} /></span>
                    <span className="sp-card-titles">
                      <span className="tt">{t(s.name)}</span>
                      <span className="ss">
                        {t(s.category)} · {t(riskLabel(s.injuryRisk))} · {week.hourlyKcalFor(s)} kcal/h
                      </span>
                    </span>
                  </button>
                  <div className="sp-card-total">
                    <strong>{s.total}</strong>
                    <span>/12</span>
                  </div>
                </div>

                <div className="sp-card-pillars">
                  {SPORT_PILLARS.map(p => (
                    <div key={p.key} className="sp-card-pil">
                      <PillarDot level={s.pillars[p.key]} label={p.label} />
                      <span>{t(p.shortLabel)}</span>
                    </div>
                  ))}
                </div>

                <div className="sp-card-foot">
                  <span className="sp-card-week">
                    {weekStats
                      ? `${weekStats.durationMin}m · ${weekStats.kcal} kcal ${t('this week')}`
                      : t('0 min this week')}
                  </span>
                  <div className="sp-card-btns">
                    <Button
                      size="sm"
                      variant={pinned ? 'primary' : 'tinted'}
                      icon={pinned ? 'check' : 'swap'}
                      onClick={() => toggleCompare(s.key)}
                    >
                      {pinned ? t('Pinned') : t('Compare')}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon="plus"
                      onClick={() => openActivitySheet(null, null, s.key)}
                    >
                      {t('Log')}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent logged sport & activity sessions */}
      <div className="card sp-history-card" data-sports-recent>
        <CardHead
          icon="history"
          tint="var(--acc)"
          eyebrow={t('Logged sessions')}
          title={t('Recent sports & cardio')}
          sub={week.recentActivities.length > 0
            ? t('Tap any entry to edit duration, MET intensity, or calories')
            : t('Sessions logged here also update Food calorie burn and History')}
          action={
            <Button size="sm" variant="ghost" onClick={() => nav('/history')}>
              {t('All history')}
            </Button>
          }
        />
        {week.recentActivities.length === 0 ? (
          <div className="sp-recent-empty">
            <span>{t('No sports or activities logged yet.')}</span>
            <Button size="sm" variant="tinted" icon="plus" onClick={() => openActivitySheet(null, null, 'swimming')}>
              {t('Log first session')}
            </Button>
          </div>
        ) : (
          <div className="list">
            {week.recentActivities.map(a => (
              <ActivityRow key={a.id} a={a} onClick={() => openActivitySheet(a)} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky comparison bar when >= 1 sport is pinned */}
      {comparedSports.length > 0 && (
        <div className="sp-compare-dock" data-sports-compare-dock>
          <div className="sp-dock-names">
            <span className="sp-dock-k">{t('Compare ({0}/3)', comparedSports.length)}</span>
            <span className="sp-dock-v">
              {comparedSports.map(s => t(s.name)).join(' · ')}
            </span>
          </div>
          <div className="sp-dock-acts">
            <Button size="sm" variant="ghost" onClick={() => setCompareKeys([])}>
              {t('Clear')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={comparedSports.length < 2}
              onClick={() => openCompareSheet()}
            >
              {comparedSports.length < 2 ? t('Pick 1 more') : t('Compare')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
