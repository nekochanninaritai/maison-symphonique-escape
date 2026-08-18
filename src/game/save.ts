import { gameConfig } from './config'
import { allCandleIds, correctCandleSequence } from './data/ceremonyCandles'
import { createInitialState, refreshPuzzleAvailability } from './logic'
import type { GameState } from './types'

export const saveGame = (state: GameState): void => {
  localStorage.setItem(gameConfig.saveKey, JSON.stringify({ ...state, saveVersion: gameConfig.saveVersion }))
}

export const loadGame = (): GameState => {
  const raw = localStorage.getItem(gameConfig.saveKey)
  if (!raw) return createInitialState()
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    if (typeof parsed.saveVersion === 'number' && parsed.saveVersion > gameConfig.saveVersion) return createInitialState()
    const initial = createInitialState()
    const restored = {
      ...initial,
      ...parsed,
      saveVersion: gameConfig.saveVersion,
      inventory: { ...initial.inventory, ...parsed.inventory },
      puzzles: { ...initial.puzzles, ...parsed.puzzles },
      memories: { ...initial.memories, ...parsed.memories },
      clues: { ...initial.clues, ...parsed.clues },
      flags: { ...initial.flags, ...parsed.flags },
      teaTime: { ...initial.teaTime, ...parsed.teaTime },
      ceremonyCandles: { ...initial.ceremonyCandles, ...parsed.ceremonyCandles },
      clockState: { ...initial.clockState, ...parsed.clockState },
    }
    if (restored.puzzles.p01_waiting_room?.status === 'solved') {
      restored.flags = { ...restored.flags, dressingRoomUnlocked: true, ceremonyUnlocked: true }
    }
    if (restored.clockState.handAttached && restored.puzzles.p02_ceremony?.status === 'solved') {
      restored.flags = { ...restored.flags, grandClockStarted: true }
    }
    if (restored.puzzles.p02_ceremony?.status === 'solved') {
      restored.ceremonyCandles = { input: correctCandleSequence, lit: allCandleIds }
    }
    return refreshPuzzleAvailability(restored)
  } catch {
    return createInitialState()
  }
}

export const clearSave = (): void => {
  localStorage.removeItem(gameConfig.saveKey)
}
