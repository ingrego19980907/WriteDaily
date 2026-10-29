import type { ReactNode } from 'react'
import { Feather } from 'lucide-react'
import { en } from './i18n/en'
import './app-shell.css'

type AppShellProps = {
  children: ReactNode
  navigation?: ReactNode
  wide?: boolean
}

export function AppShell({
  children,
  navigation,
  wide = false,
}: AppShellProps) {
  return (
    <div className={`app-shell${navigation ? ' app-shell--navigation' : ''}`}>
      <a
        href="#main-content"
        className="absolute top-4 left-4 z-10 -translate-y-[200%] rounded border border-foreground bg-surface px-4 py-2 text-foreground focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-foreground"
      >
        {en.shell.skipToContent}
      </a>
      <header className="app-shell__brand">
        <div className="app-shell__identity">
          <Feather
            className="app-shell__feather"
            strokeWidth={1.5}
            aria-hidden="true"
            focusable="false"
          />
          <p className="app-shell__wordmark">{en.app.name}</p>
        </div>
        <p className="app-shell__tagline">{en.app.tagline}</p>
      </header>
      <div
        className={
          navigation
            ? 'app-shell__body app-shell__body--navigation'
            : 'app-shell__body'
        }
      >
        {navigation && (
          <aside
            aria-label={en.shell.navigationArea}
            className="app-shell__sidebar"
          >
            {navigation}
          </aside>
        )}
        <main id="main-content" tabIndex={-1} className="app-shell__main">
          <div className={`mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
