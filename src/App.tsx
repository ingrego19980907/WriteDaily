const copy = {
  name: 'WriteDaily',
  tagline: 'A little writing, every day.',
  status: 'Your writing space is taking shape.',
}

export default function App() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-16">
      <h1 className="text-3xl font-bold">{copy.name}</h1>
      <p>{copy.tagline}</p>
      <p>{copy.status}</p>
    </main>
  )
}
