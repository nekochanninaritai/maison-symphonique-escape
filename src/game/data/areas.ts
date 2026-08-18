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
          if (state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked) {
            return ['時計は止まっている。', '長針に触れると、わずかに動いた。']
          }
          if (state.flags.invitationObtained && state.puzzles.p06_grand_clock?.status !== 'solved') {
            return ['古い招待状の裏面を、大時計の盤面へ重ねられそうだ。', '※正式問題は今後実装予定']
          }
          if (state.clockState.handAttached) {
            return ['長針は元の場所に戻っている。', 'しかし、時計は止まったままだ。']
          }
          return ['時計は止まっている。', '長針がない。']
        },
      },
      {
        id: 'entrance-desk',
        label: '受付台',
        position: { x: 12, y: 58, width: 24, height: 18 },
        message: ['受付台には、まだ名前のない記録帳が置かれている。'],
        flagUpdate: { foundReceptionDesk: true },
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
        id: 'tea-table',
        label: 'ティーテーブル',
        position: { x: 34, y: 52, width: 30, height: 24 },
        focusScene: {
          id: 'focus-tea-time',
          title: 'Puzzle 01「ティータイム」',
          description: '四人分のティーセットが並んでいる。どうやら、カップの位置が入れ替わっているようだ。',
        },
        message: (state) =>
          state.puzzles.p01_waiting_room?.status === 'solved'
            ? ['四つのティーセットは、静かに整っている。']
            : ['四人分のティーセットが並んでいる。', 'カップの位置が入れ替わっているようだ。'],
      },
      {
        id: 'framed-score',
        label: '額装された楽譜',
        position: { x: 42, y: 20, width: 20, height: 22 },
        useTarget: 'framed-score',
        message: (state) =>
          state.inventory['transparent-card']?.obtained && !state.clues.pianoSequence
            ? ['額装された古い楽譜だ。', '半透明カードを重ねられそうだ。']
            : ['額装された古い楽譜だ。'],
      },
      {
        id: 'dressing-door',
        label: '控室の扉',
        position: { x: 70, y: 28, width: 18, height: 38 },
        message: (state) =>
          state.flags.dressingRoomUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved'
            ? ['控室へ続く扉が開いている。']
            : ['控室へ続く扉は、まだ静かに閉ざされている。'],
      },
      {
        id: 'ceremony-door',
        label: '挙式会場の扉',
        position: { x: 86, y: 30, width: 12, height: 36 },
        message: (state) =>
          state.flags.ceremonyUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved'
            ? ['挙式会場へ続く扉が、少し開いている。']
            : ['挙式会場へ続く扉は、まだ開きそうにない。'],
      },
    ],
    exits: [
      { to: 'entrance', label: 'エントランスへ' },
      { to: 'dressing-room', label: '控室へ', unlockCondition: (state) => state.flags.dressingRoomUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved' },
      { to: 'ceremony', label: '挙式会場へ', unlockCondition: (state) => state.flags.ceremonyUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved' },
    ],
  },
  'dressing-room': {
    areaId: 'dressing-room',
    name: '控室',
    chapter: 'Waiting Room / Sub Area',
    emptyBackground: 'dressing-room',
    memoryBackground: 'dressing-room-memory',
    unlockCondition: (state) => state.flags.dressingRoomUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved',
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
    unlockCondition: (state) => state.flags.ceremonyUnlocked === true || state.puzzles.p01_waiting_room?.status === 'solved',
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
      {
        id: 'ceremony-light',
        label: '淡い光',
        position: { x: 60, y: 44, width: 16, height: 14 },
        visibilityCondition: (state) => state.flags.ceremonyLightVisible === true && !state.inventory['small-key'].obtained && !state.flags.pianoSecretOpened,
        message: ['祭壇の近くで、何かが光を反射している。', '小さな鍵を手に入れた。'],
        itemReward: 'small-key',
        flagUpdate: { smallKeyObtained: true },
      },
    ],
    exits: [
      { to: 'waiting-room', label: '待合室へ' },
      { to: 'reception', label: '披露宴会場へ', unlockCondition: (state) => state.flags.receptionUnlocked === true },
    ],
  },
  reception: {
    areaId: 'reception',
    name: '披露宴会場',
    chapter: 'Reception',
    emptyBackground: 'reception',
    memoryBackground: 'reception-memory',
    unlockCondition: (state) => state.flags.receptionUnlocked === true || state.worldMode === 'memory',
    hotspots: [
      {
        id: 'piano',
        label: 'ピアノ',
        position: { x: 58, y: 40, width: 28, height: 20 },
        useTarget: 'piano',
        focusScene: {
          id: 'focus-piano',
          title: 'ピアノ',
          description: '鍵盤に触れなくても、音楽の気配がかすかにある。',
        },
        message: (state) => {
          if (state.flags.pianoSecretOpened) {
            return ['秘密収納は開いている。']
          }
          if (state.flags.pianoMechanismUnlocked) {
            return ['ピアノの奥で、何かが外れたようだ。', '小さな鍵穴がある。']
          }
          return ['閉じたピアノが、次の音を待っている。']
        },
      },
    ],
    exits: [
      { to: 'ceremony', label: '挙式会場へ' },
      { to: 'waiting-room', label: '待合室へ' },
      { to: 'entrance', label: 'エントランスへ' },
      { to: 'garden', label: '広場へ', unlockCondition: (state) => state.flags.gardenUnlocked === true || state.worldMode === 'memory' },
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
            ? ['記憶の光が、庭の向こうへ続いている。']
            : ['広場の門は、最後の確認を待っている。'],
      },
    ],
    exits: [
      { to: 'reception', label: '披露宴会場へ' },
      { to: 'entrance', label: 'エントランスへ' },
    ],
  },
}
