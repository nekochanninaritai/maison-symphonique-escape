# Maison Symphoniqueからの脱出 / Phase 1

結婚式のエクストラコンテンツとして公開するブラウザ向け脱出ゲームの開発基盤です。

Phase 1では正式な謎、正式背景、最終演出を作り込まず、後続Phaseで差し替えや拡張をしやすい骨格を優先しています。

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

## File Structure

- `src/game/types.ts`: GameState、Area、Hotspot、Item、Puzzle、Memory、Clockの型定義
- `src/game/config.ts`: タイトル、保存キー、saveVersion、DEBUG_MODE
- `src/game/data/areas.ts`: 6エリア、背景キー、Hotspot、Exit
- `src/game/data/items.ts`: アイテム定義
- `src/game/data/memories.ts`: 5つのMemory定義
- `src/game/data/puzzles.ts`: Placeholder Puzzle定義
- `src/game/logic.ts`: reducer、Clock、Puzzle、Memory、Ending、09:23判定
- `src/game/save.ts`: localStorageの保存、読込、削除
- `src/game/audio.ts`: 将来音源用のAudioManager基盤
- `src/App.tsx`: 画面、DEBUG PANEL、Focus Scene、Inventory
- `src/App.css`: Phase 1用UIスタイル
- `src/game/logic.test.ts`: ロジックテスト

## Game Flow

```text
TITLE
↓
PROLOGUE
↓
Entrance
↓
Waiting Room
├ Dressing Room
↓
Ceremony
↓
Reception
↓
Garden
↓
NORMAL END
↓
Clock 09:23
↓
Memory World
↓
TRUE END
```

## Replacing Placeholder Puzzles

正式Puzzleへ置き換える場合は、まず `src/game/data/puzzles.ts` の対象Placeholderを正式ID、タイトル、前提条件、報酬に変更します。

謎の入力UIや判定ロジックが必要になったら、Puzzleごとのコンポーネントを追加し、成功時に `SOLVE_PUZZLE` をdispatchしてください。報酬は `Puzzle.rewards` 経由でMemory、Clock、Flag、Area解禁へ接続します。

## Replacing Backgrounds

Phase 1の背景は `emptyBackground` / `memoryBackground` の文字列キーです。正式画像を入れる場合は `src/assets/backgrounds/` などに画像を置き、`src/game/data/areas.ts` の背景キーを画像パスまたはアセット参照に差し替えてください。

Hotspot座標は `position: { x, y, width, height }` のパーセンテージ指定です。DEBUG PANELの `Hotspots ON/OFF` で位置を可視化しながら調整できます。
