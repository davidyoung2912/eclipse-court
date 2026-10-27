/** A slim progress bar for a fraction from 0 to 1. */
export function Bar({ fraction, thin = false }: { fraction: number; thin?: boolean }) {
  return (
    <div className={`bar${thin ? ' thin' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
      <i style={{ width: `${Math.round(fraction * 100)}%` }} />
    </div>
  )
}
