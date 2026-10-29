export const en = {
  libraryView: {
    searchLabel: 'Search books',
    searchPlaceholder: 'Search books...',
    viewLabel: 'Book view',
    grid: 'Grid view',
    list: 'List view',
    emptyTitle: 'No books found',
    clearSearch: 'Clear search',
    emptyHint:
      'Try another title, clear your search, or choose a different book filter.',
    results: (count: number) =>
      `${new Intl.NumberFormat('en').format(count)} ${count === 1 ? 'book matches' : 'books match'} your search and filters.`,
  },
  libraryFilters: {
    title: 'Filter books',
    labels: {
      all: 'All Books',
      'in-progress': 'In Progress',
      completed: 'Completed',
    },
    archived: 'Archived',
    archiveUnavailable: 'Archiving is not available yet.',
    countsLoading: 'Book counts are loading.',
    countsUnavailable:
      'Book counts are unavailable until the library loads successfully.',
    name: (label: string, count: number | null) =>
      count === null
        ? `${label} ? (count unavailable)`
        : `${label} ${new Intl.NumberFormat('en').format(count)} ${count === 1 ? 'book' : 'books'}`,
    emptyTitle: 'No books match this filter',
    emptyHint: 'Choose All Books or another filter to see your books.',
  },
  writingStatistics: {
    title: 'Writing statistics',
    streak: 'Current streak',
    words: 'Words written today',
    goals: 'Daily goals completed',
    loading: 'Loading…',
    unavailable: 'Unavailable',
    day: 'day',
    days: 'days',
    today: 'today',
    atLeast: 'At least',
    partial: 'Confirmed days only; earlier history is incomplete.',
    unknown: 'Not enough recorded history to confirm a streak.',
    failure: 'Saved activity could not be loaded.',
    wordsHint: 'Saved credited words for the current local day.',
    goalsHint:
      'Recorded book goals reached today, across all books, including retained history.',
  },
  editorEntry: {
    title: 'Choose a book to edit',
    hint: 'Select a book from your library to continue writing.',
    start: 'Start editing',
    choose: 'Choose a book',
    book: 'Book',
    placeholder: 'Select a book',
    open: 'Open selected book',
    reload: 'Reload books',
    empty: 'No books have been created yet.',
    failure: 'Could not load your books. Try again.',
    desktop: 'Open the desktop app to choose a saved book.',
    option: (title: string, number: number) => `${number}. ${title}`,
  },
  schedule: {
    title: 'Preferred writing days',
    explanation:
      'Choose your weekly writing days for all books. Changes apply from the next local day. Earlier goals and schedules stay unchanged.',
    choose: 'Writing days',
    weekdays: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ],
    loading: 'Loading writing schedule...',
    unavailable: 'Writing schedule could not be loaded. Reload to try again.',
    save: 'Save writing days',
    saving: 'Saving writing days...',
    reload: 'Reload writing days',
    emptyHint:
      'Unselected days are rest days. Rest days do not add to or break a streak.',
    paused:
      'No writing days selected. Writing remains available; scheduled goals are paused.',
    effective: (date: string) => `Latest schedule applies from ${date}.`,
    saved: (date: string) => `Writing days saved. Applies from ${date}.`,
    conflict:
      'The schedule changed elsewhere. Your selection is retained. Reload before saving again.',
    failure:
      'Writing days could not be saved. Your selection is retained. Check the local date and retry.',
  },
  activity: {
    scheduledDay: 'Scheduled writing day.',
    restDay: 'Rest day.',
    longestStreak: 'Longest recorded writing streak',
    longestLoading: 'Loading longest streak...',
    longestUnavailable: 'Longest streak could not be loaded. Try refreshing.',
    longestLimited:
      'Goal or schedule history has gaps. This is the longest confirmed run; the actual record may be longer.',
    longestDates: (start: string, end: string) => `${start} – ${end}`,
    longestHistory: (start: string) =>
      `Based on recorded history since ${start}. Earlier activity is not inferred.`,
    currentStreak: 'Current writing streak',
    refreshStreak: 'Refresh streak',
    streakLoading: 'Loading streak...',
    streakUnavailable: 'Streak could not be loaded. Try refreshing.',
    streakDays: (days: string, count: number) =>
      `${days} completed ${count === 1 ? 'day' : 'days'}`,
    streakAtLeast: (days: string, count: number) =>
      `At least ${days} completed ${count === 1 ? 'day' : 'days'}`,
    streakUnknown: 'Not enough recorded history to confirm a streak.',
    streakLimited:
      'Earlier goal or schedule history is incomplete. Only the confirmed part of the streak is shown.',
    streakGrace:
      'Today has not added a completed day yet. It has until local midnight.',
    streakToday: (date: string, words: string) =>
      `Today (${date}): ${words} credited words`,
    streakLast: (date: string) => `Last completed day: ${date}`,
    streakGlobalPolicy:
      'A day counts once when at least one scheduled book goal is reached. Current streak is based on today, independently of the month being viewed.',
    streakBookPolicy:
      'Scheduled days count when the saved daily goal is reached. Confirmed days off are skipped; missing history is not assumed to be a day off.',
    month: 'Month',
    book: 'Book',
    allBooks: 'All books, including removed books',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
    refresh: 'Refresh activity',
    invalidMonth: 'Choose a month between January 0001 and December 9999.',
    clockUnavailable:
      'The current local date is unavailable. Choose a month to view activity.',
    loading: 'Loading activity...',
    desktop: 'Open the desktop app to view saved writing activity.',
    failure: 'Could not load activity. Refresh to try again.',
    missingBook:
      'This book is no longer available. Choose All books to view retained history.',
    invalidData:
      'Saved activity could not be read safely. Refresh to retry; existing data has not been changed.',
    limit:
      'Activity totals exceed the supported range. Try another month or book.',
    booksFailure: 'Book names could not be loaded. Refresh to try again.',
    unavailableBook: 'Unavailable book',
    removedBook: (number: number) => `Removed book ${number}`,
    unnamedBook: (number: number) => `Book ${number} (name unavailable)`,
    calendar: 'Writing activity calendar',
    calendarScroll: 'Calendar, scroll horizontally if needed',
    keyboardHint:
      'Select a day for details. Use arrow keys to move between days, Home for the first day and End for the last.',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekdayNames: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    legend: 'Credited words per day',
    levels: ['0', '1–249', '250–499', '500–999', '1,000+'],
    dayLabel: (date: string, words: string, saves: string) =>
      `${date}: ${words} credited words, ${saves} saves. Select for details.`,
    monthTotals: 'Month totals',
    credited: 'Credited words',
    added: 'Added words',
    deleted: 'Deleted words',
    saves: 'Saves',
    activeDays: 'Active days',
    totalUnavailable: 'The monthly total is too large to display.',
    emptyMonth: 'No writing activity recorded this month.',
    emptyDay: 'No writing activity recorded for this day.',
    dayDetails: (date: string) => `Activity for ${date}`,
    goals: 'Daily book goals',
    noPlans: 'No historical goal snapshot is available for this day.',
    goalProgress: (words: string, goal: string) =>
      `${words} / ${goal} credited words`,
    reached: 'Daily goal reached',
    pending: (words: string) => `${words} words remaining`,
    unconfigured: 'No daily goal was configured for this day.',
    unscheduled: 'This was not a scheduled writing day.',
    policy:
      'Only saved editor activity counts. Paste is included; imports and restores are excluded. Deletions do not remove earlier credit.',
    planPolicy:
      'Daily results use the goal saved for that day. Later goal changes do not rewrite these results.',
    savePolicy:
      'Saves count committed editor operations for this day, including formatting. They do not measure writing time.',
  },
  library: {
    actions: 'Book actions',
    create: 'Create book',
    newBook: 'New Book',
    createTitle: 'Create New Book',
    createBookTitle: 'Book title',
    createCoverLabel: 'Cover image (optional)',
    createCoverHint: 'Add a cover now, or choose one later.',
    createCoverPartial:
      'Your book was created, but its cover was not saved. Retry the cover or finish without it. Retrying will not create another book.',
    createCoverConflict:
      'This book has changed. Finish without a cover, then open Manage cover from its actions menu.',
    finishWithoutCover: 'Finish without cover',
    retryCreateCover: 'Retry cover',
    open: 'Open book',
    openShort: 'Open',
    titleHelp: 'Focus or hover to read the full title.',
    progressCounts: (words: string, target: string) =>
      `${words} / ${target} words`,
    progressPercent: (value: string) => `${value}%`,
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
    bookWordCount: 'Book word count',
    savedBookWords: (words: string) => `Saved book words: ${words}`,
    wordsWritten: (words: string) => `${words} words written`,
    progressNoTarget: 'Set a word target to measure progress.',
    progressSummary: (words: string, target: string, percent: string) =>
      `${words} / ${target} words · ${percent}% of target`,
    wordsRemaining: (words: string) =>
      `${words} ${words === '1' ? 'word' : 'words'} remaining`,
    aboveTarget: (words: string) =>
      `${words} ${words === '1' ? 'word' : 'words'} above target`,
    targetReached: 'Word target reached',
    noTarget: 'No word target',
    wordTarget: (count: string) => `Target: ${count} words`,
    completed: 'Completed',
    cover: 'Cover image',
    coverChoose: 'Click to choose a cover image',
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
    coverDraftAlt: 'Unsaved cover preview',
    coverPreviewFailure:
      'This image could not be previewed. Choose a valid PNG, JPEG or WebP.',
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
    empty: 'Create your first book and begin writing, one day at a time.',
    emptyTitle: 'Your story starts here',
    createFirstBook: 'Create your first book',
    loadErrorTitle: 'Your library could not be loaded',
    desktopTitle: 'Desktop app required',
    retrying: 'Retrying…',
    validationSummary: 'Check the highlighted fields before saving.',
    close: 'Close',
    description: 'Give your story a title. Goals and a deadline are optional.',
    title: 'Title',
    titleHint: 'Up to 200 characters.',
    targetWordCount: 'Target word count (optional)',
    totalGoalHint:
      'Set a positive whole number of words for the book. Leave blank to remove the target.',
    dailyWordGoal: 'Daily word goal (optional)',
    dailyGoalHint:
      'Set a positive whole number of words per day. Leave blank to remove the goal. Once writing-day history is enabled, target changes apply from the next local day.',
    noDailyGoal: 'No daily goal',
    dailyGoalUnavailable: 'Daily goal unavailable',
    dailyGoalSummary: (words: string) => `Daily goal: ${words} words`,
    deadline: 'Deadline (optional)',
    deadlineHint:
      'Choose a date in your local calendar. Leave blank to remove the deadline. Past dates are allowed.',
    bookDeadline: 'Book deadline',
    deadlinePrefix: 'Deadline:',
    noDeadline: 'No deadline',
    deadlineUnavailable: 'Deadline unavailable',
    deadlineToday: 'Due today',
    deadlineCompleted: 'Book completed',
    writingPace: 'Required writing pace',
    paceSummary: (words: string, count: number) =>
      `${words} ${count === 1 ? 'word' : 'words'} per writing day`,
    paceDays: (days: string, count: number) =>
      `${days} writing ${count === 1 ? 'day' : 'days'} available, including today and the deadline when scheduled.`,
    paceCompleted: 'Book completed. No writing pace needed.',
    paceUnavailable: 'Writing pace unavailable.',
    paceNoTarget: 'Set a total word target to calculate your pace.',
    paceNoDeadline: 'Set a deadline to calculate your pace.',
    paceOverdue: 'Deadline passed. Choose a new date to calculate your pace.',
    paceNoWritingDays: 'No scheduled writing days remain before the deadline.',
    paceTargetReached: 'Word target reached. No additional words needed.',
    deadlineRemaining: (days: string, count: number) =>
      `${days} ${count === 1 ? 'day' : 'days'} left`,
    deadlineOverdue: (days: string, count: number) =>
      `${days} ${count === 1 ? 'day' : 'days'} overdue`,
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
    dragChapter: 'Drag to reorder chapter',
    orderHint:
      'Drag the dotted handle to reorder chapters, or use the up and down buttons.',
    moveUp: (title: string) => `Move chapter up: ${title}`,
    moveDown: (title: string) => `Move chapter down: ${title}`,
    orderSaving: 'Saving chapter order...',
    orderSaved: 'Chapter order saved.',
    orderFailure:
      'Could not save the chapter order. The displayed order is unchanged. Try again or reload chapters.',
    orderConflict:
      'Chapters changed elsewhere. Reload chapters before reordering again.',
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
    countPlaceholder: '\u2014',
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
    underline: 'Underline',
    alignment: {
      left: 'Align left',
      center: 'Align center',
      right: 'Align right',
      justify: 'Justify',
    },
    paragraph: 'Paragraph',
    heading: (level: number) => `Heading ${level}`,
    compactHeading: (level: number) => `H${level}`,
    bulletList: 'Bullet list',
    orderedList: 'Numbered list',
    undo: 'Undo',
    redo: 'Redo',
    title: 'Chapter text',
    addPage: 'Add page',
    addPageHint: 'Add an A4 page at the end of this chapter.',
    enterFocus: 'Start writing',
    exitFocus: 'Exit focus mode',
    previewHint: 'Preview. Select Start writing to edit this chapter.',
    focusHint:
      'Focus mode hides chapter navigation, formatting controls and word counts. Press Escape or Exit focus mode to return. Changes still save automatically.',
    description: 'Changes save automatically after 2 seconds without editing.',
    label: 'Chapter manuscript',
    loading: 'Loading saved chapter text…',
    loadFailure:
      'Could not load this chapter. No text has been replaced. Close and try again.',
    invalid:
      'This saved content cannot be safely opened in this editor. No changes were made.',
    close: 'Close',
    save: 'Save chapter text',
    saveShortcut: 'Save chapter text (Ctrl+S / Command+S)',
    saving: 'Saving chapter text…',
    saved: 'Chapter text saved.',
    saveStatus: 'Save status',
    savePreparing: 'Preparing safe editing.',
    saveUnchanged: 'No unsaved changes.',
    saveWaiting: 'Unsaved changes: waiting to save.',
    savePaused: 'Not saved: automatic saving is paused.',
    saveBlocked: 'Not saved: saving is blocked.',
    saveUnavailable: 'Saving is unavailable.',
    failure:
      'Could not save the chapter text. Your writing is kept in this editor. Automatic saving is paused. Choose Save chapter text to try again.',
    activityFailure:
      'Writing activity could not be captured safely. Your text is kept here. Copy it before closing; nothing has been reported as saved.',
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
  editorPreferences: {
    title: 'Editor settings',
    fontSize: 'Manuscript text size',
    fontFamily: 'Manuscript font family',
    size: (size: number) => `${size} px`,
    hint: 'Choose a size from 12 to 32 px and save it for all chapters. Only manuscript display changes; your text and formatting stay the same.',
    save: 'Save editor settings',
    decrease: 'Decrease text size',
    increase: 'Increase text size',
    mixed: 'Mixed',
    selectionHint:
      'Applies to selected text, or text you type next. Changes save with the chapter.',
    retry: 'Retry saving settings',
    autoHint:
      'Text size changes save automatically. The size is applied after saving succeeds.',
    saving: 'Saving editor settings…',
    saved: 'Editor settings saved.',
    loading: 'Loading editor settings…',
    status: 'Editor settings status',
    loadFailure:
      'Could not load saved editor settings. The current display size is unchanged. Load saved settings before making changes.',
    failure:
      'Could not save editor settings. The previous size still applies and your chosen size is kept. Try saving again.',
    conflict:
      'Editor settings changed elsewhere. Your chosen size is kept. Load saved settings before trying again.',
    invalid:
      'Saved editor settings could not be safely updated. No size was changed. Load saved settings before trying again.',
    reload: 'Load saved settings',
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
    navigationLabels: {
      library: 'My Library',
      editor: 'Writing Editor',
      goals: 'Goals',
      activity: 'Activity',
      achievements: 'Achievements',
    },
    statistics: 'Statistics',
    statisticsUnavailable: 'Statistics is not available yet.',
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
