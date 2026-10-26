# Desktop persistence review (2.12)

Task 3.12 follow-up: the separate `npm.cmd run test:desktop:editor` scenario now verifies actual chapter/editor/preferences persistence and commit-based crash recovery across six native launches on schema v4. See [EDITOR_PERSISTENCE_REVIEW.md](EDITOR_PERSISTENCE_REVIEW.md). The book/cover observations below remain the historical 2.12 run; that original scenario was not repeated in 3.12.

Later compatibility update (3.11): the reusable restart runner now expects schema v4 after chapter migration 003 and editor-preferences migration 004. It was not rerun in 3.11; the observations/results below describe the actual schema-v2 run from 2.12 and establish no chapter/editor restart verification.

Verified on Windows on 2026-10-25 using the real Tauri debug executable, embedded production frontend at `http://tauri.localhost/`, WebView2 and SQLite/filesystem persistence. This is separate from the Edge tests that use mock IPC fixtures. Milestone 2's desktop-restart gate is satisfied for current book metadata and covers; chapter editing/counting remains later work.

## Reproduce

Prerequisites are the README desktop toolchain and installed WebView2. The existing Node/Playwright packages supply automation; no extra driver, browser download, Python or persistence plugin is needed.

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;" + $env:Path
npm.cmd run test:desktop
```

This opens real application windows. The test creates a unique directory under `.cache/desktop-restart/run-*` and a CLI-only Tauri config using appDirectoriesOverride. All app directories and the WebView2 profile are isolated there. It builds with `--debug --no-bundle`, copies the test executable into that directory and launches the copy. The source tauri.conf.json/identifier are not edited and the ordinary library is never opened. The normal debug executable/config context is rebuilt in finally, so it does not keep the test-directory override.

The runner attaches Playwright to each real WebView2 process through a newly allocated loopback CDP port. It asserts real Tauri presence and embedded-app URL; no mock bridge or Vite server is involved. UI controls perform all writes, while real list_books IPC reads compare committed snapshots. After each graceful native window close it waits for process exit code 0 and opens only the isolated database read-only using Node's built-in SQLite API. It checks application ID, schema version 2, integrity and an empty cleanup queue.

The scoped PowerShell helper inspects/captures/closes only the owned `write-daily-restart` PID. It verifies a visible native window and restricts screenshot output to the artifact directory. Its child process uses ExecutionPolicy Bypass because this machine blocks .ps1 execution; no system/user execution-policy setting is changed. GUI execution may require sandbox approval. There is no force-kill, database reset, recursive cleanup or deletion of real library/source data.

## Observed result

Successful run: `.cache/desktop-restart/run-jvz0G5/report.json`, with passed=true and restoredDefaultBuild=true, command exit code 0. Artifact paths are ignored local evidence rather than versioned fixtures. All five visible native windows had title WriteDaily and physical size 1393 × 997 pixels at the current Windows scaling. Native-window and WebView screenshots were inspected.

| Launch | Native PID | UI actions and persistence evidence                                                                                                                                                                                                                                               |
| ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 18652      | Confirmed empty library; created two books with identical Ukrainian titles but distinct IDs; edited one title/target/daily goal/deadline; rejected corrupt cover input; imported a valid PNG and verified rendered preview. Renamed the disposable source file after import.      |
| 2      | 19376      | Exact persisted snapshots, IDs, timestamps and cover SHA-256 survived process exit/relaunch. Opened the correct book, edited metadata while preserving its cover, replaced the cover and checked old-file cleanup. Cancelled deletion of the other book, then confirmed deletion. |
| 3      | 10436      | Only the intended book remained; new goal and replacement cover persisted. Removed the cover and confirmed null reference.                                                                                                                                                        |
| 4      | 22308      | Cover removal persisted and fallback appeared. Added a cover again, then confirmed deletion of the covered book.                                                                                                                                                                  |
| 5      | 17644      | Empty library persisted; no book rows, no managed cover files and no pending cleanup rows.                                                                                                                                                                                        |

The five launches represent four full process restarts, not page reloads. The renamed disposable source remains among the artifacts; source independence was verified. No application bug required fixing. Changes in this task add the test runner/helper and documentation only; production source, migrations and dependency versions are unchanged. The final test restores the regular debug build and leaves no test application running.

Validation: 169 frontend tests, 39 native tests, strict typecheck, lint, formatting, Cargo fmt/Clippy and both isolated/default native debug builds passed. The prior 36 Edge checks remain recorded in 2.11; no UI/layout change required another run here.

## Limits

This covers normal graceful process close/relaunch on the installed Windows/WebView2/toolchain with isolated data. It does not establish installer/release packaging, macOS, power-loss/forced-termination recovery, arbitrary real-world migration histories, screen-reader behavior or chapter/autosave persistence. Existing disposable SQL-failure/recovery tests cover their documented narrower cases. Captured startup/profile artifacts intentionally remain for inspection; future runs use fresh directories.

References: [Tauri app-directory overrides](https://v2.tauri.app/reference/config/#appdirectoriesoverride), [Playwright WebView2/CDP guidance](https://playwright.dev/docs/webview2), [Microsoft WebView2 automation guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/playwright).
