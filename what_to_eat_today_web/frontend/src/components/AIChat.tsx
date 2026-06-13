import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { chatStream, type ChatMessage } from '../services/aiService';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  streaming?: boolean;
}

// 快捷问题
const QUICK_QUESTIONS = [
  '今天吃什么好？',
  '有什么清淡的推荐？',
  '赶时间吃什么快？',
  '想吃辣的去哪？',
];

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idCounter = useRef(0);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // 组件卸载时取消进行中的请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 发送消息（流式）
  const handleSend = (text?: string) => {
    const content = (text || input).trim();
    if (!content || sending) return;

    const userMsg: DisplayMessage = {
      id: (++idCounter.current).toString(),
      role: 'user',
      content,
    };

    const assistantMsg: DisplayMessage = {
      id: (++idCounter.current).toString(),
      role: 'assistant',
      content: '',
      loading: true,
      streaming: true,
    };

    const updatedMessages = [...messages, userMsg, assistantMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    // 构建对话历史（不含当前 assistant 占位）
    const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const msgId = assistantMsg.id;

    abortRef.current = chatStream(
      history,
      // onToken: 逐 token 追加
      (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: m.content + token, loading: false }
              : m
          )
        );
      },
      // onDone: 标记流式结束
      () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, streaming: false } : m
          )
        );
        setSending(false);
        abortRef.current = null;
      },
      // onError: 显示错误
      (error) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, content: error || '抱歉，AI 服务暂时不可用，请稍后再试 😅', loading: false, streaming: false }
              : m
          )
        );
        setSending(false);
        abortRef.current = null;
      }
    );
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
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setSending(false);
  };

  return (
    <div className="ai-chat">
      {/* 头部 */}
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="ai-chat-avatar" aria-hidden="true">🤖</span>
          <span>吃什么小助手</span>
        </div>
        <button className="ai-chat-clear" onClick={handleClear} aria-label="清空对话">
          清空
        </button>
      </div>

      {/* 消息列表 */}
      <div className="ai-chat-messages">
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <div className="ai-chat-welcome">
            <span className="ai-welcome-emoji" aria-hidden="true">🍽️</span>
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
                <span className="ai-message-avatar" aria-hidden="true">🤖</span>
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
          placeholder="告诉我你想吃什么…"
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
