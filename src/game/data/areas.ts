import type { Area } from '../types'

export const areas: Record<string, Area> = {
  entrance: {
    areaId: 'entrance',
    name: 'エントランス',
    chapter: 'Entrance',
    emptyBackground: 'entrance',
    memoryBackground: 'entrance-memory',
    hotspots: [
      {
        id: 'grand-clock',
        label: '古い大時計',
        position: { x: 40, y: 12, width: 20, height: 36 },
        useTarget: 'grand-clock',
        focusScene: {
          id: 'focus-grand-clock',
          title: '古い大時計',
          description: 'Maison Symphoniqueの入口にある大時計。長針だけが欠けている。',
        },
        message: (state) => {
          if (state.normalEndingCleared && state.clockState.handAttached) {
            return ['時計は止まっている。', '長針に触れると、わずかに動いた。']
          }
          if (state.clockState.handAttached) {
            return ['長針は戻っている。', 'しかし、時計は止まったままだ。']
          }
          return ['時計は止まっている。', '長針がない。']
        },
      },
      {
        id: 'entrance-invitation',
        label: '受付台',
        position: { x: 12, y: 58, width: 24, height: 18 },
        message: ['受付台には、まだ名前のない招待状が置かれている。'],
        flagUpdate: { foundInvitationDesk: true },
      },
    ],
    exits: [{ to: 'waiting-room', label: '待合室へ' }],
  },
  'waiting-room': {
    areaId: 'waiting-room',
    name: '待合室',
    chapter: 'Waiting Room',
    emptyBackground: 'waiting-room',
    memoryBackground: 'waiting-room-memory',
    hotspots: [
      {
        id: 'waiting-sofa',
        label: 'ソファ',
        position: { x: 8, y: 58, width: 32, height: 18 },
        message: ['誰かを待っていた温度だけが、布地に残っている。'],
      },
      {
        id: 'dressing-door',
        label: '控室の扉',
        position: { x: 70, y: 28, width: 18, height: 38 },
        message: ['控室へ続く扉が少し開いている。'],
      },
    ],
    exits: [
      { to: 'entrance', label: 'エントランスへ' },
      { to: 'dressing-room', label: '控室へ' },
      { to: 'ceremony', label: '挙式会場へ' },
    ],
  },
  'dressing-room': {
    areaId: 'dressing-room',
    name: '控室',
    chapter: 'Waiting Room / Sub Area',
    emptyBackground: 'dressing-room',
    memoryBackground: 'dressing-room-memory',
    hotspots: [
      {
        id: 'clock-hand-case',
        label: '小さなケース',
        position: { x: 52, y: 48, width: 24, height: 18 },
        visibilityCondition: (state) => !state.inventory['clock-hand'].obtained && !state.clockState.handAttached,
        message: ['小さなケースの中に、細い金色の針が入っていた。', '古い時計の長針を手に入れた。'],
        itemReward: 'clock-hand',
      },
    ],
    exits: [{ to: 'waiting-room', label: '待合室へ戻る' }],
  },
  ceremony: {
    areaId: 'ceremony',
    name: '挙式会場',
    chapter: 'Ceremony',
    emptyBackground: 'ceremony',
    memoryBackground: 'ceremony-memory',
    hotspots: [
      {
        id: 'altar',
        label: '祭壇',
        position: { x: 34, y: 18, width: 32, height: 30 },
        focusScene: {
          id: 'focus-altar',
          title: '祭壇',
          description: '誓いの言葉を待つように、静かに光を受けている。',
        },
        message: ['祭壇の前だけ、空気が少し澄んでいる。'],
      },
    ],
    exits: [
      { to: 'waiting-room', label: '待合室へ' },
      { to: 'reception', label: '披露宴会場へ' },
    ],
  },
  reception: {
    areaId: 'reception',
    name: '披露宴会場',
    chapter: 'Reception',
    emptyBackground: 'reception',
    memoryBackground: 'reception-memory',
    hotspots: [
      {
        id: 'piano',
        label: 'ピアノ',
        position: { x: 58, y: 40, width: 28, height: 20 },
        focusScene: {
          id: 'focus-piano',
          title: 'ピアノ',
          description: '鍵盤に触れなくても、音楽の気配がかすかにある。',
        },
        message: ['閉じたピアノが、次の音を待っている。'],
      },
    ],
    exits: [
      { to: 'ceremony', label: '挙式会場へ' },
      { to: 'entrance', label: 'エントランスへ' },
      { to: 'garden', label: '広場へ', unlockCondition: (state) => state.flags.gardenUnlocked === true },
    ],
  },
  garden: {
    areaId: 'garden',
    name: '広場',
    chapter: 'Garden',
    emptyBackground: 'garden',
    memoryBackground: 'garden-memory',
    unlockCondition: (state) => state.flags.gardenUnlocked === true || state.worldMode === 'memory',
    hotspots: [
      {
        id: 'garden-gate',
        label: '出口へ続く門',
        position: { x: 36, y: 18, width: 28, height: 42 },
        message: (state) =>
          state.worldMode === 'memory'
            ? ['記憶の光が、門の向こうへ続いている。']
            : ['広場の門は、最後の確認を待っている。'],
      },
    ],
    exits: [
      { to: 'reception', label: '披露宴会場へ' },
      { to: 'entrance', label: 'エントランスへ' },
    ],
  },
}
