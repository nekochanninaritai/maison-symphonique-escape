import { describe, expect, it, vi } from 'vitest'
import {
  attachClockHand,
  canMoveToArea,
  createInitialState,
  getMemoryCount,
  isNearTrueRouteTime,
  reducer,
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
import { clearSave, loadGame, saveGame } from './save'

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
    expect(state.puzzles.p03_reception.status).toBe('locked')
    expect(state.puzzles.p04_sheet_overlay.status).toBe('locked')
    expect(state.puzzles.p05_piano.status).toBe('locked')
    expect(state.puzzles.p06_grand_clock.status).toBe('locked')
    expect(state.puzzles.p07_garden_final.status).toBe('locked')
  })

  it('P01 solved unlocks Dressing Room', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })

    expect(state.puzzles.p01_waiting_room.status).toBe('solved')
    expect(canMoveToArea(state, 'dressing-room')).toBe(true)
  })

  it('attaching the clock hand makes P02 available', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'clock-hand' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'grand-clock' })

    expect(state.clockState.handAttached).toBe(true)
    expect(state.puzzles.p02_ceremony.status).toBe('available')
  })

  it('P02 solved advances the clock and unlocks Reception', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })
    expect(state.clockState.currentTime).toBe('09:23')
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })

    expect(state.clockState.currentTime).toBe('12:00')
    expect(state.flags.receptionUnlocked).toBe(true)
    expect(canMoveToArea(state, 'reception')).toBe(true)
  })

  it('P03 solved obtains the transparent card', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p02_ceremony', true)
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p03_reception' })

    expect(state.puzzles.p03_reception.status).toBe('solved')
    expect(state.inventory['transparent-card'].obtained).toBe(true)
  })

  it('transparent card on the Waiting Room score solves P04 and obtains the piano clue', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p02_ceremony', true)
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p03_reception' })
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
  })

  it('examining the Ceremony light obtains the small key', () => {
    let state = createInitialState()
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

    const state = reducer(createInitialState(), { type: 'MARK_NORMAL_END_CLEARED' })
    saveGame(state)
    expect(loadGame().normalEndingCleared).toBe(true)
    clearSave()
    expect(loadGame().normalEndingCleared).toBe(false)
    vi.unstubAllGlobals()
  })
})
