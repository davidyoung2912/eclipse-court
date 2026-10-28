import { setVoice } from './audio/synth'
import { VOICES } from './engine/data/cosmetics'
import { equippedId, shopSnapshot, subscribeShop } from './shop'

/** Applies the equipped cosmetics: art variants and frames through page attributes, sound through the synth. */
export function applyCosmetics() {
  const s = shopSnapshot()
  setVoice(VOICES[equippedId('sound', s)] ?? VOICES.classic)
  if (typeof document === 'undefined') return
  document.documentElement.dataset.pieces = equippedId('pieces', s)
  document.documentElement.dataset.board = equippedId('board', s)
  document.documentElement.dataset.codex = equippedId('codex', s)
}

subscribeShop(applyCosmetics)
