import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import './App.css'
import { areas } from './game/data/areas'
import { gameConfig, DEBUG_MODE } from './game/config'
import { clearSave, loadGame, saveGame } from './game/save'
import { createClockDragSession, updateClockDragSession } from './game/clock'
import { getMemoryCount, getVisibleHotspots, reducer } from './game/logic'
import type { AreaId, GameAction, GameState, Hotspot, Puzzle } from './game/types'
import type { ClockDragSession } from './game/clock'

const dispatchAndSave = (dispatch: React.Dispatch<GameAction>, action: GameAction) => dispatch(action)

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadGame)
  const [debugOpen, setDebugOpen] = useState(false)
  const [showHotspots, setShowHotspots] = useState(false)
  const [activeFocus, setActiveFocus] = useState<string | null>(null)

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
          showHotspots={DEBUG_MODE && showHotspots}
          selectedItemName={selectedItem?.name ?? null}
          onFocus={setActiveFocus}
          onAction={send}
        />
      )}
      {state.screen === 'normalEnd' && <NormalEnd state={state} onContinue={() => send({ type: 'START_GAME' })} onTitle={() => send({ type: 'SHOW_TITLE' })} />}
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
  showHotspots,
  selectedItemName,
  onFocus,
  onAction,
}: {
  state: GameState
  currentArea: (typeof areas)[AreaId]
  visibleHotspots: Hotspot[]
  activeFocus: string | null
  showHotspots: boolean
  selectedItemName: string | null
  onFocus: (focusId: string | null) => void
  onAction: (action: GameAction) => void
}) {
  const focusHotspot = visibleHotspots.find((hotspot) => hotspot.focusScene?.id === activeFocus)
  const background = state.worldMode === 'memory' ? currentArea.memoryBackground : currentArea.emptyBackground

  return (
    <section className="gameScreen">
      <header className="topBar">
        <div>
          <p className="eyebrow">{currentArea.chapter}</p>
          <h2>{currentArea.name}</h2>
        </div>
        <div className="hud">
          <ClockWidget state={state} />
          <MemoryMeter state={state} />
        </div>
      </header>

      <div className={`stage ${state.worldMode}`} aria-label={`${currentArea.name} ${background}`}>
        <div className="placeholderScene">
          <span>{background}</span>
          <small>{state.worldMode === 'memory' ? 'Memory World placeholder' : 'Empty World placeholder'}</small>
        </div>
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
              if (state.selectedItemId && hotspot.useTarget) {
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
            {focusHotspot.id === 'grand-clock' && <GrandClockFocus state={state} onAction={onAction} />}
            {state.messageQueue.length > 0 && (
              <div className="focusMessage" aria-live="polite">
                {state.messageQueue.map((message) => <p key={message}>{message}</p>)}
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

      {!activeFocus && <MessageWindow state={state} onClear={() => onAction({ type: 'CLEAR_MESSAGES' })} />}

      <nav className="areaNav" aria-label="Area exits">
        {currentArea.exits.map((exit) => (
          <button key={exit.to} type="button" disabled={Boolean(exit.unlockCondition && !exit.unlockCondition(state))} onClick={() => onAction({ type: 'MOVE', areaId: exit.to })}>
            {exit.label}
          </button>
        ))}
      </nav>

      <Inventory state={state} selectedItemName={selectedItemName} onAction={onAction} />

      <section className="placeholderPuzzles">
        <h3>Placeholder Puzzle</h3>
        {Object.values(state.puzzles)
          .filter((puzzle) => puzzle.areaId === state.currentArea)
          .map((puzzle) => (
            <PuzzleRow key={puzzle.puzzleId} puzzle={puzzle} onSolve={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId: puzzle.puzzleId })} />
          ))}
        {state.currentArea === 'garden' && state.puzzles['garden-placeholder'].status === 'solved' && state.worldMode === 'empty' && (
          <button type="button" onClick={() => onAction({ type: 'GO_NORMAL_END' })}>NORMAL ENDへ</button>
        )}
        {state.worldMode === 'memory' && state.currentArea === 'garden' && (
          <button type="button" onClick={() => onAction({ type: 'GO_TRUE_END' })}>TRUE ENDへ</button>
        )}
      </section>
    </section>
  )
}

function ClockWidget({ state }: { state: GameState }) {
  const [hour, minute] = state.clockState.currentTime.split(':').map(Number)
  const minuteDeg = minute * 6
  const hourDeg = ((hour % 12) + minute / 60) * 30

  return (
    <div className="clockWidget">
      <button
        type="button"
        className="clockFace"
        aria-label="大時計"
      >
        <span className="clockHand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        {state.clockState.handAttached && <span className="clockHand minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />}
      </button>
      <span>{state.clockState.currentTime}</span>
    </div>
  )
}

function GrandClockFocus({ state, onAction }: { state: GameState; onAction: (action: GameAction) => void }) {
  const dragSessionRef = useRef<ClockDragSession | null>(null)
  const [hour, minute] = state.clockState.currentTime.split(':').map(Number)
  const minuteDeg = minute * 6
  const hourDeg = ((hour % 12) + minute / 60) * 30
  const canManipulate = state.clockState.canManualRotate && state.clockState.handAttached

  useEffect(() => {
    if (!canManipulate) dragSessionRef.current = null
  }, [canManipulate])

  return (
    <div className="grandClockFocus">
      <div className="clockReadout">
        <span>TIME</span>
        <strong>{state.clockState.currentTime}</strong>
      </div>
      <button
        type="button"
        className={`largeClockFace ${canManipulate ? 'manual' : ''}`}
        aria-label="大時計の長針"
        onPointerDown={(event) => {
          if (!canManipulate) return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          dragSessionRef.current = createClockDragSession(
            { x: event.clientX, y: event.clientY },
            event.currentTarget.getBoundingClientRect(),
            state.clockState.currentTime,
          )
        }}
        onPointerMove={(event) => {
          const dragSession = dragSessionRef.current
          if (!dragSession || !canManipulate) return
          event.preventDefault()
          const next = updateClockDragSession(
            dragSession,
            { x: event.clientX, y: event.clientY },
            event.currentTarget.getBoundingClientRect(),
          )
          dragSessionRef.current = next.session
          onAction({ type: 'SET_CLOCK_TIME', time: next.time })
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          dragSessionRef.current = null
        }}
        onPointerCancel={() => { dragSessionRef.current = null }}
      >
        <span className="clockHand hour large" style={{ transform: `rotate(${hourDeg}deg)` }} />
        {state.clockState.handAttached && <span className="clockHand minute large" style={{ transform: `rotate(${minuteDeg}deg)` }} />}
        {!state.clockState.handAttached && <span className="missingHand">長針なし</span>}
      </button>
      {canManipulate && <p className="clockHint">長針を反時計回りへ戻せる。</p>}
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
      {state.messageQueue.map((message) => <p key={message}>{message}</p>)}
      <button type="button" onClick={onClear}>閉じる</button>
    </div>
  )
}

function Inventory({ state, selectedItemName, onAction }: { state: GameState; selectedItemName: string | null; onAction: (action: GameAction) => void }) {
  const obtainedItems = Object.values(state.inventory).filter((item) => item.obtained && !item.consumed)
  return (
    <aside className="inventory">
      <h3>Inventory</h3>
      <p>{selectedItemName ? `選択中: ${selectedItemName}` : 'アイテム未選択'}</p>
      <div className="inventoryGrid">
        {obtainedItems.length === 0 && <span className="emptyText">空</span>}
        {obtainedItems.map((item) => (
          <button key={item.itemId} type="button" className={state.selectedItemId === item.itemId ? 'selected' : ''} onClick={() => onAction({ type: 'SELECT_ITEM', itemId: state.selectedItemId === item.itemId ? null : item.itemId })}>
            <span>{item.name}</span>
            <small>{item.description}</small>
          </button>
        ))}
      </div>
    </aside>
  )
}

function PuzzleRow({ puzzle, onSolve }: { puzzle: Puzzle; onSolve: () => void }) {
  return (
    <div className="puzzleRow">
      <span>{puzzle.title}</span>
      <strong>{puzzle.status}</strong>
      <button type="button" disabled={puzzle.status === 'solved'} onClick={onSolve}>Solved</button>
    </div>
  )
}

function NormalEnd({ state, onContinue, onTitle }: { state: GameState; onContinue: () => void; onTitle: () => void }) {
  return (
    <section className="readingScreen ending">
      <p className="eyebrow">NORMAL END</p>
      <h2>閉宴</h2>
      <p>2026年9月23日。</p>
      <p>長い一日は、こうして終わった。</p>
      <MemoryMeter state={state} />
      <p>まだ何か残っている。</p>
      <div className="buttonRow">
        <button type="button" onClick={onContinue}>Continue</button>
        <button type="button" className="secondary" onClick={onTitle}>タイトルへ</button>
      </div>
    </section>
  )
}

function TrueEnd({ state, onTitle }: { state: GameState; onTitle: () => void }) {
  return (
    <section className="readingScreen ending">
      <p className="eyebrow">TRUE END</p>
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
        {puzzleIds.map((puzzleId) => <button key={puzzleId} type="button" onClick={() => onAction({ type: 'SOLVE_PUZZLE', puzzleId })}>{puzzleId}</button>)}
        <button type="button" onClick={() => onAction({ type: 'RESET_PUZZLES' })}>Puzzleリセット</button>
        <button type="button" onClick={() => onAction({ type: 'SOLVE_ALL_PUZZLES' })}>全Puzzle Solved</button>
      </DebugGroup>
      <DebugGroup title="Item">
        <button type="button" onClick={() => onAction({ type: 'OBTAIN_ITEM', itemId: 'clock-hand' })}>長針取得</button>
        <button type="button" onClick={() => onAction({ type: 'CLEAR_INVENTORY' })}>インベントリクリア</button>
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
      manualClockControl: state.clockState.canManualRotate,
      memoryCount: getMemoryCount(state),
      normalEndingCleared: state.normalEndingCleared,
      trueRouteUnlocked: state.trueRouteUnlocked,
      trueEndingCleared: state.trueEndingCleared,
      selectedItem: state.selectedItemId,
      puzzleStates: Object.fromEntries(Object.entries(state.puzzles).map(([id, puzzle]) => [id, puzzle.status])),
      gameFlags: state.flags,
    }, null, 2)}</pre>
  )
}

export default App
