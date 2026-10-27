import type { Character, CharacterId } from './types'

export const CHARACTERS: Record<CharacterId, Character> = {
  ysmere: { id: 'ysmere', name: 'Ysmere', title: 'The last Keeper', portrait: null },
  aurel: { id: 'aurel', name: 'Aurel', title: 'First Solarch', portrait: { court: 'solari', role: 'leader' } },
  nocte: { id: 'nocte', name: 'Nocte', title: 'First Duskmother', portrait: { court: 'umbral', role: 'leader' } },
  wren: { id: 'wren', name: 'Wren', title: 'Sunhawk rider', portrait: { court: 'solari', role: 'flier' } },
  tam: { id: 'tam', name: 'Tam', title: 'Lumen Knight', portrait: { court: 'solari', role: 'footsoldier' } },
  voss: { id: 'voss', name: 'Ser Halvard Voss', title: 'Commander of the Meridian', portrait: { court: 'solari', role: 'charger' } },
  ilse: { id: 'ilse', name: 'Mother Ilse', title: 'Wraith-keeper', portrait: { court: 'umbral', role: 'aura' } },
  sable: { id: 'sable', name: 'Sable', title: 'Night Raven scout', portrait: { court: 'umbral', role: 'flier' } },
}
