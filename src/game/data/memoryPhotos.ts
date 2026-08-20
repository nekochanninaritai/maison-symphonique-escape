export type GardenObjectId = 'birdcage' | 'lamp' | 'fountain' | 'angel'

export type MemoryPhoto = {
  id: string
  memoryId: string
  title: string
  sourceArea: string
  gardenObjectId: GardenObjectId
  clockTime: string
  sceneElements: string[]
}

export type GardenPuzzleObject = {
  id: GardenObjectId
  name: string
  shortName: string
  description: string
  photoFeature: string
  position: { x: number; y: number; width: number; height: number }
}

// TODO: Replace placeholder photo compositions and times after final Garden visuals are produced.
export const memoryPhotos: MemoryPhoto[] = [
  {
    id: 'photo-tea-room',
    memoryId: 'tea',
    title: 'Tea Room',
    sourceArea: 'Waiting Room',
    gardenObjectId: 'birdcage',
    clockTime: '10:40',
    sceneElements: ['ティーセット', 'カップ', 'お菓子', '白い鳥籠', 'アンティーク置時計'],
  },
  {
    id: 'photo-vows',
    memoryId: 'vow',
    title: 'Vows',
    sourceArea: 'Ceremony',
    gardenObjectId: 'fountain',
    clockTime: '14:20',
    sceneElements: ['祭壇', '四本のキャンドル', '花器', '噴水', '柱の時計'],
  },
  {
    id: 'photo-banquet',
    memoryId: 'banquet',
    title: 'Banquet',
    sourceArea: 'Reception',
    gardenObjectId: 'angel',
    clockTime: '16:50',
    sceneElements: ['披露宴のテーブル', 'グラス', '席札', '天使像', '壁時計'],
  },
  {
    id: 'photo-melody',
    memoryId: 'melody',
    title: 'Melody',
    sourceArea: 'Reception / Piano',
    gardenObjectId: 'lamp',
    clockTime: '12:15',
    sceneElements: ['ピアノ', '星印の鍵盤', 'ガーデンランプ', '小さな置時計'],
  },
]

export const gardenPuzzleObjects: GardenPuzzleObject[] = [
  {
    id: 'birdcage',
    name: '白い鳥籠',
    shortName: 'Birdcage',
    description: '白い鳥籠だ。ドーム型の上部に、小さな蝶の飾りがついている。',
    photoFeature: '写真の中にも、同じ蝶飾りの鳥籠が写っている。',
    position: { x: 16, y: 42, width: 18, height: 20 },
  },
  {
    id: 'lamp',
    name: 'ガーデンランプ',
    shortName: 'Lamp',
    description: '細い黒いフレームのランプだ。灯部は六角形をしている。',
    photoFeature: '写真の片隅にも、同じ形のランプが立っている。',
    position: { x: 68, y: 30, width: 14, height: 26 },
  },
  {
    id: 'fountain',
    name: '噴水',
    shortName: 'Fountain',
    description: '円形の水盤を持つ噴水だ。中央から細く水が上がっている。',
    photoFeature: '写真の奥にも、同じ円形の噴水が見える。',
    position: { x: 40, y: 46, width: 22, height: 22 },
  },
  {
    id: 'angel',
    name: '天使像',
    shortName: 'Angel',
    description: '小さな天使像だ。片翼を少し上げ、花束を抱えている。',
    photoFeature: '写真にも、同じ姿勢の天使像が写っている。',
    position: { x: 70, y: 62, width: 16, height: 22 },
  },
]

export const normalMemoryIds = memoryPhotos.map((photo) => photo.memoryId)

export const getP07CorrectSequence = (): GardenObjectId[] =>
  [...memoryPhotos]
    .sort((a, b) => a.clockTime.localeCompare(b.clockTime))
    .map((photo) => photo.gardenObjectId)

export const getMemoryPhotoByMemoryId = (memoryId: string): MemoryPhoto | undefined =>
  memoryPhotos.find((photo) => photo.memoryId === memoryId)

export const getGardenPuzzleObject = (objectId: string): GardenPuzzleObject | undefined =>
  gardenPuzzleObjects.find((object) => object.id === objectId)
