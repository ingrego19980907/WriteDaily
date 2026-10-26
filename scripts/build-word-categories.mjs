import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

// Reproducible, offline generator. Download the official files separately; see
// docs/WORD_COUNTING.md. Never derive behavior from the host's Unicode version.
const source = readFileSync(process.argv[2])
const sha256 = createHash('sha256').update(source).digest('hex')
if (
  sha256 !== '2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c'
)
  throw new Error('Expected the pinned Unicode 17.0.0 UnicodeData.txt')
const license = readFileSync(process.argv[3], 'utf8')
if (!license.startsWith('UNICODE LICENSE V3'))
  throw new Error('Unicode license required')
const ranges = []
let first = null
for (const line of source.toString('utf8').trim().split(/\r?\n/)) {
  const [hex, name, category] = line.split(';')
  const point = Number.parseInt(hex, 16)
  const kind = { L: 1, N: 2, M: 3 }[category[0]]
  if (name.endsWith(', First>')) {
    first = point
    continue
  }
  const start = name.endsWith(', Last>') ? first : point
  first = null
  if (!kind) continue
  if (start === null) throw new Error('Missing Unicode range start')
  const previous = ranges.at(-1)
  if (previous && previous[1] + 1 === start && previous[2] === kind)
    previous[1] = point
  else ranges.push([start, point, kind])
}
const target = new URL('../resources/unicode/', import.meta.url)
mkdirSync(target, { recursive: true })
writeFileSync(
  new URL('word-categories-17.0.0.json', target),
  JSON.stringify(
    { unicodeVersion: '17.0.0', sourceSha256: sha256, ranges },
    null,
    2,
  ) + '\n',
)
writeFileSync(new URL('LICENSE.txt', target), license)
process.stdout.write(
  `Generated ${ranges.length} Unicode word-category ranges.\n`,
)
