'use client'

import { use } from 'react'
import PlayerInterface from '@/components/PlayerInterface'

interface JoinGamePageProps {
  params: Promise<{ roomId: string }>
}

export default function JoinGamePage({ params }: JoinGamePageProps) {
  const { roomId } = use(params)

  return <PlayerInterface roomId={roomId} />
}