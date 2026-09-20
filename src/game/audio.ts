export type AudioCue =
  | 'area-bgm'
  | 'clock'
  | 'bell'
  | 'door'
  | 'item'
  | 'puzzle'
  | 'normal-end'
  | 'true-route'
  | 'true-end'

export class AudioManager {
  private userActivated = false
  private bgmEnabled = true
  private seEnabled = true
  private bgmVolume = 0.72
  private seVolume = 0.68
  private context: AudioContext | null = null

  enable() {
    this.userActivated = true
  }

  disable() {
    this.userActivated = false
  }

  setSettings(settings: { bgmEnabled: boolean; seEnabled: boolean; bgmVolume: number; seVolume: number }) {
    this.bgmEnabled = settings.bgmEnabled
    this.seEnabled = settings.seEnabled
    this.bgmVolume = this.clampVolume(settings.bgmVolume)
    this.seVolume = this.clampVolume(settings.seVolume)
  }

  play(cue: AudioCue) {
    if (!this.userActivated) return
    if (cue === 'area-bgm' && (!this.bgmEnabled || this.bgmVolume <= 0)) return
    if (cue !== 'area-bgm' && (!this.seEnabled || this.seVolume <= 0)) return
    if (cue === 'bell') {
      this.playBell()
      return
    }
    console.info(`Audio placeholder: ${cue}`)
  }

  playPianoTone(toneOffset: number) {
    if (!this.userActivated || !this.seEnabled || this.seVolume <= 0 || typeof window === 'undefined') return
    const context = this.getContext()
    if (!context) return
    const start = context.currentTime
    const frequency = 261.63 * Math.pow(2, toneOffset / 12)
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.16 * this.seVolume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.45)
  }

  private playBell() {
    if (typeof window === 'undefined') return
    const context = this.getContext()
    if (!context) return
    const start = context.currentTime
    ;[523.25, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime((0.12 * this.seVolume) / (index + 1), start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 1.15)
    })
  }

  private getContext() {
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return null
      this.context ??= new AudioContextCtor()
      if (this.context.state === 'suspended') void this.context.resume()
      return this.context
    } catch {
      return null
    }
  }

  private clampVolume(value: number) {
    if (!Number.isFinite(value)) return 0
    return Math.min(1, Math.max(0, value))
  }
}

export const audioManager = new AudioManager()
