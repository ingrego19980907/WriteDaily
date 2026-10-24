import { en } from './i18n/en'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="font-writing text-display">{en.app.name}</h1>
        <p className="font-writing text-writing">{en.app.tagline}</p>
        <p className="text-ui text-secondary">{en.app.status}</p>
      </div>
    </AppShell>
  )
}
