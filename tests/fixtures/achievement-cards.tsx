import '../../src/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../../src/components/ui/Button'
import { AchievementCard } from '../../src/features/achievements/AchievementCard'
import type { AchievementId } from '../../src/features/achievements/achievement-rules'
import type { AchievementCheck } from '../../src/features/achievements/evaluate-achievements'

// Isolated presentation evidence only; no native/storage mocks or actual library writes.
const samples: {
  id: AchievementId
  check: AchievementCheck | null
  unavailable?: boolean
}[] = [
  {
    id: 'first_words',
    check: { id: 'first_words', status: 'locked', confirmedProgress: 0 },
  },
  {
    id: 'getting_started',
    check: {
      id: 'getting_started',
      status: 'unavailable',
      confirmedProgress: null,
    },
  },
  {
    id: 'storyteller',
    check: { id: 'storyteller', status: 'eligible', confirmedProgress: 10_000 },
  },
  {
    id: 'novelist',
    check: { id: 'novelist', status: 'locked', confirmedProgress: 49_999 },
  },
  {
    id: 'consistency',
    check: { id: 'consistency', status: 'unavailable', confirmedProgress: 6 },
  },
  { id: 'dedicated_writer', check: null, unavailable: true },
  {
    id: 'goal_keeper',
    check: { id: 'goal_keeper', status: 'eligible', confirmedProgress: 10 },
  },
  { id: 'the_end', check: null },
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main
      className="mx-auto max-w-6xl space-y-6 p-4"
      style={{ overflowWrap: 'anywhere' }}
    >
      <h1 className="font-writing text-display">
        Achievement card verification
      </h1>
      <Button>Before cards</Button>
      <section aria-labelledby="card-states">
        <h2 id="card-states" className="mb-4 text-xl">
          Read-only card states
        </h2>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-5"
          data-testid="achievement-cards"
        >
          {samples.map(({ id, check, unavailable }) => (
            <AchievementCard
              key={id}
              achievementId={id}
              check={check}
              unlocks={
                unavailable
                  ? null
                  : id === 'goal_keeper'
                    ? [
                        {
                          achievementId: id,
                          rulePolicyVersion: 1,
                          unlockedAt: '2026-10-29T10:00:00.000Z',
                        },
                      ]
                    : []
              }
            />
          ))}
        </div>
      </section>
      <Button>After cards</Button>
    </main>
  </StrictMode>,
)
