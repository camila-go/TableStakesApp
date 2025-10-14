import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import GameManager from '@/lib/gameManager';

let io: SocketIOServer | null = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Starting Socket.IO server...');
  
  const httpServer = res.socket.server as HTTPServer;
  io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  res.socket.server.io = io;
  
  // Initialize game manager
  new GameManager(io);
  
  res.end();
}
