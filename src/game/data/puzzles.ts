import type { Puzzle } from '../types'

export const createPuzzles = (): Record<string, Puzzle> => ({
  'entrance-placeholder': {
    puzzleId: 'entrance-placeholder',
    title: 'Entrance Placeholder Puzzle',
    areaId: 'entrance',
    status: 'available',
    prerequisites: [],
    rewards: { memories: ['invitation'], advanceClockTo: '10:00' },
  },
  'waiting-placeholder': {
    puzzleId: 'waiting-placeholder',
    title: 'Waiting Room Placeholder Puzzle',
    areaId: 'waiting-room',
    status: 'available',
    prerequisites: [],
    rewards: { memories: ['music'], advanceClockTo: '12:00' },
  },
  'ceremony-placeholder': {
    puzzleId: 'ceremony-placeholder',
    title: 'Ceremony Placeholder Puzzle',
    areaId: 'ceremony',
    status: 'available',
    prerequisites: [],
    rewards: { memories: ['vow'], advanceClockTo: '15:00' },
  },
  'reception-placeholder': {
    puzzleId: 'reception-placeholder',
    title: 'Reception Placeholder Puzzle',
    areaId: 'reception',
    status: 'available',
    prerequisites: [],
    rewards: { memories: ['banquet'], unlockGarden: true, advanceClockTo: '18:00' },
  },
  'garden-placeholder': {
    puzzleId: 'garden-placeholder',
    title: 'Garden Final Placeholder Puzzle',
    areaId: 'garden',
    status: 'available',
    prerequisites: ['reception-placeholder'],
    rewards: {},
  },
})
