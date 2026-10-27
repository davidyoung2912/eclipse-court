/** How long the host waits for the guest's answer to open a channel, and the guest for the host to apply it. */
export const CONNECT_MS = 45_000

/** Rejects with `message` if `promise` has not settled within `ms`; `onTimeout` runs first, to tidy up. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string, onTimeout?: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error(message))
    }, ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

/** What to tell a player when the connection could not be made. */
export const NAT_HELP = 'Some networks (mobile data, offices, schools) block direct connections and this game has no relay server. Try the other player on a different network, such as home Wi-Fi.'
