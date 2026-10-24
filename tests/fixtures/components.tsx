import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/global.css'
import { Button } from '../../src/components/ui/Button'
import { Card } from '../../src/components/ui/Card'
import { Input } from '../../src/components/ui/Input'
import { Modal } from '../../src/components/ui/Modal'
import { ProgressBar } from '../../src/components/ui/ProgressBar'

function ComponentVerification() {
  const [open, setOpen] = useState(false)
  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-6">
      <h1 className="font-writing text-display">Component verification</h1>
      <Card className="space-y-4">
        <h2 className="text-xl">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="ghost">Quiet action</Button>
          <Button disabled>Unavailable action</Button>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-xl">Fields</h2>
        <Input label="Title" hint="Enter a working title." />
        <Input label="Required title" error="Enter a title." required />
        <Input label="Reference" defaultValue="Read-only reference" readOnly />
        <Input label="Unavailable field" disabled />
      </Card>
      <Card className="space-y-4">
        <h2 className="text-xl">Progress</h2>
        <ProgressBar label="Book progress" value={25} />
        <ProgressBar label="Unknown progress" value={null} />
      </Card>
      <Card>
        <Modal
          open={open}
          onOpenChange={setOpen}
          trigger={<Button>Open modal</Button>}
          title="Dialog details"
          description="A test-only dialog with scrollable content."
          closeLabel="Close"
        >
          <Input label="Dialog title" hint="Focus stays within this dialog." />
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index}>
              Verification paragraph {index + 1}: long content scrolls while the
              Close action remains available.
            </p>
          ))}
          <Button onClick={() => setOpen(false)}>Finish preview</Button>
        </Modal>
      </Card>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComponentVerification />
  </StrictMode>,
)
