export type ClockPoint = {
  x: number
  y: number
}

export type ClockRect = {
  left: number
  top: number
  width: number
  height: number
}

export const minutesFromTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

export const normalizeTime = (totalMinutes: number): string => {
  const dayMinutes = 24 * 60
  const normalized = ((Math.round(totalMinutes) % dayMinutes) + dayMinutes) % dayMinutes
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export const clockAngleFromPoint = (point: ClockPoint, rect: ClockRect): number => {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const degreesFromThreeOClock = Math.atan2(point.y - centerY, point.x - centerX) * (180 / Math.PI)
  return (degreesFromThreeOClock + 90 + 360) % 360
}

export const minuteFromClockAngle = (angle: number): number => {
  return Math.round((((angle % 360) + 360) % 360) / 6) % 60
}

export const timeFromClockPoint = (point: ClockPoint, rect: ClockRect, currentTime: string): string => {
  const currentMinutes = minutesFromTime(currentTime)
  const currentHour = Math.floor(currentMinutes / 60)
  const nextMinute = minuteFromClockAngle(clockAngleFromPoint(point, rect))
  return normalizeTime(currentHour * 60 + nextMinute)
}
