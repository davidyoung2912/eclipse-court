# Eclipse Court: AI Personas (character sheet)

Status: approved cast of eight. Source of truth for voice and look; the data lives in `src/engine/data/personas.ts` and the line banks beside it.

Each persona has three names so nothing overflows a small screen:

| Field | Limit | Used for |
|---|---|---|
| `name` | 12 characters | Speech bubbles, the opponent picker, the ladder rival line, the briefing |
| `tag` | 20 characters | The small line under the name |
| `fullName` + `title` | none | A detail card or cast screen only, never in a bubble or a button |

| id | name | tag | house | play style |
|---|---|---|---|---|
| `cassia` | Cassia | The Dawnbreaker | Solari | Rusher |
| `pym` | Pym | Archivist | Solari | Caster |
| `bea` | Bea | Door Keeper | Solari | Guardian |
| `mudge` | Mudge | Mire Warden | Umbral | Turtle |
| `lowen` | Lowen | Nine-Lives | Umbral | Baiter |
| `digby` | Digby | Volunteer! | Umbral | Rusher, low guard (a cheerful swarmer) |
| `quill` | Quill | Iron Factor | Marches | Grabber |
| `regent` | The Regent | Pale Echo | the Hour | Balanced |

A persona may wear the other court's colours for a Convening: champions are sworn, so the house is flavour and a hint for the picker, never a rule.

## Dame Cassia Lark, "the Dawnbreaker" (`cassia`)
- **Voice:** a sports commentator. Loud, delighted, names every move ("The Sunhawk Dive!"), hates waiting, cheers for good plays on either side.
- **Look:** a young woman with a sunburst-crested helm under one arm and a lance wrapped in ribbons. Freckled, grinning, sun-gold armour, a gap in her teeth.
- **Secret:** she cannot stand a silent board, because silence reminds her of the Eclipse. So she never stops talking.
- **Sample lines:** "Oh, you're *fast*! Do that again!" / "A hit! A palpable hit! Somebody write that down!"

## Archivist Thessaly Pym (`pym`)
- **Voice:** a gleeful pedant. Cites precedent, mutters footnotes, thrilled whenever a spell lands.
- **Look:** round spectacles, pencils stuck in a bun, ink-stained fingers, robes pinned with paper charms, a book floating beside her.
- **Secret:** she has been quietly copying the sunwell reports and does not know what to do with them.
- **Sample lines:** "Per the Third Convening, that is *entirely* legal. Mine, I mean." / "Footnote: you are about to lose a Golem."

## Ser Beatrix "Bea" Holloway, Keeper of the Leader's Door (`bea`)
- **Voice:** a worried mother hen who is also a fearsome knight. Fusses at her own Leader, gets dangerous when it is threatened.
- **Look:** a broad, weathered woman with a dented shield covered in children's chalk drawings, a kettle at her belt, a tabard with mended patches.
- **Secret:** she counts her pieces aloud because she lost her squad in the Stilling's aftermath.
- **Sample lines:** "Stay *behind* me, Majesty." / "Nobody touches my Leader. *Nobody.*"

## Mudge, Warden of the Mire Debt (`mudge`)
- **Voice:** a gentle, glacial Mire Troll. Folksy, full of weather and food. Calls the player "little crown". Nothing hurries him.
- **Look:** a huge moss-backed troll in a knitted scarf, carrying a tiny lantern. Mushrooms grow on one shoulder; kind, half-lidded eyes.
- **Secret:** the ancient debt his people owe the Vesper Halls is nearly paid, and he dreads being free of it.
- **Sample lines:** "Mm. Well now. Take your time. I have centuries." / "Had a Beacon like that once. Mine now, mind."

## Lowen "Nine-Lives" Harrow (`lowen`)
- **Voice:** a silky, teasing gambler. Dares you to take the bait, loses gracefully, always pays in "favours".
- **Look:** a lean Night Raven in a feathered coat and a half-mask, one black wing, knucklebone dice rolling across his fingers.
- **Secret:** he is out of lives, and the Duskmother knows it.
- **Sample lines:** "Go on. It's *free*. Truly." / "Oh, you took it. Lovely. That was number six."

## Digby Gray, Gloom Ghoul (Volunteer!) (`digby`)
- **Voice:** wildly upbeat about being undead. Throws pieces forward without a thought and insists it was the best decision he ever made, a little too insistently.
- **Look:** a pale, patchwork ghoul with a rosette pinned to a threadbare waistcoat, a huge toothy smile and a wobbly salute.
- **Secret:** the lore says the Ghouls are "mostly volunteers. Not all." He is the funny face of that unsettling truth.
- **Sample lines:** "Lost a Ghoul? Ha! He'll be thrilled!" / "I *chose* this. I have the form somewhere."

## Quill Ferrant, Factor of the Iron Court (`quill`)
- **Voice:** a mercenary accountant. Beacons are "assets", losses are invoiced, everything has fine print.
- **Look:** a thin man in a pince-nez and an iron-plated ledger-coat, a clockwork abacus on his wrist, a red wax seal stamped with a tiny crown on his collar.
- **Secret:** the Iron Court is broke, and he is no longer sure who is paying him.
- **Sample lines:** "That Beacon is now collateral." / "Defeat will be invoiced. Net thirty."

## The Echo of the Pale Regent (`regent`)
- **Voice:** gentle, wry, melancholy, and the only persona who gives real advice. A failed claimant to the Keeper's seat who has played this position before.
- **Look:** a translucent figure in faded coronation robes, a crown missing points, edges that blur like a stopped clock.
- **Secret:** he wants you to beat him. He may be Ysmere's mirror, which leaves room for an endgame hook.
- **Sample lines:** "I lost this exact position once. Do not make my mistake." / "Beautiful. I wish I had seen that sooner."

## Reserve

**Brick**, a sentient Dawn Golem who speaks in tiny literal sentences and naps at the Eclipse ("Dark. Nap?"). Built to hold the line in the Stilling; nobody told him it ended. Not in the first eight; swap in if one of them is dropped.

## Writing rules for every line

- Short: at most 90 characters, ideally under 70, so a bubble stays two lines on a phone.
- Spoken in the persona's voice and nothing else; no rules text, no numbers the player has to act on.
- Playful and warm even when they lose; the sting is in the secret, hinted at, never explained.
- Never name another persona's secret. Never tell the player what to do, except the Regent, who may hint.
- No line repeats within a persona, in any category.
