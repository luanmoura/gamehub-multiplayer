'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, BookOpen, Trophy, Users } from 'lucide-react'
import { BaseGameProps } from '@/lib/gameTypes'

interface StoryData {
  currentPlayer: string
  story: { playerId: string; sentence: string }[]
  round: number
  totalRounds: number
  theme: string
}

const THEMES = [
  'Uma aventura no espaço',
  'Um dia na escola mágica',
  'Mistério na cidade',
  'Viagem no tempo',
  'Animais falantes',
  'Ilha deserta',
  'Robôs do futuro',
  'Castelo assombrado'
]

export default function StoryBuilderGame({ 
  players, 
  gameState, 
  onSendToPlayers, 
  onSendToPlayer, 
  onUpdateGameState,
  onUpdatePlayer,
  onBack 
}: BaseGameProps) {
  const [storyData, setStoryData] = useState<StoryData>({
    currentPlayer: '',
    story: [],
    round: 1,
    totalRounds: players.length * 3, // 3 frases por jogador
    theme: ''
  })

  useEffect(() => {
    if (gameState.phase === 'waiting') {
      startNewStory()
    }
  }, [])

  useEffect(() => {
    // Timer para cada turno
    if (gameState.phase === 'playing' && gameState.timeLeft && gameState.timeLeft > 0) {
      const timer = setTimeout(() => {
        onUpdateGameState({ timeLeft: gameState.timeLeft! - 1 })
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.phase === 'playing' && gameState.timeLeft === 0) {
      skipPlayer()
    }
  }, [gameState.timeLeft, gameState.phase])

  const startNewStory = () => {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)]
    const firstPlayer = players[0].id

    const newStoryData = {
      ...storyData,
      currentPlayer: firstPlayer,
      story: [],
      theme
    }

    setStoryData(newStoryData)
    onUpdateGameState({ 
      phase: 'playing' as const, 
      timeLeft: 30,
      currentRound: 1,
      data: newStoryData
    })

    // Avisar jogadores sobre o tema
    onSendToPlayers({
      type: 'story-start',
      data: { 
        theme,
        currentPlayer: players.find(p => p.id === firstPlayer)?.name
      }
    })

    // Avisar jogador atual
    onSendToPlayer(firstPlayer, {
      type: 'your-turn',
      data: { 
        theme,
        isFirst: true,
        instruction: 'Comece a história com uma frase sobre: ' + theme
      }
    })
  }

  const nextPlayer = () => {
    const currentIndex = players.findIndex(p => p.id === storyData.currentPlayer)
    const nextIndex = (currentIndex + 1) % players.length
    const nextPlayerId = players[nextIndex].id

    setStoryData(prev => ({
      ...prev,
      currentPlayer: nextPlayerId,
      round: prev.round + 1
    }))

    onUpdateGameState({ 
      timeLeft: 30,
      currentRound: storyData.round + 1
    })

    if (storyData.round + 1 > storyData.totalRounds) {
      onUpdateGameState({ phase: 'finished' as const })
      return
    }

    // Avisar próximo jogador
    const lastSentence = storyData.story[storyData.story.length - 1]?.sentence || ''
    onSendToPlayer(nextPlayerId, {
      type: 'your-turn',
      data: { 
        lastSentence,
        instruction: 'Continue a história...'
      }
    })

    // Avisar todos sobre a mudança
    onSendToPlayers({
      type: 'player-change',
      data: { 
        currentPlayer: players.find(p => p.id === nextPlayerId)?.name
      }
    })
  }

  const skipPlayer = () => {
    // Adicionar frase automática
    const autoSentence = '... (o jogador não conseguiu continuar a tempo) ...'
    
    setStoryData(prev => ({
      ...prev,
      story: [...prev.story, { playerId: prev.currentPlayer, sentence: autoSentence }]
    }))

    nextPlayer()
  }

  const handlePlayerMessage = (playerId: string, message: any) => {
    if (message.type === 'story-sentence' && playerId === storyData.currentPlayer) {
      const sentence = message.data.sentence.trim()
      
      if (sentence.length > 0) {
        setStoryData(prev => ({
          ...prev,
          story: [...prev.story, { playerId, sentence }]
        }))

        // Dar pontos pela criatividade (baseado no tamanho da frase)
        const player = players.find(p => p.id === playerId)
        if (player) {
          const points = Math.min(sentence.length, 50) // Máximo 50 pontos
          onUpdatePlayer(playerId, {
            score: (player.score || 0) + points
          })
        }

        // Enviar atualização para todos
        onSendToPlayers({
          type: 'story-update',
          data: {
            playerName: players.find(p => p.id === playerId)?.name,
            sentence,
            storyLength: storyData.story.length + 1
          }
        })

        // Próximo jogador
        setTimeout(() => {
          nextPlayer()
        }, 2000)
      }
    }
  }

  // Simular contribuições dos jogadores
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.phase === 'playing' && Math.random() < 0.4) {
        const sentences = [
          'De repente, uma luz brilhante apareceu no céu.',
          'O protagonista decidiu investigar o som estranho.',
          'Mas algo inesperado estava prestes a acontecer.',
          'No meio da confusão, um personagem misterioso surgiu.',
          'A situação ficou ainda mais complicada quando...',
          'Felizmente, eles encontraram uma solução criativa.',
          'O final da aventura reservava uma grande surpresa.',
          'E assim, todos aprenderam uma lição importante.'
        ]
        
        const randomSentence = sentences[Math.floor(Math.random() * sentences.length)]
        
        if (storyData.currentPlayer) {
          handlePlayerMessage(storyData.currentPlayer, {
            type: 'story-sentence',
            data: { sentence: randomSentence }
          })
        }
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [gameState.phase, storyData.currentPlayer])

  if (gameState.phase === 'finished') {
    const ranking = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-4xl font-bold text-white mb-2">História Completa!</h1>
            <p className="text-xl text-blue-200">Construtor de Histórias Concluído!</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* História Final */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  📖 Nossa História: {storyData.theme}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/5 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {storyData.story.map((entry, index) => (
                    <p key={index} className="text-white mb-3 leading-relaxed">
                      <span className="text-blue-300 font-semibold">
                        {players.find(p => p.id === entry.playerId)?.name}:
                      </span>{' '}
                      {entry.sentence}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ranking */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">🏆 Ranking Final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ranking.map((player, index) => (
                    <div 
                      key={player.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/30' :
                        index === 2 ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-600/30' :
                        'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">{player.name}</p>
                          <p className="text-blue-200 text-sm">
                            #{index + 1} - {index === 0 ? 'Escritor Criativo' : index === 1 ? 'Contador de Histórias' : 'Colaborador'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{player.score || 0}</p>
                        <p className="text-blue-200 text-sm">pontos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={onBack}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
            >
              Voltar ao GameHub
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentPlayerName = players.find(p => p.id === storyData.currentPlayer)?.name

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            ← Sair
          </Button>
          <div className="flex items-center gap-4">
            <Badge className="bg-blue-500 text-white text-lg px-4 py-2">
              Frase {storyData.round}/{storyData.totalRounds}
            </Badge>
            <Badge className={`text-white text-lg px-4 py-2 ${(gameState.timeLeft || 0) <= 10 ? 'bg-red-500' : 'bg-green-500'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {gameState.timeLeft || 0}s
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* História em Construção */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tema */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-semibold">Tema da História</span>
                  </div>
                  <Badge className="bg-purple-500 text-white">
                    Vez de: {currentPlayerName}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    {storyData.theme}
                  </h2>
                  <p className="text-blue-200">
                    {currentPlayerName} está escrevendo a próxima frase...
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* História Atual */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Nossa História</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white/5 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                  {storyData.story.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-blue-200 text-lg">
                        A história está começando...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {storyData.story.map((entry, index) => (
                        <div key={index} className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-start gap-3">
                            <Badge className="bg-blue-500 text-white text-xs">
                              {index + 1}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-blue-300 font-semibold text-sm mb-1">
                                {players.find(p => p.id === entry.playerId)?.name}
                              </p>
                              <p className="text-white leading-relaxed">
                                {entry.sentence}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Indicador de próxima frase */}
                      <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/30">
                        <div className="flex items-center gap-3">
                          <div className="animate-pulse">✏️</div>
                          <p className="text-purple-200 italic">
                            {currentPlayerName} está escrevendo...
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Placar e Status */}
          <div className="space-y-6">
            {/* Placar */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  <Trophy className="w-5 h-5 inline mr-2" />
                  Placar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((player, index) => (
                    <div 
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        player.id === storyData.currentPlayer ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="text-white font-semibold">{player.name}</span>
                        {player.id === storyData.currentPlayer && (
                          <Badge className="bg-purple-500 text-white text-xs">Escrevendo</Badge>
                        )}
                      </div>
                      <span className="text-white font-bold">{player.score || 0}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status dos Jogadores */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  <Users className="w-5 h-5 inline mr-2" />
                  Contribuições
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players.map((player) => {
                    const contributions = storyData.story.filter(s => s.playerId === player.id).length
                    return (
                      <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-white">{player.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500 text-white text-xs">
                            {contributions} frases
                          </Badge>
                          {player.id === storyData.currentPlayer && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Dicas */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">💡 Dicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-200">
                  <p>• Seja criativo e divertido</p>
                  <p>• Continue a história anterior</p>
                  <p>• Frases maiores = mais pontos</p>
                  <p>• Máximo 30 segundos por frase</p>
                  <p>• Crie reviravoltas interessantes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}