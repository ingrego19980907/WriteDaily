import { LayoutGrid, List, Search } from 'lucide-react'
import type { Ref } from 'react'
import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'
import '../../components/ui/input.css'
import './library-view.css'

export type LibraryView = 'grid' | 'list'
const copy = en.libraryView

export function LibraryViewControls({
  query,
  view,
  onQueryChange,
  onViewChange,
  searchRef,
}: {
  query: string
  view: LibraryView
  onQueryChange: (query: string) => void
  onViewChange: (view: LibraryView) => void
  searchRef?: Ref<HTMLInputElement>
}) {
  return (
    <div className="library-view-controls">
      <label className="library-search">
        <span className="sr-only">{copy.searchLabel}</span>
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden="true"
          className="library-search__icon"
        />
        <input
          ref={searchRef}
          className="input library-search__input"
          type="search"
          placeholder={copy.searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <div
        role="group"
        aria-label={copy.viewLabel}
        className="library-view-toggle"
      >
        <Button
          variant="ghost"
          className="library-view-toggle__button"
          aria-label={copy.grid}
          title={copy.grid}
          aria-pressed={view === 'grid'}
          onClick={() => onViewChange('grid')}
        >
          <LayoutGrid size={18} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          className="library-view-toggle__button"
          aria-label={copy.list}
          title={copy.list}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
        >
          <List size={18} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
