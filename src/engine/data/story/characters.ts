import type { Character, CharacterId } from './types'

export const CHARACTERS: Record<CharacterId, Character> = {
  ysmere: { id: 'ysmere', name: 'Ysmere', title: 'The last Keeper', portrait: null, trait: 'Holds what she cannot release' },
  aurel: { id: 'aurel', name: 'Aurel', title: 'First Solarch', portrait: { court: 'solari', role: 'leader' }, trait: 'Watches everything, forgives little' },
  nocte: { id: 'nocte', name: 'Nocte', title: 'First Duskmother', portrait: { court: 'umbral', role: 'leader' }, trait: 'Pays every debt she owes' },
  wren: { id: 'wren', name: 'Wren', title: 'Sunhawk rider', portrait: { court: 'solari', role: 'flier' }, trait: 'Flies ahead and reports truly' },
  tam: { id: 'tam', name: 'Tam', title: 'Lumen Knight', portrait: { court: 'solari', role: 'footsoldier' }, trait: 'Never leaves a comrade behind' },
  voss: { id: 'voss', name: 'Ser Halvard Voss', title: 'Commander of the Meridian', portrait: { court: 'solari', role: 'charger' }, trait: 'Orders first, doubts after' },
  ilse: { id: 'ilse', name: 'Mother Ilse', title: 'Wraith-keeper', portrait: { court: 'umbral', role: 'aura' }, trait: 'Speaks to the dead as to neighbours' },
  sable: { id: 'sable', name: 'Sable', title: 'Night Raven scout', portrait: { court: 'umbral', role: 'flier' }, trait: 'Sees in the dark and tells no one' },
}
