import { PERK_INFO, PROMOTIONS } from '../../engine/rules/growth'
import { ROLE_INFO } from '../../engine/data/pieceInfo'
import { ROLE_NAMES } from '../../engine/data/roster'
import type { Court, Perk, PromotionRole } from '../../engine/rules/types'
import { t } from '../../i18n'

export type Prompt =
  | { kind: 'perk'; options: [Perk, Perk]; name: string }
  | { kind: 'promote'; court: Court; name: string }

interface Props {
  prompt: Prompt
  onPerk: (perk: Perk) => void
  onPromote: (role: PromotionRole) => void
}

/** Asks the player to pick a perk for a new Elite or a promotion for a Footsoldier that crossed the board. */
export function GrowthPrompt({ prompt, onPerk, onPromote }: Props) {
  return (
    <div className="confirm" role="dialog" aria-label={prompt.kind === 'perk' ? t('tray.choosePerk') : t('tray.choosePromotion')}>
      {prompt.kind === 'perk' ? (
        <>
          <p className="confirm-title">{t('tray.nowElite', { name: prompt.name })}</p>
          <div className="buttons">
            {prompt.options.map((perk) => (
              <button key={perk} className="primary" onClick={() => onPerk(perk)}>
                <b>{PERK_INFO[perk].name}</b><small>{PERK_INFO[perk].text}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="confirm-title">{t('tray.crossed', { name: prompt.name })}</p>
          <div className="buttons">
            {PROMOTIONS.map((role) => (
              <button key={role} className="primary" onClick={() => onPromote(role)}>
                <b>{ROLE_NAMES[prompt.court][role]}</b><small>{ROLE_INFO[role].move}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
