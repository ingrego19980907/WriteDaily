export const sectionIds = [
  'library',
  'editor',
  'goals',
  'activity',
  'achievements',
] as const

export type SectionId = (typeof sectionIds)[number]
