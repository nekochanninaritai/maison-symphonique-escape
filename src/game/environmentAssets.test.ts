import { describe, expect, it } from 'vitest'
import entrance from '../assets/environments/bg-01-entrance.jpg'
import waitingRoom from '../assets/environments/bg-02-waiting-room.jpg'
import dressingRoom from '../assets/environments/bg-03-dressing-room.jpg'
import ceremony from '../assets/environments/bg-04-ceremony.jpg'
import reception from '../assets/environments/bg-05-reception.jpg'
import garden from '../assets/environments/bg-06-garden.jpg'
import grandClock from '../assets/environments/clock-01-grand-clock.jpg'

const environmentAssets = [
  entrance,
  waitingRoom,
  dressingRoom,
  ceremony,
  reception,
  garden,
  grandClock,
]

describe('EnvironmentAssets', () => {
  it('keeps Phase 3A core environment assets resolvable by Vite', () => {
    for (const assetPath of environmentAssets) {
      expect(assetPath).toMatch(/\.jpg$/)
    }
  })
})
