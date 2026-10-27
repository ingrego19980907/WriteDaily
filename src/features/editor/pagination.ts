import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

export type PaperLayout = {
  pages: number
  width: number
  height: number
  padding: number
  gap: number
}
type Line = {
  pos: number
  y: number
  height: number
  block: number
  end: number
  margin: number
  manual?: boolean
}
type Gap = {
  pos: number
  height: number
  block?: number
  end?: number
  margin?: number
  manual?: boolean
}
export const INITIAL_PAPER: PaperLayout = {
  pages: 1,
  width: 794,
  height: 1123,
  padding: 76,
  gap: 24,
}

/** Pure view geometry; automatic page boundaries never become document content. */
export function planPages(
  lines: readonly Line[],
  paper: Omit<PaperLayout, 'pages'>,
) {
  const gaps: Gap[] = []
  const stride = paper.height + paper.gap
  const usable = paper.height - paper.padding * 2
  let page = 0,
    shift = 0
  for (const line of lines) {
    const y = line.y + shift
    page = Math.max(page, Math.floor(y / stride))
    if (line.manual) {
      page = Math.max(page + 1, Math.floor(y / stride) + 1)
      const height = Math.max(0, page * stride - y)
      gaps.push({ pos: line.pos, height, manual: true })
      shift += height
    } else if (
      y + line.height > page * stride + usable + 0.5 &&
      y > page * stride + 0.5
    ) {
      page += 1
      const height = Math.max(0, page * stride - y)
      gaps.push({
        pos: line.pos,
        height,
        ...(line.pos === line.block + 1
          ? { block: line.block, end: line.end, margin: line.margin }
          : {}),
      })
      shift += height
    }
  }
  return { gaps, pages: page + 1 }
}

function measuredLines(
  view: EditorView,
  paper: Omit<PaperLayout, 'pages'>,
): Line[] {
  const live = view.dom
  const clone = live.cloneNode(true) as HTMLElement
  clone.removeAttribute('role')
  clone.removeAttribute('aria-label')
  clone.setAttribute('aria-hidden', 'true')
  clone.setAttribute('contenteditable', 'false')
  clone.setAttribute('data-page-measure', '')
  Object.assign(clone.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    left: '0',
    top: '0',
    width: `${paper.width}px`,
    maxWidth: 'none',
    minHeight: '0',
    height: 'auto',
    padding: `${paper.padding}px`,
  })
  const sourceNodes = Array.from(
    live.querySelectorAll<HTMLElement>('p,h1,h2,h3,h4,h5,h6,[data-page-break]'),
  )
  const cloneNodes = Array.from(
    clone.querySelectorAll<HTMLElement>(
      'p,h1,h2,h3,h4,h5,h6,[data-page-break]',
    ),
  )
  const blockPositions: number[] = []
  view.state.doc.descendants((node, pos) => {
    if (node.isTextblock || node.type.name === 'pageBreak')
      blockPositions.push(pos)
  })
  const textPositions = new Map<Text, number>()
  const originalText = live.ownerDocument.createTreeWalker(
    live,
    NodeFilter.SHOW_TEXT,
  )
  const clonedText = live.ownerDocument.createTreeWalker(
    clone,
    NodeFilter.SHOW_TEXT,
  )
  let source: globalThis.Node | null
  while ((source = originalText.nextNode())) {
    const target = clonedText.nextNode()
    if (target) textPositions.set(target as Text, view.posAtDOM(source, 0))
  }
  clone
    .querySelectorAll('[data-pagination-gap]')
    .forEach((node) => node.remove())
  for (const element of cloneNodes) {
    if (element.hasAttribute('data-pagination-node')) {
      element.style.marginTop = ''
      element.style.height = ''
      element.removeAttribute('data-pagination-node')
    }
    element.removeAttribute('id')
  }
  live.parentElement!.appendChild(clone)
  try {
    const top = clone.getBoundingClientRect().top + paper.padding
    const lines: Line[] = []
    cloneNodes.forEach((element, index) => {
      const block = blockPositions[index]
      if (block === undefined || !sourceNodes[index]) return
      const node = view.state.doc.nodeAt(block)
      if (!node) return
      const style = getComputedStyle(element)
      const base = {
        block,
        end: block + node.nodeSize,
        margin: parseFloat(style.marginTop) || 0,
      }
      if (node.type.name === 'pageBreak') {
        lines.push({
          ...base,
          pos: block,
          y: element.getBoundingClientRect().top - top,
          height: 0,
          manual: true,
        })
        return
      }
      const walker = live.ownerDocument.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
      )
      let text: globalThis.Node | null
      const found: Line[] = []
      while ((text = walker.nextNode())) {
        const start = textPositions.get(text as Text)
        if (start === undefined || !text.textContent?.length) continue
        const range = live.ownerDocument.createRange()
        range.selectNodeContents(text)
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.height <= 0) continue
          // Locate the first character on this rendered line without changing the editor DOM.
          let low = 0,
            high = text.textContent.length - 1
          while (low < high) {
            const mid = Math.floor((low + high) / 2)
            range.setStart(text, mid)
            range.setEnd(text, mid + 1)
            const char = range.getBoundingClientRect()
            if (char.bottom <= rect.top + 1) low = mid + 1
            else high = mid
          }
          const height = Math.max(
            rect.height,
            parseFloat(style.lineHeight) || rect.height,
          )
          const y = rect.top - top - Math.max(0, (height - rect.height) / 2)
          const existing = found.find(
            (line) => Math.abs(line.y - y) < Math.min(height, line.height) / 2,
          )
          if (existing) {
            existing.pos = Math.min(existing.pos, start + low)
            existing.height = Math.max(existing.height, height)
          } else found.push({ ...base, pos: start + low, y, height })
        }
      }
      if (!found.length)
        found.push({
          ...base,
          pos: block + 1,
          y: element.getBoundingClientRect().top - top,
          height: element.getBoundingClientRect().height,
        })
      lines.push(...found.sort((a, b) => a.y - b.y))
    })
    return lines
  } finally {
    clone.remove()
  }
}

export function chapterPagination(onLayout: (layout: PaperLayout) => void) {
  const key = new PluginKey<DecorationSet>('chapterPagination')
  return Extension.create({
    name: 'chapterPagination',
    addProseMirrorPlugins() {
      return [
        new Plugin<DecorationSet>({
          key,
          state: {
            init: () => DecorationSet.empty,
            apply: (tr, previous) =>
              tr.getMeta(key) ?? previous.map(tr.mapping, tr.doc),
          },
          props: { decorations: (state) => key.getState(state) },
          view(view) {
            let frame = 0,
              disposed = false,
              width = 0,
              lastLayout = '',
              fontMetric = '',
              revealCaret = false
            const schedule = () => {
              if (frame || disposed) return
              frame = requestAnimationFrame(() => {
                frame = 0
                if (
                  disposed ||
                  view.composing ||
                  !view.dom.isConnected ||
                  !view.dom.parentElement
                )
                  return
                const currentWidth = view.dom.getBoundingClientRect().width
                if (
                  currentWidth <= 0 ||
                  typeof Range.prototype.getClientRects !== 'function'
                )
                  return
                width = currentWidth
                fontMetric = getComputedStyle(view.dom).fontSize
                const paper = {
                  width,
                  height: (width * 297) / 210,
                  padding: (width * 20) / 210,
                  gap: 24,
                }
                const result = planPages(measuredLines(view, paper), paper)
                const decorations = result.gaps.map((gap) => {
                  if (gap.manual)
                    return Decoration.node(gap.pos, gap.pos + 1, {
                      'data-pagination-node': '',
                      style: `height:${gap.height}px`,
                    })
                  if (gap.block !== undefined && gap.end !== undefined)
                    return Decoration.node(gap.block, gap.end, {
                      'data-pagination-node': '',
                      style: `margin-top:${gap.height + (gap.margin ?? 0)}px`,
                    })
                  return Decoration.widget(
                    gap.pos,
                    () => {
                      const spacer =
                        view.dom.ownerDocument.createElement('span')
                      spacer.setAttribute('data-pagination-gap', '')
                      spacer.setAttribute('aria-hidden', 'true')
                      spacer.setAttribute('contenteditable', 'false')
                      spacer.style.cssText = `display:block;height:${gap.height}px;pointer-events:none`
                      return spacer
                    },
                    {
                      side: -1,
                      key: `page-${gap.pos}-${gap.height}`,
                      ignoreSelection: true,
                    },
                  )
                })
                const next = DecorationSet.create(view.state.doc, decorations)
                let transaction = view.state.tr
                  .setMeta(key, next)
                  .setMeta('addToHistory', false)
                if (revealCaret && view.hasFocus())
                  transaction = transaction.scrollIntoView()
                revealCaret = false
                view.dispatch(transaction)
                const layout = { ...paper, pages: result.pages }
                const signature = JSON.stringify(layout)
                if (signature !== lastLayout) {
                  lastLayout = signature
                  onLayout(layout)
                }
              })
            }
            const observer =
              typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                    if (
                      view.dom.getBoundingClientRect().width !== width ||
                      getComputedStyle(view.dom).fontSize !== fontMetric
                    )
                      schedule()
                  })
            // An em-sized probe notices text enlargement even while the paper box keeps its size.
            const probe = view.dom.ownerDocument.createElement('span')
            probe.setAttribute('aria-hidden', 'true')
            probe.style.cssText =
              'position:absolute;visibility:hidden;pointer-events:none;width:1em;height:1em'
            view.dom.parentElement?.appendChild(probe)
            observer?.observe(view.dom)
            observer?.observe(probe)
            view.dom.addEventListener('compositionend', schedule)
            view.dom.ownerDocument.fonts?.addEventListener(
              'loadingdone',
              schedule,
            )
            schedule()
            return {
              update: (_, previous) => {
                if (!previous.doc.eq(view.state.doc)) {
                  revealCaret = true
                  schedule()
                }
              },
              destroy() {
                disposed = true
                cancelAnimationFrame(frame)
                observer?.disconnect()
                probe.remove()
                view.dom.removeEventListener('compositionend', schedule)
                view.dom.ownerDocument.fonts?.removeEventListener(
                  'loadingdone',
                  schedule,
                )
              },
            }
          },
        }),
      ]
    },
  })
}
