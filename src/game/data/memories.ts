import type { Memory } from '../types'

export const createMemories = (): Record<string, Memory> => ({
  invitation: {
    id: 'invitation',
    title: '招待の記憶',
    description: 'まだ誰かの声が残っている。',
    unlocked: false,
  },
  vow: {
    id: 'vow',
    title: '誓いの記憶',
    description: '静かな拍手が、遠くで重なる。',
    unlocked: false,
  },
  music: {
    id: 'music',
    title: '音楽の記憶',
    description: '止まった空気の中で、旋律だけが続いている。',
    unlocked: false,
  },
  banquet: {
    id: 'banquet',
    title: '祝宴の記憶',
    description: '灯りの下に、温かな時間の輪郭がある。',
    unlocked: false,
  },
  september23: {
    id: 'september23',
    title: 'September 23',
    description: '最後の記憶。まだここでは語られない。',
    unlocked: false,
  },
})
