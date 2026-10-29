import { useState } from 'react'
import { PieceArt } from '../../art/PieceArt'
import { encodeChallenge } from '../../engine/challenge'
import { MAX_PACK, MAX_PACK_NAME, cleanPackName, puzzleGoal } from '../../engine/data/pack'
import { addToDraft, clearDraft, keepPack, packSnapshot, removeFromDraft } from '../../packs'
import { t } from '../../i18n'
import {
  applyTool, blankDesign, clearBoard, designChallenge, EDITOR_GOALS, GOAL_INFO, isPuzzleGoal, problems, resize, ROLES, ROUNDS_MAX, setMirror,
  sideOf, TURNS_MAX, umbralPieces, type Design, type EditorGoal, type Tool,
} from '../../engine/data/editor'
import { ROLE_NAMES } from '../../engine/data/roster'
import { cellAt, CELL_EFFECTS, CELL_INFO } from '../../engine/rules/cells'
import { isBeacon, isBlocked, samePos } from '../../engine/rules/board'
import type { Challenge } from '../../engine/challenge'
import type { BoardSize, Court, Pos } from '../../engine/rules/types'
import { challengeLink, packLink } from '../../share'
import { ShareButton } from '../ShareButton'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { CellMark } from '../board/CellMark'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { Segmented, ToggleRow } from './SetupControls'

interface Props {
  design: Design
  onChange: (design: Design) => void
  /** Plays the design against the AI, with nothing recorded. */
  onTest: (challenge: Challenge) => void
  onBack: () => void
}

const same = (a: Tool, b: Tool) => JSON.stringify(a) === JSON.stringify(b)

const TOOLS: { tool: Tool; label: 'wall' | 'beacon' | 'target' | 'erase' }[] = [
  { tool: { kind: 'wall' }, label: 'wall' },
  { tool: { kind: 'beacon' }, label: 'beacon' },
  { tool: { kind: 'target' }, label: 'target' },
  { tool: { kind: 'erase' }, label: 'erase' },
]

const toNumber = (text: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(text))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/** The board and puzzle editor: draw a board, set the armies and the goal, test it, and share it as a challenge. */
export function Editor({ design, onChange, onTest, onBack }: Props) {
  const [tool, setTool] = useState<Tool>({ kind: 'wall' })
  const { size } = design
  const issues = problems(design)
  const puzzle = isPuzzleGoal(design.goal)
  const needsTarget = design.goal === 'escort' || design.goal === 'hold'
  const solari = design.solari
  const umbral = umbralPieces(design)
  const challenge = (seed: number) => designChallenge(design, seed)
  const tools = TOOLS.filter((x) => x.tool.kind !== 'target' || needsTarget)
  const code = issues.length ? '' : encodeChallenge(challenge(1)!)
  const [draft, setDraft] = useState(() => packSnapshot().draft)
  const [packName, setPackName] = useState('')
  const [kept, setKept] = useState(false)
  const name = cleanPackName(packName)
  const edit = (change: () => void) => { change(); setDraft(packSnapshot().draft); setKept(false) }

  return (
    <main className="app menu editor battle-menu">
      <PageArt icon="grid" />
      <h2>{t('editor.title')}</h2>
      <p className="tagline">{t('editor.tagline')}</p>

      <Segmented<BoardSize> label={t('setup.boardSize')} value={size} onChange={(s) => onChange(resize(design, s))}
        options={[{ value: 7, label: '7x7' }, { value: 9, label: '9x9' }]} />

      <h3>{t('editor.paint')}</h3>
      <div className="ed-tools" role="toolbar" aria-label={t('editor.tools')}>
        {tools.map(({ tool: tl, label }) => (
          <button key={label} type="button" aria-pressed={same(tool, tl)} className={same(tool, tl) ? 'on' : ''} onClick={() => setTool(tl)}>{t(`editor.tool.${label}`)}</button>
        ))}
        {CELL_EFFECTS.map((effect) => {
          const tl: Tool = { kind: 'cell', effect }
          return (
            <button key={effect} type="button" aria-pressed={same(tool, tl)} className={`cell-tool cell-${effect}${same(tool, tl) ? ' on' : ''}`} title={CELL_INFO[effect].text} onClick={() => setTool(tl)}>
              {CELL_INFO[effect].name}
            </button>
          )
        })}
      </div>
      {(['solari', 'umbral'] as Court[]).map((court) => (
        <div key={court} className="ed-tools" role="toolbar" aria-label={t('editor.pieces', { court: court === 'solari' ? 'Solari' : 'Umbral' })}>
          {ROLES.map((role) => {
            const tl: Tool = { kind: 'piece', court, role }
            const off = design.mirror && court === 'umbral'
            return (
              <button key={role} type="button" disabled={off} aria-pressed={same(tool, tl)} className={`piece-tool${same(tool, tl) ? ' on' : ''}`} title={ROLE_NAMES[court][role]} onClick={() => setTool(tl)}>
                <svg viewBox="-0.45 -0.45 0.9 0.9" aria-hidden="true"><PieceArt role={role} court={court} /></svg>
                <span>{ROLE_NAMES[court][role]}</span>
              </button>
            )
          })}
        </div>
      ))}

      <svg className="board ed-board" viewBox={`0 0 ${size} ${size}`} role="grid" aria-label={t('editor.boardLabel')}>
        {Array.from({ length: size * size }, (_, i) => {
          const p: Pos = { x: Math.floor(i / size), y: i % size }
          const effect = cellAt(design, p)
          return (
            <g key={i} role="gridcell" aria-label={t('editor.cell', { col: p.x + 1, row: p.y + 1 })} onClick={() => onChange(applyTool(design, tool, p))}>
              <rect x={p.x} y={p.y} width={1} height={1} className={`ed-sq ${(p.x + p.y) % 2 ? 'odd' : 'even'}`} />
              {isBlocked(design, p) && (
                <g className="wall">
                  <rect x={p.x + 0.06} y={p.y + 0.06} width={0.88} height={0.88} rx={0.1} />
                  <path d={`M${p.x + 0.2},${p.y + 0.4}H${p.x + 0.8}M${p.x + 0.2},${p.y + 0.65}H${p.x + 0.8}M${p.x + 0.5},${p.y + 0.4}V${p.y + 0.65}`} />
                </g>
              )}
              {effect && <CellMark effect={effect} cx={p.x + 0.5} cy={p.y + 0.5} round={1} />}
              {isBeacon(p, design.beacons) && <circle cx={p.x + 0.5} cy={p.y + 0.5} r={0.4} className="beacon" />}
              {design.target && samePos(design.target, p) && <rect x={p.x + 0.12} y={p.y + 0.12} width={0.76} height={0.76} rx={0.08} className="ed-goal" />}
            </g>
          )
        })}
        {solari.map((pc) => (
          <g key={`s${pc.x}-${pc.y}`} transform={`translate(${pc.x + 0.5} ${pc.y + 0.5})`} className="ed-piece" pointerEvents="none"><PieceArt role={pc.role} court="solari" /></g>
        ))}
        {umbral.map((pc) => (
          <g key={`u${pc.x}-${pc.y}`} transform={`translate(${pc.x + 0.5} ${pc.y + 0.5})`} className={`ed-piece${design.mirror ? ' ghost' : ''}`} pointerEvents="none"><PieceArt role={pc.role} court="umbral" /></g>
        ))}
      </svg>

      <ToggleRow label={t('editor.mirror')} text={t('editor.mirrorText')} checked={design.mirror} onChange={() => onChange(setMirror(design, !design.mirror))} />

      <h3>{t('editor.goal')}</h3>
      <label className="ed-field">
        <span>{t('editor.howWon')}</span>
        <select value={design.goal} onChange={(e) => onChange({ ...design, goal: e.target.value as EditorGoal })}>
          <optgroup label={t('editor.matchGoals')}>
            {EDITOR_GOALS.filter((g) => !isPuzzleGoal(g)).map((g) => <option key={g} value={g}>{GOAL_INFO[g].name}</option>)}
          </optgroup>
          <optgroup label={t('editor.puzzleGoals')}>
            {EDITOR_GOALS.filter(isPuzzleGoal).map((g) => <option key={g} value={g}>{GOAL_INFO[g].name}</option>)}
          </optgroup>
        </select>
      </label>
      <p className="setup-hint">{GOAL_INFO[design.goal].text}</p>
      {puzzle && (
        <div className="ed-numbers">
          <label className="ed-field"><span>{design.goal === 'survive' ? t('editor.roundsSurvive') : t('editor.roundLimit')}</span>
            <input type="number" min={1} max={ROUNDS_MAX} value={design.rounds} onChange={(e) => onChange({ ...design, rounds: toNumber(e.target.value, 1, ROUNDS_MAX, design.rounds) })} /></label>
          {design.goal === 'hold' && (
            <label className="ed-field"><span>{t('editor.turnsHold')}</span>
              <input type="number" min={1} max={TURNS_MAX} value={design.turns} onChange={(e) => onChange({ ...design, turns: toNumber(e.target.value, 1, TURNS_MAX, design.turns) })} /></label>
          )}
        </div>
      )}
      {!puzzle && (
        <Segmented<Court> label={t('editor.courtOffered')} value={design.side} onChange={(side) => onChange({ ...design, side })}
          options={[{ value: 'solari', label: 'Solari', icon: 'sun' }, { value: 'umbral', label: 'Umbral', icon: 'moon' }]} />
      )}

      {issues.length > 0
        ? <ul className="setup-card ed-problems" role="alert">{issues.map((line) => <li key={line}>{line}</li>)}</ul>
        : <p className="setup-hint">{t('editor.ready', { court: sideOf(design) === 'solari' ? 'Solari' : 'Umbral' })}</p>}

      <div className="menu-buttons stacked">
        <button className="primary" disabled={issues.length > 0} onClick={() => { const c = challenge(Date.now() % 1000000007); if (c) onTest(c) }}>
          <Icon name="play" />{t('editor.test')}
        </button>
        {issues.length === 0 && (
          <ShareButton title={t('editor.shareTitle')} label={t('editor.copyLink')} link={() => challengeLink(challenge(Date.now() % 1000000007)!)} />
        )}
        <button onClick={() => onChange(blankDesign(size))}><Icon name="undo" />{t('editor.reset')}</button>
        <button onClick={() => onChange(clearBoard(design))}><Icon name="close" />{t('editor.clear')}</button>
        <BackButton onClick={onBack} />
      </div>
      <h3>{t('editor.pack')}</h3>
      <p className="setup-hint">{t('editor.packText', { max: MAX_PACK })}</p>
      <div className="menu-buttons stacked">
        <button disabled={issues.length > 0 || !puzzle || draft.length >= MAX_PACK} onClick={() => { const c = challenge(Date.now() % 1000000007); if (c) edit(() => addToDraft(c)) }}>
          <Icon name="puzzle" />{draft.length >= MAX_PACK ? t('editor.packFull') : t('editor.packAdd')}
        </button>
      </div>
      {draft.length > 0 && (
        <>
          <p className="setup-hint">{t('editor.packCount', { count: draft.length })}</p>
          <ol className="setup-card">
            {draft.map((c, i) => {
              const { kind, limit } = puzzleGoal(c)
              return (
                <li key={i}>
                  {t('pack.goalLine', { goal: GOAL_INFO[kind].name, limit })}{' '}
                  <button type="button" onClick={() => edit(() => removeFromDraft(i))}>{t('editor.packRemove')}</button>
                </li>
              )
            })}
          </ol>
          <label className="ed-field"><span>{t('editor.packName')}</span>
            <input type="text" maxLength={MAX_PACK_NAME} value={packName} onChange={(e) => { setPackName(e.target.value); setKept(false) }} /></label>
          <div className="menu-buttons stacked">
            {name && <ShareButton title={t('editor.packShareTitle')} label={t('editor.packLink')} link={() => packLink({ name, puzzles: draft })} />}
            <button disabled={!name} onClick={() => setKept(keepPack({ name, puzzles: draft }))}><Icon name="check" />{kept ? t('editor.packKept') : t('editor.packKeep')}</button>
            <button onClick={() => edit(clearDraft)}><Icon name="close" />{t('editor.packClear')}</button>
          </div>
        </>
      )}
      {code && (
        <>
          <h3>{t('editor.code')}</h3>
          <textarea className="code-box" readOnly rows={3} value={code} aria-label={t('editor.codeLabel')} onFocus={(e) => e.currentTarget.select()} />
        </>
      )}
      <TipCard page="editor" />
    </main>
  )
}
