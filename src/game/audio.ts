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
  private enabled = false
  private context: AudioContext | null = null

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  play(cue: AudioCue) {
    if (!this.enabled) return
    if (cue === 'bell') {
      this.playBell()
      return
    }
    console.info(`Audio placeholder: ${cue}`)
  }

  playPianoTone(toneOffset: number) {
    if (!this.enabled || typeof window === 'undefined') return
    const context = this.getContext()
    if (!context) return
    const start = context.currentTime
    const frequency = 261.63 * Math.pow(2, toneOffset / 12)
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.012)
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
      gain.gain.exponentialRampToValueAtTime(0.12 / (index + 1), start + 0.02)
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
}

export const audioManager = new AudioManager()
