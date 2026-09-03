import { gardenPuzzleObjects } from './memoryPhotos'
import { receptionTables } from './receptionTables'
import { trueClockMessages } from './trueRoute'
import type { Area, GameState } from '../types'

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
        position: { x: 8, y: 29, width: 12, height: 41 },
        useTarget: 'grand-clock',
        focusScene: {
          id: 'focus-grand-clock',
          title: '古い大時計',
          description: 'Maison Symphoniqueの入口にある大時計。長針だけが欠けている。',
        },
        message: (state) => {
          if (state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked && !state.memories.september23?.unlocked) {
            return trueClockMessages.clockHint
          }
          if (state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked) {
            return ['時計は止まっている。', '長針に触れると、わずかに動いた。']
          }
          if (state.flags.invitationObtained && state.puzzles.p06_grand_clock?.status !== 'solved') {
            return ['時計は静かに止まっている。', '長針に触れると、わずかに動いた。']
          }
          if (state.puzzles.p06_grand_clock?.status === 'solved') {
            return ['大時計は15:30を指している。']
          }
          if (state.clockState.handAttached) {
            return ['長針は元の場所に戻っている。', 'しかし、時計は動かない。']
          }
          return ['時計は止まっている。', '長針がない。']
        },
      },
      {
        id: 'entrance-left-space',
        label: '左奥へ',
        position: { x: 0, y: 18, width: 8, height: 44 },
        message: ['左側に、奥へ続く空間がある。'],
      },
      {
        id: 'entrance-desk',
        label: '受付台',
        position: { x: 33, y: 59, width: 39, height: 23 },
        message: ['受付台には、まだ名前のない芳名帳が置かれている。'],
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
        position: { x: 8, y: 58, width: 31, height: 17 },
        message: ['誰かを待っていた温度だけが、布地に残っている。'],
      },
      {
        id: 'tea-table',
        label: 'ティーテーブル',
        position: { x: 31, y: 54, width: 45, height: 34 },
        focusScene: {
          id: 'focus-tea-time',
          title: 'Puzzle 01「ティータイム」',
          description: '四人分のティーセットが並んでいる。どうやら、カップの位置が入れ替わっているようだ。',
        },
        message: (state: GameState) =>
          state.puzzles.p01_waiting_room?.status === 'solved'
            ? ['四つのティーセットは、静かに整っている。']
            : ['四人分のティーセットが並んでいる。', 'カップの位置が入れ替わっているようだ。'],
      },
      {
        id: 'framed-picture',
        label: '額装された未完成の絵',
        position: { x: 39, y: 13, width: 29, height: 27 },
        useTarget: 'framed-picture',
        focusScene: {
          id: 'focus-framed-picture',
          title: '額装された未完成の絵',
          description: '額に収められた古い絵。ピアノが描かれているが、どこか未完成に見える。',
        },
        message: (state: GameState) =>
          state.pianoOverlay.overlayApplied || state.puzzles.p04_sheet_overlay?.status === 'solved'
            ? ['紙の模様が、絵の上にぴたりと重なっている。']
            : ['額に収められた古い絵。', 'ピアノが描かれているが、どこか未完成に見える。'],
      },
      {
        id: 'ceremony-door',
        label: '挙式会場の扉',
        position: { x: 86, y: 31, width: 12, height: 35 },
        message: (state) =>
          state.flags.ceremonyUnlocked === true
            ? ['挙式会場へ続く扉が、少し開いている。']
            : ['挙式会場へ続く扉は、まだ開きそうにない。'],
      },
    ],
    exits: [
      { to: 'entrance', label: 'エントランスへ' },
      { to: 'ceremony', label: '挙式会場へ', unlockCondition: (state) => state.flags.ceremonyUnlocked === true },
    ],
  },
  'dressing-room': {
    areaId: 'dressing-room',
    name: '控室',
    chapter: 'Waiting Room / Sub Area',
    emptyBackground: 'dressing-room',
    memoryBackground: 'dressing-room-memory',
    unlockCondition: () => true,
    hotspots: [
      {
        id: 'clock-hand-case',
        label: '置時計',
        position: { x: 37, y: 24, width: 12, height: 9 },
        focusScene: {
          id: 'focus-bridal-clock',
          title: '置時計',
          description: '奥のキャビネットに、古い置時計が置かれている。',
        },
        message: ['奥のキャビネットに、古い置時計が置かれている。'],
      },
    ],
    exits: [{ to: 'entrance', label: 'エントランスへ戻る' }],
  },
  ceremony: {
    areaId: 'ceremony',
    name: '挙式会場',
    chapter: 'Ceremony',
    emptyBackground: 'ceremony',
    memoryBackground: 'ceremony-memory',
    unlockCondition: (state) => state.flags.ceremonyUnlocked === true,
    hotspots: [
      {
        id: 'virgin-road',
        label: 'バージンロード',
        position: { x: 39, y: 54, width: 23, height: 36 },
        message: ['祭壇へ向かって、まっすぐバージンロードが伸びている。'],
      },
      {
        id: 'hanging-lamps',
        label: '吊り下げランプ',
        position: { x: 6, y: 18, width: 88, height: 22 },
        message: ['天井から、形の異なる四つのランプが吊られている。どれも古いガラスで作られているようだ。'],
      },
      {
        id: 'altar',
        label: '祭壇',
        position: { x: 35, y: 43, width: 30, height: 18 },
        focusScene: {
          id: 'focus-altar',
          title: '祭壇',
          description: '形の異なる四本のキャンドルが、まだ火を待っている。',
        },
        message: ['祭壇の前だけ、空気が少し澄んでいる。'],
      },
      {
        id: 'photo-vows',
        label: '祭壇脇',
        position: { x: 67, y: 49, width: 12, height: 14 },
        visibilityCondition: (state) => !state.memories.vow?.unlocked,
        message: (state) =>
          state.puzzles.p02_ceremony?.status === 'solved'
            ? ['四本の灯に照らされて、祭壇脇の古い写真が見える。']
            : ['祭壇の脇に、何かが置かれている。', 'ここからでは暗くてよく見えない。'],
      },
      {
        id: 'ceremony-light',
        label: '淡い光',
        position: { x: 45, y: 45, width: 10, height: 9 },
        visibilityCondition: (state) => state.flags.ceremonyLightVisible === true && !state.inventory['small-key'].obtained && !state.flags.pianoSecretOpened,
        message: ['祭壇中央の白い台の上に、淡い光が落ちている。', '小さな鍵を手に入れた。'],
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
        id: 'seating-chart',
        label: '席次表',
        position: { x: 2, y: 40, width: 17, height: 22 },
        focusScene: {
          id: 'focus-seating-chart',
          title: '席次表',
          description: '四つのゲストテーブルと、それぞれの席に振られた数字が記されている。',
        },
        message: ['入口の近くに、披露宴の席次表が立てられている。'],
      },
      ...receptionTables.map((table): Area['hotspots'][number] => ({
        id: `reception-table-${table.id}`,
        label: `${table.name} テーブル`,
        position: table.position,
        focusScene: {
          id: `focus-reception-table-${table.id}`,
          title: `${table.name} テーブル`,
          description: `${table.decoration}が飾られたゲストテーブル。席ごとの小物を見比べられそうだ。`,
        },
        message: [`${table.motif}をモチーフにしたテーブル。ひとつずつ席を確かめられそうだ。`],
      })),
      {
        id: 'reception-box',
        label: 'ロック付きの箱',
        position: { x: 36, y: 42, width: 13, height: 15 },
        focusScene: {
          id: 'focus-reception-box',
          title: 'ロック付きの箱',
          description: '四つのモチーフが並んだ、小さなダイヤルロックの箱。',
        },
        message: (state) =>
          state.receptionTables.boxOpened || state.puzzles.p03_reception?.status === 'solved'
            ? ['小さな箱は、すでに開いている。']
            : ['小さな箱には、四桁のダイヤルロックが付いている。'],
      },
      {
        id: 'piano',
        label: 'ピアノ',
        position: { x: 38, y: 35, width: 29, height: 29 },
        focusScene: {
          id: 'focus-piano',
          title: 'ピアノ',
          description: '静かな披露宴会場に、古いピアノが置かれている。',
        },
        message: (state) => {
          if (state.flags.pianoSecretOpened) {
            return ['秘密の小箱はすでに開いている。']
          }
          if (state.flags.pianoMechanismUnlocked) {
            return ['ピアノの奥で、何かが外れたようだ。']
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
      ...gardenPuzzleObjects.map((object): Area['hotspots'][number] => ({
        id: `garden-object-${object.id}`,
        label: object.name,
        position: object.position,
        focusScene: {
          id: `focus-garden-object-${object.id}`,
          title: object.name,
          description: object.description,
        },
        message: (state) =>
          state.gardenFinal.switches[object.id]
            ? [object.description, '台座の小さな灯りが、静かについている。']
            : [object.description],
      })),
      {
        id: 'garden-gate',
        label: '出口へ続く門',
        position: { x: 45, y: 39, width: 11, height: 24 },
        focusScene: {
          id: 'focus-garden-gate',
          title: '出口へ続く門',
          description: '広場の奥に、黒い鉄の門がある。',
        },
        message: (state) =>
          state.worldMode === 'memory'
            ? ['記憶の光が、庭の向こうへ続いている。']
            : ['広場の門は、最後の確認を待っている。'],
      },
      {
        id: 'garden-book',
        label: '古い本',
        position: { x: 62, y: 70, width: 11, height: 9 },
        focusScene: {
          id: 'focus-garden-book',
          title: '古い本',
          description: '緑のベンチの上に、古い本が置かれている。',
        },
        message: ['緑のベンチの上に、古い本が置かれている。'],
      },
    ],
    exits: [
      { to: 'reception', label: '披露宴会場へ' },
      { to: 'entrance', label: 'エントランスへ' },
    ],
  },
}
