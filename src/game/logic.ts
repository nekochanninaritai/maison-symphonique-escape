import { areas } from './data/areas'
import { createItems } from './data/items'
import { createMemories } from './data/memories'
import { createPuzzles } from './data/puzzles'
import { allCandleIds, correctCandleSequence } from './data/ceremonyCandles'
import { getDerivedPianoSequence, getPhraseLength, isPlayablePianoKey } from './data/pianoOverlayPuzzle'
import { getReceptionLockDigits, getReceptionTable, initialReceptionLockInput, isReceptionLockSolved } from './data/receptionTables'
import { correctTeaTimeSlots, initialTeaTimeSlots, isTeaTimeSolved } from './data/teaTime'
import { gameConfig } from './config'
export { normalizeTime } from './clock'
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
  clues: {},
  flags: {},
  teaTime: {
    cupSlots: initialTeaTimeSlots,
  },
  ceremonyCandles: {
    input: [],
    lit: [],
  },
  receptionTables: {
    discoveredAnomalies: {},
    lockInput: initialReceptionLockInput,
    boxOpened: false,
  },
  pianoOverlay: {
    overlayApplied: false,
  },
  pianoPerformance: {
    input: [],
  },
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

export const isItemAvailable = (state: GameState, itemId: string): boolean => {
  const item = state.inventory[itemId]
  return Boolean(item?.obtained && !item.consumed)
}

const hasPuzzlePrerequisites = (state: GameState, puzzle: Puzzle): boolean => {
  const puzzlesSolved = puzzle.prerequisites.every((id) => state.puzzles[id]?.status === 'solved')
  const itemsReady = (puzzle.requiredItems ?? []).every((itemId) => isItemAvailable(state, itemId))
  const flagsReady = Object.entries(puzzle.requiredFlags ?? {}).every(([flagId, value]) => state.flags[flagId] === value)
  const cluesReady = (puzzle.requiredClues ?? []).every((clueId) => state.clues[clueId] === true)
  const clockReady = !puzzle.requiredClockHandAttached || state.clockState.handAttached
  return puzzlesSolved && itemsReady && flagsReady && cluesReady && clockReady
}

export const refreshPuzzleAvailability = (state: GameState): GameState => ({
  ...state,
  puzzles: Object.fromEntries(
    Object.entries(state.puzzles).map(([puzzleId, puzzle]) => [
      puzzleId,
      puzzle.status === 'solved'
        ? puzzle
        : { ...puzzle, status: hasPuzzlePrerequisites(state, puzzle) ? 'available' : 'locked' },
    ]),
  ),
})

export const getPuzzleDependencyChecklist = (state: GameState, puzzle: Puzzle): string[] => [
  ...puzzle.prerequisites.map((id) => `${state.puzzles[id]?.status === 'solved' ? '✓' : '✗'} ${id} solved`),
  ...(puzzle.requiredItems ?? []).map((itemId) => `${isItemAvailable(state, itemId) ? '✓' : '✗'} Item: ${itemId}`),
  ...Object.entries(puzzle.requiredFlags ?? {}).map(([flagId, value]) => `${state.flags[flagId] === value ? '✓' : '✗'} Flag: ${flagId} = ${value}`),
  ...(puzzle.requiredClues ?? []).map((clueId) => `${state.clues[clueId] ? '✓' : '✗'} Clue: ${clueId}`),
  ...(puzzle.requiredClockHandAttached ? [`${state.clockState.handAttached ? '✓' : '✗'} Clock hand attached`] : []),
]

export const isNearTrueRouteTime = (time: string): boolean => {
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false
  return hour === 9 && Math.abs(minute - 23) <= 2
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

const consumeItem = (state: GameState, itemId: string): GameState => {
  const item = state.inventory[itemId]
  if (!item) return state
  return {
    ...state,
    selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
    inventory: {
      ...state.inventory,
      [itemId]: cloneItem(item, { obtained: false, consumed: true }),
    },
  }
}

const unlockClue = (state: GameState, clueId: string): GameState => ({
  ...state,
  clues: {
    ...state.clues,
    [clueId]: true,
  },
})

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

const attachClockHandFromAction = (state: GameState): GameState => {
  const attached = attachClockHand(state)
  const next = startGrandClockIfReady(attached)
  if (!next.started) return attached
  return withMessage(next.state, ['カチャ。', '長針は元の場所に戻った。', '時計の奥で、止まっていた歯車が静かに動き出した。'])
}

export const setClockTime = (state: GameState, time: string): GameState => {
  if (isNearTrueRouteTime(time) && state.clockState.canManualRotate && !state.trueRouteUnlocked) {
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

const shouldStartGrandClock = (state: GameState): boolean =>
  state.clockState.handAttached && state.puzzles.p02_ceremony?.status === 'solved' && state.flags.grandClockStarted !== true

const startGrandClock = (state: GameState): GameState =>
  advanceClock(
    {
      ...state,
      flags: { ...state.flags, grandClockStarted: true },
    },
    '12:00',
  )

const startGrandClockIfReady = (state: GameState): { state: GameState; started: boolean } => {
  if (!shouldStartGrandClock(state)) return { state, started: false }
  return { state: startGrandClock(state), started: true }
}

export const unlockTrueRoute = (state: GameState): GameState => {
  let next = Object.keys(state.memories).reduce((current, memoryId) => unlockMemory(current, memoryId), state)
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

export const solvePuzzle = (state: GameState, puzzleId: string, force = false): GameState => {
  const current = refreshPuzzleAvailability(state)
  const puzzle = current.puzzles[puzzleId]
  if (!puzzle || puzzle.status === 'solved') return state
  if (puzzle.status !== 'available' && !force) {
    return withMessage(current, ['このPlaceholder Puzzleは、まだ前提条件を満たしていない。'])
  }

  let next = updatePuzzle(current, puzzleId, { status: 'solved' })
  if (puzzleId === 'p01_waiting_room') {
    next = { ...next, teaTime: { cupSlots: correctTeaTimeSlots } }
  }
  if (puzzleId === 'p02_ceremony') {
    next = { ...next, ceremonyCandles: { input: correctCandleSequence, lit: allCandleIds } }
  }
  if (puzzleId === 'p03_reception') {
    next = {
      ...next,
      receptionTables: {
        ...next.receptionTables,
        lockInput: getReceptionLockDigits(),
        boxOpened: true,
      },
    }
  }
  if (puzzleId === 'p04_sheet_overlay') {
    next = { ...next, pianoOverlay: { overlayApplied: true } }
  }
  if (puzzleId === 'p05_piano') {
    next = { ...next, pianoPerformance: { input: [] } }
  }
  puzzle.rewards.memories?.forEach((memoryId) => {
    next = unlockMemory(next, memoryId)
  })
  puzzle.rewards.items?.forEach((itemId) => {
    next = obtainItem(next, itemId)
  })
  puzzle.rewards.clues?.forEach((clueId) => {
    next = unlockClue(next, clueId)
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
  const grandClockStart = startGrandClockIfReady(next)
  next = grandClockStart.state
  if (puzzle.rewards.goNormalEnd) {
    next = {
      ...next,
      screen: 'normalEnd',
      normalEndingCleared: true,
      memories: Object.fromEntries(
        Object.entries(next.memories).map(([id, memory], index) => [id, { ...memory, unlocked: index < 4 }]),
      ),
    }
  }
  const messages =
    puzzleId === 'p01_waiting_room'
      ? ['四つのティーセットが、きれいに揃った。', '――カチャ。', '館のどこかで、扉の開く音がした。']
      : grandClockStart.started
        ? puzzleId === 'p02_ceremony'
          ? ['四つの灯が、静かに祭壇を照らした。', '――ゴーン。', '遠くで、時計の鐘が鳴った。']
          : ['時計の奥で、止まっていた歯車が静かに動き出した。']
        : puzzleId === 'p02_ceremony'
          ? ['四つの灯が、静かに祭壇を照らした。']
          : puzzleId === 'p05_piano'
            ? ['最後の音が、静かな披露宴会場に響いた。', '――遠くで、小さな鐘が鳴った。']
            : [`${puzzle.title} をSolvedにした。`]
  const finalMessages =
    puzzleId === 'p03_reception'
      ? ['――カチッ。', '箱の中に、半透明のカードが入っている。', 'その下には――古い写真の切れ端が一枚残されていた。', '遠くで、時計の鐘が鳴った。']
      : messages
  return withMessage(refreshPuzzleAvailability(next), finalMessages)
}

export const lightCeremonyCandle = (state: GameState, candleId: string): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (current.puzzles.p02_ceremony?.status === 'solved') return current
  if (current.puzzles.p02_ceremony?.status !== 'available') return current

  const nextIndex = current.ceremonyCandles.input.length
  if (correctCandleSequence[nextIndex] !== candleId) {
    return withMessage(
      {
        ...current,
        ceremonyCandles: { input: [], lit: [] },
      },
      ['炎が、ふっと消えた。'],
    )
  }

  const input = [...current.ceremonyCandles.input, candleId]
  const lit = Array.from(new Set([...current.ceremonyCandles.lit, candleId]))
  const next = { ...current, ceremonyCandles: { input, lit } }
  return input.length === correctCandleSequence.length ? solvePuzzle(next, 'p02_ceremony') : next
}

export const discoverReceptionAnomaly = (state: GameState, tableId: string, seatId: string): GameState => {
  const current = refreshPuzzleAvailability(state)
  const table = getReceptionTable(tableId)
  if (!table || current.puzzles.p03_reception?.status === 'locked') return current
  if (table.targetSeatId !== seatId) {
    return withMessage(current, ['特に変わったところはなさそうだ。'])
  }
  return withMessage(
    {
      ...current,
      receptionTables: {
        ...current.receptionTables,
        discoveredAnomalies: {
          ...current.receptionTables.discoveredAnomalies,
          [tableId]: seatId,
        },
      },
    },
    [table.anomalyDescription],
  )
}

export const setReceptionLockDigit = (state: GameState, index: number, value: number): GameState => {
  if (index < 0 || index >= state.receptionTables.lockInput.length) return state
  const lockInput = [...state.receptionTables.lockInput]
  lockInput[index] = ((value % 10) + 10) % 10
  return { ...state, receptionTables: { ...state.receptionTables, lockInput } }
}

export const setReceptionLockInput = (state: GameState, input: number[]): GameState => ({
  ...state,
  receptionTables: {
    ...state.receptionTables,
    lockInput: initialReceptionLockInput.map((fallback, index) => {
      const value = input[index] ?? fallback
      return ((value % 10) + 10) % 10
    }),
  },
})

export const openReceptionBox = (state: GameState): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (current.receptionTables.boxOpened || current.puzzles.p03_reception?.status === 'solved') {
    return withMessage(current, ['箱は開いている。'])
  }
  if (current.puzzles.p03_reception?.status !== 'available') {
    return withMessage(current, ['箱には、まだ手がかりの足りない気配がある。'])
  }
  if (!isReceptionLockSolved(current.receptionTables.lockInput)) {
    return withMessage(current, ['カチ……', '鍵は開かない。'])
  }
  return solvePuzzle({ ...current, receptionTables: { ...current.receptionTables, boxOpened: true } }, 'p03_reception')
}

export const resetP03Reception = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    receptionTables: {
      discoveredAnomalies: {},
      lockInput: initialReceptionLockInput,
      boxOpened: false,
    },
    puzzles: {
      ...state.puzzles,
      p03_reception: { ...state.puzzles.p03_reception, status: 'available' },
      p04_sheet_overlay: { ...state.puzzles.p04_sheet_overlay, status: 'locked' },
    },
    inventory: {
      ...state.inventory,
      'transparent-card': cloneItem(state.inventory['transparent-card'], { obtained: false, consumed: false }),
    },
    memories: {
      ...state.memories,
      banquet: { ...state.memories.banquet, unlocked: false },
    },
    clockState: {
      ...state.clockState,
      currentTime: '12:00',
    },
    messageQueue: ['P03 Reception Puzzle をリセットした。'],
  })

export const applyPianoOverlay = (state: GameState): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (current.pianoOverlay.overlayApplied || current.puzzles.p04_sheet_overlay?.status === 'solved') {
    return withMessage(current, ['紙の模様が、絵の上にぴたりと重なっている。'])
  }
  if (current.puzzles.p04_sheet_overlay?.status !== 'available') {
    return withMessage(current, ['ここで使うものではなさそうだ。'])
  }
  return withMessage(solvePuzzle(current, 'p04_sheet_overlay'), ['紙の模様が、絵の上にぴたりと重なった。'])
}

export const resetP04Overlay = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    pianoOverlay: { overlayApplied: false },
    clues: { ...state.clues, pianoSequence: false },
    flags: { ...state.flags, pianoClueObtained: false },
    puzzles: {
      ...state.puzzles,
      p04_sheet_overlay: { ...state.puzzles.p04_sheet_overlay, status: 'available' },
      p05_piano: { ...state.puzzles.p05_piano, status: 'locked' },
    },
    messageQueue: ['P04 Overlay Puzzle をリセットした。'],
  })

export const getPianoSequenceForP05 = (): number[] => getDerivedPianoSequence()

export const playPianoKey = (state: GameState, keyIndex: number): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (!isPlayablePianoKey(keyIndex)) return current
  if (current.puzzles.p05_piano?.status === 'solved') {
    return { ...current, pianoPerformance: { input: [] }, messageQueue: [] }
  }
  if (current.puzzles.p05_piano?.status !== 'available') return current

  const input = [...current.pianoPerformance.input, keyIndex]
  const phraseLength = getPhraseLength()
  if (input.length < phraseLength) {
    return { ...current, pianoPerformance: { input }, messageQueue: [] }
  }

  const correct = getPianoSequenceForP05()
  const solved = input.length === correct.length && input.every((value, index) => value === correct[index])
  if (solved) {
    return solvePuzzle({ ...current, pianoPerformance: { input } }, 'p05_piano')
  }

  return { ...current, pianoPerformance: { input: [] }, messageQueue: [] }
}

export const resetP05Piano = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    pianoPerformance: { input: [] },
    flags: {
      ...state.flags,
      pianoMechanismUnlocked: false,
      ceremonyLightVisible: false,
      pianoSecretOpened: false,
      invitationObtained: false,
    },
    puzzles: {
      ...state.puzzles,
      p05_piano: { ...state.puzzles.p05_piano, status: 'available' },
      p06_grand_clock: { ...state.puzzles.p06_grand_clock, status: 'locked' },
    },
    inventory: {
      ...state.inventory,
      'old-invitation': cloneItem(state.inventory['old-invitation'], { obtained: false, consumed: false }),
    },
    messageQueue: ['P05 Piano Puzzle をリセットした。'],
  })

export const examinePianoKeyhole = (state: GameState): GameState =>
  state.flags.pianoSecretOpened
    ? withMessage(state, ['小さな収納が開いている。'])
    : withMessage(state, ['小さな鍵穴がある。', '今は開けられそうにない。'])

export const resetP02Candles = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    ceremonyCandles: { input: [], lit: [] },
    flags: {
      ...state.flags,
      grandClockStarted: false,
      receptionUnlocked: false,
    },
    puzzles: {
      ...state.puzzles,
      p02_ceremony: { ...state.puzzles.p02_ceremony, status: 'available' },
    },
    clockState: {
      ...state.clockState,
      currentTime: '09:23',
    },
    messageQueue: ['P02 Candle Puzzle をリセットした。'],
  })

export const moveTeaCup = (state: GameState, cupId: string, targetSweetId: string): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (current.puzzles.p01_waiting_room?.status !== 'available') return current

  const sourceSweetId = Object.entries(current.teaTime.cupSlots).find(([, drinkId]) => drinkId === cupId)?.[0]
  const targetCupId = current.teaTime.cupSlots[targetSweetId]
  if (!sourceSweetId || !targetCupId || sourceSweetId === targetSweetId) return current

  const cupSlots = {
    ...current.teaTime.cupSlots,
    [sourceSweetId]: targetCupId,
    [targetSweetId]: cupId,
  }
  const next = { ...current, teaTime: { cupSlots } }
  return isTeaTimeSolved(cupSlots) ? solvePuzzle(next, 'p01_waiting_room') : next
}

export const resetP01TeaTime = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    currentArea: state.currentArea === 'dressing-room' || state.currentArea === 'ceremony' ? 'waiting-room' : state.currentArea,
    teaTime: { cupSlots: initialTeaTimeSlots },
    flags: {
      ...state.flags,
      dressingRoomUnlocked: false,
      ceremonyUnlocked: false,
      grandClockStarted: false,
      receptionUnlocked: false,
    },
    puzzles: {
      ...state.puzzles,
      p01_waiting_room: { ...state.puzzles.p01_waiting_room, status: 'available' },
      p02_ceremony: { ...state.puzzles.p02_ceremony, status: 'locked' },
    },
    clockState: {
      ...state.clockState,
      currentTime: '09:23',
    },
    messageQueue: ['P01 Tea Time をリセットした。'],
  })

export const canMoveToArea = (state: GameState, areaId: AreaId): boolean => {
  const area = areas[areaId]
  return Boolean(area) && (!area.unlockCondition || area.unlockCondition(state))
}

const reduceCore = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'START_PROLOGUE':
      return { ...state, screen: 'prologue', messageQueue: [] }
    case 'START_GAME':
      return { ...state, screen: 'game', currentArea: 'entrance', chapter: areas.entrance.chapter, messageQueue: [] }
    case 'SHOW_TITLE':
      return { ...state, screen: 'title', chapter: 'Title', messageQueue: [] }
    case 'MOVE':
      if (!canMoveToArea(state, action.areaId)) return withMessage(state, ['まだその場所へは進めない。'])
      return {
        ...state,
        screen: 'game',
        currentArea: action.areaId,
        chapter: areas[action.areaId].chapter,
        flags: action.areaId === 'garden' ? { ...state.flags, gardenReached: true } : state.flags,
        messageQueue: [],
      }
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
      if (hotspot.id === 'grand-clock' && state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked) {
        next = { ...next, clockState: { ...next.clockState, canManualRotate: true } }
      }
      const message = typeof hotspot.message === 'function' ? hotspot.message(next) : hotspot.message
      return withMessage(next, message)
    }
    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.itemId }
    case 'USE_SELECTED_ITEM':
      if (state.selectedItemId === 'clock-hand' && action.targetId === 'grand-clock') return attachClockHandFromAction(state)
      if (state.selectedItemId === 'transparent-card' && action.targetId === 'framed-picture') return applyPianoOverlay(state)
      if (state.selectedItemId === 'small-key' && action.targetId === 'piano-keyhole') {
        if (!state.flags.pianoMechanismUnlocked) {
          return withMessage(state, ['小さな鍵穴がある。', '今は開けられそうにない。'])
        }
        if (state.flags.pianoSecretOpened) {
          return withMessage(state, ['秘密収納はすでに開いている。'])
        }
        return withMessage(
          refreshPuzzleAvailability({
            ...obtainItem(consumeItem(state, 'small-key'), 'old-invitation'),
            flags: { ...state.flags, pianoSecretOpened: true, invitationObtained: true },
          }),
          ['――カチ。', '小さな収納が開いた。', '古い招待状を手に入れた。'],
        )
      }
      return withMessage(state, ['今は使えないようだ。'])
    case 'SOLVE_PUZZLE':
      return solvePuzzle(state, action.puzzleId, action.force)
    case 'SET_PUZZLE_STATUS':
      return updatePuzzle(state, action.puzzleId, { status: action.status })
    case 'RESET_PUZZLES':
      return { ...state, puzzles: createPuzzles() }
    case 'SOLVE_ALL_PUZZLES':
      return Object.keys(state.puzzles).reduce((next, puzzleId) => solvePuzzle(next, puzzleId, true), state)
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
    case 'SET_CLUE':
      return { ...state, clues: { ...state.clues, [action.clueId]: action.obtained } }
    case 'SET_FLAG':
      return { ...state, flags: { ...state.flags, [action.flagId]: action.value } }
    case 'MOVE_TEA_CUP':
      return moveTeaCup(state, action.cupId, action.targetSweetId)
    case 'RESET_P01_TEA_TIME':
      return resetP01TeaTime(state)
    case 'LIGHT_CEREMONY_CANDLE':
      return lightCeremonyCandle(state, action.candleId)
    case 'RESET_P02_CANDLES':
      return resetP02Candles(state)
    case 'DISCOVER_RECEPTION_ANOMALY':
      return discoverReceptionAnomaly(state, action.tableId, action.seatId)
    case 'SET_P03_LOCK_DIGIT':
      return setReceptionLockDigit(state, action.index, action.value)
    case 'SET_P03_LOCK_INPUT':
      return setReceptionLockInput(state, action.input)
    case 'OPEN_P03_BOX':
      return openReceptionBox(state)
    case 'RESET_P03_RECEPTION':
      return resetP03Reception(state)
    case 'APPLY_P04_OVERLAY':
      return applyPianoOverlay(state)
    case 'RESET_P04_OVERLAY':
      return resetP04Overlay(state)
    case 'PLAY_PIANO_KEY':
      return playPianoKey(state, action.keyIndex)
    case 'RESET_P05_PIANO':
      return resetP05Piano(state)
    case 'EXAMINE_PIANO_KEYHOLE':
      return examinePianoKeyhole(state)
    case 'OBTAIN_ITEM':
      return obtainItem(state, action.itemId)
    case 'CLEAR_INVENTORY':
      return { ...state, inventory: createItems(), selectedItemId: null, clockState: { ...state.clockState, handObtained: false } }
    case 'ATTACH_CLOCK_HAND':
      return startGrandClockIfReady({
        ...state,
        inventory: { ...state.inventory, 'clock-hand': cloneItem(state.inventory['clock-hand'], { obtained: false, consumed: true }) },
        clockState: { ...state.clockState, handObtained: true, handAttached: true },
      }).state
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

export const reducer = (state: GameState, action: GameAction): GameState => {
  if (action.type === 'RESET_ALL' || action.type === 'SET_PUZZLE_STATUS') return reduceCore(state, action)
  return refreshPuzzleAvailability(reduceCore(state, action))
}
