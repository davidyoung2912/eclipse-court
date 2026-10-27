/**
 * A two-way channel of text messages between the players. WebRTC is one implementation; the
 * loopback pair below stands in for it in tests. Messages sent before a handler is set are held
 * and delivered once it is.
 */
export interface Transport {
  send: (text: string) => void
  onMessage: (handler: (text: string) => void) => void
  onClose: (handler: () => void) => void
  /** Closes both ends; the far end's close handler is called. */
  close: () => void
}

interface End {
  inbox: string[]
  message?: (text: string) => void
  closed: boolean
  closeHandler?: () => void
}

/** Two connected transports whose messages arrive asynchronously, in order, as on a real channel. */
export function loopbackPair(): [Transport, Transport] {
  const ends: [End, End] = [{ inbox: [], closed: false }, { inbox: [], closed: false }]
  const drain = (end: End) => {
    while (end.message && end.inbox.length) end.message(end.inbox.shift()!)
  }
  const shut = (end: End) => {
    if (end.closed) return
    end.closed = true
    queueMicrotask(() => end.closeHandler?.())
  }
  const make = (self: End, other: End): Transport => ({
    send: (text) => {
      if (self.closed) return
      other.inbox.push(text)
      queueMicrotask(() => drain(other))
    },
    onMessage: (handler) => {
      self.message = handler
      queueMicrotask(() => drain(self))
    },
    onClose: (handler) => {
      self.closeHandler = handler
      if (self.closed) queueMicrotask(handler)
    },
    close: () => {
      shut(self)
      shut(other)
    },
  })
  return [make(ends[0], ends[1]), make(ends[1], ends[0])]
}
