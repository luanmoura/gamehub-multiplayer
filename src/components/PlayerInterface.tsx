'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Send, 
  Palette, 
  Zap, 
  Clock,
  Trophy,
  Users
} from 'lucide-react'
import { PlayerConnection } from '@/lib/gameConnection'
import { GameMessage } from '@/lib/gameTypes'

interface PlayerInterfaceProps {
  roomId: string
}

export default function PlayerInterface({ roomId }: PlayerInterfaceProps) {
  const [playerName, setPlayerName] = useState('')
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState<any>({})
  const [currentGame, setCurrentGame] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [playerConnection, setPlayerConnection] = useState<PlayerConnection | null>(null)
  
  // Estados específicos dos jogos
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [drawingMode, setDrawingMode] = useState(false)
  const [wordInput, setWordInput] = useState('')
  const [storyInput, setStoryInput] = useState('')
  const [reactionReady, setReactionReady] = useState(false)
  const [guessInput, setGuessInput] = useState('')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)

  useEffect(() => {
    // Gerar nome aleatório se não tiver
    if (!playerName) {
      const names = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena']
      setPlayerName(names[Math.floor(Math.random() * names.length)])
    }
  }, [])

  useEffect(() => {
    if (playerName && !connected && !playerConnection) {
      connectToGame()
    }
  }, [playerName])

  const connectToGame = async () => {
    setConnectionStatus('connecting')
    
    const connection = new PlayerConnection(
      roomId,
      playerName,
      handleGameMessage
    )
    
    setPlayerConnection(connection)
    
    try {
      const success = await connection.connect()
      if (success) {
        setConnected(true)
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Connection failed:', error)
      setConnectionStatus('disconnected')
    }
  }

  const handleGameMessage = (message: GameMessage) => {
    console.log('Received message:', message)
    
    switch (message.type) {
      case 'welcome':
        console.log('Conectado ao jogo!')
        break
      case 'game-start':
        setCurrentGame(message.data.gameId)
        break
      case 'quiz-question':
        setGameState(message.data)
        setQuizAnswer(null)
        break
      case 'drawing-word':
        setGameState(message.data)
        setDrawingMode(message.data.isDrawer)
        break
      case 'drawing-start':
        setGameState(message.data)
        setDrawingMode(false)
        break
      case 'word-chain-start':
        setGameState(message.data)
        setWordInput('')
        break
      case 'your-turn':
        setGameState(message.data)
        break
      case 'reaction-challenge':
        setGameState(message.data)
        setReactionReady(true)
        break
      case 'signal-show':
        setReactionReady(false)
        break
      case 'story-start':
        setGameState(message.data)
        setStoryInput('')
        break
      case 'player-change':
        setGameState(prev => ({ ...prev, ...message.data }))
        break
      case 'word-result':
      case 'guess-result':
      case 'story-update':
        // Atualizar feedback visual
        break
    }
  }

  const sendMessage = (type: string, data: any) => {
    if (playerConnection) {
      playerConnection.sendMessage({ type, data })
    }
  }

  const submitQuizAnswer = (answer: number) => {
    setQuizAnswer(answer)
    sendMessage('quiz-answer', { answer })
  }

  const submitWord = () => {
    if (wordInput.trim()) {
      sendMessage('word-submission', { word: wordInput.trim() })
      setWordInput('')
    }
  }

  const submitStory = () => {
    if (storyInput.trim()) {
      sendMessage('story-sentence', { sentence: storyInput.trim() })
      setStoryInput('')
    }
  }

  const handleReactionTap = () => {
    if (!reactionReady) {
      sendMessage('reaction-tap', { timestamp: Date.now() })
    }
  }

  const submitGuess = () => {
    if (guessInput.trim()) {
      sendMessage('guess', { guess: guessInput.trim() })
      setGuessInput('')
    }
  }

  // Configurar canvas para desenho
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !drawingMode) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawing.current = true
      const { x, y } = getCoordinates(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!isDrawing.current) return
      const { x, y } = getCoordinates(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      
      // Enviar dados do desenho
      sendMessage('drawing-stroke', { x, y, type: 'draw' })
    }

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawing.current = false
    }

    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [drawingMode])

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">📱</div>
            <CardTitle className="text-white">Conectando ao Jogo</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                {connectionStatus === 'connecting' ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full" />
                    <span className="text-blue-200">Conectando...</span>
                  </>
                ) : connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-400" />
                    <span className="text-green-400">Conectado!</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">Falha na conexão</span>
                  </>
                )}
              </div>
              
              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-white font-mono">
                  Sala: <span className="text-pink-400">{roomId}</span>
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  Jogador: {playerName}
                </p>
              </div>
              
              {connectionStatus === 'connecting' && (
                <p className="text-blue-200 text-sm">
                  Aguarde enquanto conectamos você ao jogo...
                </p>
              )}
              
              {connectionStatus === 'disconnected' && (
                <Button 
                  onClick={connectToGame}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Tentar Novamente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Interface específica para cada jogo
  const renderGameInterface = () => {
    switch (currentGame) {
      case 'quiz-battle':
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">🧠 Quiz Battle</CardTitle>
            </CardHeader>
            <CardContent>
              {gameState.question ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <Badge className="bg-blue-500 text-white">
                      Pergunta {gameState.questionNumber}/{gameState.totalQuestions}
                    </Badge>
                  </div>
                  <h3 className="text-white font-bold text-lg text-center mb-6">
                    {gameState.question}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {gameState.options?.map((option: string, index: number) => (
                      <Button
                        key={index}
                        onClick={() => submitQuizAnswer(index)}
                        disabled={quizAnswer !== null}
                        className={`p-4 text-left h-auto ${
                          quizAnswer === index 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <span className="font-bold mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </Button>
                    ))}
                  </div>
                  {quizAnswer !== null && (
                    <div className="text-center mt-4">
                      <Badge className="bg-green-500 text-white">
                        ✓ Resposta enviada!
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-blue-200">Aguardando próxima pergunta...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'drawing-guess':
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">
                🎨 {drawingMode ? 'Desenhe!' : 'Adivinhe!'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drawingMode ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <Badge className="bg-purple-500 text-white text-lg px-4 py-2">
                      Palavra: {gameState.word}
                    </Badge>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={200}
                    className="w-full border-2 border-white/20 rounded-lg bg-white touch-none"
                    style={{ touchAction: 'none' }}
                  />
                  <p className="text-blue-200 text-sm text-center">
                    Desenhe a palavra acima! Outros jogadores tentarão adivinhar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-white mb-2">
                      {gameState.drawer} está desenhando!
                    </p>
                    <Badge className="bg-blue-500 text-white">
                      {gameState.wordLength} letras
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Digite seu palpite..."
                      className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                      onKeyPress={(e) => e.key === 'Enter' && submitGuess()}
                    />
                    <Button
                      onClick={submitGuess}
                      className="bg-green-500 hover:bg-green-600"
                      disabled={!guessInput.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'word-chain':
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">🔗 Corrente de Palavras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-blue-200 mb-2">Próxima palavra deve começar com:</p>
                  <div className="text-4xl font-bold text-green-400">
                    {gameState.letter?.toUpperCase() || '?'}
                  </div>
                  {gameState.currentPlayer && (
                    <p className="text-blue-200 mt-2">
                      Vez de: {gameState.currentPlayer}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    placeholder="Digite uma palavra..."
                    className="bg-white/10 border-white/20 text-white placeholder-blue-200"
                    onKeyPress={(e) => e.key === 'Enter' && submitWord()}
                  />
                  <Button 
                    onClick={submitWord} 
                    className="bg-green-500 hover:bg-green-600"
                    disabled={!wordInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-blue-200 text-sm text-center">
                  Mínimo 3 letras • Não pode repetir palavras
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'reaction-time':
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">⚡ Tempo de Reação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-blue-200 mb-4">
                    {gameState.challenge || 'Aguarde o desafio...'}
                  </p>
                </div>
                <Button
                  onClick={handleReactionTap}
                  className={`w-full h-32 text-2xl font-bold ${
                    reactionReady 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {reactionReady ? '🚫 AGUARDE O SINAL!' : '👆 TOQUE QUANDO VER O SINAL!'}
                </Button>
                <p className="text-blue-200 text-sm text-center">
                  Toque apenas quando o sinal aparecer na tela principal!
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'story-builder':
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-center">📚 Construtor de Histórias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  {gameState.theme && (
                    <Badge className="bg-purple-500 text-white mb-2">
                      Tema: {gameState.theme}
                    </Badge>
                  )}
                  <p className="text-blue-200">
                    {gameState.instruction || 'Aguarde sua vez...'}
                  </p>
                  {gameState.lastSentence && (
                    <div className="bg-black/20 rounded-lg p-3 mt-3">
                      <p className="text-white text-sm">
                        Última frase: "{gameState.lastSentence}"
                      </p>
                    </div>
                  )}
                </div>
                <Textarea
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Escreva a próxima frase da história..."
                  className="bg-white/10 border-white/20 text-white placeholder-blue-200 min-h-[100px]"
                />
                <Button 
                  onClick={submitStory} 
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={!storyInput.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Frase
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="text-center py-8">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-white text-xl mb-2">Conectado ao Jogo!</p>
              <p className="text-blue-200">Aguardando o jogo começar...</p>
            </CardContent>
          </Card>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-green-400" />
                <span className="text-white font-semibold">{playerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-green-400" />
                <Badge className="bg-green-500 text-white">Conectado</Badge>
              </div>
            </div>
            <div className="text-center mt-2">
              <Badge variant="outline" className="text-blue-200 border-blue-200">
                Sala: {roomId}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Interface do Jogo */}
        {renderGameInterface()}
      </div>
    </div>
  )
}