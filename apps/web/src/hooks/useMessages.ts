import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useSocket } from './useSocket';

interface Author {
  id: string;
  displayName: string;
  role: string;
  userType: string;
}

export interface Message {
  id: string;
  content: string;
  author: Author;
  channelId: string;
  parentId: string | null;
  editedAt: string | null;
  createdAt: string;
}

export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { socket, joinChannel, leaveChannel } = useSocket();

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    setIsLoading(true);
    try {
      const res = await api.get<Message[]>(`/messages/channel/${channelId}?size=50`);
      // API returns newest first, reverse for chat display
      const items = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setMessages([...items].reverse());
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  // Join channel room and fetch messages
  useEffect(() => {
    if (!channelId) return;
    joinChannel(channelId);
    fetchMessages();
    return () => leaveChannel(channelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !channelId) return;

    const handler = (msg: Message) => {
      if (msg.channelId === channelId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [socket, channelId]);

  const sendMessage = async (content: string, parentId?: string) => {
    if (!channelId) return;
    await api.post('/messages', { channelId, content, parentId });
  };

  return { messages, isLoading, sendMessage, refetch: fetchMessages };
}
