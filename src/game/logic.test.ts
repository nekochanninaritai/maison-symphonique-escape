import { describe, expect, it, vi } from 'vitest'
import {
  attachClockHand,
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
  it('solves placeholder puzzles and applies rewards', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'reception-placeholder')

    expect(state.puzzles['reception-placeholder'].status).toBe('solved')
    expect(state.flags.gardenUnlocked).toBe(true)
    expect(state.memories.banquet.unlocked).toBe(true)
    expect(state.clockState.currentTime).toBe('18:00')
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
