import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import './App.css'
import { areas } from './game/data/areas'
import { altarCandleDisplaySequence, ceremonyCandles, correctCandleSequence, solvedCandleLightSequence } from './game/data/ceremonyCandles'
import { coupleDisplayName, normalEndingText, trueEndingText, weddingDateDisplay } from './game/data/endingText'
import { getDerivedPianoSequence, getPhraseLength, getPlayablePianoKeys, pianoOverlayPuzzleData, pianoReferenceMark } from './game/data/pianoOverlayPuzzle'
import { allMemoryPhotos, gardenPuzzleObjects, getGardenPuzzleObject, getMemoryPhotoByMemoryId, getP07CorrectSequence, memoryPhotos, trueMemoryPhoto } from './game/data/memoryPhotos'
import { getReceptionLockCode, getReceptionLockDigits, getReceptionTable, receptionLockTables } from './game/data/receptionTables'
import { getTeaDrink, teaTimePairs } from './game/data/teaTime'
import { trueClockTarget } from './game/data/trueRoute'
import { p06TargetTime } from './game/data/weddingSchedule'
import { gameConfig, DEBUG_MODE } from './game/config'
import { clearSave, loadGame, saveGame } from './game/save'
import { audioManager } from './game/audio'
import { hourHandAngleFromTime, minuteHandAngleFromTime, timeFromClockHandPoint } from './game/clock'
import { canManuallyControlGrandClock, getAltarPhotoState, getMemoryCount, getPuzzleDependencyChecklist, getTeaDrawerState, getVisibleHotspots, reducer, shouldShowCeremonyNavCue } from './game/logic'
import type { AreaId, GameAction, GameState, Hotspot, Item, Puzzle } from './game/types'
import type { ClockHandKind } from './game/clock'
import oldInvitationScheduleImage from './assets/environments/invitation-01-schedule.jpg'
import p03ReceptionSeatingChartImage from './assets/environments/p03-reception-seating-chart.jpg'
import p03ReceptionTableMimosaImage from './assets/environments/p03-reception-table-Mimosa.jpg'
import p03ReceptionTableOliveImage from './assets/environments/p03-reception-table-Olive.jpg'
import p03ReceptionTableRoseImage from './assets/environments/p03-reception-table-Rose.jpg'
import p03ReceptionTableLilyImage from './assets/environments/p03-reception-table-lily.jpg'
import p04OverlayBaseImage from './assets/environments/p04-overlay-base.jpg'
import p04OverlayCompletedImage from './assets/environments/p04-overlay-completed.jpg'
import drawerClosedImage from './assets/environments/drawer-closed.jpg'
import drawerOpenImage from './assets/environments/drawer-open.jpg'
import photoAImage from './assets/environments/photoA.jpg'
import photoBImage from './assets/environments/photoB.jpg'
import photoCImage from './assets/environments/photoC.jpg'
import photoDImage from './assets/environments/photoD.jpg'
import coffeeImage from './assets/environments/Puzzle 01/Coffee.jpg'
import gateauChocolatImage from './assets/environments/Puzzle 01/GateauChocolat.jpg'
import hotTeeImage from './assets/environments/Puzzle 01/HotTee.jpg'
import iceTeeImage from './assets/environments/Puzzle 01/IceTee.jpg'
import mangoCakeImage from './assets/environments/Puzzle 01/MangoCake.jpg'
import shortCakeImage from './assets/environments/Puzzle 01/ShortCake.jpg'
import doorKeyItemImage from './assets/environments/item/door-key.png'
import itemPhotoAImage from './assets/environments/item/item-photoA.jpg'
import itemPhotoBImage from './assets/environments/item/item-photoB.jpg'
import itemPhotoCImage from './assets/environments/item/item-photoC.jpg'
import itemPhotoDImage from './assets/environments/item/item-photoD.jpg'
import minuteHandItemImage from './assets/environments/item/minute-hand.png'

const dispatchAndSave = (dispatch: React.Dispatch<GameAction>, action: GameAction) => dispatch(action)
const focusOnlyPuzzleIds = new Set(['p01_waiting_room', 'p02_ceremony', 'p03_reception', 'p04_sheet_overlay', 'p05_piano', 'p06_grand_clock', 'p07_garden_final'])
const puzzleOrder = ['p01_waiting_room', 'p02_ceremony', 'p03_reception', 'p04_sheet_overlay', 'p05_piano', 'p06_grand_clock', 'p07_garden_final']
type AudioSettings = {
  bgmEnabled: boolean
  seEnabled: boolean
  bgmVolume: number
  seVolume: number
}
type GuestListState = {
  status: 'idle' | 'loading' | 'loaded' | 'error'
  names: string[]
}
type ReceptionView = 'main' | 'tables' | 'tables-right' | 'high-tables' | 'piano-area'
const stageMoveTargets: Partial<Record<string, AreaId>> = {
  'entrance-to-waiting': 'waiting-room',
  'entrance-left-space': 'dressing-room',
  'waiting-room-to-entrance': 'entrance',
  'waiting-room-to-ceremony': 'ceremony',
  'dressing-to-entrance': 'entrance',
  'ceremony-to-waiting-room': 'waiting-room',
  'ceremony-to-reception': 'reception',
  'reception-to-ceremony': 'ceremony',
  'reception-to-garden': 'garden',
  'garden-to-reception': 'reception',
  'garden-to-entrance': 'entrance',
}
const receptionViewTargets: Partial<Record<string, ReceptionView>> = {
  'reception-view-tables': 'tables',
  'reception-view-tables-right': 'tables-right',
  'reception-view-high-tables': 'high-tables',
  'reception-view-piano-area': 'piano-area',
}

const isReceptionTableViewHotspot = (hotspot: Hotspot) =>
  hotspot.id.startsWith('reception-table-') && hotspot.id !== 'reception-table-mimosa'
const isReceptionTableRightViewHotspot = (hotspot: Hotspot) =>
  hotspot.id === 'reception-table-mimosa'
const isReceptionHighTablesViewHotspot = (hotspot: Hotspot) =>
  hotspot.id === 'reception-box'
const isStageMoveHotspot = (hotspot: Hotspot) => Boolean(stageMoveTargets[hotspot.id])
const receptionTableImages: Record<string, string> = {
  rose: p03ReceptionTableRoseImage,
  lily: p03ReceptionTableLilyImage,
  olive: p03ReceptionTableOliveImage,
  mimosa: p03ReceptionTableMimosaImage,
}
const memoryPhotoImages: Record<string, string> = {
  tea: photoAImage,
  vow: photoBImage,
  banquet: photoCImage,
  melody: photoDImage,
}
const teaSweetImages: Record<string, string> = {
  'gateau-chocolat': gateauChocolatImage,
  shortcake: shortCakeImage,
  'mango-cake': mangoCakeImage,
}
const teaDrinkImages: Record<string, string> = {
  coffee: coffeeImage,
  'hot-tee': hotTeeImage,
  'ice-tee': iceTeeImage,
}
const itemImages: Record<string, string> = {
  'clock-hand': minuteHandItemImage,
  'ceremony-door-key': doorKeyItemImage,
  'small-key': doorKeyItemImage,
  'transparent-card': p04OverlayBaseImage,
  'old-invitation': oldInvitationScheduleImage,
}
const itemFocusImages: Record<string, string> = {
  'clock-hand': minuteHandItemImage,
  'ceremony-door-key': doorKeyItemImage,
  'small-key': doorKeyItemImage,
  'transparent-card': p04OverlayBaseImage,
}
const memoryThumbnailImages: Record<string, string> = {
  tea: itemPhotoAImage,
  vow: itemPhotoBImage,
  banquet: itemPhotoCImage,
  melody: itemPhotoDImage,
}
const receptionLockDialColors = ['#eeb3ad', '#cde2ec', '#a9c49a', '#f2d77d']
const guestDatabaseUrl = 'https://wedding-web-baddb-default-rtdb.firebaseio.com/butterflyMiracleRecords.json'
const puzzleHints: Record<string, { title: string; hints: string[] }> = {
  p01_waiting_room: {
    title: 'ティータイム',
    hints: ['お皿とカップの組み合わせを、名前と画像の手がかりで見直す。', 'GateauChocolatにはCoffee、ShortCakeにはHotTee、MangoCakeにはIceTeeを合わせる。'],
  },
  p02_ceremony: {
    title: '誓いの灯',
    hints: ['挙式会場で見た形の順番を、祭壇のキャンドルに対応させる。', '入力は4つすべて灯してから判定される。形の順番を最後まで並べてみる。'],
  },
  p03_reception: {
    title: '席次表の違和感',
    hints: ['席次表と各テーブルの席札を見比べ、違うイニシャルを探す。', '色の順番はピンク、水色、緑、黄色。導いた番号をロック付きの箱へ直接入力する。'],
  },
  p04_sheet_overlay: {
    title: '未完成の絵',
    hints: ['披露宴会場で手に入れた半透明の紙を、待合室の未完成の絵に重ねる。', '絵に浮かぶ記号の並びが、次のピアノの手がかりになる。'],
  },
  p05_piano: {
    title: 'ピアノ演奏',
    hints: ['未完成の絵に重ねた紙の記号を、ピアノの鍵盤に対応させる。', '鍵盤の印と記号の並びを見て、音を順番に鳴らす。'],
  },
  p06_grand_clock: {
    title: '古い招待状と大時計',
    hints: ['古い招待状に書かれた予定と、時計を動かせる状態になった大時計を照合する。', `大時計を${p06TargetTime}に合わせる。`],
  },
  p07_garden_final: {
    title: '庭の灯り',
    hints: ['見つけた古い写真に写る時計の時刻を、小さい順に並べる。', '写真の時刻順に、庭の装飾のスイッチを4つすべて入れる。'],
  },
}
const audioSettingsKey = `${gameConfig.saveKey}-audio-settings`
const defaultAudioSettings: AudioSettings = {
  bgmEnabled: true,
  seEnabled: true,
  bgmVolume: 0.72,
  seVolume: 0.68,
}

const readAudioSettings = (): AudioSettings => {
  if (typeof localStorage === 'undefined') return defaultAudioSettings
  try {
    const raw = localStorage.getItem(audioSettingsKey)
    if (!raw) return defaultAudioSettings
    const parsed = JSON.parse(raw) as Partial<AudioSettings>
    return {
      bgmEnabled: parsed.bgmEnabled ?? defaultAudioSettings.bgmEnabled,
      seEnabled: parsed.seEnabled ?? defaultAudioSettings.seEnabled,
      bgmVolume: typeof parsed.bgmVolume === 'number' ? parsed.bgmVolume : defaultAudioSettings.bgmVolume,
      seVolume: typeof parsed.seVolume === 'number' ? parsed.seVolume : defaultAudioSettings.seVolume,
    }
  } catch {
    return defaultAudioSettings
  }
}

const collectNicknames = (value: unknown): string[] => {
  const names = new Set<string>()
  const nicknameKeys = new Set(['nickname', 'nickName', 'nick_name', 'displayName', 'display_name', 'name', '名前', 'ニックネーム'])
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    Object.entries(node as Record<string, unknown>).forEach(([key, child]) => {
      if (typeof child === 'string' && nicknameKeys.has(key)) {
        const name = child.trim()
        if (name) names.add(name)
        return
      }
      walk(child)
    })
  }
  walk(value)
  return [...names].sort((a, b) => a.localeCompare(b, 'ja'))
}

const getActiveHint = (state: GameState) => {
  const availablePuzzleId = puzzleOrder.find((puzzleId) => state.puzzles[puzzleId]?.status === 'available')
  const nextPuzzleId = puzzleOrder.find((puzzleId) => state.puzzles[puzzleId]?.status !== 'solved')
  const puzzleId = availablePuzzleId ?? nextPuzzleId ?? puzzleOrder[puzzleOrder.length - 1]
  return puzzleHints[puzzleId]
}

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadGame)
  const [debugOpen, setDebugOpen] = useState(false)
  const [showHotspots, setShowHotspots] = useState(false)
  const [activeFocus, setActiveFocus] = useState<string | null>(null)
  const [activeItemFocus, setActiveItemFocus] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [guestListOpen, setGuestListOpen] = useState(false)
  const [guestList, setGuestList] = useState<GuestListState>({ status: 'idle', names: [] })
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(readAudioSettings)

  useEffect(() => {
    saveGame(state)
  }, [state])

  useEffect(() => {
    audioManager.setSettings(audioSettings)
    try {
      localStorage.setItem(audioSettingsKey, JSON.stringify(audioSettings))
    } catch {
      // Audio settings are optional; game save remains independent.
    }
  }, [audioSettings])

  const currentArea = areas[state.currentArea]
  const visibleHotspots = useMemo(() => getVisibleHotspots(state), [state])
  const activeHint = useMemo(() => getActiveHint(state), [state])
  const send = (action: GameAction) => dispatchAndSave(dispatch, action)

  const resetWithConfirm = () => {
    if (confirm('保存データを消して、最初から遊びますか？')) {
      clearSave()
      setActiveFocus(null)
      setActiveItemFocus(null)
      setMenuOpen(false)
      send({ type: 'RESET_ALL' })
    }
  }

  const backToTitle = () => {
    setActiveFocus(null)
    setActiveItemFocus(null)
    setMenuOpen(false)
    setHintOpen(false)
    send({ type: 'SHOW_TITLE' })
  }

  const openHint = () => {
    setHintLevel(0)
    setHintOpen(true)
  }

  const openGuestList = useCallback(() => {
    setGuestListOpen(true)
    setGuestList({ status: 'loading', names: [] })
    fetch(guestDatabaseUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Firebase response ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((data) => setGuestList({ status: 'loaded', names: collectNicknames(data) }))
      .catch(() => setGuestList({ status: 'error', names: [] }))
  }, [])

  return (
    <main className="appShell">
      {state.screen === 'title' && (
        <TitleScreen state={state} onStart={() => send({ type: 'START_PROLOGUE' })} onContinue={() => send({ type: 'START_GAME' })} onReset={resetWithConfirm} />
      )}
      {state.screen === 'prologue' && <Prologue onContinue={() => send({ type: 'START_GAME' })} />}
      {state.screen === 'game' && (
        <GameScreen
          state={state}
          currentArea={currentArea}
          visibleHotspots={visibleHotspots}
          activeFocus={activeFocus}
          activeItemFocus={activeItemFocus}
          showHotspots={DEBUG_MODE && showHotspots}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenHint={openHint}
          onOpenGuestList={openGuestList}
          onFocus={setActiveFocus}
          onItemFocus={setActiveItemFocus}
          onAction={send}
        />
      )}
      {state.screen === 'normalEnd' && <NormalEnd state={state} onContinue={() => send({ type: 'START_GAME' })} onTitle={() => send({ type: 'SHOW_TITLE' })} />}
      {state.screen === 'photoE' && <PhotoEReveal state={state} onContinue={() => send({ type: 'GO_TRUE_END' })} />}
      {state.screen === 'trueEnd' && <TrueEnd state={state} onTitle={() => send({ type: 'SHOW_TITLE' })} />}
      {menuOpen && (
        <SettingsMenu
          settings={audioSettings}
          onChange={setAudioSettings}
          onClose={() => setMenuOpen(false)}
          onTitle={backToTitle}
          onReset={resetWithConfirm}
        />
      )}
      {hintOpen && (
        <HintMenu
          hint={activeHint}
          level={hintLevel}
          onReveal={() => setHintLevel((value) => Math.min(value + 1, activeHint.hints.length))}
          onClose={() => setHintOpen(false)}
        />
      )}
      {guestListOpen && (
        <GuestListMenu guestList={guestList} onClose={() => setGuestListOpen(false)} />
      )}
      {DEBUG_MODE && (
        <>
        <button className="debugButton" type="button" onClick={() => setDebugOpen((value) => !value)}>
            DEBUG
          </button>
          {debugOpen && <DebugPanel state={state} showHotspots={showHotspots} onToggleHotspots={() => setShowHotspots((value) => !value)} onAction={send} />}
        </>
      )}
    </main>
  )
}

function SettingsMenu({
  settings,
  onChange,
  onClose,
  onTitle,
  onReset,
}: {
  settings: AudioSettings
  onChange: (settings: AudioSettings) => void
  onClose: () => void
  onTitle: () => void
  onReset: () => void
}) {
  const update = (patch: Partial<AudioSettings>) => onChange({ ...settings, ...patch })

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="settingsModal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settingsHeader">
          <h2 id="settings-title">設定</h2>
          <button type="button" className="settingsClose" aria-label="設定を閉じる" onClick={onClose}>x</button>
        </div>
        <label className="settingsCheck">
          <input type="checkbox" checked={settings.bgmEnabled} onChange={(event) => update({ bgmEnabled: event.currentTarget.checked })} />
          <span>BGM</span>
        </label>
        <label className="settingsCheck">
          <input type="checkbox" checked={settings.seEnabled} onChange={(event) => update({ seEnabled: event.currentTarget.checked })} />
          <span>SE</span>
        </label>
        <label className="settingsSlider">
          <span>BGM音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.bgmVolume}
            onChange={(event) => update({ bgmVolume: Number(event.currentTarget.value) })}
          />
        </label>
        <label className="settingsSlider">
          <span>SE音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.seVolume}
            onChange={(event) => update({ seVolume: Number(event.currentTarget.value) })}
          />
        </label>
        <div className="settingsActions">
          <button type="button" onClick={onTitle}>タイトルへ戻る</button>
          <button type="button" onClick={onClose}>ゲームへ戻る</button>
          <button type="button" onClick={onReset}>セーブリセット</button>
        </div>
      </section>
    </div>
  )
}

function HintMenu({
  hint,
  level,
  onReveal,
  onClose,
}: {
  hint: { title: string; hints: string[] }
  level: number
  onReveal: () => void
  onClose: () => void
}) {
  const nextHintNumber = level + 1
  const canRevealMore = level < hint.hints.length

  return (
    <div className="settingsOverlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section className="settingsModal hintModal" role="dialog" aria-modal="true" aria-labelledby="hint-title">
        <div className="settingsHeader">
          <h2 id="hint-title">ヒント</h2>
          <button type="button" className="settingsClose" aria-label="ヒントを閉じる" onClick={onClose}>x</button>
        </div>
        <h3 className="hintPuzzleTitle">{hint.title}</h3>
        {level > 0 && (
          <div className="hintText">
            {hint.hints.slice(0, level).map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>
        )}
        {canRevealMore && (
          <button type="button" className="hintRevealButton" onClick={onReveal}>
            ヒント{nextHintNumber}を見る
          </button>
        )}
      </section>
    </div>
  )
}

function GuestListMenu({ guestList, onClose }: { guestList: GuestListState; onClose: () => void }) {
  return (
    <div className="focusScene focus-guest-list" role="dialog" aria-modal="true" aria-labelledby="guest-list-title">
      <section className="guestListPaper">
        <p className="eyebrow">Reception Book</p>
        <h3 id="guest-list-title">祝福の署名</h3>
        <p className="guestListDescription">受付台に置かれた芳名帳だ。ここを訪れた人たちのニックネームが、古い紙に並んでいる。</p>
        <div className="guestSignaturePaper">
          {guestList.status === 'loading' && <p className="guestListStatus">芳名帳を確認している。</p>}
          {guestList.status === 'error' && <p className="guestListStatus">署名を読み込めませんでした。</p>}
          {guestList.status === 'loaded' && guestList.names.length === 0 && <p className="guestListStatus">署名はまだありません。</p>}
          {guestList.status === 'loaded' && guestList.names.length > 0 && (
            <div className="guestSignatureBlock">
              <ul className="guestNicknameList">
                {guestList.names.map((name) => <li key={name}>{name}</li>)}
              </ul>
              <div className="guestBlankLines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={onClose}>閉じる</button>
      </section>
    </div>
  )
}

function TitleScreen({ state, onStart, onContinue, onReset }: { state: GameState; onStart: () => void; onContinue: () => void; onReset: () => void }) {
  return (
    <section className="titleScreen">
      <div className="titleBackdrop" aria-hidden="true" />
      <div className="titleContent">
        <p className="eyebrow">Wedding Escape Extra Content</p>
        <h1>{gameConfig.title}</h1>
        <p className="lead">誰もいない結婚式場を探索し、止まってしまった9月23日の時間を進める。</p>
        <div className="titleStats" aria-label="Memory progress">
          <MemoryMeter state={state} />
          {state.normalEndingCleared && <span>まだ何か残っている。</span>}
        </div>
        <div className="buttonRow">
          <button type="button" onClick={onStart}>はじめる</button>
          <button type="button" className="secondary" onClick={onContinue}>Continue</button>
          <button type="button" className="ghost" onClick={onReset}>最初から遊ぶ</button>
        </div>
      </div>
    </section>
  )
}

function Prologue({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="readingScreen">
      <p className="eyebrow">PROLOGUE</p>
      <h2>閉宴後のMaison Symphonique</h2>
      <p>結婚式は終わったはずだった。けれど、気づけば会場には誰もいない。</p>
      <p>エントランスの大時計は、9月23日のどこかで止まっている。</p>
      <p>失われた記憶をたどり、止まった時間を進めよう。</p>
      <button type="button" onClick={onContinue}>エントランスへ</button>
    </section>
  )
}

function GameScreen({
  state,
  currentArea,
  visibleHotspots,
  activeFocus,
  activeItemFocus,
  showHotspots,
  onOpenMenu,
  onOpenHint,
  onOpenGuestList,
  onFocus,
  onItemFocus,
  onAction,
}: {
  state: GameState
  currentArea: (typeof areas)[AreaId]
  visibleHotspots: Hotspot[]
  activeFocus: string | null
  activeItemFocus: string | null
  showHotspots: boolean
  onOpenMenu: () => void
  onOpenHint: () => void
  onOpenGuestList: () => void
  onFocus: (focusId: string | null) => void
  onItemFocus: (itemId: string | null) => void
  onAction: (action: GameAction) => void
}) {
  const [receptionView, setReceptionView] = useState<ReceptionView>('main')
  const isReception = currentArea.areaId === 'reception'
  const focusHotspot = visibleHotspots.find((hotspot) => hotspot.focusScene?.id === activeFocus)
  const background = state.worldMode === 'memory' ? currentArea.memoryBackground : currentArea.emptyBackground
  const selectedItem = state.selectedItemId ? state.inventory[state.selectedItemId] : null
  const displayedHotspots = useMemo(() => {
    if (!isReception) return visibleHotspots
    if (receptionView === 'main') return visibleHotspots.filter((hotspot) => hotspot.id === 'seating-chart' || isStageMoveHotspot(hotspot) || Boolean(receptionViewTargets[hotspot.id]))
    if (receptionView === 'tables') return visibleHotspots.filter(isReceptionTableViewHotspot)
    if (receptionView === 'tables-right') return visibleHotspots.filter(isReceptionTableRightViewHotspot)
    if (receptionView === 'high-tables') return visibleHotspots.filter(isReceptionHighTablesViewHotspot)
    if (receptionView === 'piano-area') return visibleHotspots.filter((hotspot) => hotspot.id === 'piano')
    return []
  }, [isReception, receptionView, visibleHotspots])
  const navigationHotspots = useMemo(
    () => displayedHotspots.filter(isStageMoveHotspot).sort((a, b) => a.position.x - b.position.x),
    [displayedHotspots],
  )
  const stageHotspots = useMemo(
    () => displayedHotspots.filter((hotspot) => !isStageMoveHotspot(hotspot)),
    [displayedHotspots],
  )
  const receptionViewLabel =
    receptionView === 'tables'
      ? 'テーブル周辺'
      : receptionView === 'tables-right'
        ? 'テーブル周辺右'
        : receptionView === 'high-tables'
          ? '高砂'
          : receptionView === 'piano-area'
            ? 'ピアノのある方'
            : '披露宴会場'
  const isReceptionPianoFocus = isReception && receptionView === 'piano-area' && activeFocus === 'focus-piano'

  useEffect(() => {
    if (!isReception && receptionView !== 'main') {
      setReceptionView('main')
      onFocus(null)
    }
  }, [isReception, onFocus, receptionView])

  const changeReceptionView = (view: ReceptionView) => {
    onAction({ type: 'CLEAR_MESSAGES' })
    onFocus(null)
    setReceptionView(view)
  }

  return (
    <section className="gameScreen">
      <header className="topBar">
        <button type="button" className="menuButton" aria-label="メニュー" onClick={onOpenMenu}>
          <span aria-hidden="true">☰</span>
          <small>MENU</small>
        </button>
        <div className="roomTitle">
          <p className="eyebrow">Escape Atelier</p>
          <h2>#001 {currentArea.name}</h2>
          <span>{currentArea.chapter}</span>
        </div>
        <div className="hud">
          <MemoryMeter state={state} />
          <ClockWidget state={state} />
          <button type="button" className="hintButton" onClick={onOpenHint}>ヒント</button>
        </div>
      </header>

      <div className="stagePanel">
        <div
          className={`stage ${state.worldMode} scene-${background} ${isReception ? `receptionView-${receptionView}` : ''}`}
          aria-label={isReception ? `${currentArea.name} ${receptionViewLabel}` : `${currentArea.name} ${background}`}
        >
          <div className="stageVignette" aria-hidden="true" />
          {currentArea.areaId === 'garden' && <GardenStageLayer state={state} />}
          {isReception && receptionView !== 'main' && (
            <button
              type="button"
              className="receptionBackButton"
              onClick={() => changeReceptionView('main')}
            >
              披露宴会場へ戻る
            </button>
          )}
          {stageHotspots.map((hotspot) => (
            <button
              key={hotspot.id}
              type="button"
              className={`hotspot hotspot-${hotspot.id} ${showHotspots ? 'visible' : ''}`}
              style={{
                left: `${hotspot.position.x}%`,
                top: `${hotspot.position.y}%`,
                width: `${hotspot.position.width}%`,
                height: `${hotspot.position.height}%`,
              }}
              aria-label={hotspot.label}
              onClick={() => {
                const nextReceptionView = receptionViewTargets[hotspot.id]
                if (isReception && nextReceptionView) {
                  changeReceptionView(nextReceptionView)
                  return
                }
                if (isReception && receptionView === 'piano-area' && hotspot.id === 'piano') {
                  onAction({ type: 'EXAMINE', hotspotId: hotspot.id })
                  if (hotspot.focusScene) onFocus(hotspot.focusScene.id)
                  return
                }
                if (hotspot.id === 'entrance-desk') {
                  onAction({ type: 'EXAMINE', hotspotId: hotspot.id })
                  onOpenGuestList()
                  return
                }
                if (selectedItem && hotspot.useTarget && selectedItem.usableTargets.includes(hotspot.useTarget)) {
                  onAction({ type: 'USE_SELECTED_ITEM', targetId: hotspot.useTarget })
                  if (hotspot.focusScene) onFocus(hotspot.focusScene.id)
                  return
                }
                onAction({ type: 'EXAMINE', hotspotId: hotspot.id })
                if (hotspot.focusScene) onFocus(hotspot.focusScene.id)
              }}
            >
              {showHotspots && hotspot.label}
            </button>
          ))}
        </div>

        {navigationHotspots.length > 0 && (
        <nav className="areaNav" aria-label="Area exits">
          {navigationHotspots.map((hotspot) => {
            const moveTarget = stageMoveTargets[hotspot.id]
            const ceremonyCue = moveTarget === 'ceremony' && shouldShowCeremonyNavCue(state)
            return (
              <button
                key={hotspot.id}
                type="button"
                className={ceremonyCue ? 'ceremonyCue' : undefined}
                style={{
                  left: `${hotspot.position.x}%`,
                  width: `${hotspot.position.width}%`,
                }}
                onClick={() => {
                  onFocus(null)
                  if (moveTarget) onAction({ type: 'MOVE', areaId: moveTarget })
                }}
              >
                {hotspot.label}
              </button>
            )
          })}
        </nav>
        )}
      </div>

      {isReceptionPianoFocus && (
        <div className="pianoPuzzleOverlay" role="dialog" aria-modal="true">
          <div>
            <PianoFocus state={state} onAction={onAction} startOpen />
            {state.messageQueue.length > 0 && (
              <div className="focusMessage" aria-live="polite">
                {state.messageQueue.map((message, index) => <p key={index}>{message}</p>)}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onAction({ type: 'CLEAR_MESSAGES' })
                onFocus(null)
              }}
            >
              ピアノへ戻る
            </button>
          </div>
        </div>
      )}

      {focusHotspot?.focusScene && !(isReceptionPianoFocus && activeFocus === 'focus-piano') && (
        <div className={`focusScene focus-${focusHotspot.id}`} role="dialog" aria-modal="true">
          <div>
            <p className="eyebrow">Focus Scene</p>
            <h3>{focusHotspot.focusScene.title}</h3>
            <p>{focusHotspot.focusScene.description}</p>
            {focusHotspot.id === 'tea-table' && <TeaTimeFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'clock-hand-case' && <BridalClockFocus state={state} onAction={onAction} showHotspots={showHotspots} />}
            {focusHotspot.id === 'altar' && <CandleFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'seating-chart' && <SeatingChartFocus />}
            {focusHotspot.id.startsWith('reception-table-') && <ReceptionTableFocus tableId={focusHotspot.id.replace('reception-table-', '')} />}
            {focusHotspot.id === 'reception-box' && <ReceptionBoxFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'framed-picture' && <FramedPictureFocus state={state} />}
            {focusHotspot.id === 'grand-clock' && <GrandClockFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'piano' && <PianoFocus state={state} onAction={onAction} />}
            {focusHotspot.id.startsWith('garden-object-') && <GardenObjectFocus state={state} objectId={focusHotspot.id.replace('garden-object-', '')} onAction={onAction} />}
            {focusHotspot.id === 'garden-gate' && <GardenGateFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'garden-book' && <GardenBookFocus />}
            {state.messageQueue.length > 0 && (
              <div className="focusMessage" aria-live="polite">
                {state.messageQueue.map((message, index) => <p key={index}>{message}</p>)}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onAction({ type: 'CLEAR_MESSAGES' })
                onFocus(null)
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {activeItemFocus?.startsWith('item:') && (
        <div className="focusScene" role="dialog" aria-modal="true">
          <div>
            <p className="eyebrow">Item Focus</p>
            <ItemFocus
              item={state.inventory[activeItemFocus.replace('item:', '')]}
              selected={state.selectedItemId === activeItemFocus.replace('item:', '')}
              onAction={onAction}
            />
            <button type="button" onClick={() => onItemFocus(null)}>閉じる</button>
          </div>
        </div>
      )}

      {activeItemFocus?.startsWith('memory:') && (
        <div className="focusScene" role="dialog" aria-modal="true">
          <div>
            <p className="eyebrow">Old Photograph</p>
            <PhotoFocus memoryId={activeItemFocus.replace('memory:', '')} />
            <button type="button" onClick={() => onItemFocus(null)}>閉じる</button>
          </div>
        </div>
      )}

      <section className="bottomConsole" aria-label="探索情報">
        <Inventory state={state} onInspectItem={onItemFocus} />
        <MessageWindow state={state} onClear={() => onAction({ type: 'CLEAR_MESSAGES' })} />
        <MemoryGallery state={state} onInspectMemory={(memoryId) => onItemFocus(`memory:${memoryId}`)} />
      </section>

      {DEBUG_MODE && (
        <section className="placeholderPuzzles">
          <h3>Placeholder Puzzle</h3>
          {Object.values(state.puzzles)
            .filter((puzzle) => puzzle.areaId === state.currentArea && !focusOnlyPuzzleIds.has(puzzle.puzzleId))
            .map((puzzle) => (
              <PuzzleRow key={puzzle.puzzleId} state={state} puzzle={puzzle} onSolve={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: puzzle.puzzleId })} />
            ))}
          {state.worldMode === 'memory' && state.currentArea === 'garden' && (
            <button type="button" onClick={() => onAction({ type: 'GO_TRUE_END' })}>TRUE ENDへ</button>
          )}
        </section>
      )}
    </section>
  )
}

function GardenStageLayer({ state }: { state: GameState }) {
  return (
    <div className="gardenStageLayer" aria-hidden="true">
      {gardenPuzzleObjects.map((object) => (
        <span
          key={object.id}
          className={`gardenStageObject ${object.id} ${state.gardenFinal.switches[object.id] ? 'active' : ''}`}
          style={{
            left: `${object.position.x}%`,
            top: `${object.position.y}%`,
            width: `${object.position.width}%`,
            height: `${object.position.height}%`,
          }}
        />
      ))}
    </div>
  )
}

type TeaDragState = {
  cupId: string
  pointerId: number
  x: number
  y: number
}

function TeaTimeFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const [dragging, setDragging] = useState<TeaDragState | null>(null)
  const puzzle = state.puzzles.p01_waiting_room
  const solved = puzzle?.status === 'solved'
  const drawerState = getTeaDrawerState(state)
  const drawerImage = drawerState === 'locked' ? drawerClosedImage : drawerOpenImage

  const finishDrag = (clientX: number, clientY: number) => {
    if (!dragging) return
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-sweet-id]')
    const targetSweetId = target?.dataset.sweetId
    if (targetSweetId) {
      onAction({ type: 'MOVE_TEA_CUP', cupId: dragging.cupId, targetSweetId })
    }
    setDragging(null)
  }

  return (
    <div className={`teaTimePuzzle ${dragging ? 'dragging' : ''}`}>
      <div className="teaTimeHeader">
        <span>{solved ? 'solved' : 'available'}</span>
        <p>カップを別のお皿へ動かすと、位置が入れ替わります。</p>
      </div>
      <div className="teaTableGrid" aria-label="ティータイムの組み合わせ">
        {teaTimePairs.map((pair) => {
          const drink = getTeaDrink(state.teaTime.cupSlots[pair.sweetId])
          return (
            <div key={pair.sweetId} className={`teaSlot teaPair-${pair.id}`} data-sweet-id={pair.sweetId}>
              <div className={`sweetPlate sweet-${pair.sweetId}`} title={pair.sweetName}>
                <img className="teaItemImage sweetImage" src={teaSweetImages[pair.sweetId]} alt="" aria-hidden="true" />
                <strong>{pair.sweetName}</strong>
              </div>
              {drink && (
                <button
                  type="button"
                  className={`teaCup drink-${drink.drinkId} ${dragging?.cupId === drink.drinkId ? 'isDragging' : ''}`}
                  title={drink.description ?? drink.drinkName}
                  aria-label={`${drink.drinkName} のカップ`}
                  disabled={solved}
                  onPointerDown={(event) => {
                    if (solved) return
                    event.preventDefault()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    setDragging({ cupId: drink.drinkId, pointerId: event.pointerId, x: event.clientX, y: event.clientY })
                  }}
                  onPointerMove={(event) => {
                    if (!dragging || dragging.pointerId !== event.pointerId) return
                    event.preventDefault()
                    setDragging({ cupId: dragging.cupId, pointerId: dragging.pointerId, x: event.clientX, y: event.clientY })
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                    }
                    finishDrag(event.clientX, event.clientY)
                  }}
                  onPointerCancel={() => setDragging(null)}
                >
                  <img className="teaItemImage drinkImage" src={teaDrinkImages[drink.drinkId]} alt="" aria-hidden="true" />
                  <span>{drink.drinkName}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
      {dragging && (
        <div className="teaDragGhost" style={{ left: dragging.x, top: dragging.y }} aria-hidden="true">
          {getTeaDrink(dragging.cupId)?.drinkName}
        </div>
      )}
      <button
        type="button"
        className={`teaDrawer ${drawerState}`}
        aria-label="ティーテーブルの引き出し"
        onClick={() => onAction({ type: 'EXAMINE_TEA_DRAWER' })}
      >
        <span className="drawerFace" aria-hidden="true">
          <img src={drawerImage} alt="" />
        </span>
        <span>
          <strong>小さな引き出し</strong>
          <small>{drawerState === 'locked' ? '閉じている' : drawerState === 'open-with-photo' ? '古い写真が見える' : '空になっている'}</small>
        </span>
      </button>
    </div>
  )
}

function BridalClockFocus({ state, onAction, showHotspots }: { state: GameState; onAction: (action: GameAction) => void; showHotspots: boolean }) {
  const clockHandTaken = state.inventory['clock-hand'].obtained || state.clockState.handAttached

  return (
    <div className="bridalClockFocus">
      <div className="bridalClockPhoto" aria-label="控室の置時計">
        <button
          type="button"
          className={`bridalClockHotspot ${showHotspots ? 'visible' : ''}`}
          aria-label="置時計を調べる"
          onClick={() => onAction({ type: 'EXAMINE_BRIDAL_CLOCK' })}
        >
          {showHotspots && '置時計'}
        </button>
      </div>
      <p>{clockHandTaken ? '時計は静かに止まっている。' : '古い置時計が、窓辺の光を受けている。'}</p>
    </div>
  )
}

function CandleFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const puzzle = state.puzzles.p02_ceremony
  const solved = puzzle?.status === 'solved'
  const available = puzzle?.status === 'available'
  const litIds = solved ? new Set(ceremonyCandles.map((candle) => candle.id)) : new Set(state.ceremonyCandles.lit)
  const altarPhotoState = getAltarPhotoState(state)
  const altarCandles = altarCandleDisplaySequence
    .map((candleId) => ceremonyCandles.find((candle) => candle.id === candleId))
    .filter((candle): candle is (typeof ceremonyCandles)[number] => Boolean(candle))

  return (
    <div className={`candlePuzzle ${solved ? 'altarLit' : 'altarUnlit'}`}>
      <div className="candleHeader">
        <span>{solved ? 'solved' : puzzle?.status ?? 'locked'}</span>
        <p>{solved ? '四つの灯が、今も祭壇を照らしている。' : '会場で見た形を思い出しながら、順に火を灯す。'}</p>
      </div>
      <div className="altarRealScene" aria-label="祭壇の四本のキャンドル">
        {altarCandles.map((candle, index) => {
          const lit = litIds.has(candle.id)
          const lightOrder = solvedCandleLightSequence.indexOf(candle.id)
          const lightStyle = {
            '--candle-light-delay': `${Math.max(lightOrder, 0) * 160}ms`,
          } as CSSProperties
          return (
            <button
              key={candle.id}
              type="button"
              className={`candleButton altarCandleHotspot altarCandle-${index + 1} ${candle.shape} ${lit ? 'lit' : ''}`}
              style={lightStyle}
              disabled={!available || solved || lit}
              aria-pressed={lit}
              aria-label={`${candle.name} ${lit ? '点灯' : '消灯'}`}
              title={candle.description}
              onClick={() => onAction({ type: 'LIGHT_CEREMONY_CANDLE', candleId: candle.id })}
            >
              <span className="flame" aria-hidden="true" />
              <span className="candleShape" aria-hidden="true" />
              <strong>{candle.name}</strong>
            </button>
          )
        })}
      </div>
      {!solved && (
        <ol className="candleInput" aria-label="入力済みの灯">
          {correctCandleSequence.map((_, index) => (
            <li key={index}>{state.ceremonyCandles.input[index] ? '灯' : '○'}</li>
          ))}
        </ol>
      )}
      <button
        type="button"
        className={`altarPhotoObject ${altarPhotoState}`}
        aria-label={altarPhotoState === 'revealed-photo' ? '祭壇脇の古い写真' : '祭壇脇に置かれたもの'}
        onClick={() => onAction({ type: 'EXAMINE_ALTAR_PHOTO' })}
      >
        <span className="altarPhotoVisual" aria-hidden="true" />
        <span>{altarPhotoState === 'dark-object' ? '祭壇脇の影' : altarPhotoState === 'revealed-photo' ? '古い写真' : '写真のあった場所'}</span>
      </button>
    </div>
  )
}

function SeatingChartFocus() {
  return (
    <div className="receptionImagePuzzle">
      <div className="receptionHint">
        <span>Seating Chart</span>
        <p>席次表で、各席の正しいイニシャルと数字を確認する。</p>
      </div>
      <img className="p03FocusImage seatingChartImage" src={p03ReceptionSeatingChartImage} alt="披露宴会場の席次表" />
    </div>
  )
}

function ReceptionTableFocus({ tableId }: { tableId: string }) {
  const table = getReceptionTable(tableId)
  if (!table) return null

  return (
    <div className="receptionImagePuzzle">
      <div className="receptionHint">
        <span>{table.name}</span>
        <p>{table.motif} テーブルの席札を、席次表と見比べる。</p>
      </div>
      <img className="p03FocusImage tableFocusImage" src={receptionTableImages[table.id]} alt={`${table.name} テーブルの席札`} />
    </div>
  )
}

function ReceptionBoxFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const solved = state.receptionTables.boxOpened || state.puzzles.p03_reception?.status === 'solved'
  return (
    <div className="lockBoxPuzzle">
      <div className={`lockBox ${solved ? 'opened' : ''}`}>
        <strong>{solved ? 'OPEN BOX' : 'LOCKED BOX'}</strong>
        <div className="lockDialGrid">
          {receptionLockTables.map((table, index) => (
            <div key={table.id} className="lockDial">
              <span className="lockDialColor" style={{ '--dial-color': receptionLockDialColors[index] } as CSSProperties} aria-hidden="true" />
              <button type="button" disabled={solved} aria-label={`${index + 1}桁目を上げる`} onClick={() => onAction({ type: 'SET_P03_LOCK_DIGIT', index, value: state.receptionTables.lockInput[index] + 1 })}>+</button>
              <strong>{state.receptionTables.lockInput[index]}</strong>
              <button type="button" disabled={solved} aria-label={`${index + 1}桁目を下げる`} onClick={() => onAction({ type: 'SET_P03_LOCK_DIGIT', index, value: state.receptionTables.lockInput[index] - 1 })}>-</button>
            </div>
          ))}
        </div>
        {solved ? (
          <div className="boxContents">
            <span>半透明の紙</span>
            <span>古い写真「PHOTO C」</span>
          </div>
        ) : (
          <button type="button" className="openBoxButton" onClick={() => onAction({ type: 'OPEN_P03_BOX' })}>OPEN</button>
        )}
      </div>
    </div>
  )
}

function FramedPictureFocus({ state }: { state: GameState }) {
  const completed = state.pianoOverlay.overlayApplied || state.puzzles.p04_sheet_overlay?.status === 'solved'
  const justApplied = completed && state.messageQueue.includes('紙の模様が、絵の上にぴたりと重なった。')

  return (
    <div className={`pictureOverlayPuzzle ${completed ? 'completed' : ''} ${justApplied ? 'justApplied' : ''}`}>
      <div className="pictureHint">
        <span>{completed ? 'completed' : 'unfinished'}</span>
        <p>{completed ? '紙の模様が、絵の上にぴたりと重なっている。' : '白い鍵盤の輪郭と、小さな記号の列が描かれている。'}</p>
      </div>
      <div className="framedPicture" aria-label={completed ? '完成した絵' : '未完成の絵'}>
        <img className="p04OverlayImage base" src={p04OverlayBaseImage} alt="" aria-hidden="true" />
        <img className="p04OverlayImage completed" src={p04OverlayCompletedImage} alt="" aria-hidden={!completed} />
        {justApplied && <TransparentSheetLayer />}
      </div>
    </div>
  )
}

function TransparentSheetLayer() {
  return <div className="transparentSheetLayer" aria-hidden="true" />
}

function OldInvitationFocus() {
  return (
    <div className="oldInvitationPaper">
      <img src={oldInvitationScheduleImage} alt="古い招待状に記された当日の流れ" className="oldInvitationScheduleImage" />
    </div>
  )
}

function MemoryGallery({ state, onInspectMemory }: { state: GameState; onInspectMemory: (memoryId: string) => void }) {
  const unlockedPhotos = allMemoryPhotos.filter((photo) => state.memories[photo.memoryId]?.unlocked)
  if (unlockedPhotos.length === 0) return null
  return (
    <aside className="memoryGallery">
      <h3>見つけた古い写真</h3>
      <div className="memoryPhotoGrid">
        {unlockedPhotos.map((photo) => (
          <button key={photo.id} type="button" aria-label={`${photo.title}を調べる`} title={photo.title} onClick={() => onInspectMemory(photo.memoryId)}>
            <img src={memoryThumbnailImages[photo.memoryId] ?? memoryPhotoImages[photo.memoryId] ?? photoDImage} alt="" aria-hidden="true" />
          </button>
        ))}
      </div>
    </aside>
  )
}

function ItemFocus({ item, selected, onAction }: { item?: Item; selected: boolean; onAction: (action: GameAction) => void }) {
  if (!item) return <p>アイテムは見つかりません。</p>
  const image = itemFocusImages[item.itemId]
  const canSelect = item.usableTargets.length > 0

  return (
    <div className="itemFocus">
      <h3>{item.name}</h3>
      {image && <img className="itemFocusImage" src={image} alt={item.name} />}
      <p>{item.description}</p>
      {item.itemId === 'old-invitation' && <OldInvitationFocus />}
      {canSelect && (
        <button type="button" onClick={() => onAction({ type: 'SELECT_ITEM', itemId: selected ? null : item.itemId })}>
          {selected ? '選択を外す' : '選択する'}
        </button>
      )}
    </div>
  )
}

function PhotoFocus({ memoryId }: { memoryId: string }) {
  const photo = getMemoryPhotoByMemoryId(memoryId)
  if (photo?.isTrueMemory) {
    return (
      <div className="photoFocus trueMemoryPhoto">
        <h3>{photo.title}</h3>
        <div className="oldPhotoComposition september23">
          <div className="photoRoom">
            {photo.sceneElements.map((element) => <span key={element}>{element}</span>)}
          </div>
          <div className="photoInscription">{photo.inscription}</div>
        </div>
        <p>開いた門の外から、Maison Symphoniqueを振り返った古い写真。</p>
      </div>
    )
  }
  const object = photo?.gardenObjectId ? getGardenPuzzleObject(photo.gardenObjectId) : undefined
  if (!photo || !object) return <p>写真はまだ見つかっていない。</p>
  const photoImage = memoryPhotoImages[photo.memoryId]

  return (
    <div className="photoFocus">
      <h3>{photo.title}</h3>
      <div className={`oldPhotoComposition ${object.id} ${photo.id}`}>
        <img className="oldPhotoImage" src={photoImage} alt={`${photo.title} ${photo.sourceArea}で見つけた古い写真`} />
      </div>
      <p>{photo.sourceArea}で見つけた古い写真。庭のものらしい装飾と、小さな時計が写っている。</p>
    </div>
  )
}

function GardenObjectFocus({ state, objectId, onAction }: { state: GameState; objectId: string; onAction: (action: GameAction) => void }) {
  const object = getGardenPuzzleObject(objectId)
  if (!object) return null
  const active = state.gardenFinal.switches[object.id] === true
  const solved = state.puzzles.p07_garden_final?.status === 'solved'
  const available = state.puzzles.p07_garden_final?.status === 'available'

  return (
    <div className={`gardenObjectPuzzle ${active ? 'active' : ''}`}>
      <div className={`gardenFocusPhoto ${object.id}`} aria-hidden="true" />
      <p>{object.description}</p>
      <p>台座の側面に、小さな真鍮のスイッチがある。</p>
      <button type="button" disabled={!available || solved || active} onClick={() => onAction({ type: 'ACTIVATE_GARDEN_SWITCH', objectId: object.id })}>
        スイッチ
      </button>
      <span className="switchIndicator" aria-label={active ? '灯りがついている' : '灯りは消えている'} />
    </div>
  )
}

function GardenGateFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const open = state.puzzles.p07_garden_final?.status === 'solved' || state.gardenFinal.gateState === 'open'
  return (
    <div className={`gardenGatePuzzle ${open ? 'open' : 'locked'}`}>
      <div className="gardenFocusPhoto gate" aria-hidden="true" />
      <p>{open ? '門が開いている。' : '重い鉄の門だ。固く閉ざされている。'}</p>
      {open && <button type="button" onClick={() => onAction({ type: 'OPEN_GARDEN_GATE' })}>門をくぐる</button>}
    </div>
  )
}

function GardenBookFocus() {
  return (
    <div className="gardenBookPuzzle">
      <div className="gardenFocusPhoto book" aria-hidden="true">
        <span />
      </div>
      <p>緑のベンチの上に、古い本が置かれている。</p>
      <p>ページは湿気を含んでいて、文字はほとんど読めない。</p>
    </div>
  )
}

function ClockWidget({ state }: { state: GameState }) {
  const minuteDeg = minuteHandAngleFromTime(state.clockState.currentTime)
  const hourDeg = hourHandAngleFromTime(state.clockState.currentTime)
  const [timeChanged, setTimeChanged] = useState(false)

  useEffect(() => {
    setTimeChanged(true)
    const timer = window.setTimeout(() => setTimeChanged(false), 720)
    return () => window.clearTimeout(timer)
  }, [state.clockState.currentTime])

  return (
    <div className={`clockWidget ${timeChanged ? 'timeChanged' : ''}`}>
      <button
        type="button"
        className="clockFace"
        aria-label="大時計"
      >
        <span className="clockHand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        {state.clockState.handAttached && <span className="clockHand minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />}
      </button>
      <span className="clockTimeText">{state.clockState.currentTime}</span>
    </div>
  )
}

function GrandClockFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const draggingHandRef = useRef<ClockHandKind | null>(null)
  const [activeHand, setActiveHand] = useState<ClockHandKind | null>(null)
  const minuteDeg = minuteHandAngleFromTime(state.clockState.currentTime)
  const hourDeg = hourHandAngleFromTime(state.clockState.currentTime)
  const canManipulate = canManuallyControlGrandClock(state)

  useEffect(() => {
    if (canManipulate) return
    draggingHandRef.current = null
    setActiveHand(null)
  }, [canManipulate])

  const setTimeFromPointer = (hand: ClockHandKind, event: PointerEvent<HTMLButtonElement>) => {
    const face = event.currentTarget.closest('.largeClockFace')
    if (!(face instanceof HTMLElement)) return
    const time = timeFromClockHandPoint(
      hand,
      { x: event.clientX, y: event.clientY },
      face.getBoundingClientRect(),
      state.clockState.currentTime,
    )
    onAction({ type: 'SET_CLOCK_TIME', time })
  }

  const beginHandDrag = (hand: ClockHandKind, event: PointerEvent<HTMLButtonElement>) => {
    if (!canManipulate) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingHandRef.current = hand
    setActiveHand(hand)
    setTimeFromPointer(hand, event)
  }

  const moveHandDrag = (hand: ClockHandKind, event: PointerEvent<HTMLButtonElement>) => {
    if (!canManipulate || draggingHandRef.current !== hand) return
    event.preventDefault()
    event.stopPropagation()
    setTimeFromPointer(hand, event)
  }

  const endHandDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    draggingHandRef.current = null
    setActiveHand(null)
  }

  return (
    <div className="grandClockFocus">
      <div className="clockCabinetAsset" aria-hidden="true" />
      <div className="clockReadout">
        <span>TIME</span>
        <strong>{state.clockState.currentTime}</strong>
      </div>
      <div className={`largeClockFace ${canManipulate ? 'manual' : ''} ${state.clockState.handAttached ? 'handAttached' : 'handMissing'}`} role="group" aria-label="大時計">
        <span className={`clockHand hour large ${activeHand === 'hour' ? 'active' : ''}`} style={{ transform: `rotate(${hourDeg}deg)` }} />
        {state.clockState.handAttached && <span className={`clockHand minute large ${activeHand === 'minute' ? 'active' : ''}`} style={{ transform: `rotate(${minuteDeg}deg)` }} />}
        {state.clockState.handAttached && (
          <>
            <button
              type="button"
              className={`clockHandHitArea hour ${activeHand === 'hour' ? 'active' : ''}`}
              style={{ transform: `rotate(${hourDeg}deg)` }}
              aria-label="大時計の短針"
              disabled={!canManipulate}
              onPointerDown={(event) => beginHandDrag('hour', event)}
              onPointerMove={(event) => moveHandDrag('hour', event)}
              onPointerUp={endHandDrag}
              onPointerCancel={endHandDrag}
            />
            <button
              type="button"
              className={`clockHandHitArea minute ${activeHand === 'minute' ? 'active' : ''}`}
              style={{ transform: `rotate(${minuteDeg}deg)` }}
              aria-label="大時計の長針"
              disabled={!canManipulate}
              onPointerDown={(event) => beginHandDrag('minute', event)}
              onPointerMove={(event) => moveHandDrag('minute', event)}
              onPointerUp={endHandDrag}
              onPointerCancel={endHandDrag}
            />
          </>
        )}
        {!state.clockState.handAttached && <span className="missingHand">長針なし</span>}
      </div>
      {canManipulate && <p className="clockHint">短針と長針に触れると、静かに動く。</p>}
    </div>
  )
}

function PianoFocus({ state, onAction, startOpen = false }: { state: GameState; onAction: (action: GameAction) => void; startOpen?: boolean }) {
  const puzzle = state.puzzles.p05_piano
  const solved = puzzle?.status === 'solved'
  const available = puzzle?.status === 'available'
  const [pressedKey, setPressedKey] = useState<number | null>(null)
  const [phraseReset, setPhraseReset] = useState(false)
  const [autoPlaying, setAutoPlaying] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(startOpen)
  const previousSolvedRef = useRef(solved)
  const previousInputLengthRef = useRef(state.pianoPerformance.input.length)
  const playableKeys = useMemo(() => getPlayablePianoKeys(), [])
  const whiteKeys = playableKeys.filter((key) => key.kind === 'white')
  const blackKeys = playableKeys.filter((key) => key.kind === 'black')
  const correctSequence = useMemo(() => getDerivedPianoSequence(), [])

  const playTone = useCallback((keyIndex: number) => {
    const key = playableKeys.find((candidate) => candidate.keyIndex === keyIndex)
    if (!key) return
    audioManager.enable()
    audioManager.playPianoTone(key.toneOffset)
    setPressedKey(keyIndex)
    window.setTimeout(() => setPressedKey((current) => (current === keyIndex ? null : current)), 140)
  }, [playableKeys])

  const playKey = (keyIndex: number) => {
    if (autoPlaying) return
    playTone(keyIndex)
    onAction({ type: 'PLAY_PIANO_KEY', keyIndex })
  }

  const inspectKeyhole = () => {
    if (state.selectedItemId === 'small-key') {
      onAction({ type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' })
      return
    }
    onAction({ type: 'EXAMINE_PIANO_KEYHOLE' })
  }

  useEffect(() => {
    const phraseLength = getPhraseLength()
    if (!solved && previousInputLengthRef.current === phraseLength - 1 && state.pianoPerformance.input.length === 0) {
      setPhraseReset(true)
      const timer = window.setTimeout(() => setPhraseReset(false), 360)
      return () => window.clearTimeout(timer)
    }
    previousInputLengthRef.current = state.pianoPerformance.input.length
    return undefined
  }, [solved, state.pianoPerformance.input.length])

  useEffect(() => {
    if (!solved || previousSolvedRef.current) {
      previousSolvedRef.current = solved
      return undefined
    }
    previousSolvedRef.current = solved
    setAutoPlaying(true)
    const timers = correctSequence.map((keyIndex, index) =>
      window.setTimeout(() => playTone(keyIndex), 260 + index * 360),
    )
    timers.push(window.setTimeout(() => {
      audioManager.play('bell')
      setAutoPlaying(false)
    }, 260 + correctSequence.length * 360 + 160))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [correctSequence, playTone, solved])

  return (
    <div className={`pianoPuzzle ${phraseReset ? 'phraseReset' : ''}`}>
      {!keyboardOpen ? (
        <div className="pianoPhotoInspect">
          <button type="button" className="pianoKeyboardAccess" aria-label="ピアノの鍵盤を調べる" onClick={() => setKeyboardOpen(true)}>
            鍵盤を調べる
          </button>
          <button
            type="button"
            className={`pianoKeyhole pianoPhotoKeyhole ${state.flags.pianoSecretOpened ? 'opened' : ''}`}
            aria-label="小さな鍵穴"
            onClick={inspectKeyhole}
          >
            <span aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="pianoCabinet">
        <div className="pianoLid" aria-hidden="true" />
        <div className="pianoKeyboard" aria-label="ピアノ鍵盤">
          <div className="pianoWhiteKeys">
            {whiteKeys.map((key) => (
              <button
                key={key.id}
                type="button"
                className={`pianoKey white ${pressedKey === key.keyIndex ? 'pressed' : ''}`}
                aria-label={`白鍵 ${key.position + 1}`}
                disabled={autoPlaying}
                onPointerDown={(event) => {
                  event.preventDefault()
                  playKey(key.keyIndex)
                }}
              >
                {key.position === pianoOverlayPuzzleData.cReferenceKeyIndex && <strong aria-label="基準点">{pianoReferenceMark}</strong>}
              </button>
            ))}
          </div>
          <div className="pianoBlackKeys" aria-hidden="false">
            {blackKeys.map((key) => (
              <button
                key={key.id}
                type="button"
                className={`pianoKey black ${pressedKey === key.keyIndex ? 'pressed' : ''}`}
                style={{ left: `${((key.position + 1) / pianoOverlayPuzzleData.whiteKeyCount) * 100}%` }}
                aria-label={`黒鍵 ${key.position + 1}`}
                disabled={autoPlaying}
                onPointerDown={(event) => {
                  event.preventDefault()
                  playKey(key.keyIndex)
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className={`pianoKeyhole ${state.flags.pianoSecretOpened ? 'opened' : ''}`}
          aria-label="小さな鍵穴"
          onClick={inspectKeyhole}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      )}
      {!available && !solved && <p className="clockHint">静かな鍵盤が、まだ音を待っている。</p>}
      {state.flags.pianoSecretOpened && <p className="clockHint">秘密収納は開いている。</p>}
    </div>
  )
}

function MemoryMeter({ state }: { state: GameState }) {
  const count = getMemoryCount(state)
  return (
    <div className="memoryMeter">
      <span>MEMORY</span>
      <strong aria-label={`${count} / 5`}>
        {Array.from({ length: 5 }, (_, index) => (index < count ? '■' : '□')).join('')}
      </strong>
      <span>{count} / 5</span>
    </div>
  )
}

function MessageWindow({ state, onClear }: { state: GameState; onClear: () => void }) {
  const hasMessages = state.messageQueue.length > 0
  return (
    <div className={`messageWindow ${hasMessages ? '' : 'empty'}`}>
      <h3>LOG</h3>
      {hasMessages ? state.messageQueue.map((message, index) => <p key={index}>{message}</p>) : <p>探索ログはまだありません。</p>}
      {hasMessages && <button type="button" onClick={onClear}>閉じる</button>}
    </div>
  )
}

function Inventory({
  state,
  onInspectItem,
}: {
  state: GameState
  onInspectItem: (itemId: string) => void
}) {
  const obtainedItems = Object.values(state.inventory).filter((item) => item.obtained && !item.consumed)
  const emptySlots = Math.max(0, 5 - obtainedItems.length)
  return (
    <aside className="inventory">
      <h3>所持品</h3>
      <div className="inventoryGrid">
        {obtainedItems.map((item) => (
          <div key={item.itemId} className="inventoryItem">
            <button
              type="button"
              className={state.selectedItemId === item.itemId ? 'selected' : ''}
              aria-label={`${item.name}を調べる`}
              title={item.name}
              onClick={() => onInspectItem(`item:${item.itemId}`)}
            >
              <img src={itemImages[item.itemId] ?? doorKeyItemImage} alt="" aria-hidden="true" />
            </button>
          </div>
        ))}
        {Array.from({ length: emptySlots }, (_, index) => (
          <span key={`empty-item-${index}`} className="emptyItemSlot" aria-hidden="true" />
        ))}
      </div>
    </aside>
  )
}

function PuzzleRow({ state, puzzle, onSolve }: { state: GameState; puzzle: Puzzle; onSolve: () => void }) {
  const checklist = getPuzzleDependencyChecklist(state, puzzle)
  return (
    <div className="puzzleRow">
      <div>
        <small>[ DEVELOPMENT PLACEHOLDER ]</small>
        <span>{puzzle.title}</span>
        {puzzle.description && <p>{puzzle.description}</p>}
        {checklist.length > 0 && (
          <ul>
            {checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
      </div>
      <strong>{puzzle.status}</strong>
      <button type="button" disabled={puzzle.status !== 'available'} onClick={onSolve}>Solved</button>
    </div>
  )
}

function NormalEnd({ state, onContinue, onTitle }: { state: GameState; onContinue: () => void; onTitle: () => void }) {
  return (
    <section className="readingScreen ending">
      <p className="eyebrow">NORMAL END</p>
      <h2>{normalEndingText.title}</h2>
      <p className="endingCouple">{coupleDisplayName}</p>
      <p className="endingDate">{weddingDateDisplay}</p>
      {normalEndingText.body.map((line) => <p key={line}>{line}</p>)}
      <h2>閉宴</h2>
      <p>2026年9月23日。</p>
      <p>長い一日は、こうして終わった。</p>
      <MemoryMeter state={state} />
      {!state.trueEndingCleared && <p>まだ何か残っている。</p>}
      <div className="buttonRow">
        <button type="button" onClick={onContinue}>{normalEndingText.returnLabel}</button>
        <button type="button" className="secondary" onClick={onTitle}>タイトルへ</button>
      </div>
    </section>
  )
}

function PhotoEReveal({ state, onContinue }: { state: GameState; onContinue: () => void }) {
  return (
    <section className="readingScreen ending photoEReveal">
      <p className="eyebrow">Old Photograph</p>
      <PhotoFocus memoryId={trueMemoryPhoto.memoryId} />
      <MemoryMeter state={state} />
      <button type="button" onClick={onContinue}>写真をしまう</button>
    </section>
  )
}

function TrueEnd({ state, onTitle }: { state: GameState; onTitle: () => void }) {
  return (
    <section className="readingScreen ending trueEnding">
      <p className="eyebrow">TRUE END</p>
      {trueEndingText.body.map((line) => <p key={line}>{line}</p>)}
      <h2>TRUE END</h2>
      <p className="endingCouple">{coupleDisplayName}</p>
      <p className="endingDate">{weddingDateDisplay}</p>
      <h2>September 23</h2>
      <p>Maison Symphoniqueに、やわらかな光が戻っていく。</p>
      <MemoryMeter state={state} />
      <button type="button" onClick={onTitle}>タイトルへ</button>
    </section>
  )
}

function DebugPanel({ state, showHotspots, onToggleHotspots, onAction }: { state: GameState; showHotspots: boolean; onToggleHotspots: () => void; onAction: (action: GameAction) => void }) {
  const areaIds = Object.keys(areas) as AreaId[]
  const quickJumpAreaIds: AreaId[] = ['entrance', 'waiting-room', 'ceremony', 'reception', 'garden']
  const memoryIds = Object.keys(state.memories)
  const puzzleIds = Object.keys(state.puzzles)
  const normalPhotoMemoryIds = memoryPhotos.map((photo) => photo.memoryId)
  const photoDebugIds = [...normalPhotoMemoryIds, trueMemoryPhoto.memoryId]
  const inventoryDebugIds = ['clock-hand', 'transparent-card', 'small-key', 'old-invitation']
  const [debugTime, setDebugTime] = useState(state.clockState.currentTime)
  const dispatchMany = (actions: GameAction[]) => actions.forEach(onAction)
  const normalReadyActions: GameAction[] = [
    { type: 'RESET_ALL' },
    { type: 'START_GAME' },
    { type: 'SOLVE_PUZZLE', puzzleId: 'p01_waiting_room', force: true },
    { type: 'OBTAIN_ITEM', itemId: 'clock-hand' },
    { type: 'ATTACH_CLOCK_HAND' },
    { type: 'DEBUG_MOVE', areaId: 'ceremony' },
    { type: 'SOLVE_PUZZLE', puzzleId: 'p02_ceremony', force: true },
    { type: 'DEBUG_MOVE', areaId: 'reception' },
    { type: 'SET_P03_LOCK_INPUT', input: getReceptionLockDigits() },
    { type: 'OPEN_P03_BOX' },
    { type: 'SELECT_ITEM', itemId: 'transparent-card' },
    { type: 'USE_SELECTED_ITEM', targetId: 'framed-picture' },
    { type: 'SOLVE_PUZZLE', puzzleId: 'p05_piano', force: true },
    { type: 'SET_FLAG', flagId: 'pianoMechanismUnlocked', value: true },
    { type: 'OBTAIN_ITEM', itemId: 'small-key' },
    { type: 'SELECT_ITEM', itemId: 'small-key' },
    { type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' },
    ...normalPhotoMemoryIds.map((memoryId): GameAction => ({ type: 'UNLOCK_MEMORY', memoryId })),
    { type: 'SET_PUZZLE_STATUS', puzzleId: 'p06_grand_clock', status: 'available' },
    { type: 'SET_CLOCK_TIME', time: p06TargetTime },
    { type: 'DEBUG_MOVE', areaId: 'garden' },
    { type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final', force: true },
  ]
  const trueReadyActions: GameAction[] = [
    ...normalReadyActions,
    { type: 'OPEN_GARDEN_GATE' },
    { type: 'START_GAME' },
    { type: 'DEBUG_MOVE', areaId: 'entrance' },
    { type: 'LOCK_MEMORY', memoryId: trueMemoryPhoto.memoryId },
    { type: 'SET_CLOCK_MANUAL', enabled: true },
    { type: 'SET_CLOCK_TIME', time: p06TargetTime },
  ]

  return (
    <aside className="debugPanel">
      <header>
        <h3>DEBUG PANEL</h3>
        <button type="button" onClick={onToggleHotspots}>Hotspots {showHotspots ? 'ON' : 'OFF'}</button>
      </header>
      <DebugState state={state} />
      <DebugGroup title="Quick Jump">
        {quickJumpAreaIds.map((areaId) => (
          <button key={areaId} type="button" onClick={() => onAction({ type: 'DEBUG_MOVE', areaId })}>{areas[areaId].name}</button>
        ))}
      </DebugGroup>
      <DebugGroup title="Scenario Presets">
        <button type="button" onClick={() => dispatchMany(normalReadyActions)}>NORMAL Ready</button>
        <button type="button" onClick={() => dispatchMany(trueReadyActions)}>TRUE Ready</button>
      </DebugGroup>
      <DebugGroup title="Area">
        {areaIds.map((areaId) => <button key={areaId} type="button" onClick={() => onAction({ type: 'MOVE', areaId })}>{areas[areaId].name}</button>)}
      </DebugGroup>
      <DebugGroup title="Puzzle Quick Clear">
        {puzzleIds.map((puzzleId, index) => (
          <button key={puzzleId} type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId, force: true })}>
            P{String(index + 1).padStart(2, '0')} Clear
          </button>
        ))}
      </DebugGroup>
      <DebugGroup title="Puzzle">
        {puzzleIds.map((puzzleId) => (
          <div key={puzzleId} className="debugPuzzleControl">
            <strong>{puzzleId}</strong>
            <span>{state.puzzles[puzzleId].status}</span>
            <small>{getPuzzleDependencyChecklist(state, state.puzzles[puzzleId]).join(' / ') || 'No requirements'}</small>
            <button type="button" onClick={() => onAction({ type: 'SET_PUZZLE_STATUS', puzzleId, status: 'locked' })}>locked</button>
            <button type="button" onClick={() => onAction({ type: 'SET_PUZZLE_STATUS', puzzleId, status: 'available' })}>available</button>
            <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId, force: true })}>Solve</button>
            <button
              type="button"
              onClick={() =>
                puzzleId === 'p01_waiting_room'
                  ? onAction({ type: 'RESET_P01_TEA_TIME' })
                  : puzzleId === 'p02_ceremony'
                    ? onAction({ type: 'RESET_P02_CANDLES' })
                    : puzzleId === 'p03_reception'
                      ? onAction({ type: 'RESET_P03_RECEPTION' })
                      : puzzleId === 'p04_sheet_overlay'
                        ? onAction({ type: 'RESET_P04_OVERLAY' })
                        : puzzleId === 'p05_piano'
                          ? onAction({ type: 'RESET_P05_PIANO' })
                          : puzzleId === 'p06_grand_clock'
                            ? onAction({ type: 'RESET_P06_CLOCK' })
                            : puzzleId === 'p07_garden_final'
                              ? onAction({ type: 'RESET_P07_GARDEN' })
                          : onAction({ type: 'SET_PUZZLE_STATUS', puzzleId, status: 'locked' })
              }
            >
              Reset
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onAction({ type: 'RESET_PUZZLES' })}>Puzzleリセット</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_ALL_PUZZLES' })}>全Puzzle Solved</button>
      </DebugGroup>
      <DebugGroup title="Item">
        {inventoryDebugIds.map((itemId) => {
          const item = state.inventory[itemId]
          if (!item) return null
          const active = item.obtained && !item.consumed
          return (
            <div key={itemId} className="debugToggleRow">
              <span>{item.name}</span>
              <small>{active ? '所持中' : item.consumed ? '使用済み' : '未所持'}</small>
              <button type="button" onClick={() => onAction({ type: 'SET_ITEM_OBTAINED', itemId, obtained: !active })}>{active ? 'Remove' : 'Give'}</button>
            </div>
          )
        })}
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'clock-hand' })}>長針取得</button>
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'transparent-card' })}>半透明の紙取得</button>
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'small-key' })}>小さな鍵取得</button>
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'old-invitation' })}>古い招待状取得</button>
        <button type="button" onClick={() => onAction({ type: 'CLEAR_INVENTORY' })}>インベントリクリア</button>
      </DebugGroup>
      <DebugGroup title="Phase 2A Events">
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'dressingRoomUnlocked', value: true })}>Dressing unlock</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLUE', clueId: 'pianoSequence', obtained: true })}>Piano clue</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'pianoMechanismUnlocked', value: true })}>Piano mechanism</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'ceremonyLightVisible', value: true })}>Ceremony light</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'invitationObtained', value: true })}>Invitation flag</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'gardenUnlocked', value: true })}>Garden unlock</button>
      </DebugGroup>
      <DebugGroup title="P03 Reception">
        <button type="button" onClick={() => onAction({ type: 'SET_P03_LOCK_INPUT', input: getReceptionLockDigits() })}>Set lock {getReceptionLockCode()}</button>
        <button type="button" onClick={() => onAction({ type: 'OPEN_P03_BOX' })}>Open / Solve P03</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_P03_RECEPTION' })}>Reset P03</button>
      </DebugGroup>
      <DebugGroup title="P04 Picture Overlay">
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'transparent-card' })}>Give Transparent Sheet</button>
        <button type="button" onClick={() => onAction({ type: 'SELECT_ITEM', itemId: 'transparent-card' })}>Select Transparent Sheet</button>
        <button type="button" onClick={() => onAction({ type: 'APPLY_P04_OVERLAY' })}>Apply Overlay</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: 'p04_sheet_overlay', force: true })}>Solve P04</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_P04_OVERLAY' })}>Reset P04</button>
      </DebugGroup>
      <DebugGroup title="P05 Piano">
        <button type="button" onClick={() => onAction({ type: 'SET_PUZZLE_STATUS', puzzleId: 'p05_piano', status: 'available' })}>Make P05 available</button>
        <button type="button" onClick={() => getDerivedPianoSequence().forEach((keyIndex) => onAction({ type: 'PLAY_PIANO_KEY', keyIndex }))}>Input correct sequence</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: 'p05_piano', force: true })}>Solve P05</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_P05_PIANO' })}>Reset P05</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'ceremonyLightVisible', value: true })}>Show Ceremony Light</button>
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'small-key' })}>Give Small Key</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'pianoSecretOpened', value: true })}>Open Piano Secret</button>
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'old-invitation' })}>Give Invitation</button>
      </DebugGroup>
      <DebugGroup title="P06 Grand Clock">
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'old-invitation' })}>Give Old Invitation</button>
        <button type="button" onClick={() => onAction({ type: 'SET_PUZZLE_STATUS', puzzleId: 'p06_grand_clock', status: 'available' })}>Make P06 available</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: '15:00' })}>Set Clock 15:00</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: p06TargetTime })}>Set Clock {p06TargetTime}</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: 'p06_grand_clock', force: true })}>Solve P06</button>
        <button type="button" onClick={() => onAction({ type: 'SET_FLAG', flagId: 'gardenUnlocked', value: true })}>Unlock Garden</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_P06_CLOCK' })}>Reset P06</button>
      </DebugGroup>
      <DebugGroup title="P07 Garden">
        <button type="button" onClick={() => memoryPhotos.forEach((photo) => onAction({ type: 'UNLOCK_MEMORY', memoryId: photo.memoryId }))}>Give All NORMAL Photos</button>
        {memoryPhotos.map((photo) => <button key={photo.id} type="button" onClick={() => onAction({ type: 'UNLOCK_MEMORY', memoryId: photo.memoryId })}>Give {photo.title}</button>)}
        <button type="button" onClick={() => onAction({ type: 'SET_MEMORY_COUNT', count: 0 })}>Remove NORMAL Photos</button>
        <button type="button" onClick={() => onAction({ type: 'SET_PUZZLE_STATUS', puzzleId: 'p07_garden_final', status: 'available' })}>Make P07 available</button>
        <button type="button" onClick={() => onAction({ type: 'ACTIVATE_GARDEN_SWITCH', objectId: getP07CorrectSequence()[state.gardenFinal.input.length] ?? getP07CorrectSequence()[0] })}>Activate correct next switch</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final', force: true })}>Solve P07</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_P07_GARDEN' })}>Reset P07</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: 'p07_garden_final', force: true })}>Open Gate</button>
        <button type="button" onClick={() => onAction({ type: 'OPEN_GARDEN_GATE' })}>Trigger NORMAL</button>
      </DebugGroup>
      <DebugGroup title="Clock">
        <button type="button" onClick={() => onAction({ type: 'ATTACH_CLOCK_HAND' })}>長針装着</button>
        <button type="button" onClick={() => onAction({ type: 'ADVANCE_CLOCK', time: '12:34' })}>自動進行テスト</button>
        {['11:00', '12:00', '13:00', '14:00', p06TargetTime, trueClockTarget].map((time) => (
          <button key={time} type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time })}>{time}</button>
        ))}
        <label className="debugInput">
          <span>Time</span>
          <input value={debugTime} onChange={(event) => setDebugTime(event.target.value)} />
          <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: debugTime })}>Set</button>
        </label>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_MANUAL', enabled: true })}>手動ON</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_MANUAL', enabled: false })}>手動OFF</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: '09:23' })}>09:23</button>
      </DebugGroup>
      <DebugGroup title="Memory">
        <p className="debugSummary">Memory {getMemoryCount(state)} / {memoryIds.length}</p>
        {photoDebugIds.map((memoryId) => {
          const memory = state.memories[memoryId]
          if (!memory) return null
          return (
            <div key={memoryId} className="debugToggleRow">
              <span>{memory.title}</span>
              <small>{memory.unlocked ? '取得済み' : '未取得'}</small>
              <button type="button" onClick={() => onAction(memory.unlocked ? { type: 'LOCK_MEMORY', memoryId } : { type: 'UNLOCK_MEMORY', memoryId })}>
                {memory.unlocked ? 'Remove' : 'Give'}
              </button>
            </div>
          )
        })}
        {memoryIds.map((memoryId) => <button key={memoryId} type="button" onClick={() => onAction({ type: 'UNLOCK_MEMORY', memoryId })}>{memoryId}</button>)}
        <button type="button" onClick={() => onAction({ type: 'SET_MEMORY_COUNT', count: 4 })}>4 / 5</button>
        <button type="button" onClick={() => onAction({ type: 'SET_MEMORY_COUNT', count: 5 })}>5 / 5</button>
        <button type="button" onClick={() => onAction({ type: 'SET_MEMORY_COUNT', count: 0 })}>全リセット</button>
      </DebugGroup>
      <DebugGroup title="TRUE Route">
        <button type="button" onClick={() => onAction({ type: 'GO_NORMAL_END' })}>Trigger NORMAL</button>
        <button type="button" onClick={() => onAction({ type: 'SET_MEMORY_COUNT', count: 4 })}>Set Memory 4/5</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: p06TargetTime })}>Set Clock 15:30</button>
        <button type="button" onClick={() => onAction({ type: 'SET_CLOCK_TIME', time: trueClockTarget })}>Set Clock 09:23</button>
        <button type="button" onClick={() => onAction({ type: 'UNLOCK_MEMORY', memoryId: trueMemoryPhoto.memoryId })}>Give PHOTO E</button>
        <button type="button" onClick={() => onAction({ type: 'RESET_TRUE_ROUTE' })}>Remove PHOTO E / Reset TRUE</button>
        <button type="button" onClick={() => onAction({ type: 'UNLOCK_TRUE_ROUTE' })}>Trigger TRUE Route</button>
        <button type="button" onClick={() => onAction({ type: 'GO_TRUE_END' })}>Trigger TRUE END</button>
      </DebugGroup>
      <DebugGroup title="Ending / World / Save">
        <button type="button" onClick={() => onAction({ type: 'GO_NORMAL_END' })}>NORMAL END</button>
        <button type="button" onClick={() => onAction({ type: 'MARK_NORMAL_END_CLEARED' })}>Normal済み</button>
        <button type="button" onClick={() => onAction({ type: 'UNLOCK_TRUE_ROUTE' })}>TRUEルート解禁</button>
        <button type="button" onClick={() => onAction({ type: 'GO_TRUE_END' })}>TRUE END</button>
        <button type="button" onClick={() => onAction({ type: 'SET_WORLD_MODE', worldMode: 'empty' })}>empty</button>
        <button type="button" onClick={() => onAction({ type: 'SET_WORLD_MODE', worldMode: 'memory' })}>memory</button>
        <button type="button" onClick={() => saveGame(state)}>Save確認</button>
        <button type="button" onClick={() => location.reload()}>Load</button>
        <button type="button" onClick={() => { clearSave(); onAction({ type: 'RESET_ALL' }) }}>Reset Game</button>
      </DebugGroup>
    </aside>
  )
}

function DebugGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="debugGroup">
      <h4>{title}</h4>
      <div>{children}</div>
    </section>
  )
}

function DebugState({ state }: { state: GameState }) {
  return (
    <pre className="debugState">{JSON.stringify({
      currentArea: state.currentArea,
      currentChapter: state.chapter,
      worldMode: state.worldMode,
      clockTime: state.clockState.currentTime,
      clockHandObtained: state.clockState.handObtained,
      clockHandAttached: state.clockState.handAttached,
      dressingRoomUnlocked: state.flags.dressingRoomUnlocked === true,
      ceremonyUnlocked: state.flags.ceremonyUnlocked === true,
      p01Status: state.puzzles.p01_waiting_room?.status,
      p02Status: state.puzzles.p02_ceremony?.status,
      p02CandleSequence: correctCandleSequence,
      p02CurrentInput: state.ceremonyCandles.input,
      p02LitCandles: state.ceremonyCandles.lit,
      p03Status: state.puzzles.p03_reception?.status,
      p03Anomalies: state.receptionTables.discoveredAnomalies,
      p03LockInput: state.receptionTables.lockInput,
      p03ExpectedCode: getReceptionLockCode(),
      receptionBoxOpened: state.receptionTables.boxOpened,
      transparentSheet: state.inventory['transparent-card'],
      p03Memory: state.memories.banquet,
      p04Status: state.puzzles.p04_sheet_overlay?.status,
      overlayApplied: state.pianoOverlay.overlayApplied,
      pianoClue: state.clues.pianoSequence,
      derivedPianoSequence: getDerivedPianoSequence(),
      p05Status: state.puzzles.p05_piano?.status,
      p05CurrentInput: state.pianoPerformance.input,
      p05PhraseLength: getPhraseLength(),
      p06Status: state.puzzles.p06_grand_clock?.status,
      oldInvitation: state.inventory['old-invitation'],
      p06Target: p06TargetTime,
      grandClockStarted: state.flags.grandClockStarted === true,
      ceremonyLightVisible: state.flags.ceremonyLightVisible === true,
      ceremonyNavCue: shouldShowCeremonyNavCue(state),
      smallKeyObtained: state.flags.smallKeyObtained === true,
      pianoSecretOpened: state.flags.pianoSecretOpened === true,
      invitationObtained: state.flags.invitationObtained === true,
      gardenUnlocked: state.flags.gardenUnlocked === true,
      p07Status: state.puzzles.p07_garden_final?.status,
      p07ExpectedSequence: getP07CorrectSequence(),
      p07CurrentSequence: state.gardenFinal.input,
      p07Switches: state.gardenFinal.switches,
      gardenGateState: state.gardenFinal.gateState,
      gardenGateUnlocked: state.flags.gardenGateUnlocked === true,
      normalPhotos: Object.fromEntries(memoryPhotos.map((photo) => [photo.title, state.memories[photo.memoryId]?.unlocked === true])),
      photoE: state.memories.september23?.unlocked === true,
      trueTarget: trueClockTarget,
      trueAvailable: state.normalEndingCleared && state.clockState.canManualRotate && !state.memories.september23?.unlocked,
      teaTimeSlots: state.teaTime.cupSlots,
      manualClockControl: state.clockState.canManualRotate,
      memoryCount: getMemoryCount(state),
      normalEndingCleared: state.normalEndingCleared,
      trueRouteUnlocked: state.trueRouteUnlocked,
      trueEndingCleared: state.trueEndingCleared,
      selectedItem: state.selectedItemId,
      puzzleStates: Object.fromEntries(Object.entries(state.puzzles).map(([id, puzzle]) => [id, puzzle.status])),
      items: Object.fromEntries(Object.entries(state.inventory).map(([id, item]) => [id, { obtained: item.obtained, consumed: item.consumed }])),
      clues: state.clues,
      gameFlags: state.flags,
    }, null, 2)}</pre>
  )
}

export default App
