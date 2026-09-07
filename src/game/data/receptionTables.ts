export type ReceptionAnomalyType = 'missing-glass' | 'different-napkin' | 'pulled-chair' | 'petals'

export type ReceptionSeat = {
  id: string
  chartInitial: string
  tableInitial: string
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
  focusImagePath: string
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
      chartInitial: '',
      tableInitial: '',
      digit,
      x: 50 + Math.cos(radian) * 39,
      y: 50 + Math.sin(radian) * 39,
    }
  })
}

const createInitialSeats = (chartInitials: string[], digits: number[], changedInitial: { seat: number; initial: string }): ReceptionSeat[] =>
  createSeats(digits).map((seat, index) => ({
    ...seat,
    chartInitial: chartInitials[index] ?? '',
    tableInitial: index + 1 === changedInitial.seat ? changedInitial.initial : chartInitials[index] ?? '',
  }))

export const receptionSeatingChartImagePath = './assets/environments/p03-reception-seating-chart.jpg'

export const receptionTables: ReceptionTablePuzzleData[] = [
  {
    id: 'rose',
    name: 'ROSE',
    motif: 'Rose',
    motifIcon: 'Rose',
    decoration: 'Rose arrangement',
    focusImagePath: './assets/environments/p03-reception-table-Rose.jpg',
    anomalyType: 'missing-glass',
    anomalyDescription: 'K.K の席札が紛れている。本来は I.S、席次表の数字は 2。',
    targetSeatId: 'seat-1',
    lockOrder: 1,
    position: { x: 12, y: 61, width: 25, height: 25 },
    seats: createInitialSeats(['I.S', 'I.H', 'O.K', 'Y.M', 'H.Y', 'S.Y', 'I.H'], [2, 8, 1, 7, 4, 9, 6], { seat: 1, initial: 'K.K' }),
  },
  {
    id: 'lily',
    name: 'LILY',
    motif: 'Lily',
    motifIcon: 'Lily',
    decoration: 'Lily arrangement',
    focusImagePath: './assets/environments/p03-reception-table-lily.jpg',
    anomalyType: 'different-napkin',
    anomalyDescription: 'G.G の席札が紛れている。本来は T.M、席次表の数字は 1。',
    targetSeatId: 'seat-6',
    lockOrder: 2,
    position: { x: 37, y: 39, width: 22, height: 21 },
    seats: createInitialSeats(['E.Y', 'F.K', 'Y.S', 'N.K', 'M.T', 'T.M', 'H.Y'], [5, 0, 3, 8, 7, 1, 4], { seat: 6, initial: 'G.G' }),
  },
  {
    id: 'olive',
    name: 'OLIVE',
    motif: 'Olive',
    motifIcon: 'Olive',
    decoration: 'Olive branch centerpiece',
    focusImagePath: './assets/environments/p03-reception-table-Olive.jpg',
    anomalyType: 'pulled-chair',
    anomalyDescription: 'W.W の席札が紛れている。本来は S.R、席次表の数字は 9。',
    targetSeatId: 'seat-3',
    lockOrder: 3,
    position: { x: 65, y: 56, width: 24, height: 24 },
    seats: createInitialSeats(['S.Y', 'S.Y', 'S.R', 'A.K', 'K.M', 'H.H', 'H.K', 'N.Y'], [6, 2, 9, 4, 0, 5, 3, 8], { seat: 3, initial: 'W.W' }),
  },
  {
    id: 'mimosa',
    name: 'MIMOSA',
    motif: 'Mimosa',
    motifIcon: 'Mimosa',
    decoration: 'Mimosa flowers',
    focusImagePath: './assets/environments/p03-reception-table-Mimosa.jpg',
    anomalyType: 'petals',
    anomalyDescription: 'G.J の席札が紛れている。本来は Y.M、席次表の数字は 7。',
    targetSeatId: 'seat-2',
    lockOrder: 4,
    position: { x: 78, y: 64, width: 18, height: 20 },
    seats: createInitialSeats(['K.S', 'Y.M', 'T.A', 'Y.Y', 'Y.M'], [1, 7, 4, 3, 8], { seat: 2, initial: 'G.J' }),
  },
]

export const initialReceptionLockInput = [0, 0, 0, 0]

export const receptionLockTables = receptionTables.slice().sort((a, b) => a.lockOrder - b.lockOrder)

export const getReceptionTable = (tableId: string): ReceptionTablePuzzleData | undefined =>
  receptionTables.find((table) => table.id === tableId)

export const getReceptionAnomalyInitial = (table: ReceptionTablePuzzleData): string =>
  table.seats.find((seat) => seat.id === table.targetSeatId)?.tableInitial ?? ''

export const getReceptionCorrectInitial = (table: ReceptionTablePuzzleData): string =>
  table.seats.find((seat) => seat.id === table.targetSeatId)?.chartInitial ?? ''

export const getReceptionAnomalyDigit = (table: ReceptionTablePuzzleData): number =>
  table.seats.find((seat) => seat.id === table.targetSeatId)?.digit ?? 0

export const getReceptionLockCode = (): string =>
  receptionLockTables
    .map((table) => getReceptionAnomalyDigit(table))
    .join('')

export const getReceptionLockDigits = (): number[] =>
  receptionLockTables.map((table) => getReceptionAnomalyDigit(table))

export const isReceptionLockSolved = (input: number[]): boolean => input.join('') === getReceptionLockCode()
