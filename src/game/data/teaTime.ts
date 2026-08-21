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

// TODO: Replace after Maison Symphonique tea service visuals are finalized.
export const teaTimePairs: TeaPair[] = [
  {
    id: 'coffee-gateau-chocolat',
    drinkId: 'coffee',
    drinkName: 'Coffee',
    drinkIcon: 'CO',
    sweetId: 'gateau-chocolat',
    sweetName: 'Gateau Chocolat',
    sweetIcon: 'GC',
    description: '深い茶色のコーヒーカップ。',
  },
  {
    id: 'earl-grey-cookies',
    drinkId: 'earl-grey',
    drinkName: 'Earl Grey',
    drinkIcon: 'EG',
    sweetId: 'cookies',
    sweetName: 'Cookies',
    sweetIcon: 'CK',
    description: '花柄のカップから、紅茶の香りがする。',
  },
  {
    id: 'matcha-wagashi',
    drinkId: 'matcha',
    drinkName: 'Matcha',
    drinkIcon: 'MA',
    sweetId: 'wagashi',
    sweetName: 'Wagashi',
    sweetIcon: 'WA',
    description: '抹茶碗に、静かな緑が残っている。',
  },
  {
    id: 'chinese-tea-sesame-balls',
    drinkId: 'chinese-tea',
    drinkName: 'Chinese Tea',
    drinkIcon: 'CT',
    sweetId: 'sesame-balls',
    sweetName: 'Sesame Balls',
    sweetIcon: 'SB',
    description: '小さな茶器に、香ばしいお茶が注がれている。',
  },
]

export const correctTeaTimeSlots: Record<string, string> = Object.fromEntries(
  teaTimePairs.map((pair) => [pair.sweetId, pair.drinkId]),
)

export const initialTeaTimeSlots: Record<string, string> = {
  'gateau-chocolat': 'earl-grey',
  cookies: 'chinese-tea',
  wagashi: 'coffee',
  'sesame-balls': 'matcha',
}

export const getTeaDrink = (drinkId: string): TeaPair | undefined => teaTimePairs.find((pair) => pair.drinkId === drinkId)

export const isTeaTimeSolved = (cupSlots: Record<string, string>): boolean =>
  teaTimePairs.every((pair) => cupSlots[pair.sweetId] === pair.drinkId)
