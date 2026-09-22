export type TeaPair = {
  id: string
  drinkId: string
  drinkName: string
  drinkIcon: string
  sweetId: string
  sweetName: string
  sweetIcon: string
  description?: string
  finalPuzzleMark?: string
}

export const teaTimePairs: TeaPair[] = [
  {
    id: 'coffee-gateau-chocolat',
    drinkId: 'coffee',
    drinkName: 'Coffee',
    drinkIcon: 'CO',
    sweetId: 'gateau-chocolat',
    sweetName: 'GateauChocolat',
    sweetIcon: 'GC',
    description: '深い茶色のコーヒーカップ。',
  },
  {
    id: 'hot-tea-shortcake',
    drinkId: 'hot-tea',
    drinkName: 'HotTee',
    drinkIcon: 'HT',
    sweetId: 'shortcake',
    sweetName: 'ShortCake',
    sweetIcon: 'SC',
    description: '温かい紅茶のカップ。',
  },
  {
    id: 'ice-tea-mango-cake',
    drinkId: 'ice-tea',
    drinkName: 'IceTee',
    drinkIcon: 'IT',
    sweetId: 'mango-cake',
    sweetName: 'MangoCake',
    sweetIcon: 'MC',
    description: '冷たい紅茶のグラス。',
  },
]

export const correctTeaTimeSlots: Record<string, string> = Object.fromEntries(
  teaTimePairs.map((pair) => [pair.sweetId, pair.drinkId]),
)

export const initialTeaTimeSlots: Record<string, string> = {
  'gateau-chocolat': 'hot-tea',
  shortcake: 'ice-tea',
  'mango-cake': 'coffee',
}

export const getTeaDrink = (drinkId: string): TeaPair | undefined => teaTimePairs.find((pair) => pair.drinkId === drinkId)

export const isTeaTimeSolved = (cupSlots: Record<string, string>): boolean =>
  teaTimePairs.every((pair) => cupSlots[pair.sweetId] === pair.drinkId)

