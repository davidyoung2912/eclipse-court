import { useState } from 'react'
import { Icon } from './icons'

interface Props {
  label: string
  /** Shown once the first tap has armed the button. */
  warning: string
  onReset: () => void
  /** Nothing to reset yet: the button stays visible but cannot be used. */
  disabled?: boolean
}

/** A button that needs a second tap to go through, so progress is not wiped by accident. */
export function ResetButton({ label, warning, onReset, disabled }: Props) {
  const [armed, setArmed] = useState(false)
  if (!armed) return <button className="reset" disabled={disabled} onClick={() => setArmed(true)}><Icon name="undo" />{label}</button>
  return (
    <>
      <p className="tagline" role="alert">{warning}</p>
      <button className="reset" onClick={() => { setArmed(false); onReset() }}><Icon name="check" />Yes, Reset</button>
      <button onClick={() => setArmed(false)}><Icon name="close" />Cancel</button>
    </>
  )
}
