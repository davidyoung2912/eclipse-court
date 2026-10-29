import type { Court, GameState } from '../../engine/rules/types'
import type { GameRecord } from '../../engine/log'
import { confettiCount } from '../../rewardFx'
import { flashesReduced } from '../../settings'
import { replayLink, watchLink } from '../../share'
import { t } from '../../i18n'
import { Icon } from '../menus/icons'
import { ShareButton } from '../ShareButton'
import { Confetti } from './Confetti'
import { ResultBanner, type ResultStat, type ResultTone } from './ResultBanner'
import { RewardLines } from './RewardLines'
import { WinBurst } from './WinBurst'
import { useDialog } from '../../hooks/useDialog'

interface Props {
  hotSeat: boolean
  online: boolean
  human: Court
  foe: Court
  winner: GameState['winner']
  /** The player has never won before: a win now is their first. */
  firstWin: boolean
  result: string
  tone: ResultTone
  stats: ResultStat[]
  rewards: string[]
  /** The named opponent's parting line, when there is one to show. */
  farewell: { name: string; line: string } | null
  canRetry: boolean
  canShareReplay: boolean
  canWatch: boolean
  canReview: boolean
  canGrudge: boolean
  canPlayAgain: boolean
  canSwap: boolean
  rematch: 'none' | 'ask' | 'sent' | 'asked'
  onRematch: () => void
  /** Present when the two games disagreed: the text to copy for a bug report. */
  report?: () => string
  /** The game so far, read when a button needs it. */
  record: () => GameRecord
  onRetry: () => void
  onExit: (winner: GameState['winner'], record: GameRecord, review?: boolean, again?: 'same' | 'swap' | 'grudge') => void
}

/** The game-over dialog: the banner, what was paid, the opponent's farewell and the ways to carry on. */
export function GameOver(p: Props) {
  const { winner, human, hotSeat, online } = p
  const next = winner ?? p.foe
  const box = useDialog<HTMLDivElement>()
  return (
    <div ref={box} className="confirm result" role="dialog" aria-label={t('game.over')}>
      {(hotSeat ? winner !== 'draw' : winner === human) && <WinBurst />}
      {winner === human && !hotSeat && !online && <Confetti count={confettiCount(p.firstWin, flashesReduced())} />}
      <ResultBanner title={p.result} tone={p.tone} stats={p.stats} />
      <RewardLines lines={p.rewards} />
      {p.farewell && <p className="persona-farewell"><b>{p.farewell.name}</b> “{p.farewell.line}”</p>}
      <div className="buttons">
        {p.canRetry && <button onClick={p.onRetry}><Icon name="undo" />{t('game.tryAgain')}</button>}
        {p.report && <button onClick={() => void navigator.clipboard?.writeText(p.report!()).catch(() => {})}><Icon name="chain" />{t('game.copyReport')}</button>}
        {p.canShareReplay && <ShareButton title={t('game.replayTitle')} label={t('game.copyReplay')} link={() => replayLink(p.record())} />}
        {p.canWatch && <ShareButton title={t('game.watchTitle')} label={t('game.copyWatch')} link={() => watchLink(p.record())} />}
        {p.rematch !== 'none' && (
          <button disabled={p.rematch === 'sent'} onClick={p.onRematch}>
            <Icon name="undo" />{p.rematch === 'sent' ? t('game.waitingThem') : p.rematch === 'asked' ? t('game.acceptRematch') : t('game.rematch')}
          </button>
        )}
        {p.canReview && <button onClick={() => p.onExit(next, p.record(), true)}><Icon name="flame" />{t('game.review')}</button>}
        {p.canGrudge && <button onClick={() => p.onExit(winner, p.record(), false, 'grudge')}><Icon name="flame" />{t('game.grudge')}</button>}
        {p.canPlayAgain && <button onClick={() => p.onExit(next, p.record(), false, 'same')}><Icon name="undo" />{t('game.playAgain')}</button>}
        {p.canPlayAgain && p.canSwap && <button onClick={() => p.onExit(next, p.record(), false, 'swap')}><Icon name="cycle" />{t('game.swapSides')}</button>}
        <button className="primary" onClick={() => p.onExit(next, p.record())}><Icon name="onward" />{t('tray.continue')}</button>
      </div>
    </div>
  )
}
