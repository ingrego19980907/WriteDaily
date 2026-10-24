export const en = {
  library: {
    create: 'Create book',
    close: 'Close',
    description: 'Give your story a title. Goals and a deadline are optional.',
    title: 'Title',
    titleHint: 'Up to 200 characters.',
    targetWordCount: 'Target word count (optional)',
    dailyWordGoal: 'Daily word goal (optional)',
    deadline: 'Deadline (optional)',
    saving: 'Creating…',
    saved: 'Book created:',
    draft: 'Your unfinished details are kept when you close this form.',
    failure:
      'Could not create the book. Your details are kept. Please try again.',
    desktop: 'Open the desktop app to save books to your library.',
    errors: {
      required: 'Enter a title.',
      invalid_type: 'Enter a valid value.',
      too_long: 'Use no more than 200 characters.',
      invalid_title: 'Remove control characters from the title.',
      invalid_count: 'Enter a whole number from 1 to 9007199254740991.',
      invalid_date: 'Enter a valid date (YYYY-MM-DD, years 0001–9999).',
    },
  },
  app: {
    name: 'WriteDaily',
    tagline: 'A little writing, every day.',
  },
  shell: {
    skipToContent: 'Skip to content',
    navigationArea: 'Application navigation',
    mainNavigation: 'Main navigation',
    comingSoon: 'Coming soon',
  },
  sections: {
    library: {
      title: 'My Library',
      subtitle: 'Every great story begins with a single word.',
      description: 'A home for your books and stories is taking shape.',
    },
    editor: {
      title: 'Writing Editor',
      subtitle: 'A peaceful place for your words.',
      description: 'Your chapter-based writing space is taking shape.',
    },
    goals: {
      title: 'Goals & Deadlines',
      subtitle: 'Make room for a little progress.',
      description:
        'A place for your writing goals and deadlines is taking shape.',
    },
    activity: {
      title: 'Activity Calendar',
      subtitle: 'Small steps become a writing habit.',
      description: 'Your writing calendar and streaks are taking shape.',
    },
    achievements: {
      title: 'Achievements',
      subtitle: 'Every milestone begins with a few words.',
      description:
        'A place to celebrate your writing milestones is taking shape.',
    },
  },
} as const
