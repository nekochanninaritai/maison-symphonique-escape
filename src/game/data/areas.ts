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
        position: { x: 14, y: 29, width: 12, height: 41 },
        useTarget: 'grand-clock',
        focusScene: {
          id: 'focus-grand-clock',
          title: '古い大時計',
          description: 'Maison Symphoniqueの入口にある大時計。文字盤を見ると、長針も短針も失われている。',
        },
        message: (state) => {
          if (state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked && !state.memories.september23?.unlocked) {
            return trueClockMessages.clockHint
          }
          if (state.normalEndingCleared && state.clockState.handAttached && !state.trueRouteUnlocked) {
            return ['時計は止まっている。', '短針と長針に触れると、わずかに動いた。']
          }
          if (state.flags.invitationObtained && state.puzzles.p06_grand_clock?.status !== 'solved') {
            return ['時計は静かに止まっている。', '短針と長針に触れると、わずかに動いた。']
          }
          if (state.puzzles.p06_grand_clock?.status === 'solved') {
            return ['大時計は15:30を指している。']
          }
          if (state.clockState.handAttached) {
            return ['長針と短針は元の場所に戻っている。', 'しかし、時計は動かない。']
          }
          return ['時計は止まっている。', '文字盤を見ると、長針も短針も失われている。']
        },
      },
      {
        id: 'entrance-left-space',
        label: '左奥へ',
        position: { x: 0, y: 18, width: 12, height: 44 },
        message: ['左側に、奥へ続く空間がある。'],
      },
      {
        id: 'entrance-desk',
        label: '受付台',
        position: { x: 45, y: 60, width: 39, height: 25 },
        message: ['受付台には、芳名帳が置かれている。'],
        flagUpdate: { foundReceptionDesk: true },
        },
    {
        id: 'entrance-menu',
        label: 'メニュー表',
        position: { x: 65, y: 35, width: 25, height: 15 },
        message: [
            '',
            'ガトーショコラ　／　ブレンドコーヒー',
            'レモンケーキ　　／　紅茶(Hot)',
            '苺のショートケーキ　／　紅茶(Ice)',
            '',
            '― Tea & Dessert Selection ―',
            'テーブルに、小さなメニュー表が置かれている。セットメニューが記されているようだ。',
        ],
    },
      {
        id: 'entrance-kitchen',
        label: 'キッチン',
        position: { x: 30, y: 22, width: 35, height: 25 },
        message: ['グラスや食器がきれいに並んでいる。特に変わったものはなさそうだ。'],
      },
      {
        id: 'entrance-to-waiting',
        label: '待合室へ',
        position: { x: 77, y: 90, width: 22, height: 9 },
        message: ['待合室へ続いている。'],
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
        position: { x: 37, y: 40, width: 60, height: 18 },
            message: ['柔らかなソファ。特に変わったところはなさそうだ。'],
      },
      {
        id: 'tea-table',
        label: 'ティーテーブル',
        position: { x: 45, y: 58, width: 50, height: 26 },
        focusScene: {
          id: 'focus-tea-time',
          title: 'Puzzle 01「ティータイム」',
          description: '三人分のティーセットが並んでいる。どうやら、カップの位置が入れ替わっているようだ。',
        },
        message: (state: GameState) =>
          state.puzzles.p01_waiting_room?.status === 'solved'
                ? ['三つのティーセットは、静かに整っている。']
            : ['三人分のティーセットが並んでいる。', 'カップの位置が入れ替わっているようだ。'],
      },
      {
        id: 'framed-picture',
        label: '額装された未完成の絵',
        position: { x: 3, y: 7, width: 35, height: 20 },
        useTarget: 'framed-picture',
        focusScene: {
          id: 'focus-framed-picture',
          title: '額装された未完成の絵',
          description: '額に収められた古い絵。どこか未完成に見える。',
        },
        message: (state: GameState) =>
          state.pianoOverlay.overlayApplied || state.puzzles.p04_sheet_overlay?.status === 'solved'
            ? ['紙の模様が、絵の上にぴたりと重なっている。']
            : ['額に収められた古い絵。', 'どこか未完成に見える。'],
      },
      {
        id: 'ceremony-door',
        label: '挙式会場の扉',
        position: { x: 60, y: 6, width: 28, height: 28 },
        useTarget: 'ceremony-door',
        message: (state) =>
          state.flags.ceremonyUnlocked === true
            ? ['挙式会場へ続く扉が、少し開いている。']
            : state.inventory['ceremony-door-key']?.obtained
              ? ['挙式会場へ続く扉は閉ざされている。', '手元の鍵なら開けられそうだ。']
              : ['挙式会場へ続く扉は、まだ開きそうにない。'],
      },
      {
        id: 'waiting-room-to-entrance',
        label: 'エントランス',
        position: { x: 2, y: 91, width: 27, height: 8 },
        message: ['エントランスへ戻れる。'],
        },
      {
        id: 'waiting-room-to-ceremony',
        label: '挙式会場',
        position: { x: 69, y: 91, width: 27, height: 8 },
        visibilityCondition: (state) => state.flags.ceremonyUnlocked === true,
        message: ['挙式会場に進める。'],
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
        position: { x: 27, y: 24, width: 20, height: 9 },
        focusScene: {
          id: 'focus-bridal-clock',
          title: '置時計',
          description: '奥のキャビネットに、古い置時計が置かれている。',
        },
        message: ['奥のキャビネットに、古い置時計が置かれている。'],
      },
      {
        id: 'old-photo-frame',
        label: '写真立て',
        position: { x: 32, y: 35, width: 25, height: 25 },
        message: ['古びた写真だ。写真は色褪せていて、誰が写っているのかよく分からない。'],
      },
      {
        id: 'dressing-to-entrance',
        label: 'エントランス',
        position: { x: 69, y: 91, width: 30, height: 8 },
        message: ['エントランスへ戻れる。'],
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
        position: { x: 39, y: 58, width: 23, height: 36 },
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
        position: { x: 35, y: 40, width: 30, height: 18 },
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
      {
          id: 'ceremony-to-waiting-room',
        label: '待合室',
        position: { x: 2, y: 91, width: 27, height: 8 },
        message: ['待合室へ戻れる。'],
        },
        {
            id: 'ceremony-to-reception',
            label: '披露宴会場',
            position: { x: 69, y: 91, width: 27, height: 8 },
            visibilityCondition: (state) => state.flags.receptionUnlocked === true,
            message: ['披露宴会場に進める。'],
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
        id: 'reception-view-high-tables',
        label: '高砂',
        position: { x: 53, y: 40, width: 25, height: 10 },
        message: ['高砂周辺へ近づける。'],
      },
      {
        id: 'reception-view-tables-right',
        label: 'テーブル周辺右',
        position: { x: 78, y: 40, width: 20, height: 50 },
        message: ['テーブル周辺右へ近づける。'],
      },
      {
        id: 'reception-view-tables',
        label: 'テーブル周辺左',
        position: { x: 5, y: 50, width: 51, height: 30 },
        message: ['テーブル周辺へ近づける。'],
      },
      {
        id: 'reception-view-piano-area',
        label: 'ピアノのある方',
        position: { x: 5, y: 30, width: 28, height: 20 },
        message: ['ピアノのある方へ近づける。'],
      },
      {
        id: 'seating-chart',
        label: '席次表',
        position: { x: 57, y: 55, width: 20, height: 33 },
        focusScene: {
          id: 'focus-seating-chart',
            title: '席次表',

          description: '四つの長テーブルの席次と、各イニシャルに対応する数字が記されている。',
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
          description: `${table.decoration}が飾られた長テーブル。席札を席次表と見比べられそうだ。`,
        },
        message: [`${table.motif}をモチーフにした長テーブル。席札を確かめられそうだ。`],
      })),
      {
        id: 'reception-box',
        label: 'ロック付きの箱',
        position: { x: 35, y: 57, width: 30, height: 15 },
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
        position: { x: 20, y: 35, width: 40, height: 29 },
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
      {
        id: 'reception-to-ceremony',
        label: '挙式会場',
        position: { x: 2, y: 91, width: 28, height: 8 },
        message: ['挙式会場へ戻れる。'],
      },
      {
        id: 'reception-to-garden',
        label: '広場',
        position: { x: 69, y: 91, width: 27, height: 8 },
        visibilityCondition: (state) => state.flags.gardenUnlocked === true || state.worldMode === 'memory',
        message: ['広場に進める。'],
      },
    ],
    exits: [
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
        position: { x: 45, y: 44, width: 11, height: 24 },
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
        position: { x: 65, y: 70, width: 11, height: 9 },
        focusScene: {
          id: 'focus-garden-book',
          title: '古い本',
          description: '緑のベンチの上に、古い本が置かれている。',
        },
          message: ['何気ない一日の記憶を、そっと閉じ込めた本のようだ。'],
      },
      {
        id: 'garden-true-light',
        label: '淡い光',
        position: { x: 43, y: 60, width: 16, height: 10 },
        visibilityCondition: (state) =>
          state.normalEndingCleared === true &&
          state.inventory.letter?.obtained === true &&
          state.inventory.letter?.consumed !== true &&
          state.flags.trueGardenMusicHeard === true &&
          state.trueEndingCleared !== true,
        message: ['石畳の中央が、淡く光っている。'],
      },
      {
        id: 'garden-to-reception',
        label: '披露宴会場へ',
        position: { x: 2, y: 91, width: 28, height: 8 },
        message: ['披露宴会場へ戻れる。'],
      },
      {
        id: 'garden-to-entrance',
        label: 'エントランスへ',
        position: { x: 69, y: 91, width: 27, height: 8 },
        message: ['エントランスへ戻れる。'],
      },
    ],
    exits: [
      { to: 'reception', label: '披露宴会場へ' },
      { to: 'entrance', label: 'エントランスへ' },
    ],
  },
}
