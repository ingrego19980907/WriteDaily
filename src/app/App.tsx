import { WritingScheduleProvider } from '../features/settings/WritingScheduleProvider'
import { WritingScheduleSettings } from '../features/settings/WritingScheduleSettings'
import { useEffect, useRef, useState } from 'react'
import { Leaf } from 'lucide-react'
import '../features/library/library-header.css'
import { en } from './i18n/en'
import { AppShell } from './AppShell'
import { AppNavigation } from './AppNavigation'
import type { SectionId } from './navigation'
import { Card } from '../components/ui/Card'
import { Library } from '../features/library/Library'
import { ChapterManager } from '../features/editor/ChapterManager'
import { EditorBookPicker } from '../features/editor/EditorBookPicker'
import { ActivityCalendar } from '../features/activity/ActivityCalendar'
import type { Book } from '../features/library/book'
import { bookErrorCode, getBook } from '../services/books'

export default function App() {
  return (
    <WritingScheduleProvider>
      <AppContent />
    </WritingScheduleProvider>
  )
}

function AppContent() {
  const [activeSection, setActiveSection] = useState<SectionId>('library')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousSection = useRef(activeSection)
  const section = en.sections[activeSection]
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailure, setOpenFailure] = useState('')
  const openRequest = useRef(0)
  const [countsVersion, setCountsVersion] = useState(0)
  const [statisticsTarget, setStatisticsTarget] =
    useState<HTMLDivElement | null>(null)

  function selectSection(sectionId: SectionId) {
    openRequest.current += 1
    setOpeningId(null)
    setOpenFailure('')
    if (sectionId === 'library') setCountsVersion((version) => version + 1)
    setActiveSection(sectionId)
  }

  async function openBook(book: Book) {
    const request = ++openRequest.current
    setOpeningId(book.id)
    setOpenFailure('')
    try {
      const current = await getBook(book.id)
      if (request !== openRequest.current) return
      setSelectedBook(current)
      setActiveSection('editor')
      if (activeSection === 'editor')
        requestAnimationFrame(() => headingRef.current?.focus())
    } catch (error) {
      if (request === openRequest.current)
        setOpenFailure(
          bookErrorCode(error) === 'not_found'
            ? en.library.openMissing
            : en.library.openFailure,
        )
    } finally {
      if (request === openRequest.current) setOpeningId(null)
    }
  }

  function bookDeleted(id: string) {
    if (openingId === id) {
      openRequest.current += 1
      setOpeningId(null)
      setOpenFailure('')
    }
    setSelectedBook((current) => (current?.id === id ? null : current))
  }

  useEffect(() => {
    if (previousSection.current !== activeSection) {
      headingRef.current?.focus()
      previousSection.current = activeSection
    }
  }, [activeSection])

  return (
    <AppShell
      wide={activeSection === 'library'}
      navigation={
        <AppNavigation activeSection={activeSection} onSelect={selectSection} />
      }
    >
      <div className="space-y-4">
        <div
          className={
            activeSection === 'library' ? 'library-page-header' : 'space-y-4'
          }
        >
          <div
            className={
              activeSection === 'library'
                ? 'library-page-header__intro'
                : 'space-y-4'
            }
          >
            <h1
              ref={headingRef}
              tabIndex={-1}
              className={
                activeSection === 'library'
                  ? 'library-page-header__title'
                  : 'font-writing text-display'
              }
            >
              <span>{section.title}</span>
              {activeSection === 'library' && (
                <Leaf
                  className="library-page-header__leaf"
                  strokeWidth={1.5}
                  aria-hidden="true"
                  focusable="false"
                />
              )}
            </h1>
            <p
              className={
                activeSection === 'library'
                  ? 'library-page-header__subtitle'
                  : 'font-writing text-writing'
              }
            >
              {section.subtitle}
            </p>
          </div>
          {activeSection === 'library' && (
            <div
              ref={setStatisticsTarget}
              className="library-page-header__statistics"
            />
          )}
        </div>
        <div hidden={activeSection !== 'library'}>
          <Library
            statisticsTarget={statisticsTarget}
            active={activeSection === 'library'}
            countsVersion={countsVersion}
            onOpenBook={(book) => {
              void openBook(book)
            }}
            openingId={openingId}
            openFailure={openFailure}
            onBookSaved={(book) =>
              setSelectedBook((current) =>
                current?.id === book.id ? book : current,
              )
            }
            onBookDeleted={bookDeleted}
          />
        </div>
        {selectedBook && (
          <div hidden={activeSection !== 'editor'}>
            <ChapterManager
              key={selectedBook.id}
              book={selectedBook}
              onBack={() => selectSection('library')}
            />
          </div>
        )}
        {activeSection === 'activity' && <ActivityCalendar />}
        {activeSection === 'goals' && <WritingScheduleSettings />}
        {activeSection === 'editor' && !selectedBook && (
          <EditorBookPicker
            onOpenBook={(book) => {
              void openBook(book)
            }}
            openingId={openingId}
            openFailure={openFailure}
            onCancelOpen={() => {
              openRequest.current++
              setOpeningId(null)
              setOpenFailure('')
            }}
          />
        )}
        {activeSection !== 'library' &&
          activeSection !== 'activity' &&
          activeSection !== 'goals' &&
          activeSection !== 'editor' && (
            <Card className="space-y-2">
              <h2 className="font-semibold">{en.shell.comingSoon}</h2>
              <p className="text-ui text-secondary">{section.description}</p>
            </Card>
          )}
      </div>
    </AppShell>
  )
}
