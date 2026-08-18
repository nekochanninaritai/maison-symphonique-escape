export type Screen = 'title' | 'prologue' | 'game' | 'normalEnd' | 'trueEnd'

export type AreaId =
  | 'entrance'
  | 'waiting-room'
  | 'dressing-room'
  | 'ceremony'
  | 'reception'
  | 'garden'

export type WorldMode = 'empty' | 'memory'
export type PuzzleStatus = 'locked' | 'available' | 'solved'

export type HotspotPosition = {
  x: number
  y: number
  width: number
  height: number
}

export type Hotspot = {
  id: string
  label: string
  position: HotspotPosition
  visibilityCondition?: (state: GameState) => boolean
  message: string[] | ((state: GameState) => string[])
  itemReward?: string
  memoryReward?: string
  flagUpdate?: Record<string, boolean>
  focusScene?: FocusScene
  useTarget?: string
}

export type FocusScene = {
  id: string
  title: string
  description: string
  hotspots?: Hotspot[]
}

export type Exit = {
  to: AreaId
  label: string
  unlockCondition?: (state: GameState) => boolean
}

export type Area = {
  areaId: AreaId
  name: string
  chapter: string
  emptyBackground: string
  memoryBackground: string
  hotspots: Hotspot[]
  exits: Exit[]
  unlockCondition?: (state: GameState) => boolean
}

export type Item = {
  itemId: string
  name: string
  description: string
  image: string
  usableTargets: string[]
  obtained: boolean
  consumed: boolean
}

export type Memory = {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export type Puzzle = {
  puzzleId: string
  title: string
  areaId: AreaId
  status: PuzzleStatus
  prerequisites: string[]
  requiredItems?: string[]
  requiredFlags?: Record<string, boolean>
  requiredClues?: string[]
  requiredClockHandAttached?: boolean
  description?: string
  rewards: {
    memories?: string[]
    items?: string[]
    clues?: string[]
    flags?: Record<string, boolean>
    unlockGarden?: boolean
    advanceClockTo?: string
    goNormalEnd?: boolean
  }
}

export type ClockState = {
  handObtained: boolean
  handAttached: boolean
  currentTime: string
  canManualRotate: boolean
  trueRouteUnlocked: boolean
}

export type TeaTimeState = {
  cupSlots: Record<string, string>
}

export type GameState = {
  saveVersion: number
  screen: Screen
  currentArea: AreaId
  chapter: string
  worldMode: WorldMode
  inventory: Record<string, Item>
  selectedItemId: string | null
  examinedHotspots: Record<string, boolean>
  puzzles: Record<string, Puzzle>
  memories: Record<string, Memory>
  clues: Record<string, boolean>
  flags: Record<string, boolean>
  teaTime: TeaTimeState
  clockState: ClockState
  normalEndingCleared: boolean
  trueRouteUnlocked: boolean
  trueEndingCleared: boolean
  messageQueue: string[]
}

export type GameAction =
  | { type: 'START_PROLOGUE' }
  | { type: 'START_GAME' }
  | { type: 'SHOW_TITLE' }
  | { type: 'MOVE'; areaId: AreaId }
  | { type: 'EXAMINE'; hotspotId: string }
  | { type: 'SELECT_ITEM'; itemId: string | null }
  | { type: 'USE_SELECTED_ITEM'; targetId: string }
  | { type: 'SOLVE_PUZZLE'; puzzleId: string; force?: boolean }
  | { type: 'SET_PUZZLE_STATUS'; puzzleId: string; status: PuzzleStatus }
  | { type: 'RESET_PUZZLES' }
  | { type: 'SOLVE_ALL_PUZZLES' }
  | { type: 'ADVANCE_CLOCK'; time: string }
  | { type: 'SET_CLOCK_TIME'; time: string }
  | { type: 'SET_CLOCK_MANUAL'; enabled: boolean }
  | { type: 'SET_WORLD_MODE'; worldMode: WorldMode }
  | { type: 'UNLOCK_MEMORY'; memoryId: string }
  | { type: 'SET_MEMORY_COUNT'; count: number }
  | { type: 'SET_CLUE'; clueId: string; obtained: boolean }
  | { type: 'SET_FLAG'; flagId: string; value: boolean }
  | { type: 'MOVE_TEA_CUP'; cupId: string; targetSweetId: string }
  | { type: 'RESET_P01_TEA_TIME' }
  | { type: 'OBTAIN_ITEM'; itemId: string }
  | { type: 'CLEAR_INVENTORY' }
  | { type: 'ATTACH_CLOCK_HAND' }
  | { type: 'GO_NORMAL_END' }
  | { type: 'MARK_NORMAL_END_CLEARED' }
  | { type: 'UNLOCK_TRUE_ROUTE' }
  | { type: 'GO_TRUE_END' }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'RESET_ALL' }
