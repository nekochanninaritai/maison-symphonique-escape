export type WeddingScheduleEntry = {
  id: string
  time: string | null
  label: string
  iconId: string
}

export const p06TargetTime = '15:30'

export const oldInvitationSchedule: WeddingScheduleEntry[] = [
  { id: 'waiting', time: '11:00', label: 'WAITING', iconId: 'cup' },
  { id: 'ceremony', time: '12:00', label: 'CEREMONY', iconId: 'ring' },
  { id: 'reception', time: '13:00', label: 'RECEPTION', iconId: 'glass' },
  { id: 'finale', time: null, label: 'FINALE', iconId: 'star' },
]
