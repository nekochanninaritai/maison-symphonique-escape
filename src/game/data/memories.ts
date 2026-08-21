import type { Memory } from '../types'

export const createMemories = (): Record<string, Memory> => ({
  tea: {
    id: 'tea',
    title: 'PHOTO A',
    description: '待合室のティーセットと、白い鳥籠が写った古い写真。',
    unlocked: false,
  },
  vow: {
    id: 'vow',
    title: 'PHOTO B',
    description: '祭壇の灯りと、噴水が写った古い写真。',
    unlocked: false,
  },
  banquet: {
    id: 'banquet',
    title: 'PHOTO C',
    description: '披露宴のテーブルと、天使像が写った古い写真。',
    unlocked: false,
  },
  melody: {
    id: 'melody',
    title: 'PHOTO D',
    description: 'ピアノと、ガーデンランプが写った古い写真。',
    unlocked: false,
  },
  september23: {
    id: 'september23',
    title: 'PHOTO E',
    description: '開いた門の外から、Maison Symphoniqueを振り返った古い写真。',
    unlocked: false,
  },
})
