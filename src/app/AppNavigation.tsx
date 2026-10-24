import { en } from './i18n/en'
import { sectionIds, type SectionId } from './navigation'

type AppNavigationProps = {
  activeSection: SectionId
  onSelect: (section: SectionId) => void
}

export function AppNavigation({ activeSection, onSelect }: AppNavigationProps) {
  return (
    <nav aria-label={en.shell.mainNavigation}>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-1">
        {sectionIds.map((id) => (
          <li key={id} className="min-w-0">
            <button
              type="button"
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => onSelect(id)}
              className="h-full w-full cursor-pointer rounded border-l-2 border-transparent px-3 py-3 text-left text-ui text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground aria-[current=page]:border-accent aria-[current=page]:bg-background aria-[current=page]:font-semibold"
            >
              {en.sections[id].title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
