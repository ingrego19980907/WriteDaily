import { useId } from 'react'
import {
  BookCheck,
  BookOpen,
  CalendarCheck,
  CircleCheck,
  CircleHelp,
  Feather,
  Flame,
  LibraryBig,
  LockKeyhole,
  PenLine,
  Target,
} from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ACHIEVEMENT_RULES, type AchievementId } from './achievement-rules'
import type { AchievementUnlock } from './achievement-unlocks'
import type { AchievementCheck } from './evaluate-achievements'
import { getAchievementCardState } from './achievement-card-state'
import './achievement-card.css'

export type AchievementCardProps = {
  achievementId: AchievementId
  /** null for a pending/failed native read; [] only after a successful empty read. */
  unlocks: readonly AchievementUnlock[] | null
  /** Optional committed-evidence progress, not a condition for showing saved unlocks. */
  check?: AchievementCheck | null
}

const icons = {
  first_words: Feather,
  getting_started: PenLine,
  storyteller: BookOpen,
  novelist: LibraryBig,
  consistency: CalendarCheck,
  dedicated_writer: Flame,
  goal_keeper: Target,
  the_end: BookCheck,
} as const
const copy = en.achievementCards

function displayUnlockDate(instant: string) {
  // Resolve the current timezone on render, including after travel/focus refresh.
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(instant),
  )
}

/** Read-only presentation; native services and the page own loading and persistence. */
export function AchievementCard({
  achievementId,
  unlocks,
  check = null,
}: AchievementCardProps) {
  const generatedId = useId()
  const headingId = `${generatedId}-title`
  const descriptionId = `${generatedId}-description`
  const progressId = `${generatedId}-progress`
  const rule = ACHIEVEMENT_RULES[achievementId]
  const details = en.achievementRules[achievementId]
  const state = getAchievementCardState(achievementId, unlocks, check)
  const Icon = icons[achievementId]
  const StatusIcon =
    state.kind === 'unlocked'
      ? CircleCheck
      : state.kind === 'locked'
        ? LockKeyhole
        : CircleHelp
  const progress = state.kind === 'locked' ? state.progress : null
  const progressText =
    progress === null
      ? null
      : copy.progress(
          progress.confirmed,
          rule.threshold,
          rule.metric,
          progress.atLeast,
        )

  return (
    <article
      className={`achievement-card achievement-card--${state.kind}`}
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
    >
      <Card className="achievement-card__surface">
        <div className="achievement-card__top">
          <span className="achievement-card__emblem" aria-hidden="true">
            <Icon
              size={28}
              strokeWidth={1.6}
              aria-hidden="true"
              focusable="false"
            />
          </span>
          <span className="achievement-card__badge">
            <StatusIcon
              size={16}
              strokeWidth={1.7}
              aria-hidden="true"
              focusable="false"
            />
            <span className="achievement-card__badge-label">
              {copy.states[state.kind]}
            </span>
          </span>
        </div>
        <div className="achievement-card__details">
          <h3 id={headingId} className="achievement-card__title">
            {details.name}
          </h3>
          <p id={descriptionId} className="achievement-card__description">
            {details.description}
          </p>
        </div>
        <div className="achievement-card__footer">
          {state.kind === 'unlocked' ? (
            <time
              dateTime={state.unlockedAt}
              className="achievement-card__date"
            >
              {copy.unlockedOn(displayUnlockDate(state.unlockedAt))}
            </time>
          ) : state.kind === 'unavailable' ? (
            <p className="achievement-card__hint">{copy.statusUnavailable}</p>
          ) : (
            <>
              {progress && progressText ? (
                <div className="achievement-card__progress">
                  <ProgressBar
                    label={copy.progressLabel(details.name)}
                    value={progress.confirmed}
                    max={rule.threshold}
                    aria-valuetext={progressText}
                    aria-describedby={progressId}
                  />
                  <p id={progressId} className="achievement-card__counts">
                    {progressText}
                  </p>
                </div>
              ) : (
                <p className="achievement-card__hint">
                  {copy.progressUnavailable}
                </p>
              )}
              {state.awaitingConfirmation && (
                <p className="achievement-card__hint">
                  {copy.awaitingConfirmation}
                </p>
              )}
              {achievementId === 'the_end' && (
                <p className="achievement-card__hint">
                  {copy.completionUnavailable}
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </article>
  )
}
