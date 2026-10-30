/** Real restore only in the existing private harness. No production library access. */
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
import type { RestoreSelection } from '../../src/services/restores.ts'
import { invoke, type Harness } from './chapter-export.ts'

export async function verifyLibraryRestore(h: Harness) {
  let page = await h.launch('restore-1-source-and-current-library')
  const rejectedCode = (command: string, args: Record<string, unknown>) =>
    page.evaluate(
      async ({ command, args }) => {
        try {
          await (
            window as unknown as {
              __TAURI_INTERNALS__: {
                invoke: (
                  command: string,
                  args: Record<string, unknown>,
                ) => Promise<unknown>
              }
            }
          ).__TAURI_INTERNALS__.invoke(command, args)
          return null
        } catch (error: unknown) {
          return typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : null
        }
      },
      { command, args },
    )
  const helper = fileURLToPath(new URL('./export-dialog.ps1', import.meta.url))
  const control = (
    action: 'Open' | 'Save' | 'Cancel',
    title: string,
    destination?: string,
  ) =>
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
          helper,
          '-DesktopProcessId',
          String(
            (JSON.parse(h.nativeWindow()) as { processId: number }).processId,
          ),
          '-DialogTitle',
          title,
          '-Action',
          action,
          ...(destination ? ['-Destination', destination] : []),
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as unknown
  const facts = (file = h.databasePath) => {
    assert(path.resolve(file).startsWith(path.resolve(h.run) + path.sep))
    const db = new DatabaseSync(file, { readOnly: true })
    try {
      return db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name",
        )
        .all()
        .map(({ name }) => {
          const quoted = String(name).replaceAll('"', '""')
          const columns = db
            .prepare(`PRAGMA table_info("${quoted}")`)
            .all().length
          return [
            name,
            db
              .prepare(
                `SELECT * FROM "${quoted}" ORDER BY ${Array.from({ length: columns }, (_, i) => i + 1).join(',')}`,
              )
              .all(),
          ]
        })
    } finally {
      db.close()
    }
  }
  const verifyZip = (archive: string, snapshot: string) =>
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
          fileURLToPath(new URL('./verify-backup.ps1', import.meta.url)),
          '-ArchivePath',
          archive,
          '-DatabaseOutput',
          snapshot,
        ],
        { encoding: 'utf8', windowsHide: true },
      ),
    ) as { bookCount: number; chapterCount: number; coverCount: number }
  const icon = await readFile(
    fileURLToPath(new URL('../../src-tauri/icons/32x32.png', import.meta.url)),
  )
  const create = async (title: string, text: string) => {
    let book = await invoke<Book>(page, 'create_book', {
      details: {
        title,
        targetWordCount: 1000,
        dailyWordGoal: 1,
        deadline: null,
      },
    })
    book = (
      await invoke<{ book: Book }>(page, 'set_cover', {
        id: book.id,
        expectedUpdatedAt: book.updatedAt,
        bytes: [...icon],
      })
    ).book
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
    await page
      .getByRole('button', { name: 'Start writing', exact: true })
      .click()
    const field = page.getByRole('textbox', { name: 'Chapter manuscript' })
    await field.fill(text)
    await field.press('Control+a')
    await field.press('Control+b')
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
    return book
  }
  const sourceText = `${'Слово '.repeat(120)}👩‍💻 e\u0301 <b>literal</b>.`
  const source = await create('Архівна книга 🌿', sourceText)
  const expected = facts()
  const coverBytes = await readFile(
    path.join(path.dirname(h.databasePath), source.coverPath!),
  )
  const selected = path.join(h.run, 'restore-library.zip')
  await page
    .getByRole('button', { name: 'Back up library', exact: true })
    .click()
  control('Save', 'Back up library', selected)
  await expect(
    page.getByText(/^Backup saved: restore-library.zip\./),
  ).toBeVisible()
  verifyZip(selected, path.join(h.run, 'restore-source.sqlite3'))
  const inputHash = createHash('sha256')
    .update(await readFile(selected))
    .digest('hex')
  await invoke(page, 'delete_book', {
    id: source.id,
    expectedUpdatedAt: source.updatedAt,
    confirmed: true,
  })
  const current = await create(
    'Поточна книга для страховки',
    'Current writing belongs in the safety backup.',
  )
  const before = facts()
  try {
    await page
      .getByRole('button', { name: 'Restore library', exact: true })
      .click()
    const dialog = page.getByRole('dialog', {
      name: 'Restore library',
      exact: true,
    })
    await dialog
      .getByRole('button', { name: 'Choose backup…', exact: true })
      .click()
    control('Cancel', 'Choose library backup')
    await expect(dialog.getByRole('status')).toContainText(
      'No backup selected.',
    )
    assert.deepEqual(facts(), before)
    // Exercise native confirmation refusal without consuming the staged selection.
    const nativePreview = invoke<RestoreSelection>(
      page,
      'prepare_library_restore',
      {
        labels: {
          title: 'Choose library backup',
          fileType: 'WriteDaily backup (ZIP)',
        },
      },
    )
    await page.title() // Flush the async native request before synchronous Win32 control.
    control('Open', 'Choose library backup', selected)
    const staged = await nativePreview
    assert.equal(staged.status, 'prepared')
    if (staged.status !== 'prepared')
      throw new Error('Native restore preview missing')
    assert.equal(
      await rejectedCode('apply_library_restore', {
        token: staged.preview.token,
        confirmed: false,
      }),
      'confirmation_required',
    )
    assert.deepEqual(facts(), before)
    await invoke(page, 'cancel_library_restore', {
      token: staged.preview.token,
    })
    await dialog
      .getByRole('button', { name: 'Choose backup…', exact: true })
      .click()
    control('Open', 'Choose library backup', selected)
    await expect(
      dialog.getByText('restore-library.zip', { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Restore this library', exact: true }),
    ).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    assert.deepEqual(facts(), before)
    await page
      .getByRole('button', { name: 'Restore library', exact: true })
      .click()
    await dialog
      .getByRole('button', { name: 'Choose backup…', exact: true })
      .click()
    control('Open', 'Choose library backup', selected)
    await dialog.getByRole('checkbox').check()
    await dialog
      .getByRole('button', { name: 'Restore this library', exact: true })
      .click()
    await expect(dialog.getByRole('status')).toContainText('Library restored.')
    assert.deepEqual(facts(), expected)
    assert.equal(
      createHash('sha256')
        .update(await readFile(selected))
        .digest('hex'),
      inputHash,
    )
    assert.deepEqual(
      await readFile(
        path.join(path.dirname(h.databasePath), source.coverPath!),
      ),
      coverBytes,
    )
    assert.equal(
      await rejectedCode('update_book', {
        id: current.id,
        expectedUpdatedAt: current.updatedAt,
        details: {
          title: 'MUST NOT WRITE',
          targetWordCount: 1000,
          dailyWordGoal: 1,
          deadline: null,
        },
      }),
      'persistence',
    )
    assert.deepEqual(facts(), expected)
    const journal = JSON.parse(
      await readFile(
        path.join(path.dirname(h.databasePath), 'restore-journal.json'),
        'utf8',
      ),
    ) as { transaction: string; committed: boolean }
    assert(journal.committed)
    const safety = path.join(
      path.dirname(h.databasePath),
      'restore-history',
      journal.transaction,
      'safety.zip',
    )
    const safetyDb = path.join(h.run, 'restore-safety.sqlite3')
    const safetyManifest = verifyZip(safety, safetyDb)
    assert.deepEqual(facts(safetyDb), before)
    h.nativeWindow(false, path.join(h.run, 'library-restore-native.png'))
    h.report.stages.push({
      stage: 'restore-committed',
      originalArchiveUnchanged: true,
      selectedRowsAndCoversVerified: true,
      safetyManifest,
      safetyLibraryVerified: true,
      staleWritesBlocked: true,
    })
    const closed = page.waitForEvent('close')
    await dialog
      .getByRole('button', { name: 'Close WriteDaily', exact: true })
      .click()
    await closed
    await h.close(true)
    page = await h.launch('restore-2-reopened-library')
    await expect(
      page.getByRole('article', { name: source.title, exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('article', { name: current.title, exact: true }),
    ).toHaveCount(0)
    assert.deepEqual(facts(), expected)
    assert.deepEqual(
      await invoke(page, 'claim_achievement_notifications', {}),
      [],
    )
    await page
      .getByRole('article', { name: source.title, exact: true })
      .getByRole('button', { name: 'Open book', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Edit chapter text', exact: true })
      .click()
    await expect(page.getByRole('dialog').locator('strong')).toContainText(
      'literal',
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    h.report.stages.push({
      stage: 'restore-after-reopen',
      exactRowsVerified: true,
      noNotificationReplay: true,
      richTextVerified: true,
    })
    await h.close()
  } catch (error) {
    h.report.stages.push({
      stage: 'restore-error',
      alerts: await page.getByRole('alert').allTextContents(),
      statuses: await page.getByRole('status').allTextContents(),
    })
    try {
      control('Cancel', 'Choose library backup')
    } catch {
      /* No owned picker remains. */
    }
    throw error
  }
}
