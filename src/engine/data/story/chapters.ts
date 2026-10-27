import type { Chapter } from './types'

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'prologue',
    act: 'prologue',
    title: 'The Stilling',
    blurb: 'How the Hour stopped, and why there are two courts.',
    beats: [
      { kind: 'narrate', text: 'Before there were courts, there was one Hour, and one woman who kept it.' },
      { kind: 'narrate', text: 'In Veyra the Hour was not rung by a bell. It was turned by hand. Five Beacons lay in the floor of the Orrery Court, and at the centre of them stood the Keeper.' },
      { kind: 'narrate', text: 'Queen Ysmere had turned the Hour for thirty years. When she turned it well the light rose and fell like breath, the harvests kept their seasons, and the dead went quietly where the dead go.' },
      { kind: 'narrate', text: 'No one in Veyra thought to ask what it cost to be the one who stands at the centre.' },
      { kind: 'narrate', text: 'In the thirtieth year, at dusk, the Queen\'s daughter fell sick. The healers said she would not see the dark out.' },
      { kind: 'say', who: 'aurel', text: 'Mother, the Hour is turning. Let it turn. A Keeper does not hold the Hour. It is the first law.' },
      { kind: 'say', who: 'ysmere', text: 'Then I will break it, and answer for it after.' },
      { kind: 'say', who: 'nocte', text: 'Mother, it is all right. I am not afraid of the dark.' },
      { kind: 'narrate', text: 'Ysmere stilled the Hour. The light stayed at dusk. The night did not come, and the dawn did not either.' },
      { kind: 'narrate', text: 'Toward what should have been midnight, Nocte stopped breathing. The Queen, who had already broken one law, broke a second. She called her daughter back.' },
      { kind: 'say', who: 'nocte', text: 'I was somewhere very quiet. Why did you bring me back?' },
      { kind: 'say', who: 'ysmere', text: 'Because I could not do otherwise.' },
      { kind: 'narrate', text: 'The Hour would not turn again. The first Eclipse fell, and a third of Veyra starved in the light that would not change.' },
      { kind: 'say', who: 'ysmere', text: 'I cannot let go of it. If I let go, the whole night comes down at once. Take the Beacons, both of you. Keep them from me.' },
      { kind: 'narrate', text: 'She walked into the Sanctum and the doors closed behind her. The Eclipse stood at her back, holding its breath. From that day she was the Eclipse Queen.' },
      { kind: 'say', who: 'aurel', text: 'Never again will the Hour be left to one tired hand in the dark. We will hold it, and we will watch it.' },
      { kind: 'say', who: 'nocte', text: 'Never again will the Hour be stolen. It will turn, and whatever it costs, we will pay.' },
      { kind: 'narrate', text: 'Aurel took the Beacons of the day and became the first Solarch. Nocte took the Beacons of the dark and became the first Duskmother. Each swore to keep the Hour turning.' },
      { kind: 'narrate', text: 'Neither has ever agreed what that means.' },
    ],
  },
]
