import { GameConfig } from './gameTypes'

export const GAMES: GameConfig[] = [
  {
    id: 'quiz-battle',
    name: 'Quiz Battle',
    description: 'Responda perguntas de conhecimentos gerais o mais rápido possível! Cada jogador recebe as perguntas no celular e compete para ser o mais rápido e preciso.',
    minPlayers: 2,
    maxPlayers: 8,
    ageRating: '10+',
    duration: '10-15 min',
    difficulty: 'Médio',
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=300&fit=crop'
  },
  {
    id: 'drawing-guess',
    name: 'Desenho & Adivinha',
    description: 'Um jogador desenha no celular enquanto outros tentam adivinhar! O desenho aparece em tempo real na tela principal para todos verem.',
    minPlayers: 3,
    maxPlayers: 10,
    ageRating: '6+',
    duration: '15-20 min',
    difficulty: 'Fácil',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop'
  },
  {
    id: 'word-chain',
    name: 'Corrente de Palavras',
    description: 'Forme palavras conectadas em sequência! Cada jogador adiciona uma palavra que comece com a última letra da palavra anterior.',
    minPlayers: 2,
    maxPlayers: 6,
    ageRating: '8+',
    duration: '8-12 min',
    difficulty: 'Médio',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop'
  },
  {
    id: 'reaction-time',
    name: 'Tempo de Reação',
    description: 'Teste seus reflexos! Quando a tela principal mostrar o sinal, seja o primeiro a tocar no seu celular. Várias rodadas com diferentes desafios.',
    minPlayers: 2,
    maxPlayers: 12,
    ageRating: '6+',
    duration: '5-10 min',
    difficulty: 'Fácil',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop'
  },
  {
    id: 'story-builder',
    name: 'Construtor de Histórias',
    description: 'Criem uma história colaborativa! Cada jogador adiciona uma frase à história pelo celular, criando narrativas hilariantes e inesperadas.',
    minPlayers: 3,
    maxPlayers: 8,
    ageRating: '10+',
    duration: '12-18 min',
    difficulty: 'Médio',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop'
  }
]

export function getGameById(id: string): GameConfig | undefined {
  return GAMES.find(game => game.id === id)
}