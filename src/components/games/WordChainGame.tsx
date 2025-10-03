'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Link, Trophy, Users } from 'lucide-react'
import { BaseGameProps } from '@/lib/gameTypes'

interface WordChainData {
  currentPlayer: string
  words: { playerId: string; word: string; valid: boolean }[]
  currentLetter: string
  round: number
  totalRounds: number
  usedWords: Set<string>
}

export default function WordChainGame({ 
  players, 
  gameState, 
  onSendToPlayers, 
  onSendToPlayer, 
  onUpdateGameState,
  onUpdatePlayer,
  onBack 
}: BaseGameProps) {
  const [wordChainData, setWordChainData] = useState<WordChainData>({
    currentPlayer: '',
    words: [],
    currentLetter: '',
    round: 1,
    totalRounds: 10,
    usedWords: new Set()
  })

  useEffect(() => {
    if (gameState.phase === 'waiting') {
      startNewRound()
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

  const startNewRound = () => {
    const playerIndex = Math.floor(Math.random() * players.length)
    const currentPlayer = players[playerIndex].id
    const startingLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26))

    const newWordChainData = {
      ...wordChainData,
      currentPlayer,
      words: [],
      currentLetter: startingLetter.toLowerCase(),
      usedWords: new Set()
    }

    setWordChainData(newWordChainData)
    onUpdateGameState({ 
      phase: 'playing' as const, 
      timeLeft: 20,
      currentRound: wordChainData.round,
      data: newWordChainData
    })

    // Avisar jogadores
    onSendToPlayers({
      type: 'word-chain-start',
      data: { 
        currentPlayer: players.find(p => p.id === currentPlayer)?.name,
        startingLetter: startingLetter.toLowerCase(),
        round: wordChainData.round
      }
    })

    // Avisar jogador atual
    onSendToPlayer(currentPlayer, {
      type: 'your-turn',
      data: { letter: startingLetter.toLowerCase() }
    })
  }

  const nextPlayer = () => {
    const currentIndex = players.findIndex(p => p.id === wordChainData.currentPlayer)
    const nextIndex = (currentIndex + 1) % players.length
    const nextPlayerId = players[nextIndex].id

    setWordChainData(prev => ({
      ...prev,
      currentPlayer: nextPlayerId
    }))

    onUpdateGameState({ timeLeft: 20 })

    // Avisar próximo jogador
    onSendToPlayer(nextPlayerId, {
      type: 'your-turn',
      data: { letter: wordChainData.currentLetter }
    })

    // Avisar todos sobre a mudança
    onSendToPlayers({
      type: 'player-change',
      data: { 
        currentPlayer: players.find(p => p.id === nextPlayerId)?.name,
        letter: wordChainData.currentLetter
      }
    })
  }

  const skipPlayer = () => {
    // Penalizar jogador atual
    const currentPlayer = players.find(p => p.id === wordChainData.currentPlayer)
    if (currentPlayer) {
      onUpdatePlayer(wordChainData.currentPlayer, {
        score: Math.max(0, (currentPlayer.score || 0) - 10)
      })
    }

    nextPlayer()
  }

  const validateWord = (word: string): boolean => {
    // Validações básicas
    if (word.length < 3) return false
    if (wordChainData.usedWords.has(word.toLowerCase())) return false
    if (!word.toLowerCase().startsWith(wordChainData.currentLetter)) return false
    
    // Lista básica de palavras válidas (em produção seria um dicionário completo)
    const validWords = [
      'casa', 'amor', 'rato', 'tomate', 'elefante', 'escola', 'livro', 'ovo', 'ouro',
      'rosa', 'azul', 'luz', 'zebra', 'abacaxi', 'igreja', 'água', 'árvore', 'energia',
      'animal', 'leão', 'onça', 'açúcar', 'rio', 'oceano', 'navio', 'ovelha', 'avião',
      'nuvem', 'mesa', 'amigo', 'gato', 'olho', 'osso', 'orelha', 'anel', 'lua',
      'uva', 'urso', 'ovo', 'ouro', 'onda', 'arco', 'oca', 'ave', 'eco', 'oca'
    ]
    
    return validWords.includes(word.toLowerCase())
  }

  const handlePlayerMessage = (playerId: string, message: any) => {
    if (message.type === 'word-submission' && playerId === wordChainData.currentPlayer) {
      const word = message.data.word.toLowerCase().trim()
      const isValid = validateWord(word)
      
      const newWord = {
        playerId,
        word: message.data.word,
        valid: isValid
      }
      
      setWordChainData(prev => ({
        ...prev,
        words: [...prev.words, newWord],
        currentLetter: isValid ? word.slice(-1) : prev.currentLetter,
        usedWords: isValid ? new Set([...prev.usedWords, word]) : prev.usedWords
      }))

      // Enviar resultado para todos
      onSendToPlayers({
        type: 'word-result',
        data: {
          playerName: players.find(p => p.id === playerId)?.name,
          word: message.data.word,
          valid: isValid,
          nextLetter: isValid ? word.slice(-1) : wordChainData.currentLetter
        }
      })

      if (isValid) {
        // Dar pontos
        const player = players.find(p => p.id === playerId)
        if (player) {
          const points = word.length * 5 // 5 pontos por letra
          onUpdatePlayer(playerId, {
            score: (player.score || 0) + points
          })
        }

        // Próximo jogador
        setTimeout(() => {
          if (wordChainData.round >= wordChainData.totalRounds) {
            onUpdateGameState({ phase: 'finished' as const })
          } else {
            nextPlayer()
          }
        }, 2000)
      } else {
        // Palavra inválida - próximo jogador
        setTimeout(() => {
          skipPlayer()
        }, 2000)
      }
    }
  }

  // Simular jogadas dos jogadores
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.phase === 'playing' && Math.random() < 0.3) {
        const possibleWords = [
          'casa', 'amor', 'rato', 'tomate', 'elefante', 'escola', 'livro', 'ovo',
          'rosa', 'azul', 'luz', 'zebra', 'abacaxi', 'igreja', 'água', 'árvore'
        ]
        
        const validWords = possibleWords.filter(word => 
          word.startsWith(wordChainData.currentLetter) && 
          !wordChainData.usedWords.has(word)
        )
        
        if (validWords.length > 0 && wordChainData.currentPlayer) {
          const randomWord = validWords[Math.floor(Math.random() * validWords.length)]
          handlePlayerMessage(wordChainData.currentPlayer, {
            type: 'word-submission',
            data: { word: randomWord }
          })
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [gameState.phase, wordChainData.currentPlayer, wordChainData.currentLetter, wordChainData.usedWords])

  if (gameState.phase === 'finished') {
    const ranking = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔗</div>
            <h1 className="text-4xl font-bold text-white mb-2">Resultado Final</h1>
            <p className="text-xl text-blue-200">Corrente de Palavras Concluída!</p>
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

  const currentPlayerName = players.find(p => p.id === wordChainData.currentPlayer)?.name

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
              Rodada {wordChainData.round}/{wordChainData.totalRounds}
            </Badge>
            <Badge className={`text-white text-lg px-4 py-2 ${(gameState.timeLeft || 0) <= 5 ? 'bg-red-500' : 'bg-green-500'}`}>
              <Clock className="w-4 h-4 mr-1" />
              {gameState.timeLeft || 0}s
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Área Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Atual */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Link className="w-5 h-5 text-green-400" />
                    <span className="text-white font-semibold">
                      Vez de: {currentPlayerName}
                    </span>
                  </div>
                  <Badge className="bg-purple-500 text-white text-xl px-4 py-2">
                    Letra: {wordChainData.currentLetter.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🔤</div>
                  <p className="text-2xl text-white mb-2">
                    Próxima palavra deve começar com:
                  </p>
                  <div className="text-8xl font-bold text-green-400 mb-4">
                    {wordChainData.currentLetter.toUpperCase()}
                  </div>
                  <p className="text-blue-200">
                    {currentPlayerName} está pensando em uma palavra...
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Palavras */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Corrente de Palavras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {wordChainData.words.length === 0 ? (
                    <p className="text-blue-200 text-center py-4">
                      Aguardando primeira palavra...
                    </p>
                  ) : (
                    wordChainData.words.map((wordEntry, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          wordEntry.valid ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-semibold">
                            {players.find(p => p.id === wordEntry.playerId)?.name}:
                          </span>
                          <span className={`text-lg font-bold ${wordEntry.valid ? 'text-green-300' : 'text-red-300'}`}>
                            {wordEntry.word}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {wordEntry.valid ? (
                            <>
                              <span className="text-green-400">✅</span>
                              <Badge className="bg-green-500 text-white">
                                +{wordEntry.word.length * 5}pts
                              </Badge>
                            </>
                          ) : (
                            <span className="text-red-400">❌</span>
                          )}
                        </div>
                      </div>
                    ))
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
                        player.id === wordChainData.currentPlayer ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                        </span>
                        <span className="text-white font-semibold">{player.name}</span>
                        {player.id === wordChainData.currentPlayer && (
                          <Badge className="bg-blue-500 text-white text-xs">Sua vez</Badge>
                        )}
                      </div>
                      <span className="text-white font-bold">{player.score || 0}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Regras */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-center">
                  <Users className="w-5 h-5 inline mr-2" />
                  Regras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-200">
                  <p>• Palavra deve começar com a letra indicada</p>
                  <p>• Mínimo 3 letras</p>
                  <p>• Não pode repetir palavras</p>
                  <p>• 5 pontos por letra</p>
                  <p>• -10 pontos se não responder</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}