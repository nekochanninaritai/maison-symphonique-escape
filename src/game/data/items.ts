import type { Item } from '../types'

export const createItems = (): Record<string, Item> => ({
  'clock-hand': {
    itemId: 'clock-hand',
    name: '古い時計の長針',
    description: '大時計から外れていたらしい、細い金色の針。',
    image: 'placeholder-item-clock-hand',
    usableTargets: ['grand-clock'],
    obtained: false,
    consumed: false,
  },
})
