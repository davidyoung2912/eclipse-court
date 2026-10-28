import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'

export interface SegOption<T extends string | number> {
  value: T
  label: string
  icon?: IconName
  /** A small round picture shown in place of the icon, such as an opponent's face. */
  face?: ReactNode
  /** One line shown under the control while this option is selected. */
  hint?: string
  disabled?: boolean
  locked?: boolean
}

interface SegmentedProps<T extends string | number> {
  label: string
  options: readonly SegOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Shown in place of the selected option's hint, such as why an option is unavailable. */
  note?: string
}

/** A row of mutually exclusive options with the chosen one explained underneath. */
export function Segmented<T extends string | number>({ label, options, value, onChange, note }: SegmentedProps<T>) {
  const chosen = options.find((o) => o.value === value)
  return (
    <div className="setup-seg-wrap">
      <div className="setup-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} disabled={o.disabled}
            className={o.value === value ? 'on' : ''} title={o.hint} onClick={() => onChange(o.value)}>
            {o.locked ? <Icon name="lock" /> : o.face ? <span className="seg-face">{o.face}</span> : o.icon && <Icon name={o.icon} />}{o.label}
          </button>
        ))}
      </div>
      {(note ?? chosen?.hint) && <p className="setup-hint">{note ?? chosen?.hint}</p>}
    </div>
  )
}

interface ToggleRowProps {
  label: string
  text: string
  checked: boolean
  onChange: () => void
}

/** A yes-or-no option: a name, one line of explanation and a switch. */
export function ToggleRow({ label, text, checked, onChange }: ToggleRowProps) {
  return (
    <label className="setup-toggle">
      <span><strong>{label}</strong><small>{text}</small></span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} />
    </label>
  )
}

interface SectionProps {
  title: string
  /** The current value, shown while the section is closed. */
  summary: string
  /** Something in the section differs from the tier's defaults. */
  changed: boolean
  open: boolean
  onToggle: (open: boolean) => void
  children: ReactNode
}

/** A collapsible group of options whose header always shows what is set inside. */
export function Section({ title, summary, changed, open, onToggle, children }: SectionProps) {
  return (
    <details className="setup-section" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>
        <span className="setup-section-title">{title}{changed && <i className="setup-changed" title="Changed from the defaults" aria-label="Changed from the defaults" />}</span>
        <span className="setup-section-value">{summary}</span>
      </summary>
      <div className="setup-section-body">{children}</div>
    </details>
  )
}
