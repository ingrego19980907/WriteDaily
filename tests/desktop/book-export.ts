/** Whole-book export through the real native picker; only private harness records/files. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { expect } from '@playwright/test'
import type { Book } from '../../src/features/library/book.ts'
import type {
  Chapter,
  ChapterSummary,
} from '../../src/features/editor/chapter.ts'
import { facts, invoke, type Harness } from './chapter-export.ts'

export async function verifyBookExport(h: Harness) {
  let page = await h.launch('book-export-1-save-reorder')
  const book = await invoke<Book>(page, 'create_book', {
    details: {
      title: 'Повна книга — тест',
      targetWordCount: null,
      dailyWordGoal: null,
      deadline: null,
    },
  })
  const created: Chapter[] = []
  for (const title of ['Zulu', 'Однакова назва', 'Однакова назва'])
    created.push(
      await invoke<Chapter>(page, 'create_chapter', {
        bookId: book.id,
        details: { title },
      }),
    )
  await page.reload()
  const rows = () =>
    page.getByRole('list', { name: 'Chapters' }).getByRole('listitem')
  const openBook = async () => {
    await page
      .getByRole('article', { name: book.title, exact: true })
      .getByRole('button', { name: 'Open book', exact: true })
      .click()
    await expect(rows()).toHaveCount(3)
  }
  await openBook()
  for (const [index, text] of [
    'Alpha content <b>literal</b>',
    'Другий текст 🌿 e\u0301',
  ].entries()) {
    await rows()
      .nth(index)
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Start writing', exact: true })
      .click()
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    await field.fill(text)
    await field.press('Control+s')
    await expect(
      page.getByRole('status', { name: 'Save status', exact: true }),
    ).toHaveText('Chapter text saved.')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
  }
  await rows()
    .nth(2)
    .getByRole('button', { name: /^Move chapter up:/ })
    .click()
  await expect(
    page.getByText('Chapter order saved.', { exact: true }),
  ).toBeVisible()
  await rows()
    .nth(1)
    .getByRole('button', { name: /^Move chapter up:/ })
    .click()
  const summaries = await invoke<ChapterSummary[]>(page, 'list_chapters', {
    bookId: book.id,
  })
  assert.deepEqual(
    summaries.map((row) => row.id),
    [created[2].id, created[0].id, created[1].id],
  )
  const before = facts(h)
  const expected =
    'Повна книга — тест\n\nОднакова назва\n\n\n\n\nZulu\n\nAlpha content <b>literal</b>\n\n\nОднакова назва\n\nДругий текст 🌿 e\u0301\n'
  const exportButton = () => page.getByRole('button', { name: /^Export book:/ })
  const helper = fileURLToPath(new URL('./export-dialog.ps1', import.meta.url))
  const control = (
    action: 'Save' | 'Cancel',
    destination?: string,
    chapter = false,
  ) => {
    const processId = (JSON.parse(h.nativeWindow()) as { processId: number })
      .processId
    return JSON.parse(
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          helper,
          '-DesktopProcessId',
          String(processId),
          '-Action',
          action,
          '-DialogTitle',
          chapter ? 'Export chapter' : 'Export book',
          ...(destination
            ? [
                '-Destination',
                destination,
                '-ExpectedFileName',
                chapter ? 'Zulu.txt' : `${book.title}.txt`,
              ]
            : []),
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as unknown
  }
  try {
    await exportButton().click()
    const cancelled = control('Cancel')
    await expect(
      page.getByText('Book export cancelled.', { exact: true }),
    ).toBeVisible()
    assert.deepEqual(facts(h), before)
    const destination = path.join(h.run, 'whole-book.txt')
    await exportButton().click()
    const saved = control('Save', destination)
    await expect(
      page.getByText('Book exported: whole-book.txt', { exact: true }),
    ).toBeVisible()
    assert.equal(await readFile(destination, 'utf8'), expected)
    assert.deepEqual(facts(h), before)
    h.nativeWindow(false, path.join(h.run, 'book-export-native.png'))
    const chapterPath = path.join(h.run, 'chapter-regression.txt')
    await rows()
      .nth(1)
      .getByRole('button', { name: /^Export chapter:/ })
      .click()
    const savedChapter = control('Save', chapterPath, true)
    await expect(rows().nth(1).getByRole('status')).toHaveText(
      'Chapter exported: chapter-regression.txt',
    )
    assert.equal(
      await readFile(chapterPath, 'utf8'),
      'Zulu\n\nAlpha content <b>literal</b>\n',
    )
    assert.deepEqual(facts(h), before)
    h.report.stages.push({
      stage: 'whole-book-native-save',
      cancelled,
      saved,
      savedChapter,
      destination,
      orderedIds: summaries.map((row) => row.id),
      contentVerified: true,
      databaseUnchanged: true,
    })
    await h.close()
    page = await h.launch('book-export-2-restart')
    await openBook()
    assert.deepEqual(facts(h), before)
    const again = path.join(h.run, 'whole-book-after-restart.txt')
    await exportButton().click()
    const savedAgain = control('Save', again)
    await expect(
      page.getByText('Book exported: whole-book-after-restart.txt', {
        exact: true,
      }),
    ).toBeVisible()
    assert.equal(await readFile(again, 'utf8'), expected)
    assert.equal(await readFile(destination, 'utf8'), expected)
    assert.deepEqual(facts(h), before)
    h.report.stages.push({
      stage: 'whole-book-native-after-restart',
      savedAgain,
      destination: again,
      contentVerified: true,
      databaseUnchanged: true,
    })
    await h.close()
  } catch (error) {
    h.report.stages.push({
      stage: 'book-export-error',
      alerts: await page.getByRole('alert').allTextContents(),
      statuses: await page.getByRole('status').allTextContents(),
    })
    await page.screenshot({
      path: path.join(h.run, 'book-export-error.png'),
      fullPage: true,
    })
    try {
      control('Cancel')
    } catch {
      /* No remaining owned picker. */
    }
    throw error
  }
}
