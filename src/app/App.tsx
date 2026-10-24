import { useEffect, useRef, useState } from 'react'
import { en } from './i18n/en'
import { AppShell } from './AppShell'
import { AppNavigation } from './AppNavigation'
import type { SectionId } from './navigation'

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('library')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousSection = useRef(activeSection)
  const section = en.sections[activeSection]

  useEffect(() => {
    if (previousSection.current !== activeSection) {
      headingRef.current?.focus()
      previousSection.current = activeSection
    }
  }, [activeSection])

  return (
    <AppShell
      navigation={
        <AppNavigation
          activeSection={activeSection}
          onSelect={setActiveSection}
        />
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
        <div className="space-y-2 border-t border-border pt-6">
          <p className="font-semibold">{en.shell.comingSoon}</p>
          <p className="text-ui text-secondary">{section.description}</p>
        </div>
      </div>
    </AppShell>
  )
}
