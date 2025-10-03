import Peer from 'simple-peer'
import { Player, GameMessage } from './gameTypes'

export class GameConnection {
  private peers: { [playerId: string]: any } = {}
  private onPlayerConnect: (player: Player) => void
  private onPlayerDisconnect: (playerId: string) => void
  private onPlayerMessage: (playerId: string, message: GameMessage) => void
  private roomId: string
  private messageQueue: GameMessage[] = []
  private isHost: boolean = true

  constructor(
    roomId: string,
    onPlayerConnect: (player: Player) => void,
    onPlayerDisconnect: (playerId: string) => void,
    onPlayerMessage: (playerId: string, message: GameMessage) => void
  ) {
    this.roomId = roomId
    this.onPlayerConnect = onPlayerConnect
    this.onPlayerDisconnect = onPlayerDisconnect
    this.onPlayerMessage = onPlayerMessage
  }

  // Sistema de sinalização melhorado usando localStorage como simulação
  private setupSignaling() {
    const signalKey = `game-signal-${this.roomId}`
    const messagesKey = `game-messages-${this.roomId}`
    
    const checkForSignals = () => {
      try {
        // Verificar novos jogadores
        const signals = JSON.parse(localStorage.getItem(signalKey) || '[]')
        signals.forEach((signal: any) => {
          if (signal.type === 'join-request' && !this.peers[signal.playerId]) {
            this.handleJoinRequest(signal.playerId, signal.playerName)
          }
        })
        
        // Limpar sinais processados
        localStorage.setItem(signalKey, '[]')
        
        // Verificar mensagens dos jogadores
        const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]')
        messages.forEach((msg: any) => {
          if (msg.roomId === this.roomId && msg.type === 'player-message') {
            this.onPlayerMessage(msg.playerId, msg.message)
          }
        })
        
        // Limpar mensagens processadas
        localStorage.setItem(messagesKey, '[]')
        
      } catch (error) {
        console.error('Error checking signals:', error)
      }
    }

    // Verificar sinais mais frequentemente para melhor responsividade
    setInterval(checkForSignals, 500)
  }

  private handleJoinRequest(playerId: string, playerName: string) {
    if (this.peers[playerId]) return

    // Simular peer connection
    const mockPeer = {
      connected: true,
      send: (data: string) => {
        // Simular envio de mensagem para o jogador
        const responseKey = `game-response-${this.roomId}-${playerId}`
        localStorage.setItem(responseKey, data)
      },
      destroy: () => {
        // Cleanup
      }
    }

    this.peers[playerId] = mockPeer

    const player: Player = {
      id: playerId,
      name: playerName,
      peer: mockPeer,
      connected: true,
      score: 0
    }

    this.onPlayerConnect(player)
    
    // Enviar mensagem de boas-vindas
    this.sendToPlayer(playerId, {
      type: 'welcome',
      data: { roomId: this.roomId }
    })

    // Simular possível desconexão aleatória (para realismo)
    if (Math.random() < 0.1) {
      setTimeout(() => {
        this.simulateDisconnection(playerId)
      }, 30000 + Math.random() * 60000)
    }
  }

  private simulateDisconnection(playerId: string) {
    if (this.peers[playerId]) {
      this.onPlayerDisconnect(playerId)
      delete this.peers[playerId]
    }
  }

  public sendToPlayer(playerId: string, message: GameMessage) {
    const peer = this.peers[playerId]
    if (peer && peer.connected) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: Date.now()
        }
        peer.send(JSON.stringify(messageWithTimestamp))
      } catch (error) {
        console.error('Error sending message to player:', error)
      }
    }
  }

  public sendToAllPlayers(message: GameMessage) {
    Object.keys(this.peers).forEach(playerId => {
      this.sendToPlayer(playerId, message)
    })
  }

  public startListening() {
    this.setupSignaling()
  }

  public disconnect() {
    Object.values(this.peers).forEach((peer: any) => {
      if (peer.destroy) peer.destroy()
    })
    this.peers = {}
  }

  public getConnectedPlayers(): string[] {
    return Object.keys(this.peers).filter(playerId => 
      this.peers[playerId] && this.peers[playerId].connected
    )
  }

  // Método para jogadores enviarem mensagens para o host
  public static sendMessageToHost(roomId: string, playerId: string, message: GameMessage) {
    const messagesKey = `game-messages-${roomId}`
    const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]')
    
    messages.push({
      roomId,
      playerId,
      message,
      timestamp: Date.now(),
      type: 'player-message'
    })
    
    localStorage.setItem(messagesKey, JSON.stringify(messages))
  }
}

// Função melhorada para simular conexões de jogadores
export function simulatePlayerConnections(
  roomId: string, 
  maxPlayers: number, 
  playerNames: string[] = ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena']
) {
  const signalKey = `game-signal-${roomId}`
  let connectionIndex = 0

  const connectPlayer = () => {
    if (connectionIndex < Math.min(maxPlayers, playerNames.length)) {
      const playerId = `sim-player-${connectionIndex + 1}`
      const playerName = playerNames[connectionIndex]
      
      // Simular sinal de conexão
      const signals = JSON.parse(localStorage.getItem(signalKey) || '[]')
      signals.push({
        type: 'join-request',
        playerId,
        playerName,
        timestamp: Date.now()
      })
      localStorage.setItem(signalKey, JSON.stringify(signals))
      
      connectionIndex++
      
      // Conectar próximo jogador com intervalo variável
      if (connectionIndex < Math.min(maxPlayers, playerNames.length)) {
        setTimeout(connectPlayer, 1500 + Math.random() * 2500)
      }
    }
  }

  // Começar a conectar jogadores após um pequeno delay
  setTimeout(connectPlayer, 1000)
}

// Classe para conexão do lado do jogador
export class PlayerConnection {
  private roomId: string
  private playerId: string
  private playerName: string
  private onMessage: (message: GameMessage) => void
  private connected: boolean = false

  constructor(
    roomId: string,
    playerName: string,
    onMessage: (message: GameMessage) => void
  ) {
    this.roomId = roomId
    this.playerId = `player-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    this.playerName = playerName
    this.onMessage = onMessage
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      // Simular processo de conexão
      const signalKey = `game-signal-${this.roomId}`
      
      // Enviar sinal de conexão
      const signals = JSON.parse(localStorage.getItem(signalKey) || '[]')
      signals.push({
        type: 'join-request',
        playerId: this.playerId,
        playerName: this.playerName,
        timestamp: Date.now()
      })
      localStorage.setItem(signalKey, JSON.stringify(signals))
      
      // Aguardar resposta do host
      const checkForResponse = () => {
        const responseKey = `game-response-${this.roomId}-${this.playerId}`
        const response = localStorage.getItem(responseKey)
        
        if (response) {
          try {
            const message = JSON.parse(response)
            this.connected = true
            this.onMessage(message)
            this.startListening()
            resolve(true)
          } catch (error) {
            console.error('Error parsing response:', error)
            resolve(false)
          }
        }
      }
      
      // Verificar resposta a cada 500ms por até 10 segundos
      let attempts = 0
      const maxAttempts = 20
      
      const responseInterval = setInterval(() => {
        checkForResponse()
        attempts++
        
        if (this.connected || attempts >= maxAttempts) {
          clearInterval(responseInterval)
          if (!this.connected) resolve(false)
        }
      }, 500)
    })
  }

  private startListening() {
    const responseKey = `game-response-${this.roomId}-${this.playerId}`
    
    const checkForMessages = () => {
      if (!this.connected) return
      
      try {
        const response = localStorage.getItem(responseKey)
        if (response) {
          const message = JSON.parse(response)
          this.onMessage(message)
          localStorage.removeItem(responseKey)
        }
      } catch (error) {
        console.error('Error checking messages:', error)
      }
    }
    
    // Verificar mensagens do host a cada 500ms
    setInterval(checkForMessages, 500)
  }

  public sendMessage(message: GameMessage) {
    if (this.connected) {
      GameConnection.sendMessageToHost(this.roomId, this.playerId, message)
    }
  }

  public disconnect() {
    this.connected = false
  }
}