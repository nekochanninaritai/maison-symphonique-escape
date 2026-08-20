import type { Memory } from '../types'

export const createMemories = (): Record<string, Memory> => ({
  tea: {
    id: 'tea',
    title: 'Tea Room',
    description: '待合室のティーセットと、白い鳥籠が写った古い写真。',
    unlocked: false,
  },
  vow: {
    id: 'vow',
    title: 'Vows',
    description: '祭壇の灯と、噴水が写った古い写真。',
    unlocked: false,
  },
  banquet: {
    id: 'banquet',
    title: 'Banquet',
    description: '披露宴のテーブルと、天使像が写った古い写真。',
    unlocked: false,
  },
  melody: {
    id: 'melody',
    title: 'Melody',
    description: 'ピアノと、ガーデンランプが写った古い写真。',
    unlocked: false,
  },
  september23: {
    id: 'september23',
    title: 'September 23',
    description: 'TRUE Route専用の五枚目の古い写真。正式内容は未実装。',
    unlocked: false,
  },
})
