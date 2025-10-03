'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, Trophy, Users } from 'lucide-react'
import { BaseGameProps } from '@/lib/gameTypes'

interface ReactionData {
  round: number
  totalRounds: number
  waitTime: number
  reactionTimes: { playerId: string; time: number }[]
  currentChallenge: string
  showSignal: boolean
  signalStartTime: number
}

const CHALLENGES = [
  { id: 'green', text: 'Toque quando a tela ficar VERDE!', color: 'bg-green-500', signal: '🟢' },
  { id: 'red', text: 'Toque quando aparecer o círculo VERMELHO!', color: 'bg-red-500', signal: '🔴' },
  { id: 'blue', text: 'Toque quando a tela ficar AZUL!', color: 'bg-blue-500', signal: '🔵' },
  { id: 'yellow', text: 'Toque quando aparecer a estrela!', color: 'bg-yellow-500', signal: '⭐' },
  { id: 'purple', text: 'Toque quando a tela ficar ROXA!', color: 'bg-purple-500', signal: '🟣' },
  { id: 'orange', text: 'Toque quando aparecer o raio!', color: 'bg-orange-500', signal: '⚡' }
]

export default function ReactionTimeGame({ 
  players, 
  gameState, 
  onSendToPlayers, 
  onSendToPlayer, 
  onUpdateGameState,
  onUpdatePlayer,
  onBack 
}: BaseGameProps) {
  const [reactionData, setReactionData] = useState<ReactionData>({
    round: 1,
    totalRounds: 6,
    waitTime: 0,
    reactionTimes: [],
    currentChallenge: '',
    showSignal: false,
    signalStartTime: 0
  })

  useEffect(() => {
    if (gameState.phase === 'waiting') {
      startNewRound()
    }
  }, [])

  const startNewRound = () => {
    const challenge = CHALLENGES[reactionData.round - 1] || CHALLENGES[0]
    const waitTime = 3000 + Math.random() * 5000 // 3-8 segundos

    setReactionData(prev => ({
      ...prev,
      currentChallenge: challenge.id,
      waitTime,
      reactionTimes: [],
      showSignal: false
    }))

    onUpdateGameState({ 
      phase: 'playing' as const,
      currentRound: reactionData.round,
      data: { ...reactionData, currentChallenge: challenge.id }
    })

    // Avisar jogadores sobre o desafio
    onSendToPlayers({
      type: 'reaction-challenge',
      data: { 
        challenge: challenge.text,
        round: reactionData.round,
        totalRounds: reactionData.totalRounds
      }
    })

    // Aguardar tempo aleatório e mostrar sinal
    setTimeout(() => {
      showSignal()
    }, waitTime)
  }

  const showSignal = () => {
    const signalStartTime = Date.now()
    
    setReactionData(prev => ({
      ...prev,
      showSignal: true,
      signalStartTime
    }))

    // Avisar jogadores que o sinal apareceu
    onSendToPlayers({
      type: 'signal-show',
      data: { startTime: signalStartTime }
    })

    // Aguardar 3 segundos para coletar reações
    setTimeout(() => {
      endRound()
    }, 3000)
  }

  const endRound = () => {
    onUpdateGameState({ phase: 'paused' as const })
    
    // Calcular pontuações baseadas na velocidade
    const sortedReactions = [...reactionData.reactionTimes].sort((a, b) => a.time - b.time)
    
    sortedReactions.forEach((reaction, index) => {
      const player = players.find(p => p.id === reaction.playerId)
      if (player) {
        // Pontos baseados na posição (1º lugar = 100pts, 2º = 80pts, etc.)
        const points = Math.max(100 - (index * 20), 10)
        onUpdatePlayer(reaction.playerId, {
          score: (player.score || 0) + points
        })
      }
    })

    // Mostrar resultado por 4 segundos
    setTimeout(() => {
      if (reactionData.round >= reactionData.totalRounds) {
        onUpdateGameState({ phase: 'finished' as const })
      } else {
        setReactionData(prev => ({ ...prev, round: prev.round + 1 }))
        startNewRound()
      }
    }, 4000)
  }

  const handlePlayerMessage = (playerId: string, message: any) => {
    if (message.type === 'reaction-tap' && reactionData.showSignal) {
      const reactionTime = message.data.timestamp - reactionData.signalStartTime
      
      // Verificar se já reagiu
      if (!reactionData.reactionTimes.find(r => r.playerId === playerId)) {
        setReactionData(prev => ({
          ...prev,
          reactionTimes: [...prev.reactionTimes, { playerId, time: reactionTime }]
        }))

        // Avisar todos sobre a reação
        onSendToPlayers({
          type: 'player-reacted',
          data: {
            playerName: players.find(p => p.id === playerId)?.name,
            reactionTime,
            position: reactionData.reactionTimes.length + 1
          }
        })
      }
    }
  }

  // Simular reações dos jogadores
  useEffect(() => {
    if (reactionData.showSignal && gameState.phase === 'playing') {
      const simulateReactions = () => {
        players.forEach((player, index) => {
          if (!reactionData.reactionTimes.find(r => r.playerId === player.id)) {
            setTimeout(() => {
              if (Math.random() < 0.8) { // 80% chance de reagir
                const reactionTime = 200 + Math.random() * 800 // 200-1000ms
                handlePlayerMessage(player.id, {
                  type: 'reaction-tap',
                  data: { timestamp: reactionData.signalStartTime + reactionTime }
                })
              }
            }, 100 + Math.random() * 1000 + (index * 100))
          }
        })
      }
      
      setTimeout(simulateReactions, 100)
    }
  }, [reactionData.showSignal, gameState.phase])

  if (gameState.phase === 'finished') {
    const ranking = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-4xl font-bold text-white mb-2">Resultado Final</h1>
            <p className="text-xl text-blue-200">Tempo de Reação Concluído!</p>
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
                        <p className="text-blue-200 text-sm">#{index + 1} - Reflexos de {index === 0 ? 'Ninja' : index === 1 ? 'Gato' : 'Humano'}</p>
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

  const currentChallenge = CHALLENGES.find(c => c.id === reactionData.currentChallenge) || CHALLENGES[0]
  const sortedReactions = [...reactionData.reactionTimes].sort((a, b) => a.time - b.time)

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
              Rodada {reactionData.round}/{reactionData.totalRounds}
            </Badge>
            <Badge className="bg-purple-500 text-white text-lg px-4 py-2">
              <Zap className="w-4 h-4 mr-1" />
              Reflexos
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Área Principal */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center text-xl">
                  {currentChallenge.text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`min-h-[400px] rounded-xl flex items-center justify-center transition-all duration-300 ${
                  reactionData.showSignal ? currentChallenge.color : 'bg-gray-800'
                }`}>
                  {!reactionData.showSignal ? (
                    <div className="text-center">
                      <div className="text-6xl mb-4">⏳</div>
                      <p className="text-2xl text-white font-bold">
                        Prepare-se...
                      </p>
                      <p className="text-blue-200 mt-2">
                        O sinal pode aparecer a qualquer momento!
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-9xl mb-4 animate-pulse">
                        {currentChallenge.signal}
                      </div>
                      <p className="text-3xl text-white font-bold">
                        AGORA!
                      </p>
                    </div>
                  )}
                </div>

                {/* Reações em tempo real */}
                {reactionData.showSignal && (
                  <div className="mt-4 bg-black/20 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-2">Reações:</h4>
                    <div className="space-y-1">
                      {sortedReactions.map((reaction, index) => (
                        <div key={reaction.playerId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⚡'}
                            </span>
                            <span className="text-white font-semibold">
                              {players.find(p => p.id === reaction.playerId)?.name}
                            </span>
                          </div>
                          <Badge className={`${
                            reaction.time < 300 ? 'bg-green-500' :
                            reaction.time < 500 ? 'bg-yellow-500' : 'bg-red-500'
                          } text-white`}>
                            {reaction.time}ms
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        reactionData.reactionTimes.find(r => r.playerId === player.id) ? 'bg-green-500/20' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="text-white font-semibold">{player.name}</span>
                        {reactionData.reactionTimes.find(r => r.playerId === player.id) && (
                          <Zap className="w-4 h-4 text-green-400" />
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
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {players.map((player) => {
                    const reaction = reactionData.reactionTimes.find(r => r.playerId === player.id)
                    return (
                      <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                        <span className="text-white">{player.name}</span>
                        <div className="flex items-center gap-2">
                          {reaction ? (
                            <Badge className="bg-green-500 text-white text-xs">
                              {reaction.time}ms
                            </Badge>
                          ) : reactionData.showSignal ? (
                            <Badge className="bg-yellow-500 text-white text-xs">Reagindo...</Badge>
                          ) : (
                            <Badge className="bg-blue-500 text-white text-xs">Pronto</Badge>
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
                  <p>• Mantenha o dedo pronto</p>
                  <p>• Não toque antes do sinal</p>
                  <p>• Reflexos &lt; 300ms = Excelente</p>
                  <p>• Reflexos &lt; 500ms = Bom</p>
                  <p>• Primeiro lugar = mais pontos</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}