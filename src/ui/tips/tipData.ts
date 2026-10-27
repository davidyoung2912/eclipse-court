import type { IconName } from '../menus/icons'

export interface Tip {
  /** Stable key under which dismissal is remembered; never reuse one for different text. */
  id: string
  icon: IconName
  title: string
  text: string
}

/** One-time guidance per page, shown in order, one card at a time. */
const DATA = {
  menu: [
    { id: 'menu-welcome', icon: 'sun', title: 'Welcome to Eclipse Court',
      text: 'Two courts, the Solari of light and the Umbral of shadow, fight across a board where the light itself keeps shifting. This is your home screen: every way to play starts here. The big gold button always offers the best next step, whether that is finishing a game, learning the rules or starting a battle.' },
    { id: 'menu-today', icon: 'flame', title: 'Today and your streak',
      text: 'The Daily Match and Daily Puzzle are the same for every player on the same day, so they make a fair daily challenge. A check mark means you have finished it. Playing the daily match each day builds a streak, shown as a flame next to the word Today.' },
    { id: 'menu-modes', icon: 'swords', title: 'Choose how to play',
      text: 'Battle holds one-off matches: Skirmish against the AI or a friend, the Practice arena, and shared codes. Campaign is a ladder of battles and hand-built scenarios that earn stars. Gauntlet is a roguelike run where your army keeps what it earns. Puzzles give you a set board and a turn limit. The line under each card shows your progress.' },
    { id: 'menu-story', icon: 'book', title: 'The Story',
      text: 'The wide Story card at the bottom of the card grid tells how Veyra came to have two courts. It is a tale read in chapters, with its own bond scenes, chapter gallery and achievements. The line on the card shows how far you have read. Story never changes your campaign stars, so read it whenever you like.' },
    { id: 'menu-utility', icon: 'book', title: 'The bottom row',
      text: 'Stats shows your record and achievements. Settings changes themes and accessibility options. How to Play replays the guided lesson at any time, and Sound switches audio on or off. Tip cards like this one appear once on every page, and you can bring them all back from Settings.' },
  ],
  story: [
    { id: 'story-intro', icon: 'book', title: 'The tale of the two courts',
      text: 'Story chapters tell how Veyra came to have two courts and an Eclipse Queen. Each chapter is read one line at a time: tap, press Enter or use the arrow keys to move on, and Skip jumps to the end. Chapters open in order, and reading one marks it done. Bonds are quiet scenes between two characters that open as you read, the Gallery replays any chapter you have read, and Achievements track your progress. Story keeps its own record, so it never affects your campaign stars.' },
  ],
  battle: [
    { id: 'battle-modes', icon: 'swords', title: 'One-off matches',
      text: 'Nothing here touches your campaign. Skirmish lets you design a match against the AI or a friend sharing your device. Practice drops you into a single duel so you can learn how each piece fights. Paste Code opens a challenge or replay that someone sent you. Pick whichever suits your mood; you can always come back.' },
  ],
  skirmish: [
    { id: 'skirmish-start', icon: 'gear', title: 'Build your match',
      text: 'The card at the top always summarises the match you have set up, so check it before you press Start. Choose one player or two, your court, and how tough the AI is. Solari favour bright squares and Umbral favour dark ones. If something is missing, a notice above Start says what, and tapping it jumps to the section to fix.' },
    { id: 'skirmish-rules', icon: 'leaf', title: 'Rules: Classic, Standard, Advanced',
      text: 'The rules level controls how much you must keep track of. Classic is the core game: move, duel and hold the beacons, with three simple spells. Standard adds all seven spells, court gifts and the Eclipse showdown. Advanced opens every option plus presets. New players should start on Classic, and the difficulty of the AI is a separate choice.' },
    { id: 'skirmish-options', icon: 'plus', title: 'Options and presets',
      text: 'Open a section under Options to change the army, board, spells, win condition, light cycle, hazards, veterancy and the turn clock. Each option shows a short hint of what it does. Boards with coloured cells have special squares with their own effects. Board size switches between the standard 7x7 and the Grand 9x9, which opens at 6 campaign stars and always uses the 16-piece Grand armies. Presets bundle Advanced rules into ready-made challenges, and some unlock when you earn campaign stars.' },
    { id: 'skirmish-share', icon: 'chain', title: 'Share and start',
      text: 'Start begins the match. Share copies a challenge link so a friend can play the exact same setup from the same position. If you cannot open links, they can paste the code on the Paste Code page. If you close the app mid-match, the main menu offers Resume Game.' },
  ],
  'campaign-battles': [
    { id: 'campaign-battles-ladder', icon: 'banner', title: 'The battle ladder',
      text: 'Battles are grouped into tiers that you open and close by tapping their headers. Each shows how many you have won. Beating a battle unlocks the next, and locked ones show a padlock. Each card shows the opponent, a difficulty in stars, a short description and any boss rule that changes the game. The Grand Court section opens at 6 stars and plays on the wider 9x9 board with 16 pieces a side.' },
    { id: 'campaign-battles-stars', icon: 'star', title: 'Earn three stars',
      text: 'Every battle can award three stars: win it, win without losing a single piece, and win before the Eclipse arrives. The total across the campaign is shown at the top of the page. Stars unlock boards, presets and colour themes elsewhere in the game, so replaying a battle for a missing star is always worthwhile.' },
    { id: 'campaign-battles-tournament', icon: 'trophy', title: 'Tournament mode',
      text: 'Tick the Tournament box before choosing a battle to play a best of three against one opponent. Tournaments award no stars and do not unlock anything, but they count towards your tournament wins. It is a good way to rematch a tough opponent. Reset Campaign at the bottom clears all battle progress, so use it carefully.' },
  ],
  'campaign-scenarios': [
    { id: 'campaign-scenarios-intro', icon: 'target', title: 'Hand-built scenarios',
      text: 'Scenarios are set situations, each with its own goal such as surviving a number of rounds, escorting your Leader to a marked beacon, or holding a beacon. The goal and a bonus star are printed on each card. They have their own stars and never affect the battle campaign.' },
    { id: 'campaign-scenarios-stars', icon: 'star', title: 'Three stars each',
      text: 'The stars are: win the scenario, win without losing a piece, and a bonus objective unique to that scenario. Read the goal line carefully, since scenarios have round limits. Some boards also use cell effects, so tap empty squares during play to read what they do.' },
  ],
  daily: [
    { id: 'daily-intro', icon: 'sun', title: 'The same game for everyone',
      text: 'Today\'s match uses the same board, army, rules and opponent for every player. The list shows what is special today and who you face. You always play the Solari court, and only your first finished attempt is scored, so make it count.' },
    { id: 'daily-streak', icon: 'flame', title: 'Streaks and sharing',
      text: 'The Streak line counts consecutive days you have played the daily match, along with your best. After finishing, you can replay without scoring to practise. Share Result copies a short line with your result and a link, so friends can try the very same game.' },
  ],
  gauntlet: [
    { id: 'gauntlet-intro', icon: 'flame', title: 'The Gauntlet',
      text: 'The Gauntlet is a run of eight opponents in a row with one army. Pieces keep their wounds, their veteran ranks and their perks between fights, fallen pieces stay fallen, and a single loss ends the run. Choose your court and starting army, then press Begin the Run.' },
    { id: 'gauntlet-army', icon: 'shield', title: 'Choose your army',
      text: 'Your starting army is drafted from a budget, so stronger pieces cost more. Each piece shows its cost, and the picker will not let you start with an invalid army. The Gauntlet is long, so a balanced army with a few tough pieces tends to survive further than an all-attack one.' },
  ],
  'gauntlet-run': [
    { id: 'gauntlet-stage', icon: 'swords', title: 'Stage by stage',
      text: 'Between fights you see the next foe, its difficulty and personality, and any special rules or extra hit points. Check your army list to see ranks, perks, relics and spells. After each victory you pick one reward, such as a new piece, more hit points, a perk, a spell, a relic or a rest that revives a fallen piece. Camps at certain stages allow revivals, and the last stage is a boss.' },
  ],
  puzzles: [
    { id: 'puzzles-intro', icon: 'puzzle', title: 'Solve the board',
      text: 'Each puzzle gives you a fixed position and a limited number of turns, shown as the win in badge. Win before you run out and the puzzle is solved. Think about the light, the cells and the order of your moves. A solved puzzle gets a green outline and a check mark.' },
    { id: 'puzzles-hints', icon: 'bulb', title: 'Stuck? Ask for a hint',
      text: 'During a puzzle, the Hint button reveals the setter\'s advice in three stages, from a gentle nudge to the full solution. Hints cost nothing and do not affect your result. Puzzles open in tiers, the puzzle of the day is at the top, and Reset Puzzles marks them all unsolved again.' },
  ],
  practice: [
    { id: 'practice-intro', icon: 'target', title: 'The Practice Arena',
      text: 'Here you can fight any piece against any other without a game riding on it, and nothing is saved. Pick your court, the piece that attacks, the piece that defends, the light on the square and how skilled the opponent is. Every choice changes the odds bar immediately.' },
    { id: 'practice-odds', icon: 'bolt', title: 'Reading the odds',
      text: 'The bar shows your chance to win, the chance of a draw and the opponent\'s chance, based on the pieces and light you chose. Try brighter or darker light to see how the favoured court gains damage and takes less. These same odds appear before every attack in a real match.' },
    { id: 'practice-duel', icon: 'swords', title: 'How a duel plays',
      text: 'Press Fight to start. Drag on the left side of the screen to move your fighter, and hold the Attack button to strike. Each piece fights differently, with quick swings, ranged shots, charges or pulses. A duel lasts at most 20 seconds: whoever has more health left wins, and a draw means the defender holds. Settings in a real match include Mirror, which swaps the controls to the other side, and Aim assist.' },
  ],
  stats: [
    { id: 'stats-intro', icon: 'trophy', title: 'Your record',
      text: 'This page keeps every number about your play: games, wins and losses, pieces taken and lost, Gauntlet runs, campaign progress and total time played. Games against a friend on one device are never counted. It all stays on this device.' },
    { id: 'stats-achievements', icon: 'star', title: 'Achievements and replays',
      text: 'Achievements you have earned shine with a trophy, and locked ones show a padlock and the goal. Replay Last Game plays your most recent match back move by move, and Copy Replay Link lets you share it. Reset Stats clears your records and achievements but keeps campaign, puzzle and scenario progress.' },
  ],
  settings: [
    { id: 'settings-look', icon: 'sparkle', title: 'Themes',
      text: 'Pick the colours of the board and pieces here. Some themes are locked and open as you earn campaign stars, so the lock shows how many you need. Changes apply immediately and are remembered on this device.' },
    { id: 'settings-access', icon: 'shield', title: 'Accessibility',
      text: 'Mark the light adds plus and minus signs to every square so that colour is never the only clue to how bright it is. Reduce motion turns off animation and screen shake. Below the options you can also bring back every one-time tip card if you would like the guidance again.' },
  ],
  replay: [
    { id: 'replay-intro', icon: 'replay', title: 'Watching a replay',
      text: 'A replay plays a finished game back one position at a time. Play and Pause run it automatically, Next and Prev step one move, and Start returns to the opening position. The line under the board says whose move it was, and the highlighted piece and square show what changed.' },
    { id: 'replay-learn', icon: 'bulb', title: 'Learn from it',
      text: 'Watch the dial at the top as you step through: the light rippling outward from the centre explains many of the duels. Notice where pieces were when they attacked and which squares the winner held. Close returns you to where you came from.' },
  ],
  challenge: [
    { id: 'challenge-intro', icon: 'chain', title: 'A challenge from a friend',
      text: 'Someone shared this match with you. The card lists the rules and any special options, and every game started from this link begins from exactly the same position. Choose which court to play, which is the court the sender left free by default.' },
    { id: 'challenge-play', icon: 'swords', title: 'Pick your opponent',
      text: 'Play against the AI at Easy, Normal or Hard, or pass the device back and forth with a friend. Your result is not scored against the sender, so it is a friendly way to compare how you each played the same position.' },
  ],
  paste: [
    { id: 'paste-intro', icon: 'chain', title: 'Open a shared code',
      text: 'If a link will not open, copy the whole link or just the code after the # sign into the box and press Open. A challenge opens a match to play and a replay opens a game to watch. An error message means the code was cut off or is from a different version of the game.' },
  ],
  game: [
    { id: 'game-board', icon: 'grid', title: 'Reading the board',
      text: 'The top dial shows the current light and the next few steps of the cycle. On the board, bright squares favour the Solari court and dark ones favour the Umbral, and the light ripples outward from the centre each round. Dashed gold circles are beacons, and walls block movement. Pieces show their hit points as pips underneath.' },
    { id: 'game-move', icon: 'target', title: 'Move a piece',
      text: 'On your turn, tap one of your pieces and glowing squares show where it can go. Tap one to move there. Each piece moves differently, and its card under the board explains how. Moving one piece uses up your whole turn, so choose which piece matters most. End Turn passes without moving, which lets wounded pieces rest and heal. Undo takes your last move back.' },
    { id: 'game-card', icon: 'book', title: 'Inspect anything',
      text: 'Tap any piece, yours or the enemy\'s, to read its card: how it moves, how it duels, its hit points and what the light is doing to it. Tap an empty square to read about that square instead, including how bright it is and whether it holds a beacon or special cell effect. You can inspect during the opponent\'s turn too.' },
    { id: 'game-duel', icon: 'swords', title: 'Attacking and duels',
      text: 'Moving onto an enemy piece starts a duel. First you see the odds, shaped by hit points, piece types and the light on the square. Then you fight it live: drag to move, hold Attack to strike. Prefer not to? Tick Auto-duel and the game resolves them for you. The winner keeps the square, and a draw means the defender holds.' },
    { id: 'game-spells', icon: 'bolt', title: 'Your Leader\'s spells',
      text: 'The spell bar lets your Leader cast one spell on its turn, such as teleporting, healing, swapping or binding an enemy. Tap a spell, then tap a glowing target. Casting uses your whole turn and costs the Leader 1 HP, and each spell works only once per match unless the rules recharge it. Pieces standing on a beacon are spell-proof.' },
    { id: 'game-win', icon: 'trophy', title: 'Winning and the Eclipse',
      text: 'The match shows its win condition in the status line, usually holding all five beacons at the end of your turn. After some rounds the Eclipse falls: light stops shifting and, in the showdown, the outer squares turn deadly. The Hint button gives free advice when you are stuck. Quit leaves the match, so finish it if you want it to count.' },
  ],
  'game-cells': [
    { id: 'game-cells-intro', icon: 'sparkle', title: 'Cell effects',
      text: 'The coloured squares on this board have special effects. Might adds damage dealt, Ward cuts damage taken, Recovery heals at the end of the round, Hazard hurts, Silence blocks a Leader\'s spells and Invincibility protects on odd rounds. The legend under the board names each colour, and tapping any empty square describes its effect.' },
  ],
  'game-hotseat': [
    { id: 'game-hotseat-intro', icon: 'swap', title: 'Two players, one device',
      text: 'Players take turns on the same screen. A pass screen hides the board between turns so nobody sees the other\'s plans, so hand over the device and tap to continue. The board can turn to face whoever is playing. Both options can be switched off under the board. Duels are resolved automatically.' },
  ],
  'game-puzzle': [
    { id: 'game-puzzle-intro', icon: 'puzzle', title: 'Puzzle rules',
      text: 'You must win within the number of turns shown under the board, and every turn of yours counts, including ones where you pass. If you run out, press Try Again to reset the board. The Hint button reveals the setter\'s advice in stages. Think about the order of your moves and which piece should strike first.' },
  ],
  'game-clock': [
    { id: 'game-clock-intro', icon: 'clock', title: 'The turn clock',
      text: 'This match has a clock. The ring under the board counts down your turn, and when it empties your turn is passed. Some matches give each court extra bank time that is spent only after a turn runs out. The clock stops during duels, dialogs and the opponent\'s turn.' },
  ],
} as const satisfies Record<string, readonly Tip[]>

export type TipPage = keyof typeof DATA

export const TIPS: Record<TipPage, readonly Tip[]> = DATA
