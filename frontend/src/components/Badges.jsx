import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate } from '../lib/format.js'
import { nav as goNav } from '../lib/nav.js'
import { evaluateBadges, unlockBadgeInState } from '../lib/badges.js'
import Icon from './Icon.jsx'
import CardHead from './CardHead.jsx'
import { Button } from './ui.jsx'

export function StickerArt({ badge, size = 'md', locked = false }) {
  const [failed, setFailed] = useState(false)
  const base = import.meta.env.BASE_URL || '/'
  const src = `${base}${badge.image}`

  return (
    <div
      className={`badge-sticker badge-sticker-${size}${locked ? ' is-locked' : ' is-unlocked'}`}
      style={{ '--badge-accent': badge.accent }}
    >
      {!failed ? (
        <img
          src={src}
          alt={badge.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="badge-sticker-fallback" aria-hidden="true">
          <Icon name={badge.icon || 'medal'} />
        </div>
      )}
      {locked && (
        <span className="badge-lock-mark" aria-hidden="true">
          <Icon name="lock" />
        </span>
      )}
    </div>
  )
}

function BadgeDetailSheet({ badge, close }) {
  const unlockedDateIso = badge.unlockedAt
    ? new Date(badge.unlockedAt).toISOString().slice(0, 10)
    : null

  const goAction = () => {
    close()
    if (badge.route) goNav(badge.route)
  }

  return (
    <div className="sheet-form badge-detail-sheet" data-badge-sheet={badge.id}>
      <div className="badge-detail-hero">
        <StickerArt badge={badge} size="xl" locked={!badge.unlocked} />
        <div className="badge-detail-char">{t(badge.character)}</div>
        <h3>{t(badge.title)}</h3>
        <div className="badge-detail-status">
          {badge.unlocked ? (
            <span className="badge-state-unlocked">
              <Icon name="checkCircle" />
              <span>
                {unlockedDateIso
                  ? t('Unlocked · {0}', fmtDate(unlockedDateIso, true))
                  : t('Unlocked')}
              </span>
            </span>
          ) : (
            <span className="badge-state-locked">
              <Icon name="lock" />
              <span>{t(badge.progress.label)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="badge-detail-box">
        <div className="badge-detail-k">{t('How to earn this sticker')}</div>
        <div className="badge-detail-p">{t(badge.howToEarn)}</div>
        <div className="badge-prog-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={badge.progress.pct}>
          <div className="badge-prog-fill" style={{ width: `${badge.progress.pct}%`, '--badge-accent': badge.accent }} />
        </div>
      </div>

      <div className="sheet-actions">
        {!badge.unlocked && badge.route && (
          <Button variant="primary" onClick={goAction}>
            {t(badge.ctaLabel)}
          </Button>
        )}
        <Button variant={badge.unlocked ? 'primary' : 'ghost'} className={badge.unlocked ? '' : 'dim'} onClick={close}>
          {badge.unlocked ? t('Done') : t('Close')}
        </Button>
      </div>
    </div>
  )
}

export function openBadgeSheet(badge) {
  useUI.getState().openSheet(close => <BadgeDetailSheet badge={badge} close={close} />)
}

export function BadgesHomeCard({ S, user }) {
  const nav = useNavigate()
  const summary = useMemo(() => evaluateBadges(S, user), [S, user])

  return (
    <div className="card tap-host badges-home-card" data-badges-home-card>
      <CardHead
        icon="medal"
        tint="var(--purple)"
        eyebrow={t('Sticker collection')}
        title={t('Hunter badges')}
        sub={t('{0} of {1} anime stickers unlocked', summary.unlockedCount, summary.totalCount)}
        open={{ onClick: () => nav('/badges') }}
        action={<Icon name="chevronRight" className="chev" />}
      />
      <div className="badges-home-strip">
        {summary.list.map(b => (
          <button
            type="button"
            key={b.id}
            className={'badges-mini-btn' + (b.unlocked ? ' on' : '')}
            aria-label={`${b.title} (${b.unlocked ? t('Unlocked') : t('Locked')})`}
            onClick={() => openBadgeSheet(b)}
          >
            <StickerArt badge={b} size="sm" locked={!b.unlocked} />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Watches live user milestones and persists newly earned anime sticker badges into `S.badges`.
 * Shows a toast celebration when a badge unlocks during an active session.
 */
export function useBadgesWatcher(enabled = true) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const tourSandbox = useStore(s => s.tourSandbox)
  const initializedRef = useRef(false)
  const seenUnlockedRef = useRef(new Set())

  useEffect(() => {
    if (!enabled || tourSandbox) return
    const { list, newlyEarnedIds } = evaluateBadges(S, user)
    const currentlyUnlocked = new Set(list.filter(x => x.unlocked).map(x => x.id))

    const firstPass = !initializedRef.current
    if (firstPass) {
      initializedRef.current = true
      seenUnlockedRef.current = currentlyUnlocked
    }

    // Celebrate any badge that newly transitioned from locked -> unlocked during the session
    const freshlyTransitioned = [...currentlyUnlocked].filter(id => !seenUnlockedRef.current.has(id))
    seenUnlockedRef.current = currentlyUnlocked

    if (newlyEarnedIds.length > 0) {
      const now = Date.now()
      useStore.getState().update(s => {
        for (const id of newlyEarnedIds) unlockBadgeInState(s, id, now)
      })
    }

    if (!firstPass && freshlyTransitioned.length > 0) {
      const unlockedBadge = list.find(b => b.id === freshlyTransitioned[0])
      if (unlockedBadge) {
        useUI.getState().toast(t('Sticker unlocked: {0}', unlockedBadge.title), {
          action: t('View'),
          onAction: () => goNav('/badges'),
        })
      }
    }
  }, [
    enabled,
    tourSandbox,
    user?.id,
    S?.routines?.length,
    S?.workouts?.length,
    S?.activities?.length,
    S?.foodLog?.length,
    S?.calorieTarget,
    S?.badges,
  ])
}
