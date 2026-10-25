import { useEffect, useRef, useState } from 'react'
import { en } from './i18n/en'
import { AppShell } from './AppShell'
import { AppNavigation } from './AppNavigation'
import type { SectionId } from './navigation'
import { Card } from '../components/ui/Card'
import { Library } from '../features/library/Library'
import { Button } from '../components/ui/Button'
import type { Book } from '../features/library/book'
import { bookErrorCode, getBook } from '../services/books'

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('library')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousSection = useRef(activeSection)
  const section = en.sections[activeSection]
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openFailure, setOpenFailure] = useState('')
  const openRequest = useRef(0)

  function selectSection(sectionId: SectionId) {
    openRequest.current += 1
    setOpeningId(null)
    setOpenFailure('')
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
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-writing text-display"
        >
          {section.title}
        </h1>
        <p className="font-writing text-writing">{section.subtitle}</p>
        <div hidden={activeSection !== 'library'}>
          <Library
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
        {activeSection === 'editor' && selectedBook ? (
          <Card
            className="space-y-4"
            role="region"
            aria-label={selectedBook.title}
          >
            <h2 className="font-writing text-writing">{selectedBook.title}</h2>
            <p className="text-secondary">
              {selectedBook.targetWordCount === null
                ? en.library.noTarget
                : en.library.wordTarget(
                    new Intl.NumberFormat('en').format(
                      selectedBook.targetWordCount,
                    ),
                  )}
            </p>
            <p>{en.library.editorPending}</p>
            <Button
              variant="secondary"
              onClick={() => selectSection('library')}
            >
              {en.library.backToLibrary}
            </Button>
          </Card>
        ) : (
          activeSection !== 'library' && (
            <Card className="space-y-2">
              <h2 className="font-semibold">{en.shell.comingSoon}</h2>
              <p className="text-ui text-secondary">{section.description}</p>
            </Card>
          )
        )}
      </div>
    </AppShell>
  )
}
