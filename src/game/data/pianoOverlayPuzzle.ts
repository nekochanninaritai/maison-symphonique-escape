export type PianoOverlaySymbol = {
  id: string
  symbol: string
  keyIndex: number
  order: number
}

export type PianoOverlayPuzzleData = {
  whiteKeyCount: number
  blackKeyPositions: number[]
  cReferenceKeyIndex: number
  symbols: PianoOverlaySymbol[]
}

export type PlayablePianoKey = {
  id: string
  keyIndex: number
  kind: 'white' | 'black'
  position: number
  toneOffset: number
}

export const pianoReferenceMark = '●'

// TODO: Replace after Maison Symphonique picture and transparent sheet visuals are finalized.
export const pianoOverlayPuzzleData: PianoOverlayPuzzleData = {
  whiteKeyCount: 8,
  blackKeyPositions: [0, 1, 3, 4, 5],
  cReferenceKeyIndex: 0,
  symbols: [
    { id: 'diamond', symbol: '◇', keyIndex: 1, order: 1 },
    { id: 'heart', symbol: '♡', keyIndex: 3, order: 2 },
    { id: 'spade', symbol: '♤', keyIndex: 4, order: 3 },
    { id: 'club', symbol: '♧', keyIndex: 6, order: 4 },
  ],
}

export const getOverlaySymbolOrder = (data = pianoOverlayPuzzleData): PianoOverlaySymbol[] =>
  data.symbols.slice().sort((a, b) => a.order - b.order)

export const getOverlaySymbolSequence = (data = pianoOverlayPuzzleData): string[] =>
  getOverlaySymbolOrder(data).map((symbol) => symbol.symbol)

export const getDerivedPianoSequence = (data = pianoOverlayPuzzleData): number[] =>
  getOverlaySymbolOrder(data).map((symbol) => symbol.keyIndex)

export const getPhraseLength = (data = pianoOverlayPuzzleData): number => getDerivedPianoSequence(data).length

export const getPlayablePianoKeys = (data = pianoOverlayPuzzleData): PlayablePianoKey[] => [
  ...Array.from({ length: data.whiteKeyCount }, (_, keyIndex) => ({
    id: `white-${keyIndex}`,
    keyIndex,
    kind: 'white' as const,
    position: keyIndex,
    toneOffset: keyIndex * 2,
  })),
  ...data.blackKeyPositions.map((position) => ({
    id: `black-${position}`,
    keyIndex: 100 + position,
    kind: 'black' as const,
    position,
    toneOffset: position * 2 + 1,
  })),
]

export const isPlayablePianoKey = (keyIndex: number, data = pianoOverlayPuzzleData): boolean =>
  getPlayablePianoKeys(data).some((key) => key.keyIndex === keyIndex)
