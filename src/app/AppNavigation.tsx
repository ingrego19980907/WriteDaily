import { en } from './i18n/en'
import { sectionIds, type SectionId } from './navigation'
import { Button } from '../components/ui/Button'

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
            <Button
              variant="ghost"
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => onSelect(id)}
              className="h-full w-full justify-start border-l-2 border-transparent px-3 py-3 text-left text-ui aria-[current=page]:border-accent aria-[current=page]:bg-background aria-[current=page]:font-semibold"
            >
              {en.sections[id].title}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
