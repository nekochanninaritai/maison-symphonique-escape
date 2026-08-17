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
  'transparent-card': {
    itemId: 'transparent-card',
    name: '半透明カード',
    description: '薄い半透明のカード。何かに重ねて使うものだろうか。',
    image: 'placeholder-item-transparent-card',
    usableTargets: ['framed-score'],
    obtained: false,
    consumed: false,
  },
  'small-key': {
    itemId: 'small-key',
    name: '小さな鍵',
    description: '小さく古びた鍵。',
    image: 'placeholder-item-small-key',
    usableTargets: ['piano'],
    obtained: false,
    consumed: false,
  },
  'old-invitation': {
    itemId: 'old-invitation',
    name: '古い招待状',
    description: 'Maison Symphoniqueの名前とSeptember 23が記された古い招待状。',
    image: 'placeholder-item-old-invitation',
    usableTargets: ['grand-clock'],
    obtained: false,
    consumed: false,
  },
})
