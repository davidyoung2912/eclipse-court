import { useState } from 'react'
import { shareOrCopy } from '../share'
import { Icon } from './menus/icons'

interface Props {
  label: string
  /** Builds the link when tapped, so a challenge gets a fresh seed each time. */
  link: () => string
  title: string
  /** A line to send with the link, such as a result. */
  text?: string
}

const DONE = { shared: 'Shared', copied: 'Link Copied', failed: 'Could Not Share' } as const

/** A button that shares a link through the system sheet, or copies it, and says which happened. */
export function ShareButton({ label, link, title, text }: Props) {
  const [note, setNote] = useState<string | null>(null)
  return (
    <button onClick={async () => setNote(DONE[await shareOrCopy(title, link(), text)])}>
      <Icon name="chain" />{note ?? label}
    </button>
  )
}
