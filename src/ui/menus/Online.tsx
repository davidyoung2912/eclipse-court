import { rtcSupported } from '../../net/rtc'
import { Icon } from './icons'
import { PageArt } from './MenuArt'
import { TipCard } from '../tips/TipCard'
import { BackButton } from './BackButton'
import { t } from '../../i18n'

interface Props {
  onHost: () => void
  onJoin: () => void
  onBack: () => void
}

/** Two players, two devices: one hosts a match, the other joins it. */
export function Online({ onHost, onJoin, onBack }: Props) {
  const supported = rtcSupported()
  return (
    <main className="app menu battle-menu">
      <PageArt icon="chain" />
      <h2>{t('online.title')}</h2>
      <p className="tagline">{t('online.tagline')}</p>
      {!supported && <p role="alert">{t('online.unsupported')}</p>}
      <div className="choices">
        <button className="choice" disabled={!supported} onClick={onHost}>
          <strong><Icon name="swords" />{t('online.host')}</strong>
          <span>{t('online.hostText')}</span>
        </button>
        <button className="choice" disabled={!supported} onClick={onJoin}>
          <strong><Icon name="chain" />{t('online.join')}</strong>
          <span>{t('online.joinText')}</span>
        </button>
      </div>
      <div className="menu-buttons stacked">
        <BackButton onClick={onBack} />
      </div>
      <TipCard page="online" />
    </main>
  )
}
