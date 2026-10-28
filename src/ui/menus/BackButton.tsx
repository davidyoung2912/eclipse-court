import { Icon } from './icons'
import { t } from '../../i18n'

interface Props {
  onClick: () => void
  label?: string
}

/** The button that leaves a page for the one before it; it has its own colour so it is easy to find. */
export function BackButton({ onClick, label }: Props) {
  return <button className="back" onClick={onClick}><Icon name="exit" />{label ?? t('common.back')}</button>
}
