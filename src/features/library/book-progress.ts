export type BookProgressState =
  | { kind: 'unknown'; target: number | null }
  | { kind: 'no_target'; words: number }
  | {
      kind: 'determinate'
      words: number
      target: number
      percentage: number
      remaining: number
      excess: number
    }

/** Counts are supplied by manuscript aggregation, never inferred from metadata/completion. */
export function calculateBookProgress(
  wordCount: unknown,
  targetWordCount: unknown,
): BookProgressState {
  const target =
    typeof targetWordCount === 'number' &&
    Number.isSafeInteger(targetWordCount) &&
    targetWordCount > 0
      ? targetWordCount
      : null
  if (
    typeof wordCount !== 'number' ||
    !Number.isSafeInteger(wordCount) ||
    wordCount < 0
  )
    return { kind: 'unknown', target }
  if (target === null) return { kind: 'no_target', words: wordCount }
  // Saturate reached targets before division; rounding must never claim 100% below target.
  const percentage =
    wordCount >= target
      ? 100
      : Math.min(99.9, Math.floor((wordCount / target) * 1000) / 10)
  return {
    kind: 'determinate',
    words: wordCount,
    target,
    percentage,
    remaining: Math.max(0, target - wordCount),
    excess: Math.max(0, wordCount - target),
  }
}
