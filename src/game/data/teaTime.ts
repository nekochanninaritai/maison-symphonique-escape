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

// TODO: Finalize pairing before the wedding build. These are temporary QA pairs.
export const teaTimePairs: TeaPair[] = [
  {
    id: 'coffee-tiramisu',
    drinkId: 'coffee',
    drinkName: 'Coffee',
    drinkIcon: 'C',
    sweetId: 'tiramisu',
    sweetName: 'Tiramisu',
    sweetIcon: '▰',
    description: 'ほろ苦い香りのカップ。',
  },
  {
    id: 'earl-grey-lemon-cake',
    drinkId: 'earl-grey',
    drinkName: 'Earl Grey',
    drinkIcon: 'E',
    sweetId: 'lemon-cake',
    sweetName: 'Lemon Cake',
    sweetIcon: '△',
    description: '柑橘の香りがする紅茶。',
  },
  {
    id: 'herbal-tea-light-cookie',
    drinkId: 'herbal-tea',
    drinkName: 'Herbal Tea',
    drinkIcon: 'H',
    sweetId: 'light-cookie',
    sweetName: 'Light Cookie',
    sweetIcon: '○',
    description: '淡いハーブの香りが残っている。',
  },
  {
    id: 'darjeeling-shortcake',
    drinkId: 'darjeeling',
    drinkName: 'Darjeeling',
    drinkIcon: 'D',
    sweetId: 'shortcake',
    sweetName: 'Shortcake',
    sweetIcon: '□',
    description: 'すっきりした色の紅茶。',
  },
]

export const correctTeaTimeSlots: Record<string, string> = Object.fromEntries(
  teaTimePairs.map((pair) => [pair.sweetId, pair.drinkId]),
)

export const initialTeaTimeSlots: Record<string, string> = {
  tiramisu: 'earl-grey',
  'lemon-cake': 'darjeeling',
  'light-cookie': 'coffee',
  shortcake: 'herbal-tea',
}

export const getTeaDrink = (drinkId: string): TeaPair | undefined => teaTimePairs.find((pair) => pair.drinkId === drinkId)

export const isTeaTimeSolved = (cupSlots: Record<string, string>): boolean =>
  teaTimePairs.every((pair) => cupSlots[pair.sweetId] === pair.drinkId)
