import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const mojibakeMarkerCodePoints = [
  0x7e5d,
  0x8b41,
  0x7e3a,
  0x873f,
  0x9666,
  0x9015,
  0x879f,
  0x8373,
  0x8389,
  0x8c41,
  0x8b4e,
  0x7e67,
  0xfffd,
  0x7b33,
  0x7b19,
]

const mojibakeMarkers = mojibakeMarkerCodePoints.map((codePoint) => String.fromCodePoint(codePoint))
const sourceExtensions = new Set(['.ts', '.tsx', '.css'])

const collectSourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry: string) => {
    const filePath = join(dir, entry)
    const stat = statSync(filePath)
    if (stat.isDirectory()) return collectSourceFiles(filePath)
    return sourceExtensions.has(filePath.slice(filePath.lastIndexOf('.'))) ? [filePath] : []
  })

describe('player-facing Japanese text encoding', () => {
  it('does not contain common mojibake markers in source text', () => {
    const findings = collectSourceFiles('src').flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return content
        .split(/\r?\n/)
        .flatMap((line: string, index: number) =>
          mojibakeMarkers.some((marker) => line.includes(marker)) ? [`${file}:${index + 1}`] : [],
        )
    })

    expect(findings).toEqual([])
  })
})
