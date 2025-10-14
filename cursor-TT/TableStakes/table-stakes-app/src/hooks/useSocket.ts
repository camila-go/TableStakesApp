import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@/types/game';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_APP_URL || ''
      : 'http://localhost:3000', {
      path: '/api/socketio'
    });

    socketInstance.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return { socket, isConnected };
};

export const useSocketEvent = <K extends keyof SocketEvents>(
  socket: Socket | null,
  event: K,
  handler: SocketEvents[K]
) => {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler as any);

    return () => {
      socket.off(event, handler as any);
    };
  }, [socket, event, handler]);
};
