import { describe, expect, it } from 'vitest'
import entrance from '../assets/environments/bg-01-entrance.png'
import waitingRoom from '../assets/environments/bg-02-waiting-room.png'
import dressingRoom from '../assets/environments/bg-03-dressing-room.png'
import ceremony from '../assets/environments/bg-04-ceremony.png'
import reception from '../assets/environments/bg-05-reception.png'
import garden from '../assets/environments/bg-06-garden.png'
import grandClock from '../assets/environments/clock-01-grand-clock.png'

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
      expect(assetPath).toMatch(/\.png$/)
    }
  })
})
