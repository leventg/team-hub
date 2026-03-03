import { useEffect, useState, useRef, CSSProperties, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useMessages, Message } from '../../hooks/useMessages';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface TypingUser {
  userId: string;
  displayName: string;
}

export function Chat() {
  const { channelName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, startTyping, stopTyping } = useSocket();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { messages, isLoading, sendMessage } = useMessages(selectedChannel?.id ?? null);

  // Fetch channels
  useEffect(() => {
    api.get<Channel[]>('/channels').then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setChannels(list);
      if (!channelName && list.length > 0) {
        navigate(`/chat/${list[0].name}`, { replace: true });
      }
    });
  }, [channelName, navigate]);

  // Select channel from URL
  useEffect(() => {
    if (channelName && channels.length > 0) {
      const ch = channels.find((c) => c.name === channelName);
      if (ch) setSelectedChannel(ch);
    }
  }, [channelName, channels]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing indicators
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { channelId: string; userId: string; displayName: string; isTyping: boolean }) => {
      if (data.channelId !== selectedChannel?.id) return;
      if (data.userId === user?.id) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.find((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, displayName: data.displayName }];
        }
        return prev.filter((u) => u.userId !== data.userId);
      });
    };
    socket.on('typing:update', handler);
    return () => { socket.off('typing:update', handler); };
  }, [socket, selectedChannel?.id, user?.id]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput('');
    stopTyping(selectedChannel!.id);
    await sendMessage(trimmed);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!selectedChannel) return;

    startTyping(selectedChannel.id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedChannel.id);
    }, 2000);
  };

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: 'var(--role-admin)',
      ARCHITECT: 'var(--role-architect)',
      ENGINEER: 'var(--role-engineer)',
      JUNIOR: 'var(--role-junior)',
    };
    return map[role] || 'var(--text-secondary)';
  };

  return (
    <div style={s.container}>
      {/* Channel list */}
      <div style={s.channelList}>
        <div style={s.channelHeader}>Channels</div>
        {channels.map((ch) => (
          <div
            key={ch.id}
            onClick={() => navigate(`/chat/${ch.name}`)}
            style={{
              ...s.channelItem,
              ...(selectedChannel?.id === ch.id ? s.channelItemActive : {}),
            }}
          >
            <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>#</span>
            {ch.name}
          </div>
        ))}
      </div>

      {/* Messages area */}
      <div style={s.messageArea}>
        {selectedChannel && (
          <>
            <div style={s.messageHeader}>
              <span style={{ fontWeight: 600 }}>#{selectedChannel.name}</span>
              {selectedChannel.description && (
                <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: 12 }}>
                  {selectedChannel.description}
                </span>
              )}
            </div>

            <div style={s.messageList}>
              {isLoading && <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>}
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} roleColor={roleColor} isOwn={msg.author?.id === user?.id} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {typingUsers.length > 0 && (
              <div style={s.typingBar}>
                {typingUsers.map((u) => u.displayName).join(', ')}{' '}
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <form onSubmit={handleSend} style={s.inputArea}>
              <input
                style={s.input}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Message #${selectedChannel.name}`}
              />
              <button type="submit" style={s.sendBtn} disabled={!input.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  roleColor,
  isOwn,
}: {
  message: Message;
  roleColor: (role: string) => string;
  isOwn: boolean;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const author = message.author;
  const isAI = author?.userType === 'AI_AGENT';

  return (
    <div style={{ ...s.message, ...(isOwn ? { background: 'var(--bg-tertiary)' } : {}) }}>
      <div style={s.messageTop}>
        <span style={{ fontWeight: 600, color: roleColor(author?.role || '') }}>
          {author?.displayName || 'Unknown'}
        </span>
        {isAI && <span style={s.aiBadge}>AI</span>}
        <span style={s.messageTime}>{time}</span>
        {message.editedAt && <span style={s.messageTime}>(edited)</span>}
      </div>
      <div style={s.messageContent}>{message.content}</div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container: { display: 'flex', height: '100%' },
  channelList: {
    width: 200,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    overflowY: 'auto',
  },
  channelHeader: {
    padding: '12px 12px 8px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-muted)',
  },
  channelItem: {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  channelItemActive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
  },
  messageArea: { flex: 1, display: 'flex', flexDirection: 'column' },
  messageHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  message: {
    padding: '6px 16px',
    borderRadius: 0,
  },
  messageTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  messageTime: { fontSize: 11, color: 'var(--text-muted)' },
  messageContent: { whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const },
  aiBadge: {
    fontSize: 9,
    padding: '1px 4px',
    borderRadius: 3,
    background: 'var(--role-architect)',
    color: '#fff',
    fontWeight: 700,
  },
  typingBar: {
    padding: '4px 16px',
    fontSize: 12,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  sendBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: 6,
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 600,
  },
};
