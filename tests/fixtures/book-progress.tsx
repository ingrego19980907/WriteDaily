// Explicit presentation inputs only; these counts are not a production persistence source.
import '../../src/styles/global.css'
import { createRoot } from 'react-dom/client'
import { BookCard } from '../../src/features/library/BookCard'
import type { Book } from '../../src/features/library/book'
import { AppShell } from '../../src/app/AppShell'

const book: Book = {
  id: 'fixture',
  title: '',
  targetWordCount: 1000,
  dailyWordGoal: null,
  deadline: null,
  coverPath: null,
  completedAt: null,
  createdAt: '2026-10-25T10:00:00.000Z',
  updatedAt: '2026-10-25T10:00:00.000Z',
}
const examples = [
  { title: 'Zero words', words: 0, target: 1000 },
  { title: 'Partial progress', words: 250, target: 1000 },
  { title: 'Target reached', words: 1000, target: 1000 },
  { title: 'Above target', words: 1500, target: 1000 },
  { title: 'No target', words: 500, target: null },
  { title: 'Unknown count', words: null, target: 1000 },
  {
    title: 'Very large count',
    words: Number.MAX_SAFE_INTEGER,
    target: Number.MAX_SAFE_INTEGER,
  },
  { title: 'Overdue', words: 250, target: 1000, deadline: '2020-01-01' },
]
createRoot(document.getElementById('root')!).render(
  <AppShell wide>
    <div className="space-y-6">
      <h1 className="font-writing text-display">Book progress verification</h1>
      <ul className="library-grid">
        {examples.map((example) => (
          <li key={example.title}>
            <BookCard
              book={{
                ...book,
                title: example.title,
                targetWordCount: example.target,
                deadline: example.deadline ?? null,
              }}
              wordCount={example.words}
              onSaved={() => {}}
              onDeleted={() => {}}
            />
          </li>
        ))}
      </ul>
    </div>
  </AppShell>,
)
