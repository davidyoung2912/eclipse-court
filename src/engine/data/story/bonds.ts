import type { Bond } from './types'

/** Quiet scenes between two characters, opened by reading a chapter. They change nothing in play. */
export const BONDS: readonly Bond[] = [
  {
    id: 'wren-tam',
    title: 'What the Hill Cost',
    between: ['wren', 'tam'],
    after: 'sunless-hill',
    beats: [
      { kind: 'narrate', text: 'The camp below the hill is quiet. Tam sits a little apart from the fires, in the long shade of a cart.' },
      { kind: 'say', who: 'wren', text: 'You stood in the sun all afternoon. Your sleeves are still smoking.' },
      { kind: 'say', who: 'tam', text: 'Only a little. It does not hurt the way it used to. That worries me more.' },
      { kind: 'say', who: 'wren', text: 'I report what I see, Tam. I have seen you carry three of ours down that hill.' },
      { kind: 'say', who: 'tam', text: 'Then report that. Leave the rest out.' },
      { kind: 'say', who: 'wren', text: 'I will. The rest was never mine to tell.' },
    ],
  },
  {
    id: 'wren-voss',
    title: 'A True Report',
    between: ['wren', 'voss'],
    after: 'ruined-gate',
    beats: [
      { kind: 'narrate', text: 'Voss is awake before dawn, reading a map he has already memorised.' },
      { kind: 'say', who: 'voss', text: 'You flew the gate road twice. Tell me again what the exiles were doing.' },
      { kind: 'say', who: 'wren', text: 'Waiting. They had food, and they had not touched a weapon. I told you so the first time.' },
      { kind: 'say', who: 'voss', text: 'You did. I gave the order anyway.' },
      { kind: 'say', who: 'wren', text: 'Why ask me, then?' },
      { kind: 'say', who: 'voss', text: 'Because I would like one report in this war that I wish I had listened to less.' },
    ],
  },
  {
    id: 'ilse-sable',
    title: 'Neighbours',
    between: ['ilse', 'sable'],
    after: 'crypt-stair',
    beats: [
      { kind: 'narrate', text: 'On the crypt stair, a wraith drifts between the torches. Mother Ilse nods to it as it passes.' },
      { kind: 'say', who: 'sable', text: 'You greet them like people who owe you a visit.' },
      { kind: 'say', who: 'ilse', text: 'They do. Most of them have waited a long time for someone to ask how they are.' },
      { kind: 'say', who: 'sable', text: 'And how are they?' },
      { kind: 'say', who: 'ilse', text: 'Tired. Like the rest of us. You see in the dark, child. What do you see in them?' },
      { kind: 'say', who: 'sable', text: 'Nothing I will say aloud. But I will sit with you, if you do not mind the quiet.' },
    ],
  },
  {
    id: 'tam-ilse',
    title: 'Hands',
    between: ['tam', 'ilse'],
    after: 'long-dusk',
    beats: [
      { kind: 'narrate', text: 'Tam has been looking at his hands for a long while. Ilse sits down beside him without being asked.' },
      { kind: 'say', who: 'ilse', text: 'The newly woken often do this. They count the fingers, as if one might be missing.' },
      { kind: 'say', who: 'tam', text: 'I keep thinking there is something I was carrying. Something I was told to keep safe.' },
      { kind: 'say', who: 'ilse', text: 'Perhaps you were. It may come back, or it may not. Neither is a failure.' },
      { kind: 'say', who: 'tam', text: 'And if it comes back and I do not like it?' },
      { kind: 'say', who: 'ilse', text: 'Then you will have had a quiet evening first. That is not nothing.' },
    ],
  },
  {
    id: 'tam-voss',
    title: 'Orders',
    between: ['tam', 'voss'],
    after: 'sunwell-ledger',
    beats: [
      { kind: 'narrate', text: 'The council is over. Voss is still standing at the table, the secret ledger shut in front of him.' },
      { kind: 'say', who: 'tam', text: 'You have not said a word since you read it.' },
      { kind: 'say', who: 'voss', text: 'I gave orders for thirty years on the strength of a page I never saw. I am deciding whether to be angry.' },
      { kind: 'say', who: 'tam', text: 'I came back to the Solari because I chose to. Not because I was ordered.' },
      { kind: 'say', who: 'voss', text: 'I know. It is the only thing in this room I am certain of.' },
      { kind: 'say', who: 'tam', text: 'Then let that be the order you give next. Ask us, Commander. We may still say yes.' },
    ],
  },
]
