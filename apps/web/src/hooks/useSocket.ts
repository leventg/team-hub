import { useEffect, useRef, useState } from 'react';
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

    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
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

  const joinChannel = (channelId: string) => {
    socketRef.current?.emit('channel:join', { channelId });
  };

  const leaveChannel = (channelId: string) => {
    socketRef.current?.emit('channel:leave', { channelId });
  };

  const startTyping = (channelId: string) => {
    socketRef.current?.emit('typing:start', { channelId });
  };

  const stopTyping = (channelId: string) => {
    socketRef.current?.emit('typing:stop', { channelId });
  };

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
