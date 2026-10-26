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
    wordsWritten: (words: string) => `${words} words written`,
    progressNoTarget: 'Set a word target to measure progress.',
    progressSummary: (words: string, target: string, percent: string) =>
      `${words} / ${target} words · ${percent}% of target`,
    wordsRemaining: (words: string) => `${words} words remaining`,
    aboveTarget: (words: string) => `${words} words above target`,
    targetReached: 'Word target reached',
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
    emptyTitle: 'Room for your next story',
    emptyHint:
      'Choose Create book to give it a title. Goals and a deadline can wait.',
    loadErrorTitle: 'Your library could not be loaded',
    desktopTitle: 'Desktop app required',
    retrying: 'Retrying…',
    validationSummary: 'Check the highlighted fields before saving.',
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
  chapters: {
    open: 'Edit chapter text',
    textSaved: (title: string) => `Chapter text saved: ${title}`,
    heading: 'Chapters',
    create: 'Create chapter',
    rename: 'Rename chapter',
    delete: 'Delete chapter',
    title: 'Chapter title',
    titleHint: 'Up to 200 characters. Duplicate titles are allowed.',
    createDescription: 'Give the next chapter of this book a title.',
    renameDescription: 'Change the title. The saved chapter text stays intact.',
    deleteDescription:
      'Permanently delete this chapter and all its saved text? This cannot be undone.',
    confirmDelete:
      'I understand that the chapter and its text will be permanently deleted.',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save title',
    creating: 'Creating…',
    saving: 'Saving…',
    deleting: 'Deleting…',
    created: (title: string) => `Chapter created: ${title}`,
    renamed: (title: string) => `Chapter renamed: ${title}`,
    deleted: (title: string) => `Chapter deleted: ${title}`,
    draft: 'Your unfinished title is kept when you close this form.',
    loading: 'Loading chapters…',
    empty: 'No chapters yet. Create the first chapter of this book.',
    pending: 'Open a chapter to write. Save your text manually.',
    loadFailure:
      'Could not load the chapters. Existing rows are kept. Retry before making changes.',
    retry: 'Retry loading chapters',
    refresh: 'Reload chapters',
    missingList:
      'This book is no longer available. Return to the library and load it again.',
    desktop: 'Open the desktop app to manage saved chapters.',
    createFailure:
      'Could not create the chapter. Your title is kept. Please try again.',
    renameFailure:
      'Could not rename the chapter. Your title is kept. Please try again.',
    deleteFailure:
      'Could not delete the chapter. No deletion was confirmed. Please try again.',
    conflict:
      'This chapter has changed. Load the latest revision before trying again. Your title draft is kept.',
    deleteConflict:
      'This chapter has changed. Load the latest details and confirm again before deleting.',
    missing:
      'The chapter or its book is no longer available. Close this dialog and reload the chapters. Your title draft is kept.',
    storedFailure:
      'Saved chapter data could not be safely read. No changes were made. Keep the existing database for recovery.',
    limit: 'The chapter has reached a storage limit. No changes were made.',
    reload: 'Load latest revision and keep draft',
    reloadDelete: 'Load latest chapter details',
    reloading: 'Loading latest revision…',
    reloadFailure:
      'Could not load the latest revision. Nothing was changed. Please try again.',
    validationSummary: 'Check the chapter title before saving.',
    errors: {
      required: 'Enter a chapter title.',
      invalid_type: 'Enter a valid chapter title.',
      invalid_title: 'Remove control characters from the title.',
      too_long: 'Use no more than 200 characters.',
    },
  },
  writing: {
    wordCounts: 'Word count',
    currentWords: (count: string) =>
      `${count} ${count === '1' ? 'word' : 'words'} in current text`,
    savedWords: (count: string) =>
      `${count} saved ${count === '1' ? 'word' : 'words'}`,
    savedWordsUnknown: 'Saved word count unavailable',
    wordsUnknown: 'Current word count unavailable',
    wordCountHint:
      'The current count includes unsaved edits. Internal apostrophes and hyphens join words; numbers also count.',
    navigation: 'Chapter navigation',
    chooseChapter: 'Choose chapter',
    previousChapter: 'Previous chapter',
    nextChapter: 'Next chapter',
    switching: 'Saving changes and opening the selected chapter…',
    switchFailure:
      'Could not open the selected chapter. Your current chapter is still open. Please try again.',
    retryChapter: 'Retry opening chapter',
    navigationHint:
      'Switching chapters saves your current changes first. A failed save keeps you in the current chapter.',
    toolbar: 'Text formatting',
    toolbarHint:
      'Use Left and Right Arrow, Home or End to move between formatting buttons. Press Enter or Space to apply, then continue writing.',
    bold: 'Bold',
    italic: 'Italic',
    paragraph: 'Paragraph',
    heading: (level: number) => `Heading ${level}`,
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
    undo: 'Undo',
    redo: 'Redo',
    title: 'Chapter text',
    description:
      'Edit this chapter and save it manually. Paste inserts plain text. Automatic saving is not enabled yet.',
    label: 'Chapter manuscript',
    loading: 'Loading saved chapter text…',
    loadFailure:
      'Could not load this chapter. No text has been replaced. Close and try again.',
    invalid:
      'This saved content cannot be safely opened in this editor. No changes were made.',
    close: 'Close',
    save: 'Save chapter text',
    saving: 'Saving chapter text…',
    saved: 'Chapter text saved.',
    failure:
      'Could not save the chapter text. Your writing is kept in this editor. Please try again.',
    storedFailure:
      'Saved chapter data could not be safely read. Your writing is kept here. Copy any text you need before closing.',
    conflict:
      'This chapter changed elsewhere. Your writing is kept here. Copy any text you need before closing; a stale revision will not overwrite the saved chapter.',
    missing:
      'This chapter is no longer available. Your writing is kept here. Copy any text you need before closing.',
    unsaved:
      'There is unsaved writing. Save it before closing, or explicitly discard the changes.',
    pending: 'A save is in progress. Wait for it to finish before closing.',
    guardFailure:
      'Writing is unavailable because safe window-close handling could not be installed. The saved chapter is unchanged.',
    rejected:
      'That edit exceeds the supported document limits. It was not applied; your previous text is kept.',
    pasteRejected:
      'Only plain text can be pasted here. Files and drag-and-drop are not supported.',
    discardCheck: 'I understand that my unsaved chapter changes will be lost.',
    discard: 'Discard changes and close',
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
