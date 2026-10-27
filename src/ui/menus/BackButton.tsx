import { Icon } from './icons'

interface Props {
  onClick: () => void
  label?: string
}

/** The button that leaves a page for the one before it; it has its own colour so it is easy to find. */
export function BackButton({ onClick, label = 'Back' }: Props) {
  return <button className="back" onClick={onClick}><Icon name="back" />{label}</button>
}
