'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, Star, Play } from 'lucide-react'
import GameRoom from '@/components/GameRoom'
import { GAMES, getGameById } from '@/lib/gameConfig'
import { GameConfig } from '@/lib/gameTypes'

export default function GameHub() {
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null)
  const [gameStarted, setGameStarted] = useState(false)

  if (gameStarted && selectedGame) {
    return <GameRoom game={selectedGame} onBack={() => setGameStarted(false)} />
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            onClick={() => setSelectedGame(null)}
            className="mb-6 bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            ← Voltar aos Jogos
          </Button>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <img 
                src={selectedGame.image} 
                alt={selectedGame.name}
                className="w-full h-64 object-cover rounded-2xl shadow-2xl"
              />
            </div>
            
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{selectedGame.name}</h1>
                <p className="text-xl text-blue-200">{selectedGame.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Users className="w-5 h-5" />
                    <span className="font-semibold">Jogadores</span>
                  </div>
                  <p className="text-blue-200">{selectedGame.minPlayers}-{selectedGame.maxPlayers} pessoas</p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">Duração</span>
                  </div>
                  <p className="text-blue-200">{selectedGame.duration}</p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Star className="w-5 h-5" />
                    <span className="font-semibold">Idade</span>
                  </div>
                  <p className="text-blue-200">{selectedGame.ageRating}</p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <span className="font-semibold">Dificuldade</span>
                  </div>
                  <Badge 
                    className={`${
                      selectedGame.difficulty === 'Fácil' ? 'bg-green-500' :
                      selectedGame.difficulty === 'Médio' ? 'bg-yellow-500' : 'bg-red-500'
                    } text-white`}
                  >
                    {selectedGame.difficulty}
                  </Badge>
                </div>
              </div>
              
              <Button 
                onClick={() => setGameStarted(true)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-lg py-6 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <Play className="w-6 h-6 mr-2" />
                Iniciar Jogo
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            GameHub
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Jogos multiplayer para jogar em grupo! Use seu celular como controle e a tela principal para o jogo.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <Card 
              key={game.id} 
              className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer transform hover:scale-105 hover:shadow-2xl"
              onClick={() => setSelectedGame(game)}
            >
              <div className="relative">
                <img 
                  src={game.image} 
                  alt={game.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <Badge 
                  className={`absolute top-3 right-3 ${
                    game.difficulty === 'Fácil' ? 'bg-green-500' :
                    game.difficulty === 'Médio' ? 'bg-yellow-500' : 'bg-red-500'
                  } text-white`}
                >
                  {game.difficulty}
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="text-white text-xl">{game.name}</CardTitle>
                <CardDescription className="text-blue-200 line-clamp-2">
                  {game.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center text-sm text-blue-200 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{game.minPlayers}-{game.maxPlayers}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{game.duration}</span>
                  </div>
                  <Badge variant="outline" className="text-blue-200 border-blue-200">
                    {game.ageRating}
                  </Badge>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white">
                  Jogar Agora
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}