'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wifi, WifiOff, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { GameConnection, simulatePlayerConnections } from '@/lib/gameConnection'
import { Player, GameState, GameMessage, BaseGameProps } from '@/lib/gameTypes'
import { getGameById } from '@/lib/gameConfig'

// Importar todos os jogos
import QuizGame from '@/components/games/QuizGame'
import DrawingGuessGame from '@/components/games/DrawingGuessGame'
import WordChainGame from '@/components/games/WordChainGame'
import ReactionTimeGame from '@/components/games/ReactionTimeGame'
import StoryBuilderGame from '@/components/games/StoryBuilderGame'

interface GameRoomProps {
  game: { id: string; name: string; minPlayers: number; maxPlayers: number }
  onBack: () => void
}

export default function GameRoom({ game, onBack }: GameRoomProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState>({ phase: 'waiting' })
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [roomId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase())
  const gameConnectionRef = useRef<GameConnection | null>(null)

  useEffect(() => {
    // Gerar QR Code com URL para conectar
    const gameUrl = `${window.location.origin}/join/${roomId}`
    QRCode.toDataURL(gameUrl, { width: 300, margin: 2 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err))

    // Configurar conexão WebRTC
    const gameConnection = new GameConnection(
      roomId,
      handlePlayerConnect,
      handlePlayerDisconnect,
      handlePlayerMessage
    )
    
    gameConnectionRef.current = gameConnection
    gameConnection.startListening()

    // Simular conexões de jogadores para demonstração
    simulatePlayerConnections(roomId, game.maxPlayers)

    return () => {
      gameConnection.disconnect()
    }
  }, [roomId, game.maxPlayers])

  const handlePlayerConnect = (player: Player) => {
    setPlayers(prev => {
      // Evitar duplicatas
      if (prev.find(p => p.id === player.id)) return prev
      if (prev.length >= game.maxPlayers) return prev
      
      return [...prev, player]
    })
  }

  const handlePlayerDisconnect = (playerId: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, connected: false } : p
    ))
  }

  const handlePlayerMessage = (playerId: string, message: GameMessage) => {
    // Repassar mensagens para o jogo ativo
    console.log(`Player ${playerId} message:`, message)
  }

  const sendToAllPlayers = (message: GameMessage) => {
    if (gameConnectionRef.current) {
      gameConnectionRef.current.sendToAllPlayers(message)
    }
  }

  const sendToPlayer = (playerId: string, message: GameMessage) => {
    if (gameConnectionRef.current) {
      gameConnectionRef.current.sendToPlayer(playerId, message)
    }
  }

  const updateGameState = (newState: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...newState }))
  }

  const updatePlayer = (playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    ))
  }

  const startGame = () => {
    if (players.length >= game.minPlayers) {
      setGameState({ phase: 'playing' })
      
      // Enviar sinal de início para todos os jogadores
      sendToAllPlayers({
        type: 'game-start',
        data: { gameId: game.id }
      })
    }
  }

  const handleGameBack = () => {
    setGameState({ phase: 'waiting' })
    onBack()
  }

  // Renderizar jogo específico baseado no ID
  const renderGame = () => {
    const gameProps: BaseGameProps = {
      players,
      gameState,
      onSendToPlayers: sendToAllPlayers,
      onSendToPlayer: sendToPlayer,
      onUpdateGameState: updateGameState,
      onUpdatePlayer: updatePlayer,
      onBack: handleGameBack
    }

    switch (game.id) {
      case 'quiz-battle':
        return <QuizGame {...gameProps} />
      case 'drawing-guess':
        return <DrawingGuessGame {...gameProps} />
      case 'word-chain':
        return <WordChainGame {...gameProps} />
      case 'reaction-time':
        return <ReactionTimeGame {...gameProps} />
      case 'story-builder':
        return <StoryBuilderGame {...gameProps} />
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">{game.name}</h1>
                <div className="flex items-center gap-4">
                  <Badge className="bg-green-500 text-white">
                    <Users className="w-4 h-4 mr-1" />
                    {players.length} jogadores
                  </Badge>
                  <Button 
                    onClick={handleGameBack}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    Sair do Jogo
                  </Button>
                </div>
              </div>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 min-h-[500px]">
                <CardContent className="p-8">
                  <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">Jogo em Desenvolvimento</h2>
                    <p className="text-blue-200 mb-8">
                      Este jogo ainda não foi implementado.
                    </p>
                    
                    <div className="bg-black/20 rounded-xl p-8 min-h-[300px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-4">🎮</div>
                        <p className="text-xl">Área do Jogo: {game.name}</p>
                        <p className="text-blue-200 mt-2">
                          Em breve disponível!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de jogadores conectados */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {players.map((player) => (
                  <Card key={player.id} className="bg-white/10 backdrop-blur-sm border-white/20">
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Smartphone className="w-6 h-6 text-green-400 mr-2" />
                        <span className="text-white font-semibold">{player.name}</span>
                      </div>
                      <Badge className={player.connected ? 'bg-green-500' : 'bg-red-500'}>
                        {player.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  if (gameState.phase === 'playing' || gameState.phase === 'paused' || gameState.phase === 'finished') {
    return renderGame()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          onClick={onBack}
          className="mb-6 bg-white/10 hover:bg-white/20 text-white border-white/20"
        >
          ← Voltar
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code e instruções */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">
                Conecte seu Celular
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              {qrCodeUrl && (
                <div className="bg-white p-4 rounded-xl inline-block mb-4">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              )}
              <p className="text-blue-200 mb-4">
                Escaneie o QR Code com seu celular para se conectar ao jogo
              </p>
              <div className="bg-black/20 rounded-lg p-3 mb-4">
                <p className="text-white font-mono text-lg">
                  Código da Sala: <span className="text-pink-400">{roomId}</span>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-200">
                <Smartphone className="w-4 h-4" />
                <span>Use seu celular como controle</span>
              </div>
            </CardContent>
          </Card>

          {/* Status da sala */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Status da Sala</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Jogadores Conectados:</span>
                  <Badge className="bg-blue-500 text-white">
                    {players.length} / {game.maxPlayers}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Mínimo para Iniciar:</span>
                  <Badge className="bg-purple-500 text-white">
                    {game.minPlayers} jogadores
                  </Badge>
                </div>

                {/* Lista de jogadores */}
                <div className="space-y-2">
                  <h4 className="text-white font-semibold">Jogadores:</h4>
                  {players.length === 0 ? (
                    <p className="text-blue-200 text-sm">Aguardando jogadores...</p>
                  ) : (
                    players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between bg-black/20 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                          <span className="text-white">{player.name}</span>
                        </div>
                        {player.connected ? (
                          <Wifi className="w-4 h-4 text-green-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Botão de iniciar */}
                <Button 
                  onClick={startGame}
                  disabled={players.length < game.minPlayers}
                  className={`w-full text-lg py-6 rounded-xl transition-all duration-300 ${
                    players.length >= game.minPlayers
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transform hover:scale-105'
                      : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {players.length >= game.minPlayers 
                    ? `Iniciar ${game.name}` 
                    : `Aguardando ${game.minPlayers - players.length} jogador(es)`
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}