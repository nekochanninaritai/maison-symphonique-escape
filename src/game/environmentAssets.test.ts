import { describe, expect, it } from 'vitest'
import entrance from '../assets/environments/bg-01-entrance.jpg'
import waitingRoom from '../assets/environments/bg-02-waiting-room.jpg'
import dressingRoom from '../assets/environments/bg-03-dressing-room.jpg'
import bridalClock from '../assets/environments/bridal-clock-focus.jpg'
import ceremony from '../assets/environments/bg-04-ceremony.jpg'
import reception from '../assets/environments/bg-05-reception.jpg'
import garden from '../assets/environments/bg-06-garden.jpg'
import gardenBirdcage from '../assets/environments/garden-focus-birdcage.jpg'
import gardenFountain from '../assets/environments/garden-focus-fountain.jpg'
import gardenAngel from '../assets/environments/garden-focus-angel.jpg'
import gardenLamp from '../assets/environments/garden-focus-lamp.jpg'
import gardenGate from '../assets/environments/garden-focus-gate.jpg'
import grandClock from '../assets/environments/clock-01-grand-clock.jpg'
import oldInvitationSchedule from '../assets/environments/invitation-01-schedule.jpg'
import coffee from '../assets/environments/Puzzle 01/Coffee.jpg'
import gateauChocolat from '../assets/environments/Puzzle 01/GateauChocolat.jpg'
import hotTea from '../assets/environments/Puzzle 01/HotTea.jpg'
import iceTea from '../assets/environments/Puzzle 01/IceTea.jpg'
import mangoCake from '../assets/environments/Puzzle 01/MangoCake.jpg'
import shortCake from '../assets/environments/Puzzle 01/ShortCake.jpg'
import { gameImageAssets, getPreloadImageCount } from './preloadAssets'

const environmentAssets = [
  entrance,
  waitingRoom,
  dressingRoom,
  bridalClock,
  ceremony,
  reception,
  garden,
  gardenBirdcage,
  gardenFountain,
  gardenAngel,
  gardenLamp,
  gardenGate,
  grandClock,
  oldInvitationSchedule,
]

const puzzle01Assets = [
  coffee,
  gateauChocolat,
  hotTea,
  iceTea,
  mangoCake,
  shortCake,
]

describe('EnvironmentAssets', () => {
  it('keeps Phase 3A core environment assets resolvable by Vite', () => {
    for (const assetPath of environmentAssets) {
      expect(assetPath).toMatch(/\.jpg$/)
    }
  })

  it('keeps the old invitation schedule image resolvable by Vite', () => {
    expect(oldInvitationSchedule).toMatch(/invitation-01-schedule.*\.jpg$/)
  })

  it('preloads every Puzzle 01 image currently used by the Tea Time UI', () => {
    for (const assetPath of puzzle01Assets) {
      expect(gameImageAssets).toContain(assetPath)
    }
  })

  it('keeps preload image assets unique', () => {
    expect(getPreloadImageCount()).toBe(new Set(gameImageAssets).size)
  })
})
