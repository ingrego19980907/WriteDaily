import { expect, test } from 'vitest'
import { planPages } from './pagination'
const paper = { width: 210, height: 297, padding: 20, gap: 10 }
const line = (pos: number, y: number) => ({
  pos,
  y,
  height: 20,
  block: 0,
  end: 50,
  margin: 0,
})
test('overflow adds visual gaps without modifying line data and leaves room for both margins', () => {
  const lines = [line(1, 0), line(10, 250), line(20, 270)]
  const before = JSON.stringify(lines)
  const result = planPages(lines, paper)
  expect(result.pages).toBe(2)
  expect(result.gaps).toEqual([{ pos: 10, height: 57 }])
  expect(JSON.stringify(lines)).toBe(before)
})
test('manual breaks preserve empty sheets while automatic layout remains separate', () => {
  const result = planPages(
    [
      { ...line(1, 0), manual: true, height: 0 },
      { ...line(2, 0), manual: true, height: 0 },
      line(3, 0),
    ],
    paper,
  )
  expect(result.pages).toBe(3)
  expect(result.gaps.map((gap) => gap.height)).toEqual([307, 307])
})
test('first lines move the entire block and oversized first lines cannot loop', () => {
  expect(
    planPages(
      [line(1, 0), { ...line(11, 250), block: 10, end: 20, margin: 12 }],
      paper,
    ).gaps,
  ).toEqual([{ pos: 11, height: 57, block: 10, end: 20, margin: 12 }])
  expect(planPages([{ ...line(1, 0), height: 500 }], paper).pages).toBe(1)
})

test('large blank vertical intervals still allocate all intervening paper sheets', () => {
  expect(planPages([line(1, 0), line(20, 1000)], paper).pages).toBe(4)
})
