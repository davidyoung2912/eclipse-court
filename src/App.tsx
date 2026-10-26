import { useState } from 'react'
import { estimateOdds, newGame, reduce } from './engine/reducer'
import { spellTargets } from './engine/rules/spells'
import { legalMoves } from './engine/rules/moves'
import { pieceAt } from './engine/rules/moves'
import { squareLuminance } from './engine/rules/luminance'
import type { DuelOutcome, GameState, Pos, Spell } from './engine/rules/types'
import { Board } from './ui/board/Board'
import { Dial } from './ui/dial/Dial'
import { AttackConfirm } from './ui/tray/AttackConfirm'
import { SpellBar } from './ui/tray/SpellBar'
import { DuelView, type DuelOptions } from './ui/duel/DuelView'

export default function App() {
  const [history, setHistory] = useState<GameState[]>(() => [newGame(Date.now())])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [options, setOptions] = useState<DuelOptions>({ mirror: false, aimAssist: true, haptics: true })
  const [realtime, setRealtime] = useState(true)
  const [pending, setPending] = useState<{ pieceId: string; to: Pos; confirmed: boolean } | null>(null)
  const [casting, setCasting] = useState<Spell | null>(null)
  const state = history[history.length - 1]
  const selected = state.pieces.find((p) => p.id === selectedId && p.court === state.turn) ?? null
  const targets = casting ? spellTargets(state, state.turn, casting) : null
  const moves = targets ? targets.squares : selected ? legalMoves(state, selected) : []

  const push = (s: GameState) => {
    setHistory((h) => [...h, s])
    setSelectedId(null)
    setCasting(null)
  }

  const pickSpell = (spell: Spell | null) => {
    setSelectedId(null)
    if (spell && spellTargets(state, state.turn, spell).none) return push(reduce(state, { type: 'cast', spell }))
    setCasting(spell)
  }

  const onSquare = (p: Pos) => {
    if (state.winner || pending) return
    if (casting && targets) {
      const occ = pieceAt(state, p)
      if (occ && targets.pieces.includes(occ.id)) return push(reduce(state, { type: 'cast', spell: casting, pieceId: occ.id }))
      if (targets.squares.some((m) => m.x === p.x && m.y === p.y)) return push(reduce(state, { type: 'cast', spell: casting, to: p }))
      return setCasting(null)
    }
    if (selected && moves.some((m) => m.x === p.x && m.y === p.y)) {
      if (pieceAt(state, p)) return setPending({ pieceId: selected.id, to: p, confirmed: false })
      return push(reduce(state, { type: 'move', pieceId: selected.id, to: p }))
    }
    const occ = pieceAt(state, p)
    setSelectedId(occ && occ.court === state.turn ? occ.id : null)
  }

  const duel = state.lastDuel
  const pendingAttacker = pending && state.pieces.find((x) => x.id === pending.pieceId)
  const pendingDefender = pending && pieceAt(state, pending.to)
  const confirmAttack = () => {
    if (!pending) return
    if (realtime) return setPending({ ...pending, confirmed: true })
    push(reduce(state, { type: 'move', pieceId: pending.pieceId, to: pending.to }))
    setPending(null)
  }
  const finishDuel = (outcome: DuelOutcome) => {
    if (pending) push(reduce(state, { type: 'move', pieceId: pending.pieceId, to: pending.to, duel: outcome }))
    setPending(null)
  }
  const toggle = (key: keyof DuelOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }))
  return (
    <main className="app">
      <Dial state={state} />
      <Board state={state} selected={selected} moves={moves} targetIds={targets?.pieces ?? []} onSquare={onSquare} />
      {pending && !pending.confirmed && pendingAttacker && pendingDefender && (
        <AttackConfirm attacker={pendingAttacker} defender={pendingDefender} live={realtime}
          luminance={squareLuminance(state, pending.to)}
          odds={estimateOdds(pendingAttacker, pendingDefender, squareLuminance(state, pending.to))}
          onConfirm={confirmAttack} onCancel={() => setPending(null)} />
      )}
      {pending?.confirmed && pendingAttacker && pendingDefender && (
        <DuelView attacker={pendingAttacker} defender={pendingDefender} luminance={squareLuminance(state, pending.to)}
          options={options} onDone={finishDuel} />
      )}
      <footer className="tray">
        {!state.winner && !pending && <SpellBar state={state} active={casting} onPick={pickSpell} />}
        <div className="options">
          <label><input type="checkbox" checked={realtime} onChange={() => setRealtime((r) => !r)} /> Live duels</label>
          <label><input type="checkbox" checked={options.mirror} onChange={() => toggle('mirror')} /> Mirror</label>
          <label><input type="checkbox" checked={options.aimAssist} onChange={() => toggle('aimAssist')} /> Aim assist</label>
          <label><input type="checkbox" checked={options.haptics} onChange={() => toggle('haptics')} /> Haptics</label>
        </div>
        <p className="status">
          {state.winner
            ? state.winner === 'draw' ? 'Draw' : `${state.winner === 'solari' ? 'Solari' : 'Umbral'} wins`
            : duel
              ? `Last duel: ${duel.attackerHp > 0 && duel.defenderHp <= 0 ? 'attacker won' : duel.attackerHp <= 0 && duel.defenderHp > 0 ? 'defender won' : duel.attackerHp <= 0 ? 'both fell' : 'draw, defender holds'}`
              : 'Tap a piece, then a glowing square'}
        </p>
        <div className="buttons">
          <button disabled={history.length < 2} onClick={() => { setHistory((h) => h.slice(0, -1)); setSelectedId(null); setCasting(null) }}>Undo</button>
          <button disabled={!!state.winner} onClick={() => push(reduce(state, { type: 'pass' }))}>End turn</button>
          <button onClick={() => { setHistory([newGame(Date.now())]); setSelectedId(null) }}>New game</button>
        </div>
      </footer>
    </main>
  )
}
