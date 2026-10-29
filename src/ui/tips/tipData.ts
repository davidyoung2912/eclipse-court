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
    { id: 'menu-today', icon: 'flame', title: 'Today and Your Streak',
      text: 'Under Today sit three challenges that reset on a schedule: the Daily Match and Daily Puzzle are the same for every player each day, and the Weekly is one rule twist that lasts all week. A check mark means you have finished it. Playing the daily match each day builds a streak, shown as a flame next to the word Today.' },
    { id: 'menu-modes', icon: 'swords', title: 'Choose How to Play',
      text: 'Battle holds one-off matches: Skirmish, the Ranked Ladder, online and by-link games, the Practice arena, the Board Editor and shared codes. Campaign is a ladder of battles and hand-built scenarios that earn stars. Gauntlet is a roguelike run where your army keeps what it earns. Puzzles give you a set board and a turn limit, plus a Rush mode. The line under each card shows your progress.' },
    { id: 'menu-story', icon: 'book', title: 'The Story',
      text: 'The wide Story card at the top of the card grid tells how Veyra came to have two courts. It is a tale read in chapters, with its own bond scenes, battles and achievements. The line on the card shows how far you have read. Story never changes your campaign stars, so read it whenever you like.' },
    { id: 'menu-shards', icon: 'star', title: 'Shards',
      text: 'Almost everything you finish pays Shards: games, puzzles, Gauntlet stages, achievements, Weekly wins, ladder rank-ups and mastery levels. Spend them in the Collection on themes, piece sets, capture effects, sound packs and codex frames. Cosmetics change how the game looks and sounds, never how it plays.' },
    { id: 'menu-guidance', icon: 'checklist', title: 'First Steps and Suggestions',
      text: 'New players see a First steps checklist that ticks itself off as you try the basics, and a suggestion card may appear after a few early losses. Tap Hide or Thanks to put either away. Show Tips Again in Settings brings back the checklist, the suggestions, every tip card and the guided lesson, so Learn the Rules is open again until you replay it.' },
    { id: 'menu-utility', icon: 'book', title: 'The Bottom Row',
      text: 'Stats shows your record, mastery and achievements. Collection is where Shards are spent. Settings changes themes, sound, accessibility and your save backup. How to Play replays the guided lesson at any time, and Sound switches audio on or off. Tip cards like this one appear once on every page.' },
  ],
  story: [
    { id: 'story-intro', icon: 'book', title: 'The Tale of the Two Courts',
      text: 'Story chapters tell how Veyra came to have two courts and an Eclipse Queen. Chapters open in order, and reading one marks it done. Some chapters end in a battle, which is part of the story and never affects your campaign stars. Story keeps its own record of chapters, bonds, endings and achievements.' },
    { id: 'story-company', icon: 'heart', title: 'Company, Bonds and Achievements',
      text: 'Characters you meet join your Company, and each is ready, wounded or fallen depending on how your story battles went. Bonds are quiet scenes between two characters that open as you read, and a check mark shows the ones you have seen. Achievements are grouped into folds, and each shows what it asks.' },
  ],
  'story-acts': [
    { id: 'story-acts-intro', icon: 'book', title: 'Acts and Starting Over',
      text: 'Chapters are grouped into acts. Once you have started an act, it opens by itself when you come back, so your place is easy to find; tap any act heading to open or close it. Reset Story at the bottom forgets every chapter, bond, ending and story achievement so you can read it all again. It never touches your campaign, puzzle or scenario progress.' },
  ],
  'story-reader': [
    { id: 'story-reader-controls', icon: 'book', title: 'Reading a Chapter',
      text: 'Tap the scene, press Enter, Space or the right arrow to move on, and use Previous or the left arrow to go back. Skip finishes the chapter at once and counts it as read, which also takes you on to its battle if it has one. Back leaves without marking the chapter read.' },
  ],
  'story-ending': [
    { id: 'story-ending-choice', icon: 'book', title: 'Who Keeps the Hour',
      text: 'This choice decides how the tale ends, and an epilogue follows whichever you pick. A padlocked ending needs a clean victory, meaning you beat the Eclipse Queen without losing to her first. Decide later leaves the choice open, and you can come back to it from the Story page.' },
  ],
  battle: [
    { id: 'battle-modes', icon: 'swords', title: 'One-Off Matches',
      text: 'Nothing here touches your campaign. Skirmish lets you design a match against the AI or a friend sharing your device. Practice drops you into a single duel so you can learn how each piece fights. Pick whichever suits your mood; you can always come back.' },
    { id: 'battle-friends', icon: 'chain', title: 'Playing a Friend',
      text: 'Play Online connects two devices directly for a live game. Play by Link needs no connection at all: you take turns sending each other a link that carries the whole game. For two people on one device, choose Two Players in Skirmish.' },
    { id: 'battle-tools', icon: 'grid', title: 'Rating, Boards and Codes',
      text: 'The Ranked Ladder gives you a rating to climb against the AI. The Board Editor lets you draw a board or puzzle and send it as a link. Paste Code opens a challenge, replay or shared board for people who cannot open links.' },
  ],
  skirmish: [
    { id: 'skirmish-start', icon: 'gear', title: 'Build Your Match',
      text: 'The card at the top always summarises the match you have set up, so check it before you press Start. Choose one player or two, your court, and how tough the AI is. Solari favour bright squares and Umbral favour dark ones. If something is missing, a notice above Start says what, and tapping it jumps to the section to fix.' },
    { id: 'skirmish-rules', icon: 'leaf', title: 'Rules: Classic, Standard, Advanced',
      text: 'The rules level controls how much you must keep track of. Classic is the core game: move, duel and hold the beacons, with three simple spells. Standard adds all seven spells, court gifts and the Eclipse showdown. Advanced opens every option plus presets. New players should start on Classic, and the difficulty of the AI is a separate choice.' },
    { id: 'skirmish-options', icon: 'plus', title: 'Options and Presets',
      text: 'Open a section under Options to change the army, spells, win condition, light cycle, hazards, turn clock and twists. A dot or summary on each section shows what you have changed. Presets bundle Advanced rules into ready-made challenges, and some unlock when you earn campaign stars. Under My presets you can name and save your own combination, load it later or delete it. Your choices are remembered for next time.' },
    { id: 'skirmish-army', icon: 'shield', title: 'Army and Board',
      text: 'Classic is the standard army mirrored for both courts. Draft lets you spend a point budget on your own army while the AI drafts its own, Random gives both courts the same random army, and Daily uses today\'s board and army. Boards with coloured cells have special squares, and many boards unlock as you earn campaign stars. Grand 9x9 opens at 6 stars and always uses the 16-piece Grand armies.' },
    { id: 'skirmish-spells', icon: 'bolt', title: 'Spells: Classic or Loadout',
      text: 'Classic spells are the seven every Leader knows. Loadout lets you choose your own few spells from a shared pool plus your court\'s two signature spells, marked with a star, and further spells unlock with campaign stars. Recharge makes a cast spell return to the Leader after 8 rounds. Loadouts are for matches against the AI.' },
    { id: 'skirmish-twists', icon: 'flame', title: 'Twists and Bonus Shards',
      text: 'Twists make a match harder for you. Fog of war hides enemy pieces more than 2 squares from yours, Sudden death ends the game at the first duel that kills a piece once a chosen round arrives, and an AI head start gives the opponent extra HP on every piece. Twists and a short turn clock pay a bonus on the Shards you win, which the section shows.' },
    { id: 'skirmish-bounties', icon: 'trophy', title: 'Today\'s Bounties',
      text: 'The fold at the top lists bounties that change every day, each with a Shard reward. They are claimed automatically when a skirmish against a Normal or Hard AI meets them, and a check mark shows the ones already claimed. They are not available in two-player games.' },
    { id: 'skirmish-share', icon: 'chain', title: 'Share and Start',
      text: 'Start begins the match. Share copies a challenge link so a friend can play the exact same setup from the same position. If you cannot open links, they can paste the code on the Paste Code page. If you close the app mid-match, the main menu offers Resume Game.' },
  ],
  editor: [
    { id: 'editor-paint', icon: 'grid', title: 'Paint a Board',
      text: 'Pick a tool, then tap squares. Walls block movement and shots, beacons mark what to hold, and cells give the piece standing on them an effect. Tap a square again with the same tool to undo it, and use Erase to clear everything on a square. Pieces are placed the same way; tapping the same piece again takes it away.' },
    { id: 'editor-size', icon: 'cycle', title: 'Size, Mirror and Starting Over',
      text: 'The board can be 7x7 or 9x9, and a 7x7 layout stays centred when you grow it. With Mirror the armies on, Umbral\'s pieces copy Solari\'s flipped across the board and are shown faded. Reset to the Classic Setup restores the standard armies and beacons, and Clear the Board empties everything.' },
    { id: 'editor-goal', icon: 'target', title: 'Goals and Puzzles',
      text: 'The first three goals make an ordinary match, and you choose which court the recipient plays. Survive, Escort and Hold a square are puzzles for Solari: turn off Mirror the armies to give Umbral a different force, and use the Goal square tool to mark where the Solarch must go or stand. Each side needs exactly one Leader, and any problem is listed above the buttons.' },
    { id: 'editor-share', icon: 'chain', title: 'Test and Share',
      text: 'Test It plays your design against the AI and counts for nothing, so you can try it freely. Copy Challenge Link sends the board to a friend, and the Code box shows the same thing as text. A board that arrives as a link can be opened in the editor and changed.' },
    { id: 'editor-pack', icon: 'puzzle', title: 'Puzzle Packs',
      text: 'With a puzzle goal chosen, Add This Puzzle to the Pack collects boards, up to twelve. Name the pack to copy one link for all of them, or keep it on your own Puzzles screen. Whoever opens the link can add the pack to their Puzzles screen. Packs pay nothing and count for no record.' },
  ],
  ladder: [
    { id: 'ladder-intro', icon: 'trophy', title: 'The Ranked Ladder',
      text: 'Every game here is rated, so you earn or lose rating against a named AI opponent. Beating a stronger foe earns more, and the suggested opponent is the one that keeps the match close. Rated games cannot be taken back with Undo, and a win pays a few Shards. Your rating, peak and record sit at the top.' },
    { id: 'ladder-ranks', icon: 'champion', title: 'Ranks and Rivals',
      text: 'Opponents are grouped under the rank their rating sits in, from Squire up to Eclipse Champion, and your own rank is marked. Tap an opponent to choose them instead of the suggestion; the figure beside a name is your record against them. Reaching a new rank pays Shards.' },
    { id: 'ladder-seasons', icon: 'cycle', title: 'Seasons',
      text: 'Once you have played enough games in a season you can start the next one. Your rating then moves halfway back toward the start while your season peak is kept. Ending a season pays Shards by the rank its peak reached and gives you a banner for that rank; Season history lists every past season. It gives a fresh climb without losing your history.' },
  ],
  weekly: [
    { id: 'weekly-intro', icon: 'cycle', title: 'The Weekly Challenge',
      text: 'One rule twist, a random army and a named AI opponent last for a whole week, and everyone gets the same one. You always play the Solari court and may try as often as you like. Your best score this week is the one that stands, and the card shows how many days are left.' },
    { id: 'weekly-shards', icon: 'star', title: 'Scores and Shards',
      text: 'The first win each week pays a large Shard reward, and every later win with a better score pays a smaller one. Earlier weeks are listed with their best scores. Share Challenge, shown once you have played, sends the match to a friend as a link.' },
  ],
  collection: [
    { id: 'collection-intro', icon: 'star', title: 'Spend Your Shards',
      text: 'The wallet at the top shows your Shards and how many you have earned in all. Tap anything you can afford to buy it, and it is equipped at once; a padlock shows what you do not own yet and how many Shards you are short. Cosmetics never change how the game plays.' },
    { id: 'collection-kinds', icon: 'sparkle', title: 'What You Can Collect',
      text: 'There are board themes, piece sets, capture effects, sound packs and codex frames, each in its own section. Tap something you own to equip it, and sound packs play a sample when chosen. The star themes, such as Ember and Frost, are free and open in Settings as you earn campaign stars.' },
  ],
  mail: [
    { id: 'mail-intro', icon: 'chain', title: 'Play by Link',
      text: 'This is a game played by passing links, with no connection or account needed. Press New Game, set up the match, make your move, then send your friend the link that appears. They open it, move, and send one back. Each link carries the whole game, so nothing is uploaded.' },
    { id: 'mail-moves', icon: 'chain', title: 'Receiving a Move',
      text: 'Open the link, or paste it into the box and press Open Move, and a card says what arrived. A new game starts with your move, an update continues a game you already hold, and a link that does not fit is explained. Your games list shows whose move it is, and Remove deletes a game from this device only.' },
  ],
  'mail-send': [
    { id: 'mail-send-link', icon: 'chain', title: 'Send This Link',
      text: 'The link below holds the whole game up to your move. Share it or copy it, and send it to your opponent by any message app. Until they send one back, the game shows as Waiting for them in your list, and Watch the Game plays it back.' },
  ],
  'campaign-battles': [
    { id: 'campaign-battles-ladder', icon: 'banner', title: 'The Battle Ladder',
      text: 'Battles are grouped into tiers that you open and close by tapping their headers. Each shows how many you have won. Beating a battle unlocks the next, and locked ones show a padlock. Each card shows the opponent, a difficulty in stars, a short description and any boss rule that changes the game. The Grand Court section opens at 6 stars and plays on the wider 9x9 board with 16 pieces a side.' },
    { id: 'campaign-battles-stars', icon: 'star', title: 'Earn Three Stars',
      text: 'Every battle can award three stars: win it, win without losing a single piece, and win before the Eclipse arrives. The total across the campaign is shown at the top of the page. Stars unlock boards, spells, presets and colour themes elsewhere in the game, so replaying a battle for a missing star is always worthwhile.' },
    { id: 'campaign-battles-tournament', icon: 'trophy', title: 'Tournament Mode',
      text: 'Tick the Tournament box before choosing a battle to play a best of three against one opponent. Tournaments award no stars and do not unlock anything, but they count towards your tournament wins. It is a good way to rematch a tough opponent. Reset Campaign at the bottom clears all battle progress, so use it carefully.' },
  ],
  'campaign-scenarios': [
    { id: 'campaign-scenarios-intro', icon: 'target', title: 'Hand-Built Scenarios',
      text: 'Scenarios are set situations, each with its own goal such as surviving a number of rounds, escorting your Leader to a marked beacon, or holding a beacon. The goal and a bonus star are printed on each card. They have their own stars and never affect the battle campaign.' },
    { id: 'campaign-scenarios-stars', icon: 'star', title: 'Three Stars Each',
      text: 'The stars are: win the scenario, win without losing a piece, and a bonus objective unique to that scenario. Read the goal line carefully, since scenarios have round limits. Some boards also use cell effects, so tap empty squares during play to read what they do.' },
  ],
  'campaign-coop': [
    { id: 'campaign-coop-intro', icon: 'target', title: 'Two on One Side',
      text: 'Co-op scenarios are for two people on one device. You share the Solari court against the AI: the first player takes the moves on odd rounds and the second on even ones, so talk it over. The stars work as in any scenario.' },
  ],
  daily: [
    { id: 'daily-intro', icon: 'sun', title: 'The Same Game for Everyone',
      text: 'Today\'s match uses the same board, army, rules and opponent for every player. The list shows what is special today, who you face and which court you play, which can change from day to day. Only your first finished attempt is scored, so make it count. Undo is switched off.' },
    { id: 'daily-streak', icon: 'flame', title: 'Streaks and Sharing',
      text: 'The Streak line counts consecutive days you have played the daily match, along with your best. A scored game also pays a Shard bonus. After finishing, you can replay without scoring to practise. Share Result copies a short line with your result and a link, so friends can try the very same game.' },
  ],
  gauntlet: [
    { id: 'gauntlet-intro', icon: 'flame', title: 'The Gauntlet',
      text: 'The Gauntlet is a run of eight opponents in a row with one army. Pieces keep their wounds, their veteran ranks and their perks between fights, fallen pieces stay fallen, and a single loss ends the run. Choose your court and starting army, then press Begin the Run.' },
    { id: 'gauntlet-army', icon: 'shield', title: 'Choose Your Army',
      text: 'Your starting army is drafted from a budget, so stronger pieces cost more. Each piece shows its cost and the most you may take, and more become available as you earn campaign stars. The picker will not let you start with an invalid army. A balanced army with a few tough pieces tends to survive further than an all-attack one.' },
    { id: 'gauntlet-ascension', icon: 'rise', title: 'Ascension',
      text: 'Win a run to open the next ascension level, a harder version of the same run with a bigger Shard reward. Each level adds to the ones below it: tougher foes, no camps, smarter opponents, extra rules and an early Eclipse boss. Choose a level before you begin; ascension 0 is the standard run.' },
    { id: 'gauntlet-daily', icon: 'sun', title: 'Daily Run and Run Codes',
      text: 'The Daily run gives everyone the same foes today, with the classic army from the Solari court, and a first win pays a Shard bonus. A run code lets you enter a friend\'s code to fight the same sequence of foes they did. A finished run offers a summary you can copy and share.' },
  ],
  'gauntlet-run': [
    { id: 'gauntlet-map', icon: 'flame', title: 'The Road',
      text: 'Before each stage you choose one of two or three nodes: a fight, an elite (harder, with one more reward and double Shards), an event, or a quiet camp that brings a fallen piece back. The whole road is listed below, and the last stage is always a boss. A run code gives the same road.' },
    { id: 'gauntlet-stage', icon: 'swords', title: 'Stage by Stage',
      text: 'Between fights you see the next foe, its difficulty and personality, and any special rules or extra hit points. Check your army list to see ranks, perks, relics and spells. The last stage is a boss, and the Eclipse falls at round 20 in its match. Abandon the Run ends it, so only use it if you mean to.' },
    { id: 'gauntlet-rewards', icon: 'sparkle', title: 'Choosing a Reward',
      text: 'After each victory you take one reward: a new piece, more hit points, a perk that makes an Elite, a spell, a relic or a rest that revives a fallen piece. Relics bend the rules for both courts, such as spells that recharge or a day event each day. A camp after certain stages lets the fallen rise again, though higher ascensions remove the camps.' },
  ],
  puzzles: [
    { id: 'puzzles-intro', icon: 'puzzle', title: 'Solve the Board',
      text: 'Each puzzle gives you a fixed position and a limited number of turns, shown as the win in badge. Win before you run out and the puzzle is solved. Think about the light, the cells and the order of your moves. A solved puzzle gets a green outline and a check mark.' },
    { id: 'puzzles-hints', icon: 'bulb', title: 'Stuck? Ask for a Hint',
      text: 'During a puzzle, the Hint button reveals the setter\'s advice in three stages, from a gentle nudge to the full solution. Hints cost nothing and do not affect your result. Puzzles open in tiers, and Reset Puzzles marks them all unsolved again.' },
    { id: 'puzzles-daily', icon: 'sun', title: 'The Puzzle of the Day',
      text: 'One puzzle is picked for everyone each day and sits at the top of the list. Solving it pays more Shards than an ordinary puzzle, and the main menu shows a check mark when it is done. The puzzle also stays in its tier, so you can find it again later.' },
    { id: 'puzzles-rush', icon: 'bolt', title: 'Puzzle Rush',
      text: 'A Rush runs through puzzles one after another, easy first and hardest last, in a random order each time. One failed puzzle ends the run, and there is no Try Again. Your best run is shown on the button, and a run pays Shards for each puzzle solved up to a limit.' },
  ],
  practice: [
    { id: 'practice-intro', icon: 'target', title: 'The Practice Arena',
      text: 'Here you can fight any piece against any other without a game riding on it, and it touches nothing but the Practice record on the Stats page. Pick your court, the piece that attacks, the piece that defends, the light on the square and how skilled the opponent is. Every choice changes the odds bar immediately.' },
    { id: 'practice-odds', icon: 'bolt', title: 'Reading the Odds',
      text: 'The bar shows your chance to win, the chance of a draw and the opponent\'s chance, based on the pieces and light you chose. Try brighter or darker light to see how the favoured court gains damage and takes less. These same odds appear before every attack in a real match.' },
    { id: 'practice-duel', icon: 'swords', title: 'How a Duel Plays',
      text: 'Press Fight to start. Drag to move your fighter, and hold the Attack button to strike. Each piece fights differently, with quick swings, ranged shots, charges or pulses. A duel lasts at most 20 seconds: whoever has more health left wins, and a draw means the defender holds. Healing and boost pickups appear briefly in the arena, so grab them.' },
  ],
  stats: [
    { id: 'stats-intro', icon: 'trophy', title: 'Your Record',
      text: 'This page keeps every number about your play: games, wins and losses, pieces taken and lost, Gauntlet runs, campaign progress and total time played. Games against a friend on one device are never counted. It all stays on this device.' },
    { id: 'stats-sections', icon: 'grid', title: 'Progress by Play Area',
      text: 'The percentage at the top is how much of the game you have completed, averaged over the campaign, scenarios, puzzles, Gauntlet, Story and achievements. Below the totals, each play area has its own card with a bar, a breakdown by tier, and your record there, including Skirmish, the Practice Arena, the daily match and games with friends. Tap a card heading to fold it away.' },
    { id: 'stats-bests', icon: 'rise', title: 'Personal Bests and the Showcase',
      text: 'Personal bests collect your records, such as longest streaks, fastest win, ladder peak and Puzzle Rush best; each appears once you have set one. The Showcase at the top holds up to three earned achievements that you pin from the list below, and you can unpin one to make room.' },
    { id: 'stats-mastery', icon: 'star', title: 'Mastery Levels',
      text: 'Each play area, from the Campaign to Online, has a mastery level that rises as you play it, with a bar showing how far to the next. Every level pays Shards, and Claim collects all that are waiting. Mastery is separate from stars, so any area you enjoy will level up.' },
    { id: 'stats-achievements', icon: 'star', title: 'Achievements and Replays',
      text: 'Achievements you have earned shine with a trophy, and locked ones show a padlock and the goal. Replay Last Game plays your most recent match back move by move, and Copy Replay Link lets you share it. Reset Stats clears your records and achievements but keeps campaign, puzzle and scenario progress.' },
    { id: 'stats-categories', icon: 'trophy', title: 'Achievement Categories',
      text: 'The achievements are grouped into categories such as Battle Craft, Campaign, Puzzles, Gauntlet and Insight. Tap a category heading to open or close it; the numbers beside it show how many you have earned there. Some achievements need a certain rule or board, so try the options in Skirmish to find them.' },
  ],
  settings: [
    { id: 'settings-look', icon: 'sparkle', title: 'Themes',
      text: 'Pick the colours of the board and pieces here. Star themes are locked and open as you earn campaign stars, so the lock shows how many you need. Themes you buy in the Collection appear here too. Changes apply immediately and are remembered on this device.' },
    { id: 'settings-sound', icon: 'speakerOn', title: 'Sound',
      text: 'The two sliders set the volume of sound effects and of music separately, and moving one plays a sample. Sound On or Off on the main menu mutes everything at once. Sound packs from the Collection change what the effects sound like.' },
    { id: 'settings-access', icon: 'shield', title: 'Accessibility',
      text: 'Larger text and buttons makes the interface bigger. Mark the light adds plus and minus signs to every square so that colour is never the only clue to how bright it is. Reduce motion turns off animation and screen shake. Show Tips Again brings back every one-time tip card and the guided lesson.' },
    { id: 'settings-save', icon: 'chain', title: 'Back Up Your Save',
      text: 'Your progress lives in this browser only, so clearing site data would erase it. Export Save downloads a backup file, and Import Save restores one, then reloads the game. Keep a copy somewhere safe, and use it to move your progress to another device.' },
  ],
  replay: [
    { id: 'replay-intro', icon: 'replay', title: 'Watching a Replay',
      text: 'A replay plays a finished game back one position at a time. Play and Pause run it automatically, Next and Prev step one move, and Start returns to the opening position. The line under the board says whose move it was, and the highlighted piece and square show what changed.' },
    { id: 'replay-review', icon: 'flame', title: 'Review the Game',
      text: 'Review Game has the AI judge every move, grading each as best, good, an inaccuracy, a mistake or a blunder, and giving each side an accuracy score. The graph shows who was ahead: tap it to jump to a moment. For a flagged move, Show the better move displays what the AI preferred.' },
    { id: 'replay-keys', icon: 'keyNext', title: 'Key Moves and Saving',
      text: 'After a review, Prev Key Move and Next Key Move jump between the turning points of the game. Save Card makes a picture of the game to share, and Save Clip records the replay as a short video on browsers that can. Play On From Here takes over from the position on show, for a game that is not yet decided.' },
    { id: 'replay-learn', icon: 'bulb', title: 'Learn from It',
      text: 'Watch the dial at the top as you step through: the light rippling outward from the centre explains many of the duels. Notice where pieces were when they attacked and which squares the winner held. Close returns you to where you came from.' },
  ],
  challenge: [
    { id: 'challenge-intro', icon: 'chain', title: 'A Challenge from a Friend',
      text: 'Someone shared this match with you. The card lists the rules and any special options, and every game started from this link begins from exactly the same position. Choose which court to play, which is the court the sender left free by default.' },
    { id: 'challenge-play', icon: 'swords', title: 'Pick Your Opponent',
      text: 'Play against the AI at Easy, Normal or Hard, or pass the device back and forth with a friend. Your result is not scored against the sender, so it is a friendly way to compare how you each played the same position. A board made in the editor also offers Open in the Editor.' },
  ],
  paste: [
    { id: 'paste-intro', icon: 'chain', title: 'Open a Shared Code',
      text: 'If a link will not open, copy the whole link or just the code after the # sign into the box and press Open. A challenge opens a match to play and a replay opens a game to watch. An error message means the code was cut off or is from a different version of the game.' },
  ],
  online: [
    { id: 'online-intro', icon: 'chain', title: 'Playing a Friend Online',
      text: 'Online games connect two browsers directly, with no game server. One player hosts: set up the match, then send the join link or code to your friend. Your friend opens it and sends back an answer code, which you paste to connect. Only moves are sent, and both sides check every move against the rules.' },
    { id: 'online-steps', icon: 'swords', title: 'Hosting and Joining',
      text: 'The host chooses the match and the court, and the guest takes whatever the host sends. Keep the page open while codes are passed back and forth, and both of you should be running the same version of the game. If the connection fails, the page says why.' },
    { id: 'online-privacy', icon: 'shield', title: 'Privacy and Limits',
      text: 'A direct connection shows each player\'s network address to the other and to the public STUN servers that help find a route. Some networks block direct connections, and there is no relay, so a pair of players may need to try another network. Duels are settled automatically online, and undo and hints are off.' },
  ],
  duel: [
    { id: 'duel-intro', icon: 'swords', title: 'A Live Duel',
      text: 'A capture is settled by a short fight in an arena. You steer one fighter, shown at the bottom, against the other, and whoever has more health left when the timer runs out wins. A draw means the defender holds. The light on the square, named under the fighters, boosts the court it favours, so the odds you saw already count it.' },
    { id: 'duel-arena', icon: 'bolt', title: 'Pickups and the Closing Arena',
      text: 'Healing, attack and defence pickups appear in the arena for a few seconds, so walk over one to take it before it fades. The opponent gets quicker as time passes, and after 12 seconds the arena starts shrinking, which makes stalling a bad plan. Land hits, take the pickups and stay out of corners.' },
  ],
  'duel-touch': [
    { id: 'duel-touch-controls', icon: 'target', title: 'Touch Controls',
      text: 'Drag anywhere in the Drag to move area to steer, and hold the Attack button to strike. You can steer and attack at the same time. If the Mirror option is ticked under the board, the Attack button sits on the other side of the screen.' },
  ],
  'duel-mouse': [
    { id: 'duel-mouse-controls', icon: 'target', title: 'Mouse Controls',
      text: 'Click the arena to take control with the mouse, then move it to steer: you glide on after a flick and ease to a stop, and you always face the foe. Hold the left button to attack, and press Esc to free the mouse. The panel under the arena repeats these controls.' },
  ],
  'duel-defend': [
    { id: 'duel-defend-hold', icon: 'shield', title: 'You Are Defending',
      text: 'The enemy has attacked your piece, and your fighter is shown at the bottom. You do not need to win outright: a draw means the defender holds the square. Keep your distance, strike when you can and stay alive until the timer ends.' },
  ],
  'duel-cells': [
    { id: 'duel-cells-effects', icon: 'sparkle', title: 'Cells in the Arena',
      text: 'A fighter standing on a special cell carries its effect into the duel: Might adds damage and Ward takes less damage, for example. The arena is tinted to match the squares the two pieces were on. Tap empty squares on the board afterwards to read what each effect does.' },
  ],
  game: [
    { id: 'game-board', icon: 'grid', title: 'Reading the Board',
      text: 'The top dial shows the current light and the next few steps of the cycle. On the board, bright squares favour the Solari court and dark ones favour the Umbral, and the light ripples outward from the centre each round. Dashed gold circles are beacons, and walls block movement. Pieces show their hit points as pips underneath.' },
    { id: 'game-goal', icon: 'banner', title: 'The Goal Line',
      text: 'The white line just above the board says what this battle is about: the way to win, such as holding every beacon or defeating the enemy Leader, followed by where the game comes from, such as a campaign opponent or a scenario. Check it whenever you are unsure what to aim for.' },
    { id: 'game-move', icon: 'target', title: 'Move a Piece',
      text: 'On your turn, tap one of your pieces and glowing squares show where it can go. Tap one to move there. Each piece moves differently, and its card under the board explains how. Moving one piece uses up your whole turn, so choose which piece matters most. End Turn passes without moving, which lets wounded pieces rest and heal. Undo takes your last move back.' },
    { id: 'game-card', icon: 'book', title: 'Inspect Anything',
      text: 'Tap any piece, yours or the enemy\'s, to read its card: how it moves, how it duels, its hit points and what the light is doing to it. Tap an empty square to read about that square instead, including how bright it is and whether it holds a beacon or special cell effect. You can inspect during the opponent\'s turn too.' },
    { id: 'game-duel', icon: 'swords', title: 'Attacking and Duels',
      text: 'Moving onto an enemy piece starts a duel. First you see the odds, shaped by hit points, piece types and the light on the square. Then you fight it live: drag to move, hold Attack to strike. Prefer not to? Tick Auto-duel and the game resolves them for you. The winner keeps the square, and a draw means the defender holds.' },
    { id: 'game-spells', icon: 'bolt', title: 'Your Leader\'s Spells',
      text: 'The spell bar lets your Leader cast one spell on its turn, such as teleporting, healing, swapping or binding an enemy. Tap a spell, then tap a glowing target. Casting uses your whole turn and costs the Leader 1 HP, and each spell works only once per match unless the rules recharge it. Spells fall silent once the Eclipse falls, and a Leader below 2 HP cannot cast. Pieces standing on a beacon cannot be targeted.' },
    { id: 'game-options', icon: 'gear', title: 'The Options Under the Board',
      text: 'Mirror swaps the duel controls to the other side of the screen, and Aim assist helps your shots find their target. Haptics adds vibration on devices that have it, and Sound and Music switch audio on and off. These settings apply to the match you are playing and are separate from the sliders in Settings.' },
    { id: 'game-win', icon: 'trophy', title: 'Winning and the Eclipse',
      text: 'The match shows its win condition in the status line, usually holding all five beacons at the end of your turn. After some rounds the Eclipse falls: light stops shifting and, in the showdown, the outer squares turn deadly. The Hint button gives free advice when you are stuck. Quit leaves the match, so finish it if you want it to count. When a game ends you can copy a replay link or review it move by move before pressing Continue.' },
  ],
  'game-cells': [
    { id: 'game-cells-intro', icon: 'sparkle', title: 'Cell Effects',
      text: 'The coloured squares on this board have special effects. Might adds damage dealt, Ward cuts damage taken, Recovery heals at the end of the round, Hazard hurts, Silence blocks a Leader\'s spells and Invincibility protects on odd rounds. The legend under the board names each colour, and tapping any empty square describes its effect.' },
  ],
  'game-passives': [
    { id: 'game-passives-intro', icon: 'sun', title: 'Court Gifts',
      text: 'In this match each court has a gift tied to the light. A Solari flier standing on a shifting square in full light reaches one square further, and Umbral pieces regenerate in the dark. The piece card tells you what the light is doing to a piece you inspect.' },
  ],
  'game-loadout': [
    { id: 'game-loadout-intro', icon: 'bolt', title: 'A Chosen Set of Spells',
      text: 'The spell bar here holds the spells picked for this match rather than the usual seven. Each Leader has its own set, and a court\'s signature spells work only for that court. Hold or hover over a spell to read what it does.' },
  ],
  'game-recharge': [
    { id: 'game-recharge-intro', icon: 'cycle', title: 'Spells That Return',
      text: 'In this match a cast spell is not gone for good: it comes back to the Leader a number of rounds later. Hold or hover over a spent spell on the bar to see the round it returns. Each cast still costs the Leader 1 HP and the turn.' },
  ],
  'game-fog': [
    { id: 'game-fog-intro', icon: 'moon', title: 'Fog of War',
      text: 'Enemy pieces more than 2 squares from any of yours are hidden. Scout with a piece that can move fast, and be careful about advancing into the unknown. Fog applies against the computer, and it pays a Shard bonus on a win.' },
  ],
  'game-sudden': [
    { id: 'game-sudden-intro', icon: 'clash', title: 'Sudden Death',
      text: 'From the round shown, the first duel that kills a piece ends the game and the survivor wins. Before then, play as usual, but plan your attacks so that the first kill is yours. Keep your Leader out of danger as the round approaches.' },
  ],
  'game-edge': [
    { id: 'game-edge-intro', icon: 'shield', title: 'A Head Start',
      text: 'Every piece of one court starts this match with extra hit points. Check the cards of the pieces to see how much, and avoid even fights early on. When the extra hit points are the enemy\'s, winning pays a Shard bonus.' },
  ],
  'game-scenario': [
    { id: 'game-scenario-goal', icon: 'target', title: 'A Scenario Goal',
      text: 'This battle has its own goal instead of the usual beacons: survive, escort your Leader to a marked beacon, or hold one. The goal line above the board and the round counter show how long you have, and running out of rounds loses unless the goal is to survive. Losing your Leader always loses.' },
  ],
  'game-story': [
    { id: 'game-story-battle', icon: 'book', title: 'A Story Battle',
      text: 'Named characters fight as some of the pieces. Win and the ones taken are wounded and start the next fight weaker, and some can fall for good. Lose and nothing changes, so you can try again at once. Story battles are not saved if you quit, and they never affect your campaign stars.' },
  ],
  'game-gauntlet': [
    { id: 'game-gauntlet-fight', icon: 'flame', title: 'A Gauntlet Fight',
      text: 'Your army fights with the wounds, ranks and perks it carries from the run. A win takes you on to a reward, while a defeat or a draw ends the run. Quitting counts as giving up the fight, so play it out.' },
  ],
  'game-series': [
    { id: 'game-series-tournament', icon: 'trophy', title: 'Best of Three',
      text: 'This is one game of a tournament: the first to win two games takes the title. Each game is a fresh start against the same opponent. Tournament games earn no stars, but a won tournament counts towards your achievements.' },
  ],
  'game-daily': [
    { id: 'game-daily-rules', icon: 'sun', title: 'A Scored Game',
      text: 'This is the daily or weekly match, so there is no Undo. Your first finished daily game is the one that counts for your streak, and a weekly keeps your best score. A game you quit before it is decided is not scored.' },
  ],
  'game-weekly': [
    { id: 'game-weekly-twist', icon: 'cycle', title: 'This Week\'s Twist',
      text: 'The weekly match changes one rule for everyone, such as a band of special squares across the middle. Tap an empty square to read what it does, and use the twist to your advantage. A better score than your best this week earns a Shard reward.' },
  ],
  'game-ladder': [
    { id: 'game-ladder-rated', icon: 'trophy', title: 'A Rated Game',
      text: 'This game changes your ladder rating, so there is no Undo. A win against a stronger foe earns the most, and a win also pays a few Shards. Hints are still free. A game you quit before it is decided is not rated.' },
  ],
  'game-mail': [
    { id: 'game-mail-turn', icon: 'chain', title: 'Your Turn by Link',
      text: 'Make your move, and the game then shows the link to send to your friend. There is no AI answer here, and nothing happens until they reply. Undo is off, and duels are settled automatically.' },
  ],
  'game-grand': [
    { id: 'game-grand-board', icon: 'grid', title: 'The Grand Board',
      text: 'The 9x9 Grand board gives each side sixteen pieces and more room to manoeuvre, with the light rippling out in more rings. Distances are longer and battles last longer, so plan several moves ahead and keep your army together.' },
  ],
  'game-modes': [
    { id: 'game-modes-goal', icon: 'banner', title: 'A Different Way to Win',
      text: 'This match is not won by holding every beacon. Leader Capture ends when a Leader falls, Score Race gives each court points for the beacons it holds every round, and King of the Hill needs the centre square for several of your turns in a row. The goal line and the round counter show your progress.' },
  ],
  'game-events': [
    { id: 'game-events-day', icon: 'cycle', title: 'Day Events',
      text: 'On some days an event bends the rules for two rounds: Solar Flare brightens the shifting squares, Gloaming darkens them, Fog shortens long-range moves and Blight stops healing. The round counter area names the current event and warns you one or two rounds before the next.' },
  ],
  'game-growth': [
    { id: 'game-growth-ranks', icon: 'rise', title: 'Veterans, Perks and Promotion',
      text: 'With these rules a piece that wins duels grows: after 2 wins it becomes a Veteran with one more hit point, and after 4 an Elite that chooses a perk. A Footsoldier that crosses to the enemy home column is promoted to a Charger or a Marksman. You are asked to choose when it happens, before your move is played.' },
  ],
  'game-online': [
    { id: 'game-online-play', icon: 'chain', title: 'Playing Online',
      text: 'Moves reach your friend as you make them, and their moves arrive on their turn. Undo and hints are off, and captures are settled automatically. If the connection drops the game is kept and you can Reconnect with the same player. Resign ends the game at once. When it is over, either side can ask for a Rematch with the courts swapped.' },
    { id: 'game-online-talk', icon: 'swap', title: 'Draws and Quick Messages',
      text: 'Offer Draw asks your friend to agree to a draw, and they can Accept or Decline. The Say menu sends a short preset message, which appears as a bubble on their screen. There is no free text.' },
  ],
  'game-hotseat': [
    { id: 'game-hotseat-intro', icon: 'swap', title: 'Two Players, One Device',
      text: 'Players take turns on the same screen. A pass screen hides the board between turns so nobody sees the other\'s plans, so hand over the device and tap to continue. The board can turn to face whoever is playing. Both options can be switched off under the board. Duels are resolved automatically.' },
  ],
  'game-puzzle': [
    { id: 'game-puzzle-brief', icon: 'puzzle', title: 'The Briefing and the Goal Line',
      text: 'When a puzzle opens, a card repeats its title and what you must achieve; press Got It! to begin. The first sentence of the description stays on the line above the board, so you can always check what the setter asks for.' },
    { id: 'game-puzzle-intro', icon: 'puzzle', title: 'Puzzle Rules',
      text: 'You must win within the number of turns shown under the board, and every turn of yours counts, including ones where you pass. If you run out, press Try Again to reset the board. The Hint button reveals the setter\'s advice in stages. Think about the order of your moves and which piece should strike first.' },
  ],
  'game-rush': [
    { id: 'game-rush-run', icon: 'bolt', title: 'A Puzzle Rush',
      text: 'This puzzle is part of a Rush, so there is no Try Again: a failed puzzle ends the run. Solve it and the next one follows at once. Your score is how many you solved in a row, and the best run is kept.' },
  ],
  'game-clock': [
    { id: 'game-clock-intro', icon: 'clock', title: 'The Turn Clock',
      text: 'This match has a clock. The ring under the board counts down your turn, and when it empties your turn is passed. Some matches give each court extra bank time that is spent only after a turn runs out. The clock stops during duels, dialogs and the opponent\'s turn.' },
  ],
} as const satisfies Record<string, readonly Tip[]>

export type TipPage = keyof typeof DATA

export const TIPS: Record<TipPage, readonly Tip[]> = DATA
