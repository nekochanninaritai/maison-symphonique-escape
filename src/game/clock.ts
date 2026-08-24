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

export type ClockDragSession = {
  lastAngle: number
  totalMinutes: number
}

export type ClockHandKind = 'hour' | 'minute'

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

export const hourFromClockAngle = (angle: number): number => {
  return Math.round((((angle % 360) + 360) % 360) / 30) % 12
}

export const minuteHandAngleFromTime = (time: string): number => {
  return (minutesFromTime(time) % 60) * 6
}

export const hourHandAngleFromTime = (time: string): number => {
  const totalMinutes = minutesFromTime(time)
  const hour = Math.floor(totalMinutes / 60) % 12
  const minute = totalMinutes % 60
  return hour * 30 + minute * 0.5
}

export const setMinuteInTime = (currentTime: string, minute: number): string => {
  const currentMinutes = minutesFromTime(currentTime)
  const currentHour = Math.floor(currentMinutes / 60)
  return normalizeTime(currentHour * 60 + minute)
}

export const setHourInTime = (currentTime: string, hourOnDial: number): string => {
  const currentMinutes = minutesFromTime(currentTime)
  const currentHour = Math.floor(currentMinutes / 60)
  const minute = currentMinutes % 60
  const dialHour = ((hourOnDial % 12) + 12) % 12
  const candidates = [dialHour, dialHour + 12, dialHour - 12, dialHour + 24]
    .filter((hour) => hour >= 0 && hour <= 24)
  const closestHour = candidates.reduce((closest, candidate) => (
    Math.abs(candidate - currentHour) < Math.abs(closest - currentHour) ? candidate : closest
  ), candidates[0] ?? dialHour)
  return normalizeTime(closestHour * 60 + minute)
}

export const timeFromClockPoint = (point: ClockPoint, rect: ClockRect, currentTime: string): string => {
  const currentMinutes = minutesFromTime(currentTime)
  const currentHour = Math.floor(currentMinutes / 60)
  const nextMinute = minuteFromClockAngle(clockAngleFromPoint(point, rect))
  return normalizeTime(currentHour * 60 + nextMinute)
}

export const timeFromClockHandPoint = (
  hand: ClockHandKind,
  point: ClockPoint,
  rect: ClockRect,
  currentTime: string,
): string => {
  const angle = clockAngleFromPoint(point, rect)
  if (hand === 'minute') return setMinuteInTime(currentTime, minuteFromClockAngle(angle))
  return setHourInTime(currentTime, hourFromClockAngle(angle))
}

export const normalizeAngleDelta = (fromAngle: number, toAngle: number): number => {
  return ((((toAngle - fromAngle) % 360) + 540) % 360) - 180
}

export const createClockDragSessionFromAngle = (angle: number, currentTime: string): ClockDragSession => ({
  lastAngle: angle,
  totalMinutes: minutesFromTime(currentTime),
})

export const updateClockDragSessionFromAngle = (
  session: ClockDragSession,
  nextAngle: number,
): { session: ClockDragSession; time: string } => {
  const deltaAngle = normalizeAngleDelta(session.lastAngle, nextAngle)
  const nextSession = {
    lastAngle: nextAngle,
    totalMinutes: session.totalMinutes + deltaAngle / 6,
  }
  return {
    session: nextSession,
    time: normalizeTime(nextSession.totalMinutes),
  }
}

export const createClockDragSession = (
  point: ClockPoint,
  rect: ClockRect,
  currentTime: string,
): ClockDragSession => createClockDragSessionFromAngle(clockAngleFromPoint(point, rect), currentTime)

export const updateClockDragSession = (
  session: ClockDragSession,
  point: ClockPoint,
  rect: ClockRect,
): { session: ClockDragSession; time: string } => {
  return updateClockDragSessionFromAngle(session, clockAngleFromPoint(point, rect))
}
