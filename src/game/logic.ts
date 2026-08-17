import { areas } from './data/areas'
import { createItems } from './data/items'
import { createMemories } from './data/memories'
import { createPuzzles } from './data/puzzles'
import { gameConfig } from './config'
import type { AreaId, GameAction, GameState, Hotspot, Item, Puzzle } from './types'

export const createInitialState = (): GameState => ({
  saveVersion: gameConfig.saveVersion,
  screen: 'title',
  currentArea: 'entrance',
  chapter: 'Title',
  worldMode: 'empty',
  inventory: createItems(),
  selectedItemId: null,
  examinedHotspots: {},
  puzzles: createPuzzles(),
  memories: createMemories(),
  flags: {},
  clockState: {
    handObtained: false,
    handAttached: false,
    currentTime: '09:23',
    canManualRotate: false,
    trueRouteUnlocked: false,
  },
  normalEndingCleared: false,
  trueRouteUnlocked: false,
  trueEndingCleared: false,
  messageQueue: [],
})

export const getVisibleHotspots = (state: GameState, areaId = state.currentArea): Hotspot[] => {
  return areas[areaId].hotspots.filter((hotspot) => !hotspot.visibilityCondition || hotspot.visibilityCondition(state))
}

export const getMemoryCount = (state: GameState): number => Object.values(state.memories).filter((memory) => memory.unlocked).length

export const isNearTrueRouteTime = (time: string): boolean => {
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false
  return hour === 9 && Math.abs(minute - 23) <= 2
}

export const normalizeTime = (totalMinutes: number): string => {
  const dayMinutes = 24 * 60
  const normalized = ((Math.round(totalMinutes) % dayMinutes) + dayMinutes) % dayMinutes
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const cloneItem = (item: Item, patch: Partial<Item>): Item => ({ ...item, ...patch })

const withMessage = (state: GameState, messageQueue: string[]): GameState => ({
  ...state,
  messageQueue,
})

const updatePuzzle = (state: GameState, puzzleId: string, patch: Partial<Puzzle>): GameState => ({
  ...state,
  puzzles: {
    ...state.puzzles,
    [puzzleId]: { ...state.puzzles[puzzleId], ...patch },
  },
})

const unlockMemory = (state: GameState, memoryId: string): GameState => {
  const memory = state.memories[memoryId]
  if (!memory) return state
  return {
    ...state,
    memories: {
      ...state.memories,
      [memoryId]: { ...memory, unlocked: true },
    },
  }
}

export const obtainItem = (state: GameState, itemId: string): GameState => {
  const item = state.inventory[itemId]
  if (!item) return state
  return {
    ...state,
    inventory: {
      ...state.inventory,
      [itemId]: cloneItem(item, { obtained: true, consumed: false }),
    },
    clockState:
      itemId === 'clock-hand'
        ? { ...state.clockState, handObtained: true }
        : state.clockState,
  }
}

export const attachClockHand = (state: GameState): GameState => {
  const hand = state.inventory['clock-hand']
  if (!hand?.obtained || hand.consumed) {
    return withMessage(state, ['長針はまだ見つかっていない。'])
  }

  return withMessage(
    {
      ...state,
      selectedItemId: null,
      inventory: {
        ...state.inventory,
        'clock-hand': cloneItem(hand, { obtained: false, consumed: true }),
      },
      clockState: {
        ...state.clockState,
        handAttached: true,
      },
    },
    ['カチッ', '長針は元の場所に戻った。', 'しかし、時計は止まったままだ。'],
  )
}

export const setClockTime = (state: GameState, time: string): GameState => {
  if (isNearTrueRouteTime(time) && state.clockState.canManualRotate) {
    return unlockTrueRoute({
      ...state,
      clockState: {
        ...state.clockState,
        currentTime: '09:23',
      },
    })
  }
  return {
    ...state,
    clockState: {
      ...state.clockState,
      currentTime: time,
    },
  }
}

export const advanceClock = (state: GameState, targetTime: string): GameState => ({
  ...state,
  clockState: {
    ...state.clockState,
    currentTime: targetTime,
  },
})

export const unlockTrueRoute = (state: GameState): GameState => {
  let next = unlockMemory(state, 'september23')
  next = {
    ...next,
    trueRouteUnlocked: true,
    worldMode: 'memory',
    clockState: {
      ...next.clockState,
      currentTime: '09:23',
      trueRouteUnlocked: true,
      canManualRotate: false,
    },
  }
  return withMessage(next, ['時計の針が09:23で静かに止まった。', '最後の記憶が戻った。'])
}

export const solvePuzzle = (state: GameState, puzzleId: string): GameState => {
  const puzzle = state.puzzles[puzzleId]
  if (!puzzle || puzzle.status === 'solved') return state
  const missingPrerequisite = puzzle.prerequisites.some((id) => state.puzzles[id]?.status !== 'solved')
  if (missingPrerequisite) {
    return withMessage(state, ['このPlaceholder Puzzleは、まだ前提条件を満たしていない。'])
  }

  let next = updatePuzzle(state, puzzleId, { status: 'solved' })
  puzzle.rewards.memories?.forEach((memoryId) => {
    next = unlockMemory(next, memoryId)
  })
  if (puzzle.rewards.flags) {
    next = { ...next, flags: { ...next.flags, ...puzzle.rewards.flags } }
  }
  if (puzzle.rewards.unlockGarden) {
    next = { ...next, flags: { ...next.flags, gardenUnlocked: true } }
  }
  if (puzzle.rewards.advanceClockTo) {
    next = advanceClock(next, puzzle.rewards.advanceClockTo)
  }
  return withMessage(next, [`${puzzle.title} をSolvedにした。`])
}

export const canMoveToArea = (state: GameState, areaId: AreaId): boolean => {
  const area = areas[areaId]
  return Boolean(area) && (!area.unlockCondition || area.unlockCondition(state))
}

export const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_PROLOGUE':
      return { ...state, screen: 'prologue', messageQueue: [] }
    case 'START_GAME':
      return { ...state, screen: 'game', currentArea: 'entrance', chapter: areas.entrance.chapter, messageQueue: [] }
    case 'MOVE':
      if (!canMoveToArea(state, action.areaId)) return withMessage(state, ['まだその場所へは進めない。'])
      return { ...state, screen: 'game', currentArea: action.areaId, chapter: areas[action.areaId].chapter, messageQueue: [] }
    case 'EXAMINE': {
      const hotspot = getVisibleHotspots(state).find((candidate) => candidate.id === action.hotspotId)
      if (!hotspot) return state
      let next = {
        ...state,
        examinedHotspots: { ...state.examinedHotspots, [`${state.currentArea}:${hotspot.id}`]: true },
        flags: { ...state.flags, ...hotspot.flagUpdate },
      }
      if (hotspot.itemReward) next = obtainItem(next, hotspot.itemReward)
      if (hotspot.memoryReward) next = unlockMemory(next, hotspot.memoryReward)
      if (hotspot.id === 'grand-clock' && state.normalEndingCleared && state.clockState.handAttached) {
        next = { ...next, clockState: { ...next.clockState, canManualRotate: true } }
      }
      const message = typeof hotspot.message === 'function' ? hotspot.message(next) : hotspot.message
      return withMessage(next, message)
    }
    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.itemId }
    case 'USE_SELECTED_ITEM':
      if (state.selectedItemId === 'clock-hand' && action.targetId === 'grand-clock') return attachClockHand(state)
      return withMessage(state, ['今は使えないようだ。'])
    case 'SOLVE_PUZZLE':
      return solvePuzzle(state, action.puzzleId)
    case 'RESET_PUZZLES':
      return { ...state, puzzles: createPuzzles() }
    case 'SOLVE_ALL_PUZZLES':
      return Object.keys(state.puzzles).reduce((next, puzzleId) => solvePuzzle(next, puzzleId), state)
    case 'ADVANCE_CLOCK':
      return advanceClock(state, action.time)
    case 'SET_CLOCK_TIME':
      return setClockTime(state, action.time)
    case 'SET_CLOCK_MANUAL':
      return { ...state, clockState: { ...state.clockState, canManualRotate: action.enabled } }
    case 'SET_WORLD_MODE':
      return { ...state, worldMode: action.worldMode }
    case 'UNLOCK_MEMORY':
      return unlockMemory(state, action.memoryId)
    case 'SET_MEMORY_COUNT': {
      const memoryIds = Object.keys(state.memories)
      const memories = Object.fromEntries(
        memoryIds.map((memoryId, index) => [memoryId, { ...state.memories[memoryId], unlocked: index < action.count }]),
      )
      return { ...state, memories }
    }
    case 'OBTAIN_ITEM':
      return obtainItem(state, action.itemId)
    case 'CLEAR_INVENTORY':
      return { ...state, inventory: createItems(), selectedItemId: null, clockState: { ...state.clockState, handObtained: false } }
    case 'ATTACH_CLOCK_HAND':
      return {
        ...state,
        inventory: { ...state.inventory, 'clock-hand': cloneItem(state.inventory['clock-hand'], { obtained: false, consumed: true }) },
        clockState: { ...state.clockState, handObtained: true, handAttached: true },
      }
    case 'GO_NORMAL_END':
      return {
        ...state,
        screen: 'normalEnd',
        normalEndingCleared: true,
        memories: Object.fromEntries(
          Object.entries(state.memories).map(([id, memory], index) => [id, { ...memory, unlocked: index < 4 }]),
        ),
      }
    case 'MARK_NORMAL_END_CLEARED':
      return { ...state, normalEndingCleared: true }
    case 'UNLOCK_TRUE_ROUTE':
      return unlockTrueRoute(state)
    case 'GO_TRUE_END':
      return { ...state, screen: 'trueEnd', trueEndingCleared: true, worldMode: 'memory' }
    case 'CLEAR_MESSAGES':
      return { ...state, messageQueue: [] }
    case 'RESET_ALL':
      return createInitialState()
    default:
      return state
  }
}
