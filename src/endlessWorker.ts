import { generateEndless } from './endless'

/** Finds an Endless puzzle off the main thread, since the search can take a second or two. */
self.onmessage = (e: MessageEvent<{ seed: number; band: number }>) => {
  self.postMessage(generateEndless(e.data.seed, e.data.band))
}
