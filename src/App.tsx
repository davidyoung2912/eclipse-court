import { useState } from 'react'
import { newGame, reduce } from './engine/reducer'
import { legalMoves } from './engine/rules/moves'
import { pieceAt } from './engine/rules/moves'
import type { GameState, Pos } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { Dial } from './ui/dial/Dial'

export default function App() {
  const [history, setHistory] = useState<GameState[]>(() => [newGame(Date.now())])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const state = history[history.length - 1]
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === state.turn) ?? null
  const moves = selected ? legalMoves(state, selected) : []

  const push = (s: GameState) => {
    setHistory((h) => [...h, s])
    setSelectedId(null)
  }

  const onSquare = (p: Pos) => {
    if (state.winner) return
    if (selected && moves.some((m) => m.x === p.x && m.y === p.y)) {
      return push(reduce(state, { type: 'move', pieceId: selected.id, to: p }))
    }
    const occ = pieceAt(state, p)
    setSelectedId(occ && occ.court === state.turn ? occ.id : null)
  }

  const duel = state.lastDuel
  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={selected} moves={moves} onSquare={onSquare} />
      <footer className="tray">
        <p className="status">
          {state.winner
            ? state.winner === 'draw' ? 'Draw' : `${state.winner === 'solari' ? 'Solari' : 'Umbral'} wins`
            : duel
              ? `Last duel: ${duel.attackerHp > 0 && duel.defenderHp <= 0 ? 'attacker won' : duel.attackerHp <= 0 && duel.defenderHp > 0 ? 'defender won' : duel.attackerHp <= 0 ? 'both fell' : 'draw, defender holds'}`
              : 'Tap a piece, then a glowing square'}
        </p>
        <div className="buttons">
          <button disabled={history.length < 2} onClick={() => { setHistory((h) => h.slice(0, -1)); setSelectedId(null) }}>Undo</button>
          <button disabled={!!state.winner} onClick={() => push(reduce(state, { type: 'pass' }))}>End turn</button>
          <button onClick={() => { setHistory([newGame(Date.now())]); setSelectedId(null) }}>New game</button>
        </div>
      </footer>
    </main>
  )
}
