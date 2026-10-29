import { useEffect, useSyncExternalStore } from 'react'
import { questById, type QuestPeriod } from '../../engine/data/quests'
import { dailySeed } from '../../engine/data/setups'
import { t } from '../../i18n'
import { canRerollQuest, claimQuest, questDone, questsSnapshot, refreshQuests, rerollQuest, subscribeQuests, type QuestSlot } from '../../quests'
import { Bar } from './Bar'
import { Icon } from './icons'

function Row({ slot, period, index, canReroll }: { slot: QuestSlot; period: QuestPeriod; index: number; canReroll: boolean }) {
  const q = questById(slot.id)
  if (!q) return null
  const done = questDone(slot)
  return (
    <li className={`quest${slot.claimed ? ' claimed' : ''}`}>
      <strong>{q.text}</strong> <small>{t('quests.progress', { n: slot.n, target: q.target })}</small>
      <Bar fraction={slot.n / q.target} thin />
      <div className="quest-actions">
        {done && !slot.claimed && <button className="primary" onClick={() => claimQuest(period, index)}><Icon name="star" />{t('quests.claim', { shards: q.shards })}</button>}
        {slot.claimed && <small><Icon name="check" />{t('quests.claimed')}</small>}
        {!done && !slot.claimed && <small>{q.shards} Shards</small>}
        {!slot.claimed && canReroll && <button onClick={() => rerollQuest(period, index)} aria-label={`${t('quests.rerollLabel')}: ${q.text}`}><Icon name="cycle" />{t('quests.reroll')}</button>}
      </div>
    </li>
  )
}

/** The day's and the week's quests, with a claim button for each finished one and one reroll a day. */
export function Quests() {
  useEffect(refreshQuests, [])
  const state = useSyncExternalStore(subscribeQuests, questsSnapshot)
  const canReroll = canRerollQuest(state, dailySeed())
  return (
    <section className="quests" aria-label={t('quests.title')}>
      <h3>{t('quests.title')}</h3>
      {(['daily', 'weekly'] as const).map((period) => {
        const slots = period === 'daily' ? state.daily : state.weekly
        return slots.length > 0 && (
          <div key={period}>
            <h4>{t(`quests.${period}`)}</h4>
            <ul className="mastery-tracks">{slots.map((s, i) => <Row key={s.id} slot={s} period={period} index={i} canReroll={canReroll} />)}</ul>
          </div>
        )
      })}
    </section>
  )
}
