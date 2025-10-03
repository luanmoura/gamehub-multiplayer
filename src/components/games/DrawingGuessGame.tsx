'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Palette, Trophy, Users } from 'lucide-react'
import { BaseGameProps } from '@/lib/gameTypes'

interface DrawingData {
  currentDrawer: string
  word: string
  drawing: string[]
  guesses: { playerId: string; guess: string; correct: boolean }[]
  round: number
  totalRounds: number
}

const WORDS = [
  'gato', 'casa', 'árvore', 'carro', 'sol', 'lua', 'peixe', 'flor',
  'bicicleta', 'livro', 'telefone', 'computador', 'cachorro', 'pássaro',
  'montanha', 'praia', 'pizza', 'sorvete', 'guitarra', 'violão'
]

export default function DrawingGuessGame({ 
  players, 
  gameState, 
  onSendToPlayers, 
  onSendToPlayer, 
  onUpdateGameState,
  onUpdatePlayer,
  onBack 
}: BaseGameProps) {
  const [drawingData, setDrawingData] = useState<DrawingData>({
    currentDrawer: '',
    word: '',
    drawing: [],
    guesses: [],
    round: 1,
    totalRounds: players.length * 2
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (gameState.phase === 'waiting') {
      startNewRound()
    }
  }, [])

  useEffect(() => {
    // Timer para cada rodada
    if (gameState.phase === 'playing' && gameState.timeLeft && gameState.timeLeft > 0) {
      const timer = setTimeout(() => {
        onUpdateGameState({ timeLeft: gameState.timeLeft! - 1 })
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.phase === 'playing' && gameState.timeLeft === 0) {
      endRound()
    }
  }, [gameState.timeLeft, gameState.phase])

  const startNewRound = () => {
    const drawerIndex = (drawingData.round - 1) % players.length
    const currentDrawer = players[drawerIndex]
    const word = WORDS[Math.floor(Math.random() * WORDS.length)]

    const newDrawingData = {
      ...drawingData,
      currentDrawer: currentDrawer.id,
      word,
      drawing: [],
      guesses: []
    }

    setDrawingData(newDrawingData)
    onUpdateGameState({ 
      phase: 'playing' as const, 
      timeLeft: 90,
      currentRound: drawingData.round,
      data: newDrawingData
    })

    // Enviar palavra para o desenhista
    onSendToPlayer(currentDrawer.id, {
      type: 'drawing-word',
      data: { word, isDrawer: true }
    })

    // Avisar outros jogadores
    players.forEach(player => {
      if (player.id !== currentDrawer.id) {
        onSendToPlayer(player.id, {
          type: 'drawing-start',
          data: { 
            drawer: currentDrawer.name,
            isDrawer: false,
            wordLength: word.length
          }
        })
      }
    })
  }

  const endRound = () => {
    onUpdateGameState({ phase: 'paused' as const })
    
    // Calcular pontuações
    const correctGuesses = drawingData.guesses.filter(g => g.correct)
    
    // Pontos para quem acertou (mais pontos para quem acertou primeiro)
    correctGuesses.forEach((guess, index) => {
      const points = Math.max(100 - (index * 20), 20)
      const player = players.find(p => p.id === guess.playerId)
      if (player) {
        onUpdatePlayer(guess.playerId, { 
          score: (player.score || 0) + points 
        })
      }
    })

    // Pontos para o desenhista se alguém acertou
    if (correctGuesses.length > 0) {
      const drawer = players.find(p => p.id === drawingData.currentDrawer)
      if (drawer) {
        onUpdatePlayer(drawingData.currentDrawer, {
          score: (drawer.score || 0) + (correctGuesses.length * 30)
        })
      }
    }

    // Mostrar resultado por 5 segundos
    setTimeout(() => {
      if (drawingData.round >= drawingData.totalRounds) {
        onUpdateGameState({ phase: 'finished' as const })
      } else {
        setDrawingData(prev => ({ ...prev, round: prev.round + 1 }))
        startNewRound()
      }
    }, 5000)
  }

  const handlePlayerMessage = (playerId: string, message: any) => {
    if (message.type === 'drawing-stroke') {
      // Atualizar desenho
      setDrawingData(prev => ({
        ...prev,
        drawing: [...prev.drawing, message.data]
      }))
      
      // Reenviar para todos os outros jogadores
      players.forEach(player => {
        if (player.id !== playerId) {
          onSendToPlayer(player.id, {
            type: 'drawing-update',
            data: message.data
          })
        }
      })
    } else if (message.type === 'guess') {
      const guess = message.data.guess.toLowerCase().trim()
      const isCorrect = guess === drawingData.word.toLowerCase()
      
      const newGuess = {
        playerId,
        guess: message.data.guess,
        correct: isCorrect
      }
      
      setDrawingData(prev => ({
        ...prev,
        guesses: [...prev.guesses, newGuess]
      }))

      // Enviar feedback para todos
      onSendToPlayers({
        type: 'guess-result',
        data: {
          playerName: players.find(p => p.id === playerId)?.name,
          guess: message.data.guess,
          correct: isCorrect
        }
      })

      // Se acertou, dar pontos e continuar
      if (isCorrect) {
        const correctGuesses = drawingData.guesses.filter(g => g.correct).length
        if (correctGuesses === 0) {
          // Primeira pessoa a acertar - mais pontos
          setTimeout(() => {
            endRound()
          }, 2000)
        }
      }
    }
  }

  // Simular recebimento de mensagens dos jogadores
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.phase === 'playing' && Math.random() < 0.1) {
        const guessingPlayers = players.filter(p => p.id !== drawingData.currentDrawer)
        if (guessingPlayers.length > 0) {
          const randomPlayer = guessingPlayers[Math.floor(Math.random() * guessingPlayers.length)]
          const randomGuess = WORDS[Math.floor(Math.random() * WORDS.length)]
          
          if (!drawingData.guesses.find(g => g.playerId === randomPlayer.id)) {
            handlePlayerMessage(randomPlayer.id, {
              type: 'guess',
              data: { guess: randomGuess }
            })
          }
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [gameState.phase, drawingData.currentDrawer, drawingData.guesses])

  if (gameState.phase === 'finished') {
    const ranking = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎨</div>
            <h1 className="text-4xl font-bold text-white mb-2">Resultado Final</h1>
            <p className="text-xl text-blue-200">Desenho & Adivinha Concluído!</p>
          </div>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
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
                        <p className="text-blue-200 text-sm">#{index + 1}</p>
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

  const currentDrawer = players.find(p => p.id === drawingData.currentDrawer)
  const guessingPlayers = players.filter(p => p.id !== drawingData.currentDrawer)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            ← Sair
          </Button>
          <div className="flex items-center gap-4">
            <Badge className="bg-blue-500 text-white text-lg px-4 py-2">
              Rodada {drawingData.round}/{drawingData.totalRounds}
            </Badge>
            <Badge className={`text-white text-lg px-4 py-2 ${(gameState.timeLeft || 0) <= 15 ? 'bg-red-500' : 'bg-green-500'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {gameState.timeLeft || 0}s
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Área de Desenho */}
          <div className="lg:col-span-3">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-pink-400" />
                    <span className="text-white font-semibold">
                      {currentDrawer?.name} está desenhando
                    </span>
                  </div>
                  <Badge className="bg-purple-500 text-white">
                    Palavra: {drawingData.word.split('').map((_, i) => '_ ').join('')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-xl p-4 min-h-[400px] relative">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className="w-full h-full border-2 border-gray-200 rounded-lg"
                  />
                  {gameState.phase === 'waiting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                      <div className="text-center">
                        <Palette className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                        <p className="text-xl font-semibold text-gray-700">
                          Preparando próxima rodada...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Palpites */}
                <div className="mt-4 bg-black/20 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <h4 className="text-white font-semibold mb-2">Palpites:</h4>
                  <div className="space-y-1">
                    {drawingData.guesses.map((guess, index) => (
                      <div key={index} className={`text-sm ${guess.correct ? 'text-green-400' : 'text-blue-200'}`}>
                        <span className="font-semibold">
                          {players.find(p => p.id === guess.playerId)?.name}:
                        </span> {guess.guess}
                        {guess.correct && <span className="ml-2">✅</span>}
                      </div>
                    ))}
                  </div>
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
                        player.id === drawingData.currentDrawer ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="text-white font-semibold">{player.name}</span>
                        {player.id === drawingData.currentDrawer && (
                          <Palette className="w-4 h-4 text-pink-400" />
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
                  Jogadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-white">{player.name}</span>
                      <div className="flex items-center gap-2">
                        {player.id === drawingData.currentDrawer ? (
                          <Badge className="bg-purple-500 text-white text-xs">Desenhando</Badge>
                        ) : drawingData.guesses.find(g => g.playerId === player.id && g.correct) ? (
                          <Badge className="bg-green-500 text-white text-xs">Acertou!</Badge>
                        ) : drawingData.guesses.find(g => g.playerId === player.id) ? (
                          <Badge className="bg-yellow-500 text-white text-xs">Tentou</Badge>
                        ) : (
                          <Badge className="bg-blue-500 text-white text-xs">Pensando</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}