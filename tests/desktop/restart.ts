/** Windows-only real Tauri/WebView2 + SQLite test. No mocks or production-library access. */
import assert from 'node:assert/strict'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium, expect, type Browser, type Page } from '@playwright/test'
import type { Book } from '../../src/features/library/book.ts'

assert.equal(
  process.platform,
  'win32',
  'This desktop test requires Windows/WebView2.',
)
const root = fileURLToPath(new URL('../../', import.meta.url))
const editorMode = process.argv.includes('--editor')
const baseConfig = path.join(root, 'src-tauri/tauri.conf.json')
const originalConfig = await readFile(baseConfig, 'utf8')
assert.equal(JSON.parse(originalConfig).identifier, 'app.writedaily.desktop')
const artifactBase = path.join(root, '.cache/desktop-restart')
await mkdir(artifactBase, { recursive: true })
const run = await mkdtemp(path.join(artifactBase, 'run-'))
const dataRoot = path.join(run, 'app-data')
const databasePath = path.join(dataRoot, 'development/write-daily.sqlite3')
const configPath = path.join(run, 'tauri.restart.json')
const executable = path.join(run, 'write-daily-restart.exe')
const windowHelper = path.join(root, 'tests/desktop/window.ps1')
const npmCli =
  process.env.npm_execpath ??
  path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
await writeFile(
  configPath,
  JSON.stringify({ app: { appDirectoriesOverride: dataRoot } }, null, 2),
)
const report: {
  run: string
  stages: unknown[]
  passed: boolean
  restoredDefaultBuild: boolean
  error?: string
} = { run, stages: [], passed: false, restoredDefaultBuild: false }
let app: ChildProcess | undefined
let browser: Browser | undefined

function build(config?: string) {
  execFileSync(
    process.execPath,
    [
      npmCli,
      'run',
      'tauri',
      '--',
      'build',
      '--debug',
      '--no-bundle',
      ...(config ? ['--config', config] : []),
    ],
    { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true },
  )
}
function nativeWindow(close = false, screenshot?: string) {
  assert(app?.pid)
  return execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      windowHelper,
      '-DesktopProcessId',
      String(app.pid),
      ...(close ? ['-Close'] : []),
      ...(screenshot ? ['-ScreenshotPath', screenshot] : []),
    ],
    { encoding: 'utf8', windowsHide: true },
  )
}
async function port() {
  const server = createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address !== 'string')
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  return address.port
}
async function launch(stage: string): Promise<Page> {
  const cdpPort = await port()
  app = spawn(executable, [], {
    cwd: run,
    windowsHide: true,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${cdpPort}`,
      WEBVIEW2_USER_DATA_FOLDER: path.join(run, 'webview-profile'),
    },
    stdio: 'inherit',
  })
  app.on('error', (error) => {
    console.error(error)
  })
  const endpoint = `http://127.0.0.1:${cdpPort}`
  let ready = false
  for (let attempt = 0; attempt < 120; attempt += 1) {
    assert.equal(
      app.exitCode,
      null,
      'Native process exited before WebView2 became ready.',
    )
    try {
      if ((await fetch(`${endpoint}/json/version`)).ok) {
        ready = true
        break
      }
    } catch {
      /* Wait only for this newly allocated local endpoint. */
    }
    await delay(250)
  }
  assert(ready, 'WebView2 CDP endpoint did not become ready.')
  browser = await chromium.connectOverCDP(endpoint)
  const context = browser.contexts()[0]
  assert(context)
  let page = context.pages()[0]
  if (!page) page = await context.waitForEvent('page')
  page.setDefaultTimeout(15000)
  await expect(
    page.getByRole('heading', { name: 'My Library', level: 1 }),
  ).toBeVisible()
  assert.equal(
    await page.evaluate(() =>
      Boolean((globalThis as unknown as { isTauri?: boolean }).isTauri),
    ),
    true,
    'Not a real Tauri webview.',
  )
  assert(
    !page.url().includes('tests/fixtures') && !page.url().includes('5173'),
    'Expected the embedded application, not a test page/dev server.',
  )
  const window = JSON.parse(nativeWindow())
  assert.equal(window.visible, true)
  assert.equal(window.title, 'WriteDaily')
  // Prove the directory override before any UI writes, including an empty library.
  rows()
  report.stages.push({ stage, processId: app.pid, window, url: page.url() })
  console.log(`Desktop stage: ${stage}; PID ${app.pid}`)
  return page
}
async function close() {
  if (app && app.exitCode === null) {
    const exited = once(app, 'exit')
    nativeWindow(true)
    const timeout = new AbortController()
    try {
      const result = await Promise.race([
        exited,
        delay(15000, null, { signal: timeout.signal }).then(() => {
          throw new Error('Native window did not close gracefully.')
        }),
      ])
      assert.equal(result[0], 0, 'Native process did not exit cleanly.')
    } finally {
      timeout.abort()
    }
  }
  await browser?.close().catch(() => {})
  browser = undefined
  app = undefined
}
async function forceStop(reason: string) {
  assert(editorMode, 'Forced termination is confined to the editor fault test.')
  assert(app && app.exitCode === null)
  assert.equal(app.spawnfile, executable)
  assert.equal(path.dirname(executable), run)
  const owned = app
  const exited = once(owned, 'exit')
  assert(
    owned.kill('SIGKILL'),
    'Could not terminate the owned isolated test process.',
  )
  const result = await exited
  report.stages.push({
    stage: 'forced-stop',
    reason,
    processId: owned.pid,
    exitCode: result[0],
    signal: result[1],
  })
  await browser?.close().catch(() => {})
  browser = undefined
  app = undefined
}
async function books(page: Page): Promise<Book[]> {
  return page.evaluate(async () => {
    const bridge = (
      globalThis as unknown as {
        __TAURI_INTERNALS__: { invoke: (command: string) => Promise<unknown> }
      }
    ).__TAURI_INTERNALS__
    return (await bridge.invoke('list_books')) as Book[]
  })
}
function rows() {
  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    assert.equal(database.prepare('PRAGMA user_version').get()?.user_version, 4)
    assert.equal(
      database.prepare('PRAGMA application_id').get()?.application_id,
      1464090969,
    )
    assert.equal(
      database.prepare('PRAGMA quick_check').get()?.quick_check,
      'ok',
    )
    assert.equal(
      database
        .prepare('SELECT count(*) AS count FROM pending_cover_cleanup')
        .get()?.count,
      0,
    )
    return database.prepare('SELECT * FROM books ORDER BY id').all()
  } finally {
    database.close()
  }
}
function card(page: Page, title: string) {
  return page.getByRole('article', { name: title, exact: true })
}
async function create(page: Page, title: string, goals = false) {
  await page.getByRole('button', { name: 'Create book', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  if (goals) {
    await page.getByLabel('Target word count (optional)').fill('60000')
    await page.getByLabel('Daily word goal (optional)').fill('750')
    await page.getByLabel('Deadline (optional)').fill('2027-02-28')
  }
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create book', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function cover(page: Page, title: string, source: string) {
  const selected = card(page, title)
  const details = selected.locator('details')
  if (
    !(await details.evaluate((element) => (element as HTMLDetailsElement).open))
  )
    await selected.getByText('Manage cover', { exact: true }).click()
  await selected
    .getByLabel('Cover image', { exact: true })
    .setInputFiles(source)
  await selected
    .getByRole('button', { name: 'Save cover', exact: true })
    .click()
  await expect(
    selected.getByText('Cover saved.', { exact: true }),
  ).toBeVisible()
  const image = selected.getByRole('img', { name: 'Book cover' })
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)
}
async function removeBook(page: Page, title: string) {
  await card(page, title)
    .getByRole('button', { name: 'Book actions', exact: true })
    .click()
  await card(page, title)
    .getByRole('button', { name: 'Delete book', exact: true })
    .click()
  await page.getByRole('checkbox').check()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete book', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(card(page, title)).toHaveCount(0)
}
async function snapshot(page: Page, stage: string) {
  const native = await books(page)
  await page.screenshot({
    path: path.join(run, `${stage}-webview.png`),
    fullPage: true,
  })
  nativeWindow(false, path.join(run, `${stage}-window.png`))
  report.stages.push({ stage: `${stage}-committed`, books: native })
  return native
}

try {
  console.log(`Isolated desktop data/artifacts: ${run}`)
  build(configPath)
  await copyFile(
    path.join(root, 'src-tauri/target/debug/write-daily.exe'),
    executable,
  )
  if (editorMode) {
    const { verifyEditorRestart } = await import('./editor-restart.ts')
    await verifyEditorRestart({
      run,
      databasePath,
      launch,
      close,
      forceStop,
      nativeWindow,
      report,
    })
  } else {
    const title = 'Перезапуск — моя історія'
    const editedTitle = 'Перезапуск — оновлена історія'
    const source = path.join(run, 'source-cover.png')
    const movedSource = path.join(run, 'source-renamed.png')
    await copyFile(path.join(root, 'src-tauri/icons/32x32.png'), source)
    let page = await launch('1-create-edit-import')
    await expect(
      page.getByText('No books yet. Create your first story.'),
    ).toBeVisible()
    await create(page, title, true)
    await create(page, title)
    const created = await books(page)
    assert.equal(created.length, 2)
    assert.notEqual(created[0].id, created[1].id)
    const selected = created.find((book) => book.targetWordCount === 60000)!
    const duplicate = created.find((book) => book.id !== selected.id)!
    const selectedCard = page
      .getByRole('article')
      .filter({ has: page.getByText('Target: 60,000 words', { exact: true }) })
    await selectedCard
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await selectedCard
      .getByRole('button', { name: 'Edit book', exact: true })
      .click()
    await page.getByLabel('Title', { exact: true }).fill(editedTitle)
    await page.getByLabel('Target word count (optional)').fill('84000')
    await page.getByLabel('Daily word goal (optional)').fill('900')
    await page.getByLabel('Deadline (optional)').fill('2027-06-15')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await card(page, editedTitle)
      .getByText('Manage cover', { exact: true })
      .click()
    await card(page, editedTitle)
      .getByLabel('Cover image')
      .setInputFiles({
        name: 'invalid.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not an image'),
      })
    await card(page, editedTitle)
      .getByRole('button', { name: 'Save cover', exact: true })
      .click()
    await expect(card(page, editedTitle).getByRole('alert')).toContainText(
      'valid PNG',
    )
    assert.equal(
      (await books(page)).find((book) => book.id === selected.id)?.coverPath,
      null,
    )
    await cover(page, editedTitle, source)
    const first = await snapshot(page, 'first')
    const persisted = first.find((book) => book.id === selected.id)!
    assert.equal(persisted.dailyWordGoal, 900)
    assert.equal(persisted.deadline, '2027-06-15')
    assert.equal(persisted.createdAt, selected.createdAt)
    assert(persisted.coverPath)
    const firstCoverPath = path.join(
      dataRoot,
      'development',
      persisted.coverPath,
    )
    const firstHash = createHash('sha256')
      .update(await readFile(firstCoverPath))
      .digest('hex')
    await rename(source, movedSource)
    await close()
    assert.equal(rows().length, 2)

    page = await launch('2-reopen-replace-delete-duplicate')
    await expect(
      card(page, editedTitle).getByRole('img', { name: 'Book cover' }),
    ).toBeVisible()
    assert.deepEqual(
      (await books(page)).sort((a, b) => a.id.localeCompare(b.id)),
      [...first].sort((a, b) => a.id.localeCompare(b.id)),
    )
    assert.equal(
      createHash('sha256')
        .update(await readFile(firstCoverPath))
        .digest('hex'),
      firstHash,
    )
    await card(page, editedTitle)
      .getByRole('button', { name: 'Open book', exact: true })
      .click()
    await expect(
      page.getByRole('region', { name: editedTitle, exact: true }),
    ).toContainText('Target: 84,000 words')
    await page.getByRole('button', { name: 'Back to library' }).click()
    await card(page, editedTitle)
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await card(page, editedTitle)
      .getByRole('button', { name: 'Edit book', exact: true })
      .click()
    await page.getByLabel('Daily word goal (optional)').fill('1000')
    await page
      .getByRole('button', { name: 'Save changes', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    assert.equal(
      (await books(page)).find((book) => book.id === selected.id)?.coverPath,
      persisted.coverPath,
    )
    await cover(page, editedTitle, movedSource)
    const replaced = (await books(page)).find(
      (book) => book.id === selected.id,
    )!
    assert.notEqual(replaced.coverPath, persisted.coverPath)
    assert(
      !(await readdir(path.dirname(firstCoverPath))).includes(
        path.basename(firstCoverPath),
      ),
    )
    await card(page, title)
      .getByRole('button', { name: 'Book actions', exact: true })
      .click()
    await card(page, title)
      .getByRole('button', { name: 'Delete book', exact: true })
      .click()
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    assert((await books(page)).some((book) => book.id === duplicate.id))
    await removeBook(page, title)
    const second = await snapshot(page, 'second')
    await close()
    assert.equal(rows().length, 1)

    page = await launch('3-reopen-remove-cover')
    assert.deepEqual(await books(page), second)
    assert.equal(second[0].dailyWordGoal, 1000)
    await expect(
      card(page, editedTitle).getByRole('img', { name: 'Book cover' }),
    ).toBeVisible()
    await card(page, editedTitle)
      .getByText('Manage cover', { exact: true })
      .click()
    await card(page, editedTitle)
      .getByRole('button', { name: 'Remove cover', exact: true })
      .click()
    await expect(
      card(page, editedTitle).getByText('Cover removed.', { exact: true }),
    ).toBeVisible()
    const third = await snapshot(page, 'third')
    assert.equal(third[0].coverPath, null)
    await close()
    assert.equal(rows()[0].cover_path, null)

    page = await launch('4-reopen-delete-covered-book')
    assert.deepEqual(await books(page), third)
    await expect(
      card(page, editedTitle).getByText('No cover yet', { exact: true }),
    ).toBeVisible()
    await cover(page, editedTitle, movedSource)
    await removeBook(page, editedTitle)
    await snapshot(page, 'fourth')
    await close()
    assert.equal(rows().length, 0)

    page = await launch('5-confirm-empty-after-restart')
    await expect(
      page.getByText('No books yet. Create your first story.'),
    ).toBeVisible()
    assert.deepEqual(await books(page), [])
    assert.deepEqual(
      await readdir(path.join(dataRoot, 'development/covers')),
      [],
    )
    await snapshot(page, 'fifth')
    await close()
    assert.equal(rows().length, 0)
  }
  assert.equal(await readFile(baseConfig, 'utf8'), originalConfig)
  report.passed = true
  console.log(
    editorMode
      ? 'Real desktop editor recovery: PASS (six native process launches).'
      : 'Real desktop restart persistence: PASS (five native process launches).',
  )
} catch (error) {
  report.error = error instanceof Error ? error.stack : String(error)
  console.error(report.error)
  process.exitCode = 1
} finally {
  try {
    await close()
  } catch (error) {
    console.error('Graceful close failed:', error)
    process.exitCode = 1
    if (editorMode && app?.exitCode === null)
      await forceStop('failure-cleanup').catch(console.error)
  }
  // Leave the ordinary debug executable/config context restored, never pointing at test storage.
  try {
    build()
    report.restoredDefaultBuild = true
  } catch (error) {
    console.error('Default build restoration failed:', error)
    process.exitCode = 1
  }
  await writeFile(
    path.join(run, 'report.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(`Desktop verification report: ${path.join(run, 'report.json')}`)
}
