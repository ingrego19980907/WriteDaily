export const en = {
  library: {
    create: 'Create book',
    open: 'Open book',
    opening: 'Opening…',
    openFailure: 'Could not open this book. Please try again.',
    openMissing:
      'This book is no longer available. Your library has not been changed.',
    backToLibrary: 'Back to library',
    editorPending: 'Chapter editing is coming soon.',
    noCover: 'No cover yet',
    manageCover: 'Manage cover',
    writingProgress: 'Writing progress',
    wordCountUnavailable: 'Word count unavailable',
    noTarget: 'No word target',
    wordTarget: (count: string) => `Target: ${count} words`,
    completed: 'Completed',
    cover: 'Cover image',
    coverHint:
      'PNG, JPEG or WebP, up to 5 MiB and 4096 × 4096 pixels. Saved as a PNG up to 1200 × 1600 pixels.',
    coverSave: 'Save cover',
    coverRemove: 'Remove cover',
    coverSaving: 'Saving cover…',
    coverSaved: 'Cover saved.',
    coverRemoved: 'Cover removed.',
    coverInvalid:
      'Choose a valid PNG, JPEG or WebP within the supported dimensions.',
    coverTooLarge: 'Choose an image no larger than 5 MiB.',
    coverFailure:
      'Could not save the cover. The current cover is unchanged. Please try again.',
    coverReadFailure: 'The saved cover could not be loaded.',
    coverLoading: 'Loading cover…',
    coverAlt: 'Book cover',
    coverConflict:
      'This book has changed. Load the latest book details before trying again.',
    coverReload: 'Load latest book details',
    coverCleanupPending:
      'The change is saved. Some old cover files remain queued for cleanup on the next cover operation or app startup.',
    delete: 'Delete book',
    deleteDescription:
      'Permanently delete this book? This cannot be undone. Any unsaved edits for this book will also be discarded.',
    confirmDelete: 'I understand that this deletion is permanent.',
    cancel: 'Cancel',
    deleting: 'Deleting…',
    deleted: 'Book deleted:',
    deleteFailure:
      'Could not delete the book. It remains in your library. Please try again.',
    deleteConflict:
      'This book has changed. Load the latest details and confirm again before deleting.',
    deleteMissing:
      'This book is no longer available. No deletion was confirmed. Close this dialog and reopen the library later.',
    deleteCover:
      'This book has a cover. Deletion is unavailable until safe cover cleanup is supported.',
    deleteReload: 'Load latest details',
    deleteReloadFailure:
      'Could not load the latest details. No deletion was performed. Please try again.',
    edit: 'Edit book',
    editDescription: 'Update the title, goals or deadline for this book.',
    save: 'Save changes',
    updating: 'Saving…',
    updated: 'Book updated:',
    editFailure:
      'Could not save changes. Your draft is kept. Please try again.',
    conflict:
      'This book has changed elsewhere. Your draft is kept. Load the latest details before editing again.',
    missing: 'This book is no longer available. Your draft is kept.',
    replaceDraft: 'Replace draft with latest details',
    reloading: 'Loading latest details…',
    reloadFailure:
      'Could not load the latest details. Your draft is kept. Please try again.',
    books: 'Books',
    loading: 'Loading books…',
    loadFailure: 'Could not load your books. Please try again.',
    retry: 'Retry loading books',
    empty: 'No books yet. Create your first story.',
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
