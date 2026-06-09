import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { chat, type ChatMessage } from '../services/aiService';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

// 快捷问题
const QUICK_QUESTIONS = [
  '今天吃什么好？',
  '有什么清淡的推荐？',
  '赶时间吃什么快？',
  '想吃辣的去哪？',
];

const AIChat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 发送消息
  const handleSend = async (text?: string) => {
    const content = (text || input).trim();
    if (!content || sending) return;

    // 添加用户消息
    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    // 添加 AI loading 占位
    const loadingMsg: DisplayMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setSending(true);

    try {
      // 构建对话历史（不含 loading 消息）
      const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await chat(history);

      // 替换 loading 消息为真实回复
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: reply, loading: false }
            : m
        )
      );
    } catch {
      // 错误处理
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: '抱歉，AI 服务暂时不可用，请稍后再试 😅', loading: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  // 按回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="ai-chat">
      {/* 头部 */}
      <div className="ai-chat-header">
        <button className="ai-chat-back" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="ai-chat-title">
          <span className="ai-chat-avatar">🤖</span>
          <span>吃什么小助手</span>
        </div>
        <button className="ai-chat-clear" onClick={handleClear}>
          清空
        </button>
      </div>

      {/* 消息列表 */}
      <div className="ai-chat-messages">
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <span className="ai-welcome-emoji">🍽️</span>
            <h3>你好！我是吃什么小助手</h3>
            <p>告诉我你的口味、忌口、饥饿程度，我来帮你推荐今天吃什么！</p>
            <div className="ai-quick-questions">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="ai-quick-btn"
                  onClick={() => handleSend(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            {msg.role === 'assistant' && (
              <span className="ai-message-avatar">🤖</span>
            )}
            <div className="ai-message-bubble">
              {msg.loading ? (
                <div className="ai-typing">
                  <span></span><span></span><span></span>
                </div>
              ) : msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="ai-chat-input-area">
        <input
          ref={inputRef}
          type="text"
          className="ai-chat-input"
          placeholder="告诉我你想吃什么..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="ai-chat-send"
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
        >
          发送
        </button>
      </div>
    </div>
  );
};

export default AIChat;
