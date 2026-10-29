import { useId, type ReactNode } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { en } from '../../app/i18n/en'
import { Card } from '../../components/ui/Card'
import './library-empty-state.css'

export function LibraryEmptyState({
  kind,
  children,
}: {
  kind: 'library' | 'search' | 'filter'
  children: ReactNode
}) {
  const headingId = useId()
  const title =
    kind === 'library'
      ? en.library.emptyTitle
      : kind === 'search'
        ? en.libraryView.emptyTitle
        : en.libraryFilters.emptyTitle
  const description =
    kind === 'library'
      ? en.library.empty
      : kind === 'search'
        ? en.libraryView.emptyHint
        : en.libraryFilters.emptyHint
  const Icon = kind === 'search' ? Search : BookOpen
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      className={`library-empty-state library-empty-state--${kind}`}
    >
      <div className="library-empty-state__art" aria-hidden="true">
        <Icon size={40} strokeWidth={1.35} focusable="false" />
      </div>
      <h3 id={headingId} className="library-empty-state__title">
        {title}
      </h3>
      <p className="library-empty-state__description">{description}</p>
      <div className="library-empty-state__action">{children}</div>
    </Card>
  )
}
