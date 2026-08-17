import { gameConfig } from './config'
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
    return refreshPuzzleAvailability({
      ...initial,
      ...parsed,
      saveVersion: gameConfig.saveVersion,
      inventory: { ...initial.inventory, ...parsed.inventory },
      puzzles: { ...initial.puzzles, ...parsed.puzzles },
      memories: { ...initial.memories, ...parsed.memories },
      clues: { ...initial.clues, ...parsed.clues },
      flags: { ...initial.flags, ...parsed.flags },
      clockState: { ...initial.clockState, ...parsed.clockState },
    })
  } catch {
    return createInitialState()
  }
}

export const clearSave = (): void => {
  localStorage.removeItem(gameConfig.saveKey)
}
