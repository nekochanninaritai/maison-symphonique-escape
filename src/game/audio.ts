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

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  play(cue: AudioCue) {
    if (!this.enabled) return
    console.info(`Audio placeholder: ${cue}`)
  }
}

export const audioManager = new AudioManager()
