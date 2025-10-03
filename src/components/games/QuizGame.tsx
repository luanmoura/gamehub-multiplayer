'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Trophy, Zap } from 'lucide-react'
import { BaseGameProps } from '@/lib/gameTypes'

interface Question {
  id: number
  question: string
  options: string[]
  correct: number
  category: string
}

const questions: Question[] = [
  {
    id: 1,
    question: "Qual é a capital do Brasil?",
    options: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
    correct: 2,
    category: "Geografia"
  },
  {
    id: 2,
    question: "Quem pintou a Mona Lisa?",
    options: ["Van Gogh", "Leonardo da Vinci", "Picasso", "Michelangelo"],
    correct: 1,
    category: "Arte"
  },
  {
    id: 3,
    question: "Qual é o maior planeta do sistema solar?",
    options: ["Terra", "Marte", "Saturno", "Júpiter"],
    correct: 3,
    category: "Ciência"
  },
  {
    id: 4,
    question: "Em que ano o Brasil foi descoberto?",
    options: ["1498", "1500", "1502", "1504"],
    correct: 1,
    category: "História"
  },
  {
    id: 5,
    question: "Qual é a fórmula da água?",
    options: ["CO2", "H2O", "O2", "NaCl"],
    correct: 1,
    category: "Química"
  }
]

export default function QuizGame({ 
  players, 
  gameState, 
  onSendToPlayers, 
  onSendToPlayer, 
  onUpdateGameState,
  onUpdatePlayer,
  onBack 
}: BaseGameProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [playerAnswers, setPlayerAnswers] = useState<{ [playerId: string]: { answer: number; time: number } }>({})
  const [questionStartTime, setQuestionStartTime] = useState(0)

  useEffect(() => {
    if (gameState.phase === 'waiting') {
      // Começar o jogo após 3 segundos
      setTimeout(() => {
        startNextQuestion()
      }, 3000)
    }
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    
    if (gameState.phase === 'playing' && gameState.timeLeft && gameState.timeLeft > 0) {
      timer = setTimeout(() => {
        onUpdateGameState({ timeLeft: gameState.timeLeft! - 1 })
      }, 1000)
    } else if (gameState.phase === 'playing' && gameState.timeLeft === 0) {
      endQuestion()
    }
    
    return () => clearTimeout(timer)
  }, [gameState.timeLeft, gameState.phase])

  const startNextQuestion = () => {
    if (currentQuestion >= questions.length) {
      onUpdateGameState({ phase: 'finished' as const })
      return
    }

    onUpdateGameState({ 
      phase: 'playing' as const, 
      timeLeft: 15,
      currentRound: currentQuestion + 1
    })
    
    setPlayerAnswers({})
    setQuestionStartTime(Date.now())
    
    // Enviar pergunta para todos os jogadores
    const question = questions[currentQuestion]
    onSendToPlayers({
      type: 'quiz-question',
      data: {
        question: question.question,
        options: question.options,
        questionNumber: currentQuestion + 1,
        totalQuestions: questions.length,
        timeLimit: 15
      }
    })
  }

  const endQuestion = () => {
    onUpdateGameState({ phase: 'paused' as const })
    
    // Calcular pontuações
    const question = questions[currentQuestion]
    
    Object.entries(playerAnswers).forEach(([playerId, answer]) => {
      if (answer.answer === question.correct) {
        // Pontuação baseada na velocidade (máximo 1000 pontos)
        const timeBonus = Math.max(0, 15 - (answer.time - questionStartTime) / 1000)
        const points = Math.round(500 + (timeBonus / 15) * 500)
        
        const player = players.find(p => p.id === playerId)
        if (player) {
          onUpdatePlayer(playerId, {
            score: (player.score || 0) + points
          })
        }
      }
    })
    
    // Mostrar resultados por 5 segundos
    setTimeout(() => {
      setCurrentQuestion(currentQuestion + 1)
      startNextQuestion()
    }, 5000)
  }

  const handlePlayerAnswer = (playerId: string, answer: number) => {
    if (gameState.phase !== 'playing' || playerAnswers[playerId]) return
    
    setPlayerAnswers(prev => ({
      ...prev,
      [playerId]: {
        answer,
        time: Date.now()
      }
    }))
  }

  // Simular respostas dos jogadores
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.phase === 'playing' && Math.random() < 0.2) {
        const unansweredPlayers = players.filter(p => !playerAnswers[p.id])
        if (unansweredPlayers.length > 0) {
          const randomPlayer = unansweredPlayers[Math.floor(Math.random() * unansweredPlayers.length)]
          const randomAnswer = Math.floor(Math.random() * 4)
          handlePlayerAnswer(randomPlayer.id, randomAnswer)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [gameState.phase, playerAnswers])

  const getPlayerRanking = () => {
    return players
      .map(player => ({
        ...player,
        score: player.score || 0
      }))
      .sort((a, b) => b.score - a.score)
  }

  if (gameState.phase === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <Button onClick={onBack} className="mb-6 bg-white/10 hover:bg-white/20 text-white border-white/20">
            ← Voltar
          </Button>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-12">
              <div className="text-6xl mb-6">🧠</div>
              <h1 className="text-4xl font-bold text-white mb-4">Quiz Battle</h1>
              <p className="text-xl text-blue-200 mb-8">Preparando as perguntas...</p>
              <div className="animate-spin w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full mx-auto"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (gameState.phase === 'finished') {
    const ranking = getPlayerRanking()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-4xl font-bold text-white mb-2">Resultado Final</h1>
            <p className="text-xl text-blue-200">Quiz Battle Concluído!</p>
          </div>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-center">🥇 Ranking Final</CardTitle>
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
                      <p className="text-2xl font-bold text-white">{player.score}</p>
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

  const question = questions[currentQuestion]
  const answeredPlayers = Object.keys(playerAnswers).length

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
              Pergunta {currentQuestion + 1}/{questions.length}
            </Badge>
            <Badge className={`text-white text-lg px-4 py-2 ${(gameState.timeLeft || 0) <= 5 ? 'bg-red-500' : 'bg-green-500'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {gameState.timeLeft || 0}s
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pergunta Principal */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <Badge className="bg-purple-500 text-white">{question.category}</Badge>
                  <div className="flex items-center gap-2 text-blue-200">
                    <Zap className="w-4 h-4" />
                    <span>{answeredPlayers}/{players.length} responderam</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold text-white text-center mb-8">
                  {question.question}
                </h2>
                
                {gameState.phase === 'paused' && (
                  <div className="grid grid-cols-2 gap-4">
                    {question.options.map((option, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          index === question.correct 
                            ? 'bg-green-500/20 border-green-500 text-green-100' 
                            : 'bg-white/5 border-white/20 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                          {index === question.correct && (
                            <Trophy className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        
                        {/* Mostrar quantos jogadores escolheram esta opção */}
                        <div className="mt-2">
                          {Object.values(playerAnswers)
                            .filter(answer => answer.answer === index)
                            .map((_, i) => (
                              <div key={i} className="w-2 h-2 bg-blue-400 rounded-full inline-block mr-1" />
                            ))
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {gameState.phase === 'playing' && (
                  <div className="text-center">
                    <div className="text-6xl mb-4">⏰</div>
                    <p className="text-xl text-blue-200">
                      Os jogadores estão respondendo em seus celulares...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Placar */}
          <div>
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  <Trophy className="w-5 h-5 inline mr-2" />
                  Placar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getPlayerRanking().map((player, index) => (
                    <div 
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        playerAnswers[player.id] ? 'bg-green-500/20' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="text-white font-semibold">{player.name}</span>
                        {playerAnswers[player.id] && (
                          <Badge className="bg-green-500 text-white text-xs">✓</Badge>
                        )}
                      </div>
                      <span className="text-white font-bold">{player.score}</span>
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