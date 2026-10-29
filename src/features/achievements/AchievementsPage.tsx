import { useEffect, useId, useRef, useState } from 'react'
import { RefreshCw, Trophy } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useLocalCalendarDate } from '../../hooks/useLocalCalendarDate'
import {
  getAchievementUnlocks,
  refreshAchievements,
} from '../../services/achievements'
import { bookErrorCode } from '../../services/books'
import { AchievementCard } from './AchievementCard'
import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'
import type { AchievementUnlock } from './achievement-unlocks'
import './achievements-page.css'

const copy = en.achievementsPage
const ids = Object.keys(ACHIEVEMENT_RULES) as AchievementId[]
type Result = { key: string; error?: string; desktop?: boolean }

function failureMessage(error: unknown): string {
  switch (bookErrorCode(error)) {
    case 'desktop_required':
      return copy.desktop
    case 'invalid_stored_data':
      return copy.invalidData
    case 'limit_reached':
      return copy.limit
    default:
      return copy.failure
  }
}

/** Keep confirmed unlocks across navigation; readers/timers exist only while active. */
export function AchievementsPage({ active = true }: { active?: boolean }) {
  const [unlocks, setUnlocks] = useState<readonly AchievementUnlock[] | null>(
    null,
  )
  return active ? (
    <ActiveAchievementsPage unlocks={unlocks} onLoaded={setUnlocks} />
  ) : null
}

function ActiveAchievementsPage({
  unlocks,
  onLoaded,
}: {
  unlocks: readonly AchievementUnlock[] | null
  onLoaded: (data: readonly AchievementUnlock[]) => void
}) {
  const id = useId()
  const today = useLocalCalendarDate()
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const lastConfirmed = useRef(unlocks)
  const key = JSON.stringify([today, version])

  useEffect(() => {
    let current = true
    function accept(data: readonly AchievementUnlock[]) {
      // Permanent IDs/timestamps cannot disappear or change in a later snapshot.
      if (
        lastConfirmed.current?.some(
          (saved) =>
            !data.some(
              (next) =>
                next.achievementId === saved.achievementId &&
                next.rulePolicyVersion === saved.rulePolicyVersion &&
                next.unlockedAt === saved.unlockedAt,
            ),
        )
      )
        throw { code: 'invalid_stored_data' }
      lastConfirmed.current = data
      onLoaded(data)
    }
    async function load() {
      try {
        const saved = await getAchievementUnlocks()
        if (!current) return
        accept(saved)
        const refreshed = await refreshAchievements()
        if (!current) return
        accept(refreshed.unlocks)
        setResult({ key })
      } catch (error) {
        if (current)
          setResult({
            key,
            error: failureMessage(error),
            desktop: bookErrorCode(error) === 'desktop_required',
          })
      }
    }
    void load()
    return () => {
      current = false
    }
  }, [key, onLoaded])

  useEffect(() => {
    const refresh = () => setVersion((value) => value + 1)
    const visible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', visible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])

  const loading = result?.key !== key
  const error = !loading ? result?.error : undefined
  const desktop = !loading && result?.desktop

  return (
    <section className="achievements-page" aria-labelledby={`${id}-title`}>
      <div className="achievements-page__toolbar">
        <div>
          <h2 id={`${id}-title`} className="achievements-page__title">
            {copy.title}
          </h2>
          <p className="achievements-page__summary">
            {unlocks === null
              ? copy.countUnavailable
              : copy.summary(unlocks.length, ids.length)}
          </p>
        </div>
        <Button
          className="achievements-page__refresh"
          variant="secondary"
          disabled={loading || !!desktop}
          onClick={() => setVersion((value) => value + 1)}
        >
          <RefreshCw
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
            focusable="false"
          />
          {error && !desktop ? copy.retry : copy.refresh}
        </Button>
      </div>
      <p className="achievements-page__status" role="status" aria-atomic="true">
        {loading
          ? unlocks === null
            ? copy.loading
            : copy.refreshing
          : error
            ? ''
            : copy.updated}
      </p>
      {error && (
        <Card
          className="achievements-page__feedback"
          role={desktop ? undefined : 'alert'}
        >
          <p>{error}</p>
          {unlocks !== null && (
            <p className="achievements-page__hint">{copy.retained}</p>
          )}
        </Card>
      )}
      {!loading && !error && unlocks?.length === 0 && (
        <Card className="achievements-page__empty">
          <Trophy
            size={28}
            strokeWidth={1.5}
            aria-hidden="true"
            focusable="false"
          />
          <div>
            <h3 className="achievements-page__empty-title">
              {copy.emptyTitle}
            </h3>
            <p className="achievements-page__hint">{copy.emptyDescription}</p>
          </div>
        </Card>
      )}
      {(unlocks !== null || error) && (
        <ul
          className="achievements-page__grid"
          aria-label={copy.collection}
          aria-busy={loading}
        >
          {ids.map((achievementId) => (
            <li key={achievementId}>
              <AchievementCard
                achievementId={achievementId}
                unlocks={unlocks}
              />
            </li>
          ))}
        </ul>
      )}
      <p className="achievements-page__hint">{copy.policy}</p>
    </section>
  )
}
