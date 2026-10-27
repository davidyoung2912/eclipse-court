import { useState } from 'react'
import { shareOrCopy } from '../share'
import { Icon } from './menus/icons'

interface Props {
  label: string
  /** Builds the link when tapped, so a challenge gets a fresh seed each time. */
  link: () => string
  title: string
}

const DONE = { shared: 'Shared', copied: 'Link copied', failed: 'Could not share' } as const

/** A button that shares a link through the system sheet, or copies it, and says which happened. */
export function ShareButton({ label, link, title }: Props) {
  const [note, setNote] = useState<string | null>(null)
  return (
    <button onClick={async () => setNote(DONE[await shareOrCopy(title, link())])}>
      <Icon name="chain" />{note ?? label}
    </button>
  )
}
