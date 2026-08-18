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
    name: 'Cube Candle',
    description: '直線的な面を持つ、四角いキャンドル。',
  },
  {
    id: 'ceremony-candle-orb',
    shape: 'orb',
    name: 'Orb Candle',
    description: '丸みを帯びた、やわらかな形のキャンドル。',
  },
  {
    id: 'ceremony-candle-twist',
    shape: 'twist',
    name: 'Twist Candle',
    description: 'ゆるく螺旋を描くキャンドル。',
  },
  {
    id: 'ceremony-candle-faceted',
    shape: 'faceted',
    name: 'Faceted Candle',
    description: '小さな面が光を返す、多面体のキャンドル。',
  },
]

// Temporary sequence for Phase 2B-2. Final order can be changed by editing vase order only.
export const ceremonyVases: CeremonyVase[] = [
  {
    id: 'ceremony-vase-orb',
    shape: 'orb',
    name: '丸みのある花器',
    description: '丸みを帯びたガラスの花器。淡い花が飾られている。',
    orderFromEntrance: 1,
    position: { x: 24, y: 66, width: 14, height: 14 },
  },
  {
    id: 'ceremony-vase-twist',
    shape: 'twist',
    name: '螺旋の花器',
    description: '螺旋を描くような細工の花器。',
    orderFromEntrance: 2,
    position: { x: 62, y: 60, width: 14, height: 14 },
  },
  {
    id: 'ceremony-vase-faceted',
    shape: 'faceted',
    name: 'カットガラスの花器',
    description: '光を細かく反射する、カットガラスの花器。',
    orderFromEntrance: 3,
    position: { x: 28, y: 42, width: 14, height: 14 },
    isFutureLightEventAnchor: true,
  },
  {
    id: 'ceremony-vase-cube',
    shape: 'cube',
    name: '四角い花器',
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
