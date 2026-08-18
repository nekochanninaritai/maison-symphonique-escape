import { describe, expect, it, vi } from 'vitest'
import {
  attachClockHand,
  canMoveToArea,
  createInitialState,
  discoverReceptionAnomaly,
  getMemoryCount,
  isNearTrueRouteTime,
  lightCeremonyCandle,
  moveTeaCup,
  openReceptionBox,
  reducer,
  setReceptionLockInput,
  setClockTime,
  solvePuzzle,
} from './logic'
import {
  clockAngleFromPoint,
  createClockDragSessionFromAngle,
  minuteFromClockAngle,
  normalizeAngleDelta,
  normalizeTime,
  timeFromClockPoint,
  updateClockDragSessionFromAngle,
} from './clock'
import { allCandleIds, correctCandleSequence, lightEventVase } from './data/ceremonyCandles'
import { getReceptionLockDigits, receptionTables } from './data/receptionTables'
import { clearSave, loadGame, saveGame } from './save'

const createP03ReadyState = () => {
  let state = createInitialState()
  state = solvePuzzle(state, 'p02_ceremony', true)
  return reducer(state, { type: 'ATTACH_CLOCK_HAND' })
}

describe('ClockState', () => {
  it('attaches the hand but does not start the clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = attachClockHand(state)

    expect(state.clockState.handAttached).toBe(true)
    expect(state.clockState.canManualRotate).toBe(false)
    expect(state.clockState.currentTime).toBe('09:23')
    expect(state.inventory['clock-hand'].obtained).toBe(false)
  })

  it('snaps near 09:23 only when manual control is enabled', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SET_CLOCK_MANUAL', enabled: true })
    state = setClockTime(state, '09:24')

    expect(state.clockState.currentTime).toBe('09:23')
    expect(state.trueRouteUnlocked).toBe(true)
    expect(state.worldMode).toBe('memory')
  })

  it('detects the 09:23 tolerance window', () => {
    expect(isNearTrueRouteTime('09:21')).toBe(true)
    expect(isNearTrueRouteTime('09:25')).toBe(true)
    expect(isNearTrueRouteTime('09:26')).toBe(false)
  })

  it('converts circular pointer movement into clock time', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 }

    expect(clockAngleFromPoint({ x: 50, y: 0 }, rect)).toBe(0)
    expect(minuteFromClockAngle(138)).toBe(23)
    expect(timeFromClockPoint({ x: 83.5, y: 87.2 }, rect, '09:00')).toBe('09:23')
    expect(normalizeTime(-1)).toBe('23:59')
  })

  it('moves the full clock time back by one hour after one counterclockwise rotation', () => {
    let session = createClockDragSessionFromAngle(0, '18:00')

    for (const angle of [300, 240, 180, 120, 60, 0]) {
      const next = updateClockDragSessionFromAngle(session, angle)
      session = next.session
    }

    expect(normalizeTime(session.totalMinutes)).toBe('17:00')
  })

  it('supports multiple counterclockwise rotations', () => {
    let session = createClockDragSessionFromAngle(0, '18:00')

    for (let rotation = 0; rotation < 3; rotation += 1) {
      for (const angle of [300, 240, 180, 120, 60, 0]) {
        const next = updateClockDragSessionFromAngle(session, angle)
        session = next.session
      }
    }

    expect(normalizeTime(session.totalMinutes)).toBe('15:00')
  })

  it('normalizes the 359 / 0 degree boundary without a large jump', () => {
    const clockwiseBoundary = normalizeAngleDelta(359, 0)
    const counterClockwiseBoundary = normalizeAngleDelta(0, 359)

    expect(clockwiseBoundary).toBe(1)
    expect(counterClockwiseBoundary).toBe(-1)
  })

  it('keeps manual clock control locked before the normal ending', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'grand-clock' })

    expect(state.clockState.canManualRotate).toBe(false)
  })

  it('unlocks manual clock control after the normal ending', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })
    state = reducer(state, { type: 'GO_NORMAL_END' })
    state = reducer(state, { type: 'START_GAME' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'grand-clock' })

    expect(state.clockState.canManualRotate).toBe(true)
  })
})

describe('MemoryState', () => {
  it('tracks 0 to 5 memories', () => {
    let state = createInitialState()
    expect(getMemoryCount(state)).toBe(0)
    state = reducer(state, { type: 'SET_MEMORY_COUNT', count: 5 })
    expect(getMemoryCount(state)).toBe(5)
    state = reducer(state, { type: 'SET_MEMORY_COUNT', count: 0 })
    expect(getMemoryCount(state)).toBe(0)
  })
})

describe('PuzzleState', () => {
  it('starts with P01 available and P02-P07 locked', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'START_GAME' })

    expect(state.puzzles.p01_waiting_room.status).toBe('available')
    expect(state.puzzles.p02_ceremony.status).toBe('locked')
    expect(canMoveToArea(state, 'dressing-room')).toBe(false)
    expect(canMoveToArea(state, 'ceremony')).toBe(false)
    expect(state.puzzles.p03_reception.status).toBe('locked')
    expect(state.puzzles.p04_sheet_overlay.status).toBe('locked')
    expect(state.puzzles.p05_piano.status).toBe('locked')
    expect(state.puzzles.p06_grand_clock.status).toBe('locked')
    expect(state.puzzles.p07_garden_final.status).toBe('locked')
  })

  it('P01 solved unlocks Dressing Room, Ceremony, and P02', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })

    expect(state.puzzles.p01_waiting_room.status).toBe('solved')
    expect(state.flags.dressingRoomUnlocked).toBe(true)
    expect(state.flags.ceremonyUnlocked).toBe(true)
    expect(canMoveToArea(state, 'dressing-room')).toBe(true)
    expect(canMoveToArea(state, 'ceremony')).toBe(true)
    expect(state.puzzles.p02_ceremony.status).toBe('available')
  })

  it('P01 Tea Time swaps cups and solves on the final correct placement', () => {
    let state = createInitialState()
    state = moveTeaCup(state, 'coffee', 'tiramisu')

    expect(state.teaTime.cupSlots.tiramisu).toBe('coffee')
    expect(state.puzzles.p01_waiting_room.status).toBe('available')

    state = moveTeaCup(state, 'earl-grey', 'lemon-cake')
    state = moveTeaCup(state, 'herbal-tea', 'light-cookie')

    expect(state.puzzles.p01_waiting_room.status).toBe('solved')
    expect(state.flags.dressingRoomUnlocked).toBe(true)
    expect(state.flags.ceremonyUnlocked).toBe(true)
  })

  it('P01 solved alone does not start the Grand Clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })

    expect(state.flags.grandClockStarted).not.toBe(true)
    expect(state.clockState.currentTime).toBe('09:23')
  })

  it('attaching the clock hand before P02 does not start the Grand Clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })

    expect(state.clockState.handAttached).toBe(true)
    expect(state.flags.grandClockStarted).not.toBe(true)
    expect(state.clockState.currentTime).toBe('09:23')
  })

  it('P02 solved before Clock Hand does not start the Grand Clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })

    expect(state.puzzles.p02_ceremony.status).toBe('solved')
    expect(state.flags.receptionUnlocked).toBe(true)
    expect(state.flags.grandClockStarted).not.toBe(true)
    expect(state.clockState.currentTime).toBe('09:23')
    expect(state.puzzles.p03_reception.status).toBe('locked')
  })

  it('correct P02 candle sequence solves the Ceremony puzzle', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })

    for (const candleId of correctCandleSequence) {
      state = lightCeremonyCandle(state, candleId)
    }

    expect(state.puzzles.p02_ceremony.status).toBe('solved')
    expect(state.ceremonyCandles.input).toEqual(correctCandleSequence)
    expect(state.ceremonyCandles.lit.sort()).toEqual([...allCandleIds].sort())
    expect(state.flags.receptionUnlocked).toBe(true)
  })

  it('wrong P02 candle sequence resets input without solving', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    const wrongFirst = allCandleIds.find((id) => id !== correctCandleSequence[0])
    expect(wrongFirst).toBeDefined()

    state = lightCeremonyCandle(state, wrongFirst!)

    expect(state.puzzles.p02_ceremony.status).toBe('available')
    expect(state.ceremonyCandles.input).toEqual([])
    expect(state.ceremonyCandles.lit).toEqual([])
    expect(state.messageQueue).toEqual(['炎が、ふっと消えた。'])
  })

  it('Clock Hand attached then P02 solved starts the Grand Clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })

    expect(state.clockState.currentTime).toBe('12:00')
    expect(state.flags.grandClockStarted).toBe(true)
    expect(state.flags.receptionUnlocked).toBe(true)
    expect(canMoveToArea(state, 'reception')).toBe(true)
  })

  it('P02 solved then Clock Hand attached also starts the Grand Clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })

    expect(state.clockState.currentTime).toBe('12:00')
    expect(state.flags.grandClockStarted).toBe(true)
  })

  it('P02 solved keeps all candles lit on revisit', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    for (const candleId of correctCandleSequence) {
      state = reducer(state, { type: 'LIGHT_CEREMONY_CANDLE', candleId })
    }

    state = reducer(state, { type: 'EXAMINE', hotspotId: 'altar' })

    expect(state.puzzles.p02_ceremony.status).toBe('solved')
    expect(state.ceremonyCandles.lit.sort()).toEqual([...allCandleIds].sort())
  })

  it('Grand Clock start event fires only once', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '13:00' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony', force: true })
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })

    expect(state.flags.grandClockStarted).toBe(true)
    expect(state.clockState.currentTime).toBe('13:00')
  })

  it('P02 solved makes P03 available in Reception', () => {
    const state = createP03ReadyState()

    expect(state.puzzles.p03_reception.status).toBe('available')
    expect(canMoveToArea(state, 'reception')).toBe(true)
    expect(state.clockState.currentTime).toBe('12:00')
  })

  it('discovers each P03 table anomaly from the correct seat', () => {
    let state = createP03ReadyState()

    for (const table of receptionTables) {
      state = discoverReceptionAnomaly(state, table.id, table.targetSeatId)
    }

    expect(state.receptionTables.discoveredAnomalies).toEqual(
      Object.fromEntries(receptionTables.map((table) => [table.id, table.targetSeatId])),
    )
  })

  it('does not discover a P03 anomaly from the wrong seat', () => {
    let state = createP03ReadyState()
    const table = receptionTables[0]
    const wrongSeat = table.seats.find((seat) => seat.id !== table.targetSeatId)
    expect(wrongSeat).toBeDefined()

    state = discoverReceptionAnomaly(state, table.id, wrongSeat!.id)

    expect(state.receptionTables.discoveredAnomalies[table.id]).toBeUndefined()
    expect(state.messageQueue).toEqual(['特に変わったところはなさそうだ。'])
  })

  it('wrong P03 lock code keeps the box closed', () => {
    let state = createP03ReadyState()
    state = setReceptionLockInput(state, [4, 7, 2, 8])
    state = openReceptionBox(state)

    expect(state.receptionTables.boxOpened).toBe(false)
    expect(state.puzzles.p03_reception.status).toBe('available')
    expect(state.messageQueue).toEqual(['カチ……', '鍵は開かない。'])
  })

  it('correct P03 lock code opens the box, rewards the card and memory, and advances the clock', () => {
    let state = createP03ReadyState()
    state = setReceptionLockInput(state, getReceptionLockDigits())
    state = openReceptionBox(state)

    expect(state.receptionTables.boxOpened).toBe(true)
    expect(state.puzzles.p03_reception.status).toBe('solved')
    expect(state.inventory['transparent-card'].obtained).toBe(true)
    expect(state.memories.banquet.unlocked).toBe(true)
    expect(state.clockState.currentTime).toBe('15:00')
  })

  it('P03 rewards do not duplicate after the box is reopened', () => {
    let state = createP03ReadyState()
    state = setReceptionLockInput(state, getReceptionLockDigits())
    state = openReceptionBox(state)
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '16:00' })
    state = openReceptionBox(state)

    expect(state.inventory['transparent-card'].obtained).toBe(true)
    expect(getMemoryCount(state)).toBe(2)
    expect(state.clockState.currentTime).toBe('16:00')
  })

  it('transparent card on the Waiting Room score solves P04 and obtains the piano clue', () => {
    let state = createP03ReadyState()
    state = setReceptionLockInput(state, getReceptionLockDigits())
    state = openReceptionBox(state)
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-score' })

    expect(state.puzzles.p04_sheet_overlay.status).toBe('solved')
    expect(state.clues.pianoSequence).toBe(true)
    expect(state.flags.pianoClueObtained).toBe(true)
  })

  it('P04 solved makes P05 available', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p04_sheet_overlay', true)

    expect(state.puzzles.p05_piano.status).toBe('available')
  })

  it('P05 solved unlocks the piano mechanism and Ceremony light', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p05_piano', true)

    expect(state.flags.pianoMechanismUnlocked).toBe(true)
    expect(state.flags.ceremonyLightVisible).toBe(true)
    expect(lightEventVase?.isFutureLightEventAnchor).toBe(true)
  })

  it('examining the Ceremony light obtains the small key', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'SET_FLAG', flagId: 'ceremonyLightVisible', value: true })
    state = reducer(state, { type: 'MOVE', areaId: 'ceremony' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'ceremony-light' })

    expect(state.inventory['small-key'].obtained).toBe(true)
    expect(state.flags.smallKeyObtained).toBe(true)
  })

  it('piano mechanism plus small key opens the piano secret and obtains the invitation', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SET_FLAG', flagId: 'pianoMechanismUnlocked', value: true })
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'piano' })

    expect(state.flags.pianoSecretOpened).toBe(true)
    expect(state.inventory['small-key'].consumed).toBe(true)
    expect(state.inventory['old-invitation'].obtained).toBe(true)
  })

  it('obtaining the invitation makes P06 available', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p05_piano', true)
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'old-invitation' })

    expect(state.puzzles.p06_grand_clock.status).toBe('available')
  })

  it('P06 solved unlocks Garden', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)

    expect(state.puzzles.p06_grand_clock.status).toBe('solved')
    expect(state.flags.gardenUnlocked).toBe(true)
    expect(canMoveToArea(state, 'garden')).toBe(true)
    expect(state.clockState.currentTime).toBe('18:00')
  })

  it('reaching Garden makes P07 available', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })

    expect(state.flags.gardenReached).toBe(true)
    expect(state.puzzles.p07_garden_final.status).toBe('available')
  })

  it('P07 solved goes to NORMAL END with memory 4 / 5', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final' })

    expect(state.screen).toBe('normalEnd')
    expect(state.normalEndingCleared).toBe(true)
    expect(getMemoryCount(state)).toBe(4)
  })

  it('09:23 after NORMAL END still unlocks TRUE route and memory 5 / 5', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })
    state = reducer(state, { type: 'GO_NORMAL_END' })
    state = reducer(state, { type: 'START_GAME' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'grand-clock' })
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '09:24' })

    expect(state.clockState.currentTime).toBe('09:23')
    expect(state.trueRouteUnlocked).toBe(true)
    expect(state.worldMode).toBe('memory')
    expect(getMemoryCount(state)).toBe(5)
  })
})

describe('Ending flow', () => {
  it('normal ending always leaves memory at 4 / 5', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SET_MEMORY_COUNT', count: 5 })
    state = reducer(state, { type: 'GO_NORMAL_END' })

    expect(state.normalEndingCleared).toBe(true)
    expect(state.screen).toBe('normalEnd')
    expect(getMemoryCount(state)).toBe(4)
  })

  it('true route unlocks memory world and the fifth memory', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'UNLOCK_TRUE_ROUTE' })

    expect(state.trueRouteUnlocked).toBe(true)
    expect(state.worldMode).toBe('memory')
    expect(getMemoryCount(state)).toBe(5)
    expect(state.memories.september23.unlocked).toBe(true)
  })
})

describe('Inventory', () => {
  it('obtains, selects, and consumes the clock hand on the grand clock', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })

    expect(state.clockState.handAttached).toBe(true)
    expect(state.clockState.canManualRotate).toBe(false)
    expect(state.inventory['clock-hand'].obtained).toBe(false)
    expect(state.inventory['clock-hand'].consumed).toBe(true)
  })
})

describe('SaveState', () => {
  it('saves, loads, and clears versioned state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = reducer(createInitialState(), { type: 'MARK_NORMAL_END_CLEARED' })
    state = moveTeaCup(state, 'coffee', 'tiramisu')
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    for (const candleId of correctCandleSequence) {
      state = lightCeremonyCandle(state, candleId)
    }
    saveGame(state)
    const loaded = loadGame()
    expect(loaded.normalEndingCleared).toBe(true)
    expect(loaded.teaTime.cupSlots.tiramisu).toBe('coffee')
    expect(loaded.puzzles.p02_ceremony.status).toBe('solved')
    expect(loaded.ceremonyCandles.lit.sort()).toEqual([...allCandleIds].sort())
    clearSave()
    expect(loadGame().normalEndingCleared).toBe(false)
    vi.unstubAllGlobals()
  })

  it('saves and loads P03 anomaly discoveries and opened box state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = createP03ReadyState()
    for (const table of receptionTables) {
      state = discoverReceptionAnomaly(state, table.id, table.targetSeatId)
    }
    state = setReceptionLockInput(state, getReceptionLockDigits())
    state = openReceptionBox(state)
    saveGame(state)

    const loaded = loadGame()
    expect(loaded.receptionTables.discoveredAnomalies).toEqual(
      Object.fromEntries(receptionTables.map((table) => [table.id, table.targetSeatId])),
    )
    expect(loaded.receptionTables.boxOpened).toBe(true)
    expect(loaded.puzzles.p03_reception.status).toBe('solved')
    expect(loaded.inventory['transparent-card'].obtained).toBe(true)
    expect(loaded.memories.banquet.unlocked).toBe(true)
    expect(loaded.clockState.currentTime).toBe('15:00')
    vi.unstubAllGlobals()
  })
})
