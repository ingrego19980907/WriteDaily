/** Real embedded WebView2 editor verification. All fault injection targets its fresh private DB. */
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { expect, type Page } from '@playwright/test'
import type { Editor } from '@tiptap/core'
import type {
  Chapter,
  ChapterSummary,
} from '../../src/features/editor/chapter.ts'
import type { EditorPreferences } from '../../src/features/editor/editor-preferences.ts'

type Harness = {
  run: string
  databasePath: string
  launch: (stage: string) => Promise<Page>
  close: () => Promise<void>
  forceStop: (reason: string) => Promise<void>
  nativeWindow: (close?: boolean, screenshot?: string) => string
  report: { stages: unknown[] }
}

async function invoke<T>(
  page: Page,
  command: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    async ({ command, args }) => {
      const bridge = (
        globalThis as unknown as {
          __TAURI_INTERNALS__: {
            invoke: (
              command: string,
              args: Record<string, unknown>,
            ) => Promise<unknown>
          }
        }
      ).__TAURI_INTERNALS__
      return (await bridge.invoke(command, args)) as T
    },
    { command, args },
  )
}
const field = (page: Page) =>
  page.getByRole('textbox', { name: 'Chapter manuscript' })
const status = (page: Page) =>
  page.getByRole('status', { name: 'Save status', exact: true })
async function editorJson(page: Page) {
  return field(page).evaluate((element) =>
    (element as HTMLElement & { editor: Editor }).editor.getJSON(),
  )
}
async function append(page: Page, text: string) {
  await field(page).click()
  await field(page).evaluate((element) => {
    const editor = (element as HTMLElement & { editor: Editor }).editor
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  })
  await page.keyboard.insertText(text)
}
async function manualSave(page: Page) {
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(status(page)).toHaveText('Chapter text saved.')
}
async function openBook(page: Page, title: string) {
  await page
    .getByRole('article', { name: title, exact: true })
    .getByRole('button', { name: 'Open book', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Chapters', exact: true }),
  ).toBeVisible()
}
async function startWriting(page: Page) {
  const start = page.getByRole('button', { name: 'Start writing', exact: true })
  if (await start.count()) await start.click()
  await expect(field(page)).toHaveAttribute('contenteditable', 'true')
}
async function previewChapter(page: Page) {
  const exit = page.getByRole('button', {
    name: 'Exit focus mode',
    exact: true,
  })
  if (await exit.count()) await exit.click()
}
async function openChapter(page: Page, index = 0) {
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .nth(index)
    .click()
  await startWriting(page)
  await expect(field(page)).toHaveAttribute('contenteditable', 'true')
}
async function pauseDebounce(page: Page) {
  await page.clock.install({ time: new Date('2026-10-26T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-26T12:01:00Z'))
}

export async function verifyEditorRestart(h: Harness) {
  assert(
    path.resolve(h.databasePath).startsWith(path.resolve(h.run) + path.sep),
    'Fault database must stay within this fresh run.',
  )
  function database(writable = false) {
    const db = new DatabaseSync(h.databasePath, { readOnly: !writable })
    assert.equal(
      db.prepare('PRAGMA application_id').get()?.application_id,
      1464090969,
    )
    assert.equal(db.prepare('PRAGMA user_version').get()?.user_version, 8)
    return db
  }
  function rows() {
    const db = database()
    try {
      assert.equal(
        db.prepare('PRAGMA integrity_check').get()?.integrity_check,
        'ok',
      )
      assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), [])
      return {
        books: db.prepare('SELECT * FROM books ORDER BY id').all(),
        chapters: db.prepare('SELECT * FROM chapters ORDER BY id').all(),
        preferences: db.prepare('SELECT * FROM editor_preferences').all(),
      }
    } finally {
      db.close()
    }
  }
  async function capture(page: Page, stage: string, bookId: string) {
    const chapters = await invoke<ChapterSummary[]>(page, 'list_chapters', {
      bookId,
    })
    const documents = await Promise.all(
      chapters.map((chapter) =>
        invoke<Chapter>(page, 'get_chapter', { bookId, id: chapter.id }),
      ),
    )
    const preferences = await invoke<EditorPreferences>(
      page,
      'get_editor_preferences',
    )
    await page.screenshot({
      path: path.join(h.run, `${stage}-webview.png`),
      fullPage: true,
    })
    h.nativeWindow(false, path.join(h.run, `${stage}-window.png`))
    const snapshot = { stage, documents, preferences }
    h.report.stages.push(snapshot)
    return snapshot
  }
  const title = 'Перезапуск редактора — тестова книга'
  const chapterTitle = 'Однаковий заголовок'
  let page = await h.launch('editor-1-create-format-save')
  await expect(
    page.getByText(
      'Create your first book and begin writing, one day at a time.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Create book', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create book', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const books = await invoke<Array<{ id: string }>>(page, 'list_books')
  assert.equal(books.length, 1)
  const bookId = books[0].id
  await openBook(page, title)
  for (let index = 0; index < 2; index += 1) {
    await page
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await page.getByLabel('Chapter title', { exact: true }).fill(chapterTitle)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create chapter', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Edit chapter text', exact: true }),
    ).toHaveCount(index + 1)
  }
  const initial = await invoke<ChapterSummary[]>(page, 'list_chapters', {
    bookId,
  })
  assert.equal(initial.length, 2)
  const [first, second] = initial
  assert.notEqual(first.id, second.id)
  await openChapter(page)
  await field(page).fill('Україна п’ять foo-bar 12,500.75 é <tag>')
  await field(page).press('Control+a')
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' })
  await toolbar.getByRole('button', { name: 'Bold', exact: true }).click()
  await toolbar.getByRole('button', { name: 'Italic', exact: true }).click()
  await toolbar.getByRole('button', { name: 'H2', exact: true }).click()
  await append(page, '')
  await field(page).press('Enter')
  const paragraph = toolbar.getByRole('button', {
    name: 'H2',
    exact: true,
  })
  if ((await paragraph.getAttribute('aria-pressed')) !== 'true')
    await paragraph.click()
  await toolbar
    .getByRole('button', { name: 'Numbered list', exact: true })
    .click()
  await page.keyboard.insertText('First list item')
  await page.keyboard.press('Enter')
  await page.keyboard.insertText('Second list item')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  if ((await paragraph.getAttribute('aria-pressed')) !== 'true')
    await paragraph.click()
  await toolbar
    .getByRole('button', { name: 'Bullet list', exact: true })
    .click()
  await page.keyboard.insertText('Bullet branch')
  await manualSave(page)
  await expect(field(page).locator('h2 strong em')).toHaveText(
    'Україна п’ять foo-bar 12,500.75 é <tag>',
  )
  await expect(field(page).locator('ol li')).toHaveCount(2)
  await expect(field(page).locator('ul li')).toHaveCount(1)
  await field(page).press('Control+a')
  await page
    .getByRole('combobox', { name: 'Manuscript text size' })
    .selectOption('24')
  await manualSave(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  let expectedUi = await editorJson(page)
  const firstSnapshot = await capture(page, 'editor-first', bookId)
  assert.equal(firstSnapshot.documents[0].wordCount, 14)
  await h.close()
  const firstRows = rows()

  page = await h.launch('editor-2-restore-navigation-native-close')
  await openBook(page, title)
  await openChapter(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  assert.deepEqual(await editorJson(page), expectedUi)
  assert.deepEqual(
    await invoke<Chapter>(page, 'get_chapter', { bookId, id: first.id }),
    firstSnapshot.documents[0],
  )
  assert.deepEqual(rows(), firstRows)
  await startWriting(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  await append(page, ' rapid')
  const rapidUi = await editorJson(page)
  await previewChapter(page)
  await page
    .getByRole('button', { name: 'Next chapter', exact: true })
    .evaluate((element) => {
      ;(element as HTMLButtonElement).click()
      ;(element as HTMLButtonElement).click()
    })
  await expect(
    page.getByRole('combobox', { name: 'Choose chapter' }),
  ).toHaveValue(second.id)
  await startWriting(page)
  const flushed = await invoke<Chapter>(page, 'get_chapter', {
    bookId,
    id: first.id,
  })
  assert.equal(flushed.revision, firstSnapshot.documents[0].revision + 1)
  assert.equal(flushed.wordCount, 15)
  await field(page).fill('Другий розділ — збережено автоматично.')
  await expect(status(page)).toHaveText('Chapter text saved.')
  const savedSecond = await invoke<Chapter>(page, 'get_chapter', {
    bookId,
    id: second.id,
  })
  assert.equal(savedSecond.wordCount, 4)
  await previewChapter(page)
  await page
    .getByRole('button', { name: 'Previous chapter', exact: true })
    .evaluate((element) => {
      ;(element as HTMLButtonElement).click()
      ;(element as HTMLButtonElement).click()
    })
  await expect(
    page.getByRole('combobox', { name: 'Choose chapter' }),
  ).toHaveValue(first.id)
  await startWriting(page)
  assert.deepEqual(await editorJson(page), rapidUi)
  await pauseDebounce(page)
  await append(page, ' unsaved close')
  h.nativeWindow(true)
  await expect(page.getByRole('alert')).toContainText(
    'There is unsaved writing',
  )
  await manualSave(page)
  expectedUi = await editorJson(page)
  await page.clock.resume()
  const committed = await capture(page, 'editor-before-crash', bookId)
  assert.equal(committed.documents[0].wordCount, 17)
  await h.close()
  const committedRows = rows()

  page = await h.launch('editor-3-uncommitted-memory-interruption')
  await openBook(page, title)
  await openChapter(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  assert.deepEqual(await editorJson(page), expectedUi)
  await pauseDebounce(page)
  await append(page, ' IN_MEMORY_ONLY')
  await expect(status(page)).toHaveText('Unsaved changes: waiting to save.')
  await page.screenshot({
    path: path.join(h.run, 'editor-memory-only-webview.png'),
  })
  await h.forceStop('unsaved-memory-before-debounce')
  assert.deepEqual(rows(), committedRows)
  h.report.stages.push({
    stage: 'memory-boundary',
    lastCommitPreserved: true,
    unsavedMemoryDurable: false,
  })

  page = await h.launch('editor-4-active-sqlite-write-interruption')
  await openBook(page, title)
  await openChapter(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  assert.deepEqual(await editorJson(page), expectedUi)
  await expect(field(page)).not.toContainText('IN_MEMORY_ONLY')
  const fault = database(true)
  fault.exec(`CREATE TRIGGER editor_interrupt_probe AFTER UPDATE OF content_json ON chapters BEGIN
    SELECT sum(n) FROM (WITH RECURSIVE step(n) AS (SELECT 0 UNION ALL SELECT n+1 FROM step WHERE n<1000000000) SELECT n FROM step);
    END;`)
  await append(page, ' UNCOMMITTED_SAVE')
  await page
    .getByRole('button', { name: 'Save chapter text', exact: true })
    .click()
  await expect(status(page)).toHaveText('Saving chapter text…')
  // Prove the native transaction owns the writer lock before killing it. The
  // trigger performs bounded-memory CPU work, no large inserts or file writes.
  fault.exec('PRAGMA busy_timeout=0')
  await expect
    .poll(
      () => {
        try {
          fault.exec('BEGIN IMMEDIATE; ROLLBACK;')
          return false
        } catch (error) {
          if (error instanceof Error && /locked|busy/i.test(error.message))
            return true
          throw error
        }
      },
      { timeout: 5000 },
    )
    .toBe(true)
  fault.close() // Leave the app as the only connection before abrupt termination.
  await page.screenshot({
    path: path.join(h.run, 'editor-interrupted-write-webview.png'),
  })
  await expect(status(page)).not.toHaveText('Chapter text saved.')
  await h.forceStop('active-native-sqlite-transaction')
  // No SQLite connection reopens this database until the next real app launch.

  page = await h.launch('editor-5-sqlite-recovery-and-successful-retry')
  assert.deepEqual(rows(), committedRows)
  await openBook(page, title)
  await openChapter(page)
  await expect(
    field(page).locator('span[data-font-size="24"]').first(),
  ).toHaveCSS('font-size', '24px')
  assert.deepEqual(await editorJson(page), expectedUi)
  assert.deepEqual(
    await invoke<Chapter>(page, 'get_chapter', { bookId, id: first.id }),
    committed.documents[0],
  )
  assert.deepEqual(
    await invoke<Chapter>(page, 'get_chapter', { bookId, id: second.id }),
    savedSecond,
  )
  const cleanup = database(true)
  cleanup.exec('DROP TRIGGER editor_interrupt_probe')
  cleanup.close()
  await append(page, ' recovered')
  await manualSave(page)
  await field(page).press('Control+a')
  await page
    .getByRole('combobox', { name: 'Manuscript text size' })
    .selectOption('32')
  await manualSave(page)
  expectedUi = await editorJson(page)
  await expect(
    field(page).locator('span[data-font-size="32"]').first(),
  ).toHaveCSS('font-size', '32px')
  const recovered = await capture(page, 'editor-recovered', bookId)
  assert.equal(recovered.documents[0].wordCount, 18)
  assert.equal(
    recovered.documents[0].revision,
    committed.documents[0].revision + 2,
  )
  await h.close()
  const recoveredRows = rows()

  page = await h.launch('editor-6-final-restart-after-recovery')
  assert.deepEqual(rows(), recoveredRows)
  await openBook(page, title)
  await openChapter(page)
  await expect(
    field(page).locator('span[data-font-size="32"]').first(),
  ).toHaveCSS('font-size', '32px')
  assert.deepEqual(await editorJson(page), expectedUi)
  assert.deepEqual(
    await invoke<Chapter>(page, 'get_chapter', { bookId, id: first.id }),
    recovered.documents[0],
  )
  await capture(page, 'editor-final', bookId)
  await h.close()
  assert.deepEqual(rows(), recoveredRows)
  await writeFile(
    path.join(h.run, 'editor-evidence.json'),
    JSON.stringify(
      {
        firstSnapshot,
        committed,
        recovered,
        firstRows,
        committedRows,
        recoveredRows,
      },
      null,
      2,
    ),
  )
}
