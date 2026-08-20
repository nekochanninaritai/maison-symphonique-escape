import { describe, expect, it, vi } from 'vitest'
import {
  applyPianoOverlay,
  attachClockHand,
  canMoveToArea,
  createInitialState,
  discoverReceptionAnomaly,
  getMemoryCount,
  getPianoSequenceForP05,
  isP06ClockActive,
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
import { getDerivedPianoSequence, getPhraseLength, getPlayablePianoKeys, pianoOverlayPuzzleData } from './data/pianoOverlayPuzzle'
import { getP07CorrectSequence, memoryPhotos } from './data/memoryPhotos'
import { getReceptionLockDigits, receptionTables } from './data/receptionTables'
import { oldInvitationSchedule, p06TargetTime } from './data/weddingSchedule'
import { clearSave, loadGame, saveGame } from './save'

const createP03ReadyState = () => {
  let state = createInitialState()
  state = solvePuzzle(state, 'p02_ceremony', true)
  return reducer(state, { type: 'ATTACH_CLOCK_HAND' })
}

const createP04ReadyState = () => {
  let state = createP03ReadyState()
  state = setReceptionLockInput(state, getReceptionLockDigits())
  return openReceptionBox(state)
}

const createP05ReadyState = () => {
  let state = createP04ReadyState()
  state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
  return reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' })
}

const createP06ReadyState = () => {
  let state = createP05ReadyState()
  state = solvePuzzle(state, 'p05_piano', true)
  state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'old-invitation' })
  state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })
  return reducer(state, { type: 'SET_CLOCK_TIME', time: '15:00' })
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

  it('P01 solved does not auto-obtain PHOTO A, but reveals it for pickup', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })

    expect(state.memories.tea.unlocked).toBe(false)

    state = reducer(state, { type: 'MOVE', areaId: 'waiting-room' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'photo-tea-room' })

    expect(state.memories.tea.unlocked).toBe(true)
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

  it('P02 solved reveals PHOTO B for pickup without auto-obtaining it', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony' })

    expect(state.memories.vow.unlocked).toBe(false)

    state = reducer(state, { type: 'MOVE', areaId: 'ceremony' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'photo-vows' })

    expect(state.memories.vow.unlocked).toBe(true)
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
    expect(getMemoryCount(state)).toBe(1)
    expect(state.clockState.currentTime).toBe('16:00')
  })

  it('P03 unsolved keeps P04 locked', () => {
    const state = createP03ReadyState()

    expect(state.puzzles.p04_sheet_overlay.status).toBe('locked')
  })

  it('P03 solved obtains the transparent sheet and makes P04 available', () => {
    const state = createP04ReadyState()

    expect(state.inventory['transparent-card'].obtained).toBe(true)
    expect(state.inventory['transparent-card'].name).toBe('半透明の紙')
    expect(state.puzzles.p04_sheet_overlay.status).toBe('available')
  })

  it('examining the unfinished picture without selecting the sheet does not solve P04', () => {
    let state = createP04ReadyState()
    state = reducer(state, { type: 'MOVE', areaId: 'waiting-room' })
    state = reducer(state, { type: 'EXAMINE', hotspotId: 'framed-picture' })

    expect(state.puzzles.p04_sheet_overlay.status).toBe('available')
    expect(state.pianoOverlay.overlayApplied).toBe(false)
    expect(state.clues.pianoSequence).not.toBe(true)
  })

  it('selected transparent sheet on the unfinished picture applies the overlay and solves P04', () => {
    let state = createP04ReadyState()
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' })

    expect(state.pianoOverlay.overlayApplied).toBe(true)
    expect(state.puzzles.p04_sheet_overlay.status).toBe('solved')
    expect(state.clues.pianoSequence).toBe(true)
    expect(state.flags.pianoClueObtained).toBe(true)
  })

  it('P04 solved makes P05 available and preserves the completed picture state', () => {
    let state = createP04ReadyState()
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' })

    expect(state.puzzles.p05_piano.status).toBe('available')
    expect(state.pianoOverlay.overlayApplied).toBe(true)
  })

  it('P04 revisit does not solve or reward twice', () => {
    let state = createP04ReadyState()
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' })
    const solvedState = state
    state = applyPianoOverlay(state)

    expect(state.puzzles.p04_sheet_overlay.status).toBe('solved')
    expect(state.clues).toEqual(solvedState.clues)
    expect(state.pianoOverlay.overlayApplied).toBe(true)
  })

  it('derives the P05 piano sequence from P04 overlay data', () => {
    expect(getPianoSequenceForP05()).toEqual(getDerivedPianoSequence())
  })

  it('changing symbol order changes the derived piano sequence', () => {
    const changedData = {
      ...pianoOverlayPuzzleData,
      symbols: pianoOverlayPuzzleData.symbols.map((symbol) =>
        symbol.id === 'diamond'
          ? { ...symbol, order: 4 }
          : symbol.id === 'club'
            ? { ...symbol, order: 1 }
            : symbol,
      ),
    }

    expect(getDerivedPianoSequence(changedData)).toEqual([6, 3, 4, 1])
  })

  it('P04 unsolved keeps P05 locked', () => {
    const state = createP04ReadyState()

    expect(state.puzzles.p05_piano.status).toBe('locked')
  })

  it('P05 correct sequence is derived from P04 overlay data', () => {
    expect(getPianoSequenceForP05()).toEqual([1, 3, 4, 6])
    expect(getPianoSequenceForP05()).toEqual(getDerivedPianoSequence())
    expect(getPhraseLength()).toBe(getDerivedPianoSequence().length)
  })

  it('P05 accepts every visible piano key', () => {
    const playableKeys = getPlayablePianoKeys()
    let state = createP05ReadyState()

    for (const key of playableKeys) {
      state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex: key.keyIndex })
      expect(state.puzzles.p05_piano.status).not.toBe('locked')
    }
  })

  it('P05 does not judge before the phrase length is reached', () => {
    let state = createP05ReadyState()
    const sequence = getPianoSequenceForP05()

    for (const keyIndex of sequence.slice(0, getPhraseLength() - 1)) {
      state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex })
    }

    expect(state.puzzles.p05_piano.status).toBe('available')
    expect(state.pianoPerformance.input).toEqual(sequence.slice(0, getPhraseLength() - 1))
  })

  it('wrong P05 phrase resets input without error messaging', () => {
    let state = createP05ReadyState()
    const wrongSequence = [0, 0, 0, 0]

    for (const keyIndex of wrongSequence) {
      state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex })
    }

    expect(state.puzzles.p05_piano.status).toBe('available')
    expect(state.pianoPerformance.input).toEqual([])
    expect(state.messageQueue).toEqual([])
  })

  it('correct P05 phrase solves the puzzle and shows the bell event once', () => {
    let state = createP05ReadyState()

    for (const keyIndex of getPianoSequenceForP05()) {
      state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex })
    }
    const solvedState = state
    state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex: 0 })

    expect(solvedState.puzzles.p05_piano.status).toBe('solved')
    expect(solvedState.flags.ceremonyLightVisible).toBe(true)
    expect(solvedState.flags.pianoMechanismUnlocked).toBe(true)
    expect(solvedState.messageQueue).toEqual(['最後の音が、静かな披露宴会場に響いた。', '――遠くで、小さな鐘が鳴った。'])
    expect(state.puzzles.p05_piano.status).toBe('solved')
    expect(state.messageQueue).toEqual([])
  })

  it('P05 solved still allows free piano play', () => {
    let state = createP05ReadyState()
    state = solvePuzzle(state, 'p05_piano', true)
    state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex: 100 })

    expect(state.puzzles.p05_piano.status).toBe('solved')
    expect(state.pianoPerformance.input).toEqual([])
  })

  it('Piano keyhole can be examined before P05 is solved', () => {
    let state = createP05ReadyState()
    state = reducer(state, { type: 'EXAMINE_PIANO_KEYHOLE' })

    expect(state.flags.pianoSecretOpened).not.toBe(true)
    expect(state.messageQueue).toEqual(['小さな鍵穴がある。', '今は開けられそうにない。'])
  })

  it('Small Key cannot open the keyhole before P05 is solved', () => {
    let state = createP05ReadyState()
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' })

    expect(state.flags.pianoSecretOpened).not.toBe(true)
    expect(state.inventory['small-key'].obtained).toBe(true)
    expect(state.messageQueue).toEqual(['小さな鍵穴がある。', '今は開けられそうにない。'])
  })

  it('Small Key opens the keyhole after P05 and obtains the invitation', () => {
    let state = createP05ReadyState()
    state = solvePuzzle(state, 'p05_piano', true)
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'small-key' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' })

    expect(state.flags.pianoSecretOpened).toBe(true)
    expect(state.flags.invitationObtained).toBe(true)
    expect(state.inventory['small-key'].consumed).toBe(true)
    expect(state.inventory['old-invitation'].obtained).toBe(true)
    expect(state.puzzles.p06_grand_clock.status).toBe('available')
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
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' })

    expect(state.flags.pianoSecretOpened).toBe(true)
    expect(state.inventory['small-key'].consumed).toBe(true)
    expect(state.inventory['old-invitation'].obtained).toBe(true)
    expect(state.memories.melody.unlocked).toBe(true)
  })

  it('obtaining the invitation makes P06 available', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p05_piano', true)
    state = reducer(state, { type: 'OBTAIN_ITEM', itemId: 'old-invitation' })

    expect(state.puzzles.p06_grand_clock.status).toBe('available')
  })

  it('P06 clock operation is unavailable before the old invitation is obtained', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p05_piano', true)
    state = reducer(state, { type: 'ATTACH_CLOCK_HAND' })

    expect(state.puzzles.p06_grand_clock.status).toBe('locked')
    expect(isP06ClockActive(state)).toBe(false)
  })

  it('old invitation schedule keeps Finale time missing in normal UI data', () => {
    const finale = oldInvitationSchedule.find((entry) => entry.id === 'finale')

    expect(finale?.time).toBeNull()
    expect(JSON.stringify(oldInvitationSchedule)).not.toContain(p06TargetTime)
  })

  it('P06 target time is 15:30', () => {
    expect(p06TargetTime).toBe('15:30')
  })

  it('15:29 and 15:31 do not solve P06', () => {
    let state = createP06ReadyState()
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '15:29' })
    expect(state.puzzles.p06_grand_clock.status).toBe('available')
    expect(state.flags.gardenUnlocked).not.toBe(true)

    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '15:31' })
    expect(state.puzzles.p06_grand_clock.status).toBe('available')
    expect(state.flags.gardenUnlocked).not.toBe(true)
  })

  it('15:30 solves P06, keeps the clock at 15:30, and unlocks Garden', () => {
    let state = createP06ReadyState()
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: p06TargetTime })

    expect(state.puzzles.p06_grand_clock.status).toBe('solved')
    expect(state.flags.gardenUnlocked).toBe(true)
    expect(canMoveToArea(state, 'garden')).toBe(true)
    expect(state.clockState.currentTime).toBe(p06TargetTime)
  })

  it('P06 solved does not double solve or unlock the TRUE route', () => {
    let state = createP06ReadyState()
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: p06TargetTime })
    const solvedState = state
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: p06TargetTime })

    expect(state.puzzles.p06_grand_clock.status).toBe('solved')
    expect(state.messageQueue).toEqual(solvedState.messageQueue)
    expect(state.trueRouteUnlocked).not.toBe(true)
    expect(state.worldMode).toBe('empty')
    expect(getMemoryCount(state)).toBe(1)
  })

  it('09:23 before NORMAL END does not unlock TRUE route', () => {
    let state = createP06ReadyState()
    state = reducer(state, { type: 'SET_CLOCK_TIME', time: '09:23' })

    expect(state.trueRouteUnlocked).not.toBe(true)
    expect(state.worldMode).toBe('empty')
  })

  it('reaching Garden makes P07 available', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })

    expect(state.flags.gardenReached).toBe(true)
    expect(state.puzzles.p07_garden_final.status).toBe('available')
  })

  it('P07 correct sequence is derived from photo clock times', () => {
    expect(memoryPhotos.map((photo) => photo.clockTime)).toEqual(['10:40', '14:20', '16:50', '12:15'])
    expect(getP07CorrectSequence()).toEqual(['birdcage', 'lamp', 'fountain', 'angel'])
  })

  it('P07 keeps correct partial sequence and resets on a quiet wrong sequence', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })

    state = reducer(state, { type: 'ACTIVATE_GARDEN_SWITCH', objectId: 'birdcage' })
    expect(state.gardenFinal.input).toEqual(['birdcage'])
    expect(state.gardenFinal.switches.birdcage).toBe(true)

    state = reducer(state, { type: 'ACTIVATE_GARDEN_SWITCH', objectId: 'fountain' })
    expect(state.gardenFinal.input).toEqual([])
    expect(Object.values(state.gardenFinal.switches).every((value) => value === false)).toBe(true)
    expect(state.puzzles.p07_garden_final.status).toBe('available')
    expect(state.messageQueue).toEqual(['――カチ。', '……小さな灯りが消えた。'])
  })

  it('P07 full correct switch sequence solves and opens the gate', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })

    for (const objectId of getP07CorrectSequence()) {
      state = reducer(state, { type: 'ACTIVATE_GARDEN_SWITCH', objectId })
    }

    expect(state.puzzles.p07_garden_final.status).toBe('solved')
    expect(state.gardenFinal.gateState).toBe('open')
    expect(state.flags.gardenGateUnlocked).toBe(true)
    expect(state.screen).toBe('game')
  })

  it('P07 solved opens the Garden gate without ending automatically', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final' })

    expect(state.screen).toBe('game')
    expect(state.normalEndingCleared).toBe(false)
    expect(state.gardenFinal.gateState).toBe('open')
    expect(state.flags.gardenGateUnlocked).toBe(true)
  })

  it('Garden gate tap goes to NORMAL END with memory 4 / 5', () => {
    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final' })
    state = reducer(state, { type: 'OPEN_GARDEN_GATE' })

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

  it('saves and loads the completed P04 overlay state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = createP04ReadyState()
    state = reducer(state, { type: 'SELECT_ITEM', itemId: 'transparent-card' })
    state = reducer(state, { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' })
    saveGame(state)

    const loaded = loadGame()
    expect(loaded.pianoOverlay.overlayApplied).toBe(true)
    expect(loaded.puzzles.p04_sheet_overlay.status).toBe('solved')
    expect(loaded.clues.pianoSequence).toBe(true)
    expect(loaded.puzzles.p05_piano.status).toBe('available')
    vi.unstubAllGlobals()
  })

  it('saves and loads P05 solved without replaying the bell event', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = createP05ReadyState()
    for (const keyIndex of getPianoSequenceForP05()) {
      state = reducer(state, { type: 'PLAY_PIANO_KEY', keyIndex })
    }
    saveGame({ ...state, messageQueue: [] })

    const loaded = loadGame()
    expect(loaded.puzzles.p05_piano.status).toBe('solved')
    expect(loaded.flags.ceremonyLightVisible).toBe(true)
    expect(loaded.flags.pianoMechanismUnlocked).toBe(true)
    expect(loaded.pianoPerformance.input).toEqual([])
    expect(loaded.messageQueue).toEqual([])
    vi.unstubAllGlobals()
  })

  it('saves and loads normal photo memories and P07 partial sequence', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = createInitialState()
    state = reducer(state, { type: 'UNLOCK_MEMORY', memoryId: 'tea' })
    state = reducer(state, { type: 'UNLOCK_MEMORY', memoryId: 'vow' })
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })
    state = reducer(state, { type: 'ACTIVATE_GARDEN_SWITCH', objectId: 'birdcage' })
    state = reducer(state, { type: 'ACTIVATE_GARDEN_SWITCH', objectId: 'lamp' })
    saveGame(state)

    const loaded = loadGame()
    expect(loaded.memories.tea.unlocked).toBe(true)
    expect(loaded.memories.vow.unlocked).toBe(true)
    expect(loaded.gardenFinal.input).toEqual(['birdcage', 'lamp'])
    expect(loaded.gardenFinal.switches.birdcage).toBe(true)
    expect(loaded.gardenFinal.switches.lamp).toBe(true)
    vi.unstubAllGlobals()
  })

  it('saves and loads P07 solved gate open state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    let state = createInitialState()
    state = solvePuzzle(state, 'p06_grand_clock', true)
    state = reducer(state, { type: 'MOVE', areaId: 'garden' })
    state = reducer(state, { type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final' })
    saveGame(state)

    const loaded = loadGame()
    expect(loaded.puzzles.p07_garden_final.status).toBe('solved')
    expect(loaded.gardenFinal.gateState).toBe('open')
    expect(loaded.flags.gardenGateUnlocked).toBe(true)
    vi.unstubAllGlobals()
  })

  it('migrates legacy transparent sheet inventory entries to the current item data', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    const legacy = {
      ...createInitialState(),
      inventory: {
        'transparent-sheet': { itemId: 'transparent-sheet', name: 'old', description: 'old', obtained: true, consumed: false },
      },
    }
    localStorage.setItem('maison-symphonique-escape-save', JSON.stringify(legacy))

    const loaded = loadGame()
    expect(loaded.inventory['transparent-card'].obtained).toBe(true)
    expect(loaded.inventory['transparent-card'].name).toBe('半透明の紙')
    vi.unstubAllGlobals()
  })

  it('migrates legacy P06 saves from 18:00 to the 15:30 Garden unlock state', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    const legacy = {
      ...createInitialState(),
      saveVersion: 2,
      puzzles: {
        ...createInitialState().puzzles,
        p06_grand_clock: { ...createInitialState().puzzles.p06_grand_clock, status: 'solved' },
      },
      flags: {
        ...createInitialState().flags,
        gardenUnlocked: false,
      },
      clockState: {
        ...createInitialState().clockState,
        currentTime: '18:00',
      },
    }
    localStorage.setItem('maison-symphonique-escape-save', JSON.stringify(legacy))

    const loaded = loadGame()
    expect(loaded.puzzles.p06_grand_clock.status).toBe('solved')
    expect(loaded.clockState.currentTime).toBe(p06TargetTime)
    expect(loaded.flags.gardenUnlocked).toBe(true)
    vi.unstubAllGlobals()
  })

  it('migrates legacy memory flags into independent old photos', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })

    const legacy = {
      ...createInitialState(),
      saveVersion: 3,
      memories: {
        invitation: { id: 'invitation', title: 'old', description: 'old', unlocked: true },
        vow: { id: 'vow', title: 'old', description: 'old', unlocked: true },
        music: { id: 'music', title: 'old', description: 'old', unlocked: true },
        banquet: { id: 'banquet', title: 'old', description: 'old', unlocked: true },
        september23: { id: 'september23', title: 'old', description: 'old', unlocked: true },
      },
    }
    localStorage.setItem('maison-symphonique-escape-save', JSON.stringify(legacy))

    const loaded = loadGame()
    expect(loaded.memories.tea.unlocked).toBe(true)
    expect(loaded.memories.vow.unlocked).toBe(true)
    expect(loaded.memories.banquet.unlocked).toBe(true)
    expect(loaded.memories.melody.unlocked).toBe(true)
    expect(loaded.memories.september23.unlocked).toBe(true)
    vi.unstubAllGlobals()
  })
})
