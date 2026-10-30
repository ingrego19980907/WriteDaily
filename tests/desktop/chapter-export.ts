/** Real native picker/write verification, confined to the harness's private app data/artifacts. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { expect, type Page } from '@playwright/test'
import type { Book } from '../../src/features/library/book.ts'
import type {
  Chapter,
  ChapterSummary,
} from '../../src/features/editor/chapter.ts'

export type Harness = {
  run: string
  databasePath: string
  launch: (stage: string) => Promise<Page>
  close: (alreadyClosing?: boolean) => Promise<void>
  nativeWindow: (close?: boolean, screenshot?: string) => string
  report: { stages: unknown[] }
}
export async function invoke<T>(
  page: Page,
  command: string,
  args: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    async ({ command, args }) => {
      const bridge = (
        window as unknown as {
          __TAURI_INTERNALS__: {
            invoke: (
              command: string,
              args: Record<string, unknown>,
            ) => Promise<T>
          }
        }
      ).__TAURI_INTERNALS__
      return bridge.invoke(command, args)
    },
    { command, args },
  )
}
export function facts(h: Harness) {
  assert(
    path.resolve(h.databasePath).startsWith(path.resolve(h.run) + path.sep),
  )
  const db = new DatabaseSync(h.databasePath, { readOnly: true })
  try {
    return [
      'books',
      'chapters',
      'activity_operations',
      'writing_activity',
      'activity_day_plans',
      'achievement_unlocks',
      'achievement_notification_receipts',
    ].map((table) => db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all())
  } finally {
    db.close()
  }
}
export async function verifyChapterExport(h: Harness) {
  const helper = fileURLToPath(new URL('./export-dialog.ps1', import.meta.url))
  const control = (action: 'Save' | 'Cancel', destination?: string) => {
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
          ...(destination
            ? [
                '-Destination',
                destination,
                '-ExpectedFileName',
                'Однакова назва.txt',
              ]
            : []),
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as unknown
  }
  let page = await h.launch('export-1-create-and-save')
  const book = await invoke<Book>(page, 'create_book', {
    details: {
      title: 'Експорт — тестова книга',
      targetWordCount: null,
      dailyWordGoal: null,
      deadline: null,
    },
  })
  const chapters: Chapter[] = []
  for (let index = 0; index < 2; index++) {
    chapters.push(
      await invoke<Chapter>(page, 'create_chapter', {
        bookId: book.id,
        details: { title: 'Однакова назва' },
      }),
    )
  }
  // Native setup only touches the already-proven private database. Remount the
  // embedded application so its library reads those committed setup rows.
  await page.reload()
  const openBook = async () => {
    await page
      .getByRole('article', { name: book.title, exact: true })
      .getByRole('button', { name: 'Open book', exact: true })
      .click()
    await expect(
      page.getByRole('list', { name: 'Chapters' }).getByRole('listitem'),
    ).toHaveCount(2)
  }
  await openBook()
  const rows = () =>
    page.getByRole('list', { name: 'Chapters' }).getByRole('listitem')
  await rows()
    .nth(1)
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await field.fill('Привіт світе 🌿 literal <b>text</b>')
  await field.press('Control+s')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  const source = await invoke<Chapter>(page, 'get_chapter', {
    bookId: book.id,
    id: chapters[1].id,
  })
  const before = facts(h)
  const exportButton = () =>
    rows()
      .nth(1)
      .getByRole('button', { name: /^Export chapter:/ })
  try {
    await exportButton().click()
    const cancelled = control('Cancel')
    await expect(rows().nth(1).getByRole('status')).toHaveText(
      'Export cancelled.',
    )
    assert.deepEqual(facts(h), before)
    const destination = path.join(h.run, 'selected-chapter.txt')
    await exportButton().click()
    const saved = control('Save', destination)
    h.report.stages.push({ stage: 'export-native-save-request', saved })
    await expect(rows().nth(1).getByRole('status')).toHaveText(
      'Chapter exported: selected-chapter.txt',
    )
    const expected = 'Однакова назва\n\nПривіт світе 🌿 literal <b>text</b>\n'
    assert.equal(await readFile(destination, 'utf8'), expected)
    assert.deepEqual(facts(h), before)
    assert.deepEqual(
      await invoke<Chapter>(page, 'get_chapter', {
        bookId: book.id,
        id: source.id,
      }),
      source,
    )
    const first = await invoke<Chapter>(page, 'get_chapter', {
      bookId: book.id,
      id: chapters[0].id,
    })
    assert.equal(first.wordCount, 0)
    h.nativeWindow(false, path.join(h.run, 'chapter-export-native.png'))
    h.report.stages.push({
      stage: 'export-native-cancel-save',
      cancelled,
      saved,
      destination,
      revision: source.revision,
      contentVerified: true,
      databaseUnchanged: true,
    })
    await h.close()

    page = await h.launch('export-2-reopen-and-export')
    await openBook()
    const afterRestart = facts(h)
    assert.deepEqual(afterRestart, before)
    const again = path.join(h.run, 'after-restart.txt')
    await exportButton().click()
    const savedAgain = control('Save', again)
    await expect(rows().nth(1).getByRole('status')).toHaveText(
      'Chapter exported: after-restart.txt',
    )
    assert.equal(await readFile(again, 'utf8'), expected)
    assert.equal(await readFile(destination, 'utf8'), expected)
    assert.deepEqual(facts(h), before)
    const summaries = await invoke<ChapterSummary[]>(page, 'list_chapters', {
      bookId: book.id,
    })
    assert.equal(summaries[1].revision, source.revision)
    h.report.stages.push({
      stage: 'export-native-after-restart',
      savedAgain,
      destination: again,
      contentVerified: true,
      databaseUnchanged: true,
    })
    await h.close()
  } catch (error) {
    h.report.stages.push({
      stage: 'export-error-context',
      alerts: await page.getByRole('alert').allTextContents(),
      statuses: await page.getByRole('status').allTextContents(),
    })
    await page.screenshot({
      path: path.join(h.run, 'export-error.png'),
      fullPage: true,
    })
    try {
      control('Cancel')
    } catch {
      /* Close only an owned picker if one remains. */
    }
    throw error
  }
}
