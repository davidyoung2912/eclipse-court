import { useState } from 'react'
import { Icon } from './icons'

interface Props {
  label: string
  /** Shown once the first tap has armed the button. */
  warning: string
  onReset: () => void
}

/** A button that needs a second tap to go through, so progress is not wiped by accident. */
export function ResetButton({ label, warning, onReset }: Props) {
  const [armed, setArmed] = useState(false)
  if (!armed) return <button onClick={() => setArmed(true)}><Icon name="undo" />{label}</button>
  return (
    <>
      <p className="tagline" role="alert">{warning}</p>
      <button className="primary" onClick={() => { setArmed(false); onReset() }}><Icon name="check" />Yes, Reset</button>
      <button onClick={() => setArmed(false)}><Icon name="close" />Cancel</button>
    </>
  )
}
