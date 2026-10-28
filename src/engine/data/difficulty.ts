export type Difficulty = 'easy' | 'normal' | 'hard'
export const DIFFICULTY_LIST: readonly Difficulty[] = ['easy', 'normal', 'hard']

/** The strengths the AI can play at: the three difficulties, plus rungs between and above them that only the ranked ladder uses. */
export type AiLevel = Difficulty | 'journeyman' | 'expert' | 'grandmaster'
