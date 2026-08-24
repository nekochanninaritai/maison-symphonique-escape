import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type PointerEvent } from 'react'
import './App.css'
import { areas } from './game/data/areas'
import { ceremonyCandles, correctCandleSequence } from './game/data/ceremonyCandles'
import { coupleDisplayName, normalEndingText, trueEndingText, weddingDateDisplay } from './game/data/endingText'
import { getDerivedPianoSequence, getPhraseLength, getPlayablePianoKeys, getOverlaySymbolSequence, pianoOverlayPuzzleData, pianoReferenceMark } from './game/data/pianoOverlayPuzzle'
import { allMemoryPhotos, gardenPuzzleObjects, getGardenPuzzleObject, getMemoryPhotoByMemoryId, getP07CorrectSequence, memoryPhotos, trueMemoryPhoto } from './game/data/memoryPhotos'
import { getReceptionLockCode, getReceptionLockDigits, getReceptionTable, receptionLockTables, receptionTables } from './game/data/receptionTables'
import { getTeaDrink, teaTimePairs } from './game/data/teaTime'
import { trueClockTarget } from './game/data/trueRoute'
import { oldInvitationSchedule, p06TargetTime } from './game/data/weddingSchedule'
import { gameConfig, DEBUG_MODE } from './game/config'
import { clearSave, loadGame, saveGame } from './game/save'
import { audioManager } from './game/audio'
import { hourHandAngleFromTime, minuteHandAngleFromTime, timeFromClockHandPoint } from './game/clock'
import { canManuallyControlGrandClock, getAltarPhotoState, getMemoryCount, getPuzzleDependencyChecklist, getTeaDrawerState, getVisibleHotspots, reducer, shouldShowCeremonyNavCue } from './game/logic'
import type { AreaId, GameAction, GameState, Hotspot, Puzzle } from './game/types'
import type { ClockHandKind } from './game/clock'

const dispatchAndSave = (dispatch: React.Dispatch<GameAction>, action: GameAction) => dispatch(action)
const focusOnlyPuzzleIds = new Set(['p01_waiting_room', 'p02_ceremony', 'p03_reception', 'p04_sheet_overlay', 'p05_piano', 'p06_grand_clock', 'p07_garden_final'])

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadGame)
  const [debugOpen, setDebugOpen] = useState(false)
  const [showHotspots, setShowHotspots] = useState(false)
  const [activeFocus, setActiveFocus] = useState<string | null>(null)
  const [activeItemFocus, setActiveItemFocus] = useState<string | null>(null)

  useEffect(() => {
    saveGame(state)
  }, [state])

  const currentArea = areas[state.currentArea]
  const visibleHotspots = useMemo(() => getVisibleHotspots(state), [state])
  const selectedItem = state.selectedItemId ? state.inventory[state.selectedItemId] : null

  const send = (action: GameAction) => dispatchAndSave(dispatch, action)

  const resetWithConfirm = () => {
    if (confirm('保存データを消して、最初から遊びますか？')) {
      clearSave()
      send({ type: 'RESET_ALL' })
    }
  }

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
          selectedItemName={selectedItem?.name ?? null}
          onFocus={setActiveFocus}
          onItemFocus={setActiveItemFocus}
          onAction={send}
        />
      )}
      {state.screen === 'normalEnd' && <NormalEnd state={state} onContinue={() => send({ type: 'START_GAME' })} onTitle={() => send({ type: 'SHOW_TITLE' })} />}
      {state.screen === 'photoE' && <PhotoEReveal state={state} onContinue={() => send({ type: 'GO_TRUE_END' })} />}
      {state.screen === 'trueEnd' && <TrueEnd state={state} onTitle={() => send({ type: 'SHOW_TITLE' })} />}
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
  selectedItemName,
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
  selectedItemName: string | null
  onFocus: (focusId: string | null) => void
  onItemFocus: (itemId: string | null) => void
  onAction: (action: GameAction) => void
}) {
  const focusHotspot = visibleHotspots.find((hotspot) => hotspot.focusScene?.id === activeFocus)
  const background = state.worldMode === 'memory' ? currentArea.memoryBackground : currentArea.emptyBackground
  const selectedItem = state.selectedItemId ? state.inventory[state.selectedItemId] : null

  return (
    <section className="gameScreen">
      <header className="topBar">
        <div className="roomTitle">
          <p className="eyebrow">{currentArea.chapter}</p>
          <h2>{currentArea.name}</h2>
        </div>
        <div className="hud">
          <ClockWidget state={state} />
          <MemoryMeter state={state} />
        </div>
      </header>

      <div className={`stage ${state.worldMode} scene-${background}`} aria-label={`${currentArea.name} ${background}`}>
        <div className="stageVignette" aria-hidden="true" />
        {currentArea.areaId === 'garden' && <GardenStageLayer state={state} />}
        {visibleHotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className={`hotspot ${showHotspots ? 'visible' : ''}`}
            style={{
              left: `${hotspot.position.x}%`,
              top: `${hotspot.position.y}%`,
              width: `${hotspot.position.width}%`,
              height: `${hotspot.position.height}%`,
            }}
            aria-label={hotspot.label}
            onClick={() => {
              if (hotspot.id === 'garden-gate' && (state.puzzles.p07_garden_final?.status === 'solved' || state.gardenFinal.gateState === 'open')) {
                onAction({ type: 'OPEN_GARDEN_GATE' })
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

      {focusHotspot?.focusScene && (
        <div className="focusScene" role="dialog" aria-modal="true">
          <div>
            <p className="eyebrow">Focus Scene</p>
            <h3>{focusHotspot.focusScene.title}</h3>
            <p>{focusHotspot.focusScene.description}</p>
            {focusHotspot.id === 'tea-table' && <TeaTimeFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'altar' && <CandleFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'seating-chart' && <SeatingChartFocus />}
            {focusHotspot.id.startsWith('reception-table-') && <ReceptionTableFocus state={state} tableId={focusHotspot.id.replace('reception-table-', '')} onAction={onAction} />}
            {focusHotspot.id === 'reception-box' && <ReceptionBoxFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'framed-picture' && <FramedPictureFocus state={state} />}
            {focusHotspot.id === 'grand-clock' && <GrandClockFocus state={state} onAction={onAction} />}
            {focusHotspot.id === 'piano' && <PianoFocus state={state} onAction={onAction} />}
            {focusHotspot.id.startsWith('garden-object-') && <GardenObjectFocus state={state} objectId={focusHotspot.id.replace('garden-object-', '')} onAction={onAction} />}
            {focusHotspot.id === 'garden-gate' && <GardenGateFocus state={state} onAction={onAction} />}
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

      {activeItemFocus === 'old-invitation' && (
        <div className="focusScene" role="dialog" aria-modal="true">
          <div>
            <p className="eyebrow">Item Focus</p>
            <h3>古い招待状</h3>
            <p>古い招待状だ。当日の流れが記されているが、最後の時刻だけ読み取れない。</p>
            <OldInvitationFocus />
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

      {!activeFocus && !activeItemFocus && <MessageWindow state={state} onClear={() => onAction({ type: 'CLEAR_MESSAGES' })} />}

      <nav className="areaNav" aria-label="Area exits">
        {currentArea.exits.map((exit) => {
          const ceremonyCue = exit.to === 'ceremony' && shouldShowCeremonyNavCue(state)
          return (
            <button
              key={exit.to}
              type="button"
              className={ceremonyCue ? 'ceremonyCue' : undefined}
              disabled={Boolean(exit.unlockCondition && !exit.unlockCondition(state))}
              onClick={() => {
                onFocus(null)
                onAction({ type: 'MOVE', areaId: exit.to })
              }}
            >
              {exit.label}
            </button>
          )
        })}
      </nav>

      <Inventory state={state} selectedItemName={selectedItemName} onInspectItem={onItemFocus} onAction={onAction} />
      <MemoryGallery state={state} onInspectMemory={(memoryId) => onItemFocus(`memory:${memoryId}`)} />

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
  const gateOpen = state.puzzles.p07_garden_final?.status === 'solved' || state.gardenFinal.gateState === 'open'
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
      <span className={`gardenStageGate ${gateOpen ? 'open' : 'locked'}`} />
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
                <span className="sweetIcon" aria-hidden="true">{pair.sweetIcon}</span>
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
                  <span className="cupIcon" aria-hidden="true">{drink.drinkIcon}</span>
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
          <span className="drawerKnob" />
        </span>
        <span>
          <strong>小さな引き出し</strong>
          <small>{drawerState === 'locked' ? '閉じている' : drawerState === 'open-with-photo' ? '古い写真が見える' : '空になっている'}</small>
        </span>
      </button>
    </div>
  )
}

function CandleFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const puzzle = state.puzzles.p02_ceremony
  const solved = puzzle?.status === 'solved'
  const available = puzzle?.status === 'available'
  const litIds = solved ? new Set(ceremonyCandles.map((candle) => candle.id)) : new Set(state.ceremonyCandles.lit)
  const altarPhotoState = getAltarPhotoState(state)

  return (
    <div className="candlePuzzle">
      <div className="candleHeader">
        <span>{solved ? 'solved' : puzzle?.status ?? 'locked'}</span>
        <p>{solved ? '四つの灯が、今も祭壇を照らしている。' : '会場で見た形を思い出しながら、順に火を灯す。'}</p>
      </div>
      <div className="candleGrid" aria-label="誓いの灯">
        {ceremonyCandles.map((candle) => {
          const lit = litIds.has(candle.id)
          return (
            <button
              key={candle.id}
              type="button"
              className={`candleButton ${candle.shape} ${lit ? 'lit' : ''}`}
              disabled={!available || solved || lit}
              aria-pressed={lit}
              aria-label={`${candle.name} ${lit ? '点灯' : '消灯'}`}
              title={candle.description}
              onClick={() => onAction({ type: 'LIGHT_CEREMONY_CANDLE', candleId: candle.id })}
            >
              <span className="flame" aria-hidden="true">{lit ? '火' : ''}</span>
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
    <div className="seatingChartPuzzle">
      <div className="receptionHint">
        <span>Seating Chart</span>
        <p>テーブル名とモチーフ、席ごとの数字を確認できる。</p>
      </div>
      <div className="seatingChartGrid">
        {receptionTables.map((table) => (
          <section key={table.id} className="chartTable">
            <header>
              <strong>{table.name}</strong>
              <span>{table.motif}</span>
            </header>
            <RoundSeatMap table={table} mode="chart" />
          </section>
        ))}
      </div>
    </div>
  )
}

function ReceptionTableFocus({ state, tableId, onAction }: { state: GameState; tableId: string; onAction: (action: GameAction) => void }) {
  const table = getReceptionTable(tableId)
  if (!table) return null
  const discovered = state.receptionTables.discoveredAnomalies[table.id] === table.targetSeatId

  return (
    <div className="receptionTablePuzzle">
      <div className="receptionHint">
        <span>{discovered ? 'found' : 'inspect'}</span>
        <p>{table.motif}をモチーフにした装花。ひとつだけ、他の席と違うところがある。</p>
      </div>
      <RoundSeatMap table={table} mode="inspect" discovered={discovered} onSeat={(seatId) => onAction({ type: 'DISCOVER_RECEPTION_ANOMALY', tableId: table.id, seatId })} />
    </div>
  )
}

function RoundSeatMap({
  table,
  mode,
  discovered = false,
  onSeat,
}: {
  table: (typeof receptionTables)[number]
  mode: 'chart' | 'inspect'
  discovered?: boolean
  onSeat?: (seatId: string) => void
}) {
  return (
    <div className={`roundSeatMap ${mode}`}>
      <div className={`tableCenter ${table.id}`}>
        <strong>{table.motifIcon}</strong>
        <span>{table.name}</span>
      </div>
      {table.seats.map((seat) => {
        const isAnomaly = seat.id === table.targetSeatId
        const showAnomaly = mode === 'inspect' && isAnomaly
        return (
          <button
            key={seat.id}
            type="button"
            className={`seatButton ${showAnomaly ? table.anomalyType : ''} ${discovered && isAnomaly ? 'discovered' : ''}`}
            style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            disabled={mode === 'chart'}
            aria-label={`${table.name} ${seat.label}${mode === 'chart' ? ` number ${seat.digit}` : ''}`}
            onClick={() => onSeat?.(seat.id)}
          >
            <span className="seatLabel">{seat.label}</span>
            {mode === 'chart' ? <strong>{seat.digit}</strong> : <SeatSetting anomalyType={showAnomaly ? table.anomalyType : undefined} />}
          </button>
        )
      })}
    </div>
  )
}

function SeatSetting({ anomalyType }: { anomalyType?: string }) {
  return (
    <span className={`seatSetting ${anomalyType ?? ''}`} aria-hidden="true">
      <span className="plate" />
      {anomalyType !== 'missing-glass' && <span className="glass" />}
      <span className="napkin" />
      <span className="chair" />
      {anomalyType === 'petals' && <span className="petal" />}
    </span>
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
              <span>{table.motif}</span>
              <button type="button" disabled={solved} aria-label={`${table.motif} digit up`} onClick={() => onAction({ type: 'SET_P03_LOCK_DIGIT', index, value: state.receptionTables.lockInput[index] + 1 })}>+</button>
              <strong>{state.receptionTables.lockInput[index]}</strong>
              <button type="button" disabled={solved} aria-label={`${table.motif} digit down`} onClick={() => onAction({ type: 'SET_P03_LOCK_DIGIT', index, value: state.receptionTables.lockInput[index] - 1 })}>-</button>
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
      <div className="framedPicture" aria-label={completed ? '完成したピアノの絵' : '未完成のピアノの絵'}>
        <div className="pictureSky" aria-hidden="true" />
        <div className="symbolOrder" aria-label="絵に描かれた記号の順番">
          {getOverlaySymbolSequence().map((symbol, index) => (
            <span key={`${symbol}-${index}`}>{symbol}</span>
          ))}
        </div>
        <KeyboardBaseLayer />
        {completed && <TransparentSheetLayer />}
      </div>
    </div>
  )
}

function KeyboardBaseLayer() {
  return (
    <div className="pictureKeyboard base">
      {Array.from({ length: pianoOverlayPuzzleData.whiteKeyCount }, (_, index) => (
        <span key={index} className="whiteKeyOutline">
          {index === pianoOverlayPuzzleData.cReferenceKeyIndex && <strong aria-label="基準点">{pianoReferenceMark}</strong>}
        </span>
      ))}
    </div>
  )
}

function TransparentSheetLayer() {
  return (
    <div className="transparentSheetLayer">
      <div className="blackKeyLayer" aria-hidden="true">
        {pianoOverlayPuzzleData.blackKeyPositions.map((position) => (
          <span key={position} className="blackKeyMark" style={{ left: `${((position + 1) / pianoOverlayPuzzleData.whiteKeyCount) * 100}%` }} />
        ))}
      </div>
      <div className="sheetSymbols">
        {pianoOverlayPuzzleData.symbols.map((symbol) => (
          <span key={symbol.id} style={{ left: `${((symbol.keyIndex + 0.5) / pianoOverlayPuzzleData.whiteKeyCount) * 100}%` }}>
            {symbol.symbol}
          </span>
        ))}
      </div>
    </div>
  )
}

function OldInvitationFocus() {
  return (
    <div className="oldInvitationPaper">
      <div className="invitationHeader">
        <span>Maison Symphonique</span>
        <strong>TODAY&apos;S SCHEDULE</strong>
      </div>
      <ol className="invitationSchedule" aria-label="Today's schedule on the old invitation">
        {oldInvitationSchedule.map((entry) => (
          <li key={entry.id} className={entry.time === null ? 'missingTime' : ''}>
            <span className={`scheduleIcon ${entry.iconId}`} aria-hidden="true" />
            <time aria-label={entry.time ?? 'time missing'}>{entry.time ?? '--:--'}</time>
            <strong>{entry.label}</strong>
          </li>
        ))}
      </ol>
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
          <button key={photo.id} type="button" onClick={() => onInspectMemory(photo.memoryId)}>
            <span>{photo.title}</span>
            <small>{state.memories[photo.memoryId].description}</small>
          </button>
        ))}
      </div>
    </aside>
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

  return (
    <div className="photoFocus">
      <h3>{photo.title}</h3>
      <div className={`oldPhotoComposition ${object.id} ${photo.id}`}>
        <div className="photoRoom">
          {photo.sceneElements.map((element) => <span key={element}>{element}</span>)}
        </div>
        <div className={`photoGardenObject ${object.id}`} aria-label={object.name}>
          <span className="photoObjectIcon" aria-hidden="true" />
          <span>{object.name}</span>
          <small>{object.photoFeature}</small>
        </div>
        {photo.clockTime && <PhotoClock time={photo.clockTime} />}
      </div>
      <p>{photo.sourceArea}で見つけた古い写真。庭のものらしい装飾と、小さな時計が写っている。</p>
    </div>
  )
}

function PhotoClock({ time }: { time: string }) {
  const minuteDeg = minuteHandAngleFromTime(time)
  const hourDeg = hourHandAngleFromTime(time)

  return (
    <div className="photoClock" aria-label={`写真に写った時計 ${time}`}>
      <span className="photoClockDial" aria-hidden="true">
        <i className="clockHand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        <i className="clockHand minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />
      </span>
      <span>{time}</span>
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
      <div className={`gardenObjectIllustration ${object.id}`} aria-hidden="true">
        <span />
      </div>
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
      <div className="gateIllustration" aria-hidden="true">
        <span className="gateLock" />
        <span className="gatePanel left" />
        <span className="gatePanel right" />
      </div>
      <p>{open ? '門が開いている。' : '重い鉄の門だ。固く閉ざされている。'}</p>
      {open && <button type="button" onClick={() => onAction({ type: 'OPEN_GARDEN_GATE' })}>門をくぐる</button>}
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

function PianoFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const puzzle = state.puzzles.p05_piano
  const solved = puzzle?.status === 'solved'
  const available = puzzle?.status === 'available'
  const [pressedKey, setPressedKey] = useState<number | null>(null)
  const [phraseReset, setPhraseReset] = useState(false)
  const [autoPlaying, setAutoPlaying] = useState(false)
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
          onClick={() => {
            if (state.selectedItemId === 'small-key') {
              onAction({ type: 'USE_SELECTED_ITEM', targetId: 'piano-keyhole' })
              return
            }
            onAction({ type: 'EXAMINE_PIANO_KEYHOLE' })
          }}
        >
          <span aria-hidden="true" />
        </button>
      </div>
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
  if (state.messageQueue.length === 0) return null
  return (
    <div className="messageWindow">
      {state.messageQueue.map((message, index) => <p key={index}>{message}</p>)}
      <button type="button" onClick={onClear}>閉じる</button>
    </div>
  )
}

function Inventory({
  state,
  selectedItemName,
  onInspectItem,
  onAction,
}: {
  state: GameState
  selectedItemName: string | null
  onInspectItem: (itemId: string) => void
  onAction: (action: GameAction) => void
}) {
  const obtainedItems = Object.values(state.inventory).filter((item) => item.obtained && !item.consumed)
  return (
    <aside className="inventory">
      <h3>所持品</h3>
      {selectedItemName && <p className="inventorySelection">選択中: {selectedItemName}</p>}
      <div className="inventoryGrid">
        {obtainedItems.length === 0 && <span className="emptyText">まだ何も手にしていない。</span>}
        {obtainedItems.map((item) => (
          <div key={item.itemId} className="inventoryItem">
            <button type="button" className={state.selectedItemId === item.itemId ? 'selected' : ''} onClick={() => onAction({ type: 'SELECT_ITEM', itemId: state.selectedItemId === item.itemId ? null : item.itemId })}>
              <span>{item.name}</span>
              <small>{item.description}</small>
            </button>
            {item.itemId === 'old-invitation' && (
              <button type="button" className="inspectItemButton" onClick={() => onInspectItem(item.itemId)}>調べる</button>
            )}
          </div>
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
    <section className="readingScreen ending">
      <p className="eyebrow">TRUE END</p>
      {trueEndingText.body.map((line) => <p key={line}>{line}</p>)}
      <h2>TRUE END</h2>
      <p className="endingCouple">{coupleDisplayName}</p>
      <p className="endingDate">{weddingDateDisplay}</p>
      <h2>September 23</h2>
      <p>最後の演出は、Phase 2以降で結婚式当日の写真とともに実装します。</p>
      <MemoryMeter state={state} />
      <button type="button" onClick={onTitle}>タイトルへ</button>
    </section>
  )
}

function DebugPanel({ state, showHotspots, onToggleHotspots, onAction }: { state: GameState; showHotspots: boolean; onToggleHotspots: () => void; onAction: (action: GameAction) => void }) {
  const areaIds = Object.keys(areas) as AreaId[]
  const memoryIds = Object.keys(state.memories)
  const puzzleIds = Object.keys(state.puzzles)
  const [debugTime, setDebugTime] = useState(state.clockState.currentTime)

  return (
    <aside className="debugPanel">
      <header>
        <h3>DEBUG PANEL</h3>
        <button type="button" onClick={onToggleHotspots}>Hotspots {showHotspots ? 'ON' : 'OFF'}</button>
      </header>
      <DebugState state={state} />
      <DebugGroup title="Area">
        {areaIds.map((areaId) => <button key={areaId} type="button" onClick={() => onAction({ type: 'MOVE', areaId })}>{areas[areaId].name}</button>)}
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
        <button type="button" onClick={() => receptionTables.forEach((table) => onAction({ type: 'DISCOVER_RECEPTION_ANOMALY', tableId: table.id, seatId: table.targetSeatId }))}>Discover all anomalies</button>
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
        <button type="button" onClick={() => { clearSave(); onAction({ type: 'RESET_ALL' }) }}>完全リセット</button>
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
