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
