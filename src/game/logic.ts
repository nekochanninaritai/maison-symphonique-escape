import { areas } from './data/areas'
import { createItems } from './data/items'
import { createMemories } from './data/memories'
import { createPuzzles } from './data/puzzles'
import { allCandleIds, correctCandleSequence } from './data/ceremonyCandles'
import { getDerivedPianoSequence, getPhraseLength, isPlayablePianoKey } from './data/pianoOverlayPuzzle'
import { getReceptionLockDigits, getReceptionTable, initialReceptionLockInput, isReceptionLockSolved } from './data/receptionTables'
import { correctTeaTimeSlots, initialTeaTimeSlots, isTeaTimeSolved } from './data/teaTime'
import { trueClockTarget } from './data/trueRoute'
import { p06TargetTime } from './data/weddingSchedule'
import { gardenPuzzleObjects, getP07CorrectSequence, normalMemoryIds } from './data/memoryPhotos'
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
  gardenFinal: {
    input: [],
    switches: Object.fromEntries(gardenPuzzleObjects.map((object) => [object.id, false])),
    gateState: 'locked',
  },
  clockState: {
    handObtained: false,
    handAttached: false,
    currentTime: '11:00',
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
  return hour === 9 && minute === 23
}

export const canTriggerTrueRoute = (state: GameState, time = state.clockState.currentTime): boolean =>
  state.normalEndingCleared === true &&
  state.clockState.canManualRotate === true &&
  state.memories.september23?.unlocked !== true &&
  state.trueRouteUnlocked !== true &&
  time === trueClockTarget

export const isP06ClockActive = (state: GameState): boolean =>
  state.clockState.handAttached && state.puzzles.p06_grand_clock?.status === 'available' && isItemAvailable(state, 'old-invitation')

export const canManuallyControlGrandClock = (state: GameState): boolean =>
  state.clockState.handAttached && (state.clockState.canManualRotate === true || isP06ClockActive(state))

const shouldUnlockCeremony = (state: GameState): boolean =>
  state.puzzles.p01_waiting_room?.status === 'solved' && state.clockState.handAttached === true

const unlockCeremonyIfReady = (state: GameState): GameState =>
  shouldUnlockCeremony(state) && state.flags.ceremonyUnlocked !== true
    ? { ...state, flags: { ...state.flags, ceremonyUnlocked: true } }
    : state

export type TeaDrawerState = 'locked' | 'open-with-photo' | 'open-empty'

export const getTeaDrawerState = (state: GameState): TeaDrawerState => {
  if (state.memories.tea?.unlocked) return 'open-empty'
  if (state.puzzles.p01_waiting_room?.status === 'solved') return 'open-with-photo'
  return 'locked'
}

export type AltarPhotoState = 'dark-object' | 'revealed-photo' | 'empty'

export const getAltarPhotoState = (state: GameState): AltarPhotoState => {
  if (state.memories.vow?.unlocked) return 'empty'
  if (state.puzzles.p02_ceremony?.status === 'solved') return 'revealed-photo'
  return 'dark-object'
}

export const shouldShowCeremonyNavCue = (state: GameState): boolean =>
  state.flags.ceremonyLightVisible === true &&
  state.inventory['small-key']?.obtained !== true &&
  state.inventory['small-key']?.consumed !== true &&
  state.flags.smallKeyObtained !== true

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

const lockMemory = (state: GameState, memoryId: string): GameState => {
  const memory = state.memories[memoryId]
  if (!memory) return state
  return {
    ...state,
    memories: {
      ...state.memories,
      [memoryId]: { ...memory, unlocked: false },
    },
  }
}

const unlockNormalMemories = (state: GameState): GameState =>
  normalMemoryIds.reduce((current, memoryId) => unlockMemory(current, memoryId), {
    ...state,
    memories: {
      ...state.memories,
      september23: { ...state.memories.september23, unlocked: false },
    },
  } as GameState)

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

const setItemObtained = (state: GameState, itemId: string, obtained: boolean): GameState => {
  const item = state.inventory[itemId]
  if (!item) return state
  return {
    ...state,
    selectedItemId: obtained ? state.selectedItemId : state.selectedItemId === itemId ? null : state.selectedItemId,
    inventory: {
      ...state.inventory,
      [itemId]: cloneItem(item, { obtained, consumed: false }),
    },
    clockState:
      itemId === 'clock-hand'
        ? { ...state.clockState, handObtained: obtained || state.clockState.handAttached }
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

  const attached = unlockCeremonyIfReady({
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
    })

  return withMessage(
    attached,
    ['カチッ', '長針は元の場所に戻った。', 'しかし、時計は止まったままだ。'],
  )
}

const attachClockHandFromAction = (state: GameState): GameState => attachClockHand(state)

export const setClockTime = (state: GameState, time: string): GameState => {
  if (canTriggerTrueRoute(state, time)) {
    return unlockTrueRoute({
      ...state,
      clockState: {
        ...state.clockState,
        currentTime: trueClockTarget,
      },
    })
  }
  if (isP06ClockActive(state) && time === p06TargetTime) {
    return solvePuzzle({
      ...state,
      clockState: {
        ...state.clockState,
        currentTime: p06TargetTime,
      },
    }, 'p06_grand_clock')
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
    screen: 'photoE',
    trueRouteUnlocked: true,
    worldMode: 'memory',
    clockState: {
      ...next.clockState,
      currentTime: trueClockTarget,
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
  if (puzzleId === 'p06_grand_clock') {
    next = {
      ...next,
      clockState: { ...next.clockState, currentTime: p06TargetTime },
    }
  }
  if (puzzleId === 'p07_garden_final') {
    next = {
      ...next,
      gardenFinal: {
        input: getP07CorrectSequence(),
        switches: Object.fromEntries(gardenPuzzleObjects.map((object) => [object.id, true])),
        gateState: 'open',
      },
      flags: { ...next.flags, gardenGateUnlocked: true },
    }
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
  next = unlockCeremonyIfReady(next)
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
      ? ['四つのティーセットが、きれいに揃った。', '――カチャ。', 'ティーテーブルの引き出しが、ゆっくりと開いた。', 'そして館のどこかからも、扉の開く音がした。']
      : puzzleId === 'p02_ceremony'
          ? ['四つの灯が、静かに祭壇を照らした。']
          : puzzleId === 'p05_piano'
            ? ['最後の音が、静かな披露宴会場に響いた。', '――遠くで、小さな鐘が鳴った。']
            : puzzleId === 'p06_grand_clock'
              ? ['――ゴーン。', '時計の奥で、古い歯車がゆっくりと動き始めた。', '……どこかで、重い扉の開く音がした。']
            : [`${puzzle.title} をSolvedにした。`]
  const finalMessages =
    puzzleId === 'p03_reception'
      ? ['――カチッ。', '箱の中に、半透明の紙が入っている。', 'その下には、古い写真「PHOTO C」が一枚残されていた。', '遠くで、時計の鐘が鳴った。']
      : puzzleId === 'p07_garden_final'
        ? ['――カチ。', '四つの小さな灯りが揃った。', 'Gardenの奥で、重い金属の動く音がした。', '門の錠が外れた。']
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
    memories: {
      ...state.memories,
      melody: { ...state.memories.melody, unlocked: false },
    },
    messageQueue: ['P05 Piano Puzzle をリセットした。'],
  })

export const examinePianoKeyhole = (state: GameState): GameState =>
  state.flags.pianoSecretOpened
    ? withMessage(state, ['小さな収納が開いている。'])
    : withMessage(state, ['小さな鍵穴がある。', '今は開けられそうにない。'])

export const resetP06Clock = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    flags: {
      ...state.flags,
      gardenUnlocked: false,
      gardenGateUnlocked: false,
    },
    puzzles: {
      ...state.puzzles,
      p06_grand_clock: { ...state.puzzles.p06_grand_clock, status: 'available' },
      p07_garden_final: { ...state.puzzles.p07_garden_final, status: 'locked' },
    },
    gardenFinal: {
      input: [],
      switches: Object.fromEntries(gardenPuzzleObjects.map((object) => [object.id, false])),
      gateState: 'locked',
    },
    clockState: {
      ...state.clockState,
      currentTime: '15:00',
    },
    messageQueue: ['P06 Grand Clock Puzzle をリセットした。'],
  })

export const activateGardenSwitch = (state: GameState, objectId: string): GameState => {
  const current = refreshPuzzleAvailability(state)
  if (current.puzzles.p07_garden_final?.status === 'solved') return current
  if (current.puzzles.p07_garden_final?.status !== 'available') return current
  if (!gardenPuzzleObjects.some((object) => object.id === objectId)) return current

  const correctSequence = getP07CorrectSequence()
  const expected = correctSequence[current.gardenFinal.input.length]
  if (objectId !== expected) {
    return withMessage(
      {
        ...current,
        gardenFinal: {
          input: [],
          switches: Object.fromEntries(gardenPuzzleObjects.map((object) => [object.id, false])),
          gateState: 'locked',
        },
      },
      ['――カチ。', '……小さな灯りが消えた。'],
    )
  }

  const input = [...current.gardenFinal.input, objectId]
  const switches = { ...current.gardenFinal.switches, [objectId]: true }
  const next = { ...current, gardenFinal: { ...current.gardenFinal, input, switches } }
  return input.length === correctSequence.length ? solvePuzzle(next, 'p07_garden_final') : withMessage(next, ['――カチ。'])
}

export const resetP07Garden = (state: GameState): GameState =>
  refreshPuzzleAvailability({
    ...state,
    flags: {
      ...state.flags,
      gardenGateUnlocked: false,
    },
    puzzles: {
      ...state.puzzles,
      p07_garden_final: { ...state.puzzles.p07_garden_final, status: 'available' },
    },
    gardenFinal: {
      input: [],
      switches: Object.fromEntries(gardenPuzzleObjects.map((object) => [object.id, false])),
      gateState: 'locked',
    },
    messageQueue: ['P07 Garden Puzzle をリセットした。'],
  })

export const openGardenGate = (state: GameState): GameState => {
  if (state.puzzles.p07_garden_final?.status !== 'solved' && state.gardenFinal.gateState !== 'open' && state.flags.gardenGateUnlocked !== true) {
    return withMessage(state, ['重い鉄の門だ。', '固く閉ざされている。'])
  }
  return withMessage(
    {
      ...unlockNormalMemories(state),
      screen: 'normalEnd',
      normalEndingCleared: true,
    },
    [],
  )
}

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
    memories: {
      ...state.memories,
      vow: { ...state.memories.vow, unlocked: false },
    },
    clockState: {
      ...state.clockState,
      currentTime: '11:00',
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

export const examineTeaDrawer = (state: GameState): GameState => {
  const drawerState = getTeaDrawerState(state)
  if (drawerState === 'locked') {
    return withMessage(state, ['小さな引き出しがある。', '鍵穴はないが、固く閉ざされている。'])
  }
  if (drawerState === 'open-empty') {
    return withMessage(state, ['開いた引き出しだ。', '中にはもう何もない。'])
  }
  return withMessage(unlockMemory(state, 'tea'), ['開いた引き出しの中に、一枚の古い写真が入っている。', '古い写真「PHOTO A」を手に入れた。'])
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
    memories: {
      ...state.memories,
      tea: { ...state.memories.tea, unlocked: false },
    },
    clockState: {
      ...state.clockState,
      currentTime: '09:23',
    },
    messageQueue: ['P01 Tea Time をリセットした。'],
  })

export const examineAltarPhoto = (state: GameState): GameState => {
  const photoState = getAltarPhotoState(state)
  if (photoState === 'dark-object') {
    return withMessage(state, ['祭壇の脇に、何かが置かれている。', 'ここからでは暗くてよく見えない。'])
  }
  if (photoState === 'empty') {
    return withMessage(state, ['祭壇脇は、静かに灯りを受けている。'])
  }
  return withMessage(unlockMemory(state, 'vow'), ['四本の灯に照らされて、祭壇脇の古い写真が見える。', '古い写真「PHOTO B」を手に入れた。'])
}

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
        clockState:
          action.areaId === 'ceremony' &&
          state.clockState.currentTime === '11:00'
            ? { ...state.clockState, currentTime: '12:00' }
            : action.areaId === 'reception' &&
                state.flags.receptionUnlocked === true &&
                state.clockState.currentTime === '12:00'
              ? { ...state.clockState, currentTime: '13:00' }
              : state.clockState,
        messageQueue: [],
      }
    case 'DEBUG_MOVE':
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
      if (hotspot.id === 'photo-vows') return examineAltarPhoto(state)
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
            ...unlockMemory(obtainItem(consumeItem(state, 'small-key'), 'old-invitation'), 'melody'),
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
    case 'LOCK_MEMORY':
      return lockMemory(state, action.memoryId)
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
    case 'EXAMINE_TEA_DRAWER':
      return examineTeaDrawer(state)
    case 'RESET_P01_TEA_TIME':
      return resetP01TeaTime(state)
    case 'LIGHT_CEREMONY_CANDLE':
      return lightCeremonyCandle(state, action.candleId)
    case 'EXAMINE_ALTAR_PHOTO':
      return examineAltarPhoto(state)
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
    case 'RESET_P06_CLOCK':
      return resetP06Clock(state)
    case 'ACTIVATE_GARDEN_SWITCH':
      return activateGardenSwitch(state, action.objectId)
    case 'RESET_P07_GARDEN':
      return resetP07Garden(state)
    case 'OPEN_GARDEN_GATE':
      return openGardenGate(state)
    case 'OBTAIN_ITEM':
      return obtainItem(state, action.itemId)
    case 'SET_ITEM_OBTAINED':
      return setItemObtained(state, action.itemId, action.obtained)
    case 'CLEAR_INVENTORY':
      return { ...state, inventory: createItems(), selectedItemId: null, clockState: { ...state.clockState, handObtained: false } }
    case 'ATTACH_CLOCK_HAND':
      return unlockCeremonyIfReady({
        ...state,
        inventory: { ...state.inventory, 'clock-hand': cloneItem(state.inventory['clock-hand'], { obtained: false, consumed: true }) },
        clockState: { ...state.clockState, handObtained: true, handAttached: true },
      })
    case 'GO_NORMAL_END':
      return {
        ...unlockNormalMemories(state),
        screen: 'normalEnd',
        normalEndingCleared: true,
      }
    case 'MARK_NORMAL_END_CLEARED':
      return { ...state, normalEndingCleared: true }
    case 'UNLOCK_TRUE_ROUTE':
      return unlockTrueRoute(state)
    case 'GO_TRUE_END':
      return { ...unlockMemory(state, 'september23'), screen: 'trueEnd', trueRouteUnlocked: true, trueEndingCleared: true, worldMode: 'memory' }
    case 'RESET_TRUE_ROUTE':
      return {
        ...state,
        screen: state.screen === 'photoE' || state.screen === 'trueEnd' ? 'game' : state.screen,
        trueRouteUnlocked: false,
        trueEndingCleared: false,
        worldMode: 'empty',
        memories: {
          ...state.memories,
          september23: { ...state.memories.september23, unlocked: false },
        },
        clockState: {
          ...state.clockState,
          trueRouteUnlocked: false,
          canManualRotate: state.normalEndingCleared,
        },
      }
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
