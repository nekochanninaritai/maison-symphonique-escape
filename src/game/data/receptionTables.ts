export type ReceptionAnomalyType = 'missing-glass' | 'different-napkin' | 'pulled-chair' | 'petals'

export type ReceptionSeat = {
  id: string
  label: string
  digit: number
  x: number
  y: number
}

export type ReceptionTablePuzzleData = {
  id: string
  name: string
  motif: string
  motifIcon: string
  decoration: string
  anomalyType: ReceptionAnomalyType
  anomalyDescription: string
  targetSeatId: string
  lockOrder: number
  position: { x: number; y: number; width: number; height: number }
  image?: string
  finalPuzzleMark?: string
  seats: ReceptionSeat[]
}

const createSeats = (digits: number[]): ReceptionSeat[] => {
  const count = digits.length
  return digits.map((digit, index) => {
    const angle = -90 + (360 / count) * index
    const radian = (angle * Math.PI) / 180
    return {
      id: `seat-${index + 1}`,
      label: `${index + 1}`,
      digit,
      x: 50 + Math.cos(radian) * 39,
      y: 50 + Math.sin(radian) * 39,
    }
  })
}

// TODO: Replace after Maison Symphonique reception visuals are finalized.
export const receptionTables: ReceptionTablePuzzleData[] = [
  {
    id: 'rose',
    name: 'ROSE',
    motif: 'Rose',
    motifIcon: 'Rose',
    decoration: 'Rose arrangement',
    anomalyType: 'missing-glass',
    anomalyDescription: 'この席だけ、グラスが置かれていない。',
    targetSeatId: 'seat-3',
    lockOrder: 1,
    position: { x: 12, y: 61, width: 25, height: 25 },
    seats: createSeats([6, 1, 4, 8, 3, 0, 5, 2]),
  },
  {
    id: 'lily',
    name: 'LILY',
    motif: 'Lily',
    motifIcon: 'Lily',
    decoration: 'Lily arrangement',
    anomalyType: 'different-napkin',
    anomalyDescription: 'この席だけ、ナプキンの折り方が違う。',
    targetSeatId: 'seat-6',
    lockOrder: 2,
    position: { x: 37, y: 39, width: 22, height: 21 },
    seats: createSeats([3, 8, 1, 5, 2, 7, 0, 6]),
  },
  {
    id: 'olive',
    name: 'OLIVE',
    motif: 'Olive',
    motifIcon: 'Olive',
    decoration: 'Olive branch centerpiece',
    anomalyType: 'pulled-chair',
    anomalyDescription: 'この席だけ、椅子が少し引かれている。',
    targetSeatId: 'seat-2',
    lockOrder: 3,
    position: { x: 65, y: 56, width: 24, height: 24 },
    seats: createSeats([9, 2, 5, 1, 6, 8, 3, 4]),
  },
  {
    id: 'mimosa',
    name: 'MIMOSA',
    motif: 'Mimosa',
    motifIcon: 'Mimosa',
    decoration: 'Mimosa flowers',
    anomalyType: 'petals',
    anomalyDescription: 'この席だけ、小さな花びらが置かれている。',
    targetSeatId: 'seat-8',
    lockOrder: 4,
    position: { x: 78, y: 64, width: 18, height: 20 },
    seats: createSeats([1, 5, 0, 6, 8, 3, 4, 9]),
  },
]

export const initialReceptionLockInput = [0, 0, 0, 0]

export const receptionLockTables = receptionTables.slice().sort((a, b) => a.lockOrder - b.lockOrder)

export const getReceptionTable = (tableId: string): ReceptionTablePuzzleData | undefined =>
  receptionTables.find((table) => table.id === tableId)

export const getReceptionLockCode = (): string =>
  receptionLockTables
    .map((table) => table.seats.find((seat) => seat.id === table.targetSeatId)?.digit ?? 0)
    .join('')

export const getReceptionLockDigits = (): number[] =>
  receptionLockTables.map((table) => table.seats.find((seat) => seat.id === table.targetSeatId)?.digit ?? 0)

export const isReceptionLockSolved = (input: number[]): boolean => input.join('') === getReceptionLockCode()
