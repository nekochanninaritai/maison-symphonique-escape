export const gameConfig = {
  title: 'Maison Symphoniqueからの脱出',
  venueName: 'Maison Symphonique',
  saveKey: 'maison-symphonique-escape-save',
  saveVersion: 5,
}

const debugQueryFlag = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('debug')

export const DEBUG_MODE =
  debugQueryFlag === '1'
    ? true
    : debugQueryFlag === '0'
      ? false
      : import.meta.env.DEV || import.meta.env.VITE_DEBUG_MODE === 'true'
