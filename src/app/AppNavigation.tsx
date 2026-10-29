import { useId } from 'react'
import {
  BookOpen,
  Target,
  CalendarDays,
  Trophy,
  ChartNoAxesColumn,
  PenLine,
} from 'lucide-react'
import { en } from './i18n/en'
import { sectionIds, type SectionId } from './navigation'
import { Button } from '../components/ui/Button'

type AppNavigationProps = {
  activeSection: SectionId
  onSelect: (section: SectionId) => void
}

const icons = {
  library: BookOpen,
  editor: PenLine,
  goals: Target,
  activity: CalendarDays,
  achievements: Trophy,
}

export function AppNavigation({ activeSection, onSelect }: AppNavigationProps) {
  const statisticsDescription = useId()
  return (
    <nav aria-label={en.shell.mainNavigation}>
      <ul className="app-navigation__list">
        {sectionIds.map((id) => {
          const Icon = icons[id]
          return (
            <li key={id} className="min-w-0">
              <Button
                variant="ghost"
                aria-current={activeSection === id ? 'page' : undefined}
                aria-label={en.sections[id].title}
                onClick={() => onSelect(id)}
                className="app-navigation__link"
              >
                <Icon
                  className="app-navigation__icon"
                  strokeWidth={1.7}
                  aria-hidden="true"
                  focusable="false"
                />
                <span className="min-w-0">{en.shell.navigationLabels[id]}</span>
              </Button>
            </li>
          )
        })}
        <li className="min-w-0">
          <Button
            variant="ghost"
            className="app-navigation__link"
            disabled
            title={en.shell.statisticsUnavailable}
            aria-describedby={statisticsDescription}
          >
            <ChartNoAxesColumn
              className="app-navigation__icon"
              strokeWidth={1.7}
              aria-hidden="true"
              focusable="false"
            />
            <span className="min-w-0">{en.shell.statistics}</span>
          </Button>
          <span id={statisticsDescription} className="sr-only">
            {en.shell.statisticsUnavailable}
          </span>
        </li>
      </ul>
    </nav>
  )
}
