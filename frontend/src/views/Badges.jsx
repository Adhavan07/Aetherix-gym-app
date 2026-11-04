import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import { evaluateBadges } from '../lib/badges.js'
import { StickerArt, openBadgeSheet } from '../components/Badges.jsx'
import Icon from '../components/Icon.jsx'
import CardHead from '../components/CardHead.jsx'
import { Segmented } from '../components/ui.jsx'

export default function Badges() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const [filter, setFilter] = useState('all')

  const summary = useMemo(() => evaluateBadges(S, user), [S, user])
  const visible = useMemo(() => {
    if (filter === 'unlocked') return summary.list.filter(b => b.unlocked)
    if (filter === 'locked') return summary.list.filter(b => !b.unlocked)
    return summary.list
  }, [summary.list, filter])

  const heroTextureUrl = `url("${(import.meta.env.BASE_URL || '/')}solo/system-card.jpg")`

  return (
    <div className="narrow" data-badges-view>
      <div className="hdr">
        <div className="row" style={{ gap: 10 }}>
          <button
            type="button"
            className="iconbtn"
            data-back="/home"
            onClick={() => nav('/home')}
            aria-label={t('Back')}
          >
            <Icon name="chevronLeft" />
          </button>
          <div>
            <h1>{t('Hunter badges')}</h1>
            <div className="sub">{t('Collectible anime character stickers earned from your milestones')}</div>
          </div>
        </div>
      </div>

      <div className="card food-hero-card badges-hero-card" style={{ '--solo-card-tex': heroTextureUrl }}>
        <CardHead
          icon="trophy"
          tint="var(--purple)"
          eyebrow={t('Achievement progress')}
          title={t('{0} of {1} stickers collected', summary.unlockedCount, summary.totalCount)}
          sub={
            summary.unlockedCount === summary.totalCount
              ? t('Every sticker in the collection is unlocked.')
              : t('Tap any sticker to inspect how to unlock it.')
          }
        />
        <svg
          className="food-bar-svg"
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          role="progressbar"
          aria-label={t('Sticker collection progress')}
          aria-valuemin={0}
          aria-valuemax={summary.totalCount}
          aria-valuenow={summary.unlockedCount}
        >
          <rect className="food-bar-bg" x="0" y="0" width="100" height="8" rx="4" />
          <rect className="food-bar-fg" x="0" y="0" width={summary.pct} height="8" rx="4" />
        </svg>
      </div>

      <div className="badges-filter-row">
        <Segmented
          ariaLabel={t('Filter badges')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('All ({0})', summary.totalCount) },
            { value: 'unlocked', label: t('Unlocked ({0})', summary.unlockedCount) },
            { value: 'locked', label: t('Locked ({0})', summary.totalCount - summary.unlockedCount) },
          ]}
        />
      </div>

      {visible.length > 0 ? (
        <div className="badges-grid" data-badges-grid>
          {visible.map(badge => {
            const unlockedIso = badge.unlockedAt
              ? new Date(badge.unlockedAt).toISOString().slice(0, 10)
              : null
            return (
              <button
                type="button"
                key={badge.id}
                className={'card badge-card' + (badge.unlocked ? ' is-unlocked' : ' is-locked')}
                data-badge-card={badge.id}
                onClick={() => openBadgeSheet(badge)}
              >
                <StickerArt badge={badge} size="lg" locked={!badge.unlocked} />
                <div className="badge-card-meta">
                  <div className="badge-card-char">{t(badge.character)}</div>
                  <div className="badge-card-title">{t(badge.title)}</div>
                  <div className="badge-card-sub">{t(badge.subtitle)}</div>
                </div>
                <div className="badge-card-foot">
                  {badge.unlocked ? (
                    <span className="badge-foot-unlocked">
                      <Icon name="checkCircle" />
                      <span>{unlockedIso ? fmtDate(unlockedIso, true) : t('Unlocked')}</span>
                    </span>
                  ) : (
                    <span className="badge-foot-locked">{t(badge.progress.label)}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="card small dim" style={{ textAlign: 'center', padding: '24px 16px' }}>
          {filter === 'unlocked'
            ? t('No stickers unlocked yet. Complete your first milestone to claim one!')
            : t('All stickers are already unlocked!')}
        </div>
      )}
    </div>
  )
}
