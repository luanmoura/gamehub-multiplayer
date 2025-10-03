export interface Player {
  id: string
  name: string
  peer: any
  connected: boolean
  score?: number
  status?: string
}

export interface GameConfig {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  ageRating: string
  duration: string
  difficulty: 'Fácil' | 'Médio' | 'Difícil'
  image: string
}

export interface GameState {
  phase: 'waiting' | 'playing' | 'paused' | 'finished'
  currentRound?: number
  totalRounds?: number
  timeLeft?: number
  data?: any // Dados específicos do jogo
}

export interface GameMessage {
  type: string
  data?: any
  playerId?: string
  timestamp?: number
}

export interface BaseGameProps {
  players: Player[]
  gameState: GameState
  onSendToPlayers: (message: GameMessage) => void
  onSendToPlayer: (playerId: string, message: GameMessage) => void
  onUpdateGameState: (newState: Partial<GameState>) => void
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void
  onBack: () => void
}