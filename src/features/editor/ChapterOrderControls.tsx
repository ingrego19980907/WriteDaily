import { en } from '../../app/i18n/en'
import { Button } from '../../components/ui/Button'

export function ChapterOrderControls({
  title,
  disabled,
  first,
  last,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  title: string
  disabled: boolean
  first: boolean
  last: boolean
  onMove: (direction: -1 | 1) => void
  onDragStart: (event: React.DragEvent<HTMLSpanElement>) => void
  onDragEnd: () => void
}) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-1">
      <span
        draggable={!disabled}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={en.chapters.dragChapter}
        aria-hidden="true"
        className="inline-flex h-11 w-8 items-center justify-center text-secondary cursor-grab active:cursor-grabbing"
      >
        <svg
          width="18"
          height="22"
          viewBox="0 0 18 22"
          fill="currentColor"
          focusable="false"
        >
          {[5, 11, 17].map((y) => (
            <g key={y}>
              <circle cx="6" cy={y} r="1.2" />
              <circle cx="12" cy={y} r="1.2" />
            </g>
          ))}
        </svg>
      </span>
      {([-1, 1] as const).map((direction) => (
        <Button
          key={direction}
          variant="ghost"
          className="h-11 w-11 shrink-0 p-2"
          disabled={disabled || (direction === -1 ? first : last)}
          aria-label={
            direction === -1
              ? en.chapters.moveUp(title)
              : en.chapters.moveDown(title)
          }
          title={
            direction === -1
              ? en.chapters.moveUp(title)
              : en.chapters.moveDown(title)
          }
          onClick={() => onMove(direction)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d={direction === -1 ? 'm6 14 6-6 6 6' : 'm6 10 6 6 6-6'} />
          </svg>
        </Button>
      ))}
    </div>
  )
}
