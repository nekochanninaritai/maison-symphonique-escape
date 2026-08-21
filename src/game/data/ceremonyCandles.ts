export type CandleShape = 'orb' | 'faceted' | 'cube' | 'twist'

export type CeremonyCandle = {
  id: string
  shape: CandleShape
  name: string
  description: string
  image?: string
  finalPuzzleMark?: string
}

export type CeremonyVase = {
  id: string
  shape: CandleShape
  name: string
  description: string
  orderFromEntrance: number
  position: { x: number; y: number; width: number; height: number }
  isFutureLightEventAnchor?: boolean
}

export const ceremonyCandles: CeremonyCandle[] = [
  {
    id: 'ceremony-candle-cube',
    shape: 'cube',
    name: 'Square Holder',
    description: '四角いガラス台座に立てられたキャンドル。',
  },
  {
    id: 'ceremony-candle-orb',
    shape: 'orb',
    name: 'Round Holder',
    description: '丸みのあるガラス台座に立てられたキャンドル。',
  },
  {
    id: 'ceremony-candle-twist',
    shape: 'twist',
    name: 'Spiral Holder',
    description: '螺旋意匠の台座に立てられたキャンドル。',
  },
  {
    id: 'ceremony-candle-faceted',
    shape: 'faceted',
    name: 'Faceted Holder',
    description: 'カットガラスの台座に立てられたキャンドル。',
  },
]

// Temporary sequence for Phase 2B-2. Final order can be changed by editing vase order only.
export const ceremonyVases: CeremonyVase[] = [
  {
    id: 'ceremony-vase-orb',
    shape: 'orb',
    name: 'Round Vase',
    description: '丸みを帯びたガラスの花器。淡い花が飾られている。',
    orderFromEntrance: 1,
    position: { x: 24, y: 66, width: 14, height: 14 },
  },
  {
    id: 'ceremony-vase-twist',
    shape: 'twist',
    name: 'Spiral Vase',
    description: '螺旋を描くような細工の花器。',
    orderFromEntrance: 2,
    position: { x: 62, y: 60, width: 14, height: 14 },
  },
  {
    id: 'ceremony-vase-faceted',
    shape: 'faceted',
    name: 'Faceted Glass Vase',
    description: '光を細かく反射する、カットガラスの花器。',
    orderFromEntrance: 3,
    position: { x: 28, y: 42, width: 14, height: 14 },
    isFutureLightEventAnchor: true,
  },
  {
    id: 'ceremony-vase-cube',
    shape: 'cube',
    name: 'Square Vase',
    description: '直線的な四角い花器。',
    orderFromEntrance: 4,
    position: { x: 60, y: 32, width: 14, height: 14 },
  },
]

export const correctCandleSequence = ceremonyVases
  .slice()
  .sort((a, b) => a.orderFromEntrance - b.orderFromEntrance)
  .map((vase) => ceremonyCandles.find((candle) => candle.shape === vase.shape)?.id)
  .filter((id): id is string => Boolean(id))

export const allCandleIds = ceremonyCandles.map((candle) => candle.id)
export const lightEventVase = ceremonyVases.find((vase) => vase.isFutureLightEventAnchor)
