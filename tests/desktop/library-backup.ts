/** Real backup/picker/restart test; only the existing private desktop harness. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import type { Book } from '../../src/features/library/book.ts'
import type { Chapter } from '../../src/features/editor/chapter.ts'
import { invoke, type Harness } from './chapter-export.ts'

export async function verifyLibraryBackup(h: Harness) {
  let page = await h.launch('backup-1-saved-library')
  let book = await invoke<Book>(page, 'create_book', {
    details: {
      title: 'Книга для резервної копії 🌿',
      targetWordCount: 1000,
      dailyWordGoal: 1,
      deadline: null,
    },
  })
  const icon = await readFile(
    fileURLToPath(new URL('../../src-tauri/icons/32x32.png', import.meta.url)),
  )
  const cover = await invoke<{ book: Book }>(page, 'set_cover', {
    id: book.id,
    expectedUpdatedAt: book.updatedAt,
    bytes: [...icon],
  })
  book = cover.book
  await invoke<Chapter>(page, 'create_chapter', {
    bookId: book.id,
    details: { title: 'Збережений розділ' },
  })
  await page.reload()
  await page
    .getByRole('article', { name: book.title, exact: true })
    .getByRole('button', { name: 'Open book', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Edit chapter text', exact: true })
    .click()
  await page.getByRole('button', { name: 'Start writing', exact: true }).click()
  const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
  await field.fill('Резервна копія зберігає 👩‍💻 текст e\u0301 <b>literal</b>.')
  await field.press('Control+s')
  await expect(
    page.getByRole('status', { name: 'Save status', exact: true }),
  ).toHaveText('Chapter text saved.')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Back to library', exact: true })
    .click()
  await invoke(page, 'refresh_achievements', {})
  await invoke(page, 'claim_achievement_notifications', {})
  const privateFile = (file: string) =>
    assert(path.resolve(file).startsWith(path.resolve(h.run) + path.sep))
  const facts = (file = h.databasePath) => {
    privateFile(file)
    const db = new DatabaseSync(file, { readOnly: true })
    try {
      return db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
        .map(({ name }) => {
          const quoted = String(name).replaceAll('"', '""')
          const columns = db
            .prepare(`PRAGMA table_info("${quoted}")`)
            .all().length
          const order = Array.from(
            { length: columns },
            (_, index) => index + 1,
          ).join(',')
          return [
            name,
            db.prepare(`SELECT * FROM "${quoted}" ORDER BY ${order}`).all(),
          ]
        })
    } finally {
      db.close()
    }
  }
  const before = facts()
  const coverBytes = await readFile(
    path.join(path.dirname(h.databasePath), book.coverPath!),
  )
  const coverHash = createHash('sha256').update(coverBytes).digest('hex')
  const region = () =>
    page.getByRole('region', { name: 'Library backup', exact: true })
  const control = (action: 'Save' | 'Cancel', destination?: string) =>
    JSON.parse(
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
          fileURLToPath(new URL('./export-dialog.ps1', import.meta.url)),
          '-DesktopProcessId',
          String(
            (JSON.parse(h.nativeWindow()) as { processId: number }).processId,
          ),
          '-DialogTitle',
          'Back up library',
          '-Action',
          action,
          ...(destination ? ['-Destination', destination] : []),
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as unknown
  const verify = (archive: string, database: string) => {
    const manifest = JSON.parse(
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
          fileURLToPath(new URL('./verify-backup.ps1', import.meta.url)),
          '-ArchivePath',
          archive,
          '-DatabaseOutput',
          database,
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as {
      bookCount: number
      chapterCount: number
      coverCount: number
      files: { path: string; sha256: string }[]
    }
    assert.equal(manifest.bookCount, 1)
    assert.equal(manifest.chapterCount, 1)
    assert.equal(manifest.coverCount, 1)
    assert.equal(
      manifest.files.find((file) => file.path === book.coverPath)?.sha256,
      coverHash,
    )
    assert.deepEqual(facts(database), before)
    assert.deepEqual(facts(), before)
    return manifest
  }
  try {
    await region()
      .getByRole('button', { name: 'Back up library', exact: true })
      .click()
    const cancelled = control('Cancel')
    await expect(region().getByRole('status')).toContainText(
      'Backup cancelled.',
    )
    assert.deepEqual(facts(), before)
    const destination = path.join(h.run, 'library-backup.zip')
    await region()
      .getByRole('button', { name: 'Back up library', exact: true })
      .click()
    const saved = control('Save', destination)
    await expect(region().getByRole('status')).toContainText(
      'Backup saved: library-backup.zip.',
    )
    const manifest = verify(
      destination,
      path.join(h.run, 'backup-snapshot.sqlite3'),
    )
    h.nativeWindow(false, path.join(h.run, 'library-backup-native.png'))
    h.report.stages.push({
      stage: 'native-backup-created',
      cancelled,
      saved,
      manifest,
      databaseAndCoversVerified: true,
      sourceUnchanged: true,
    })
    await h.close()
    page = await h.launch('backup-2-restart')
    await expect(
      page
        .getByRole('article', { name: book.title, exact: true })
        .getByRole('img'),
    ).toBeVisible()
    assert.deepEqual(facts(), before)
    const again = path.join(h.run, 'library-backup-after-restart.zip')
    await region()
      .getByRole('button', { name: 'Back up library', exact: true })
      .click()
    const savedAgain = control('Save', again)
    await expect(region().getByRole('status')).toContainText(
      'Backup saved: library-backup-after-restart.zip.',
    )
    const afterRestart = verify(
      again,
      path.join(h.run, 'backup-after-restart.sqlite3'),
    )
    h.report.stages.push({
      stage: 'native-backup-after-restart',
      savedAgain,
      manifest: afterRestart,
      databaseAndCoversVerified: true,
      sourceUnchanged: true,
    })
    await h.close()
  } catch (error) {
    h.report.stages.push({
      stage: 'backup-error',
      alerts: await page.getByRole('alert').allTextContents(),
      statuses: await page.getByRole('status').allTextContents(),
    })
    try {
      control('Cancel')
    } catch {
      /* No remaining owned picker. */
    }
    throw error
  }
}
