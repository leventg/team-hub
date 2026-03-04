import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

interface OnlineUser {
  id: string;
  displayName: string;
  role: string;
}

export function useSocket() {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('presence:update', (users: OnlineUser[]) => setOnlineUsers(users));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  const joinChannel = useCallback((channelId: string) => {
    socketRef.current?.emit('channel:join', { channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    socketRef.current?.emit('channel:leave', { channelId });
  }, []);

  const startTyping = useCallback((channelId: string) => {
    socketRef.current?.emit('typing:start', { channelId });
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    socketRef.current?.emit('typing:stop', { channelId });
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
  };
}
