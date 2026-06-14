import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRecommendedDishes } from '../mock/mockApi';
import { chatStream, getAiSessionInit, type ChatMessage } from '../services/aiService';
import type { AiSessionInit, Dish } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
  streaming?: boolean;
}

const QUICK_QUESTIONS = [
  '今天吃什么好？',
  '想要清淡一点的推荐',
  '赶时间吃什么更快？',
  '我今天想吃辣一点',
];

const DEFAULT_INTRO = '告诉我口味、忌口或今天状态，我来帮你快速缩小选择范围';

function buildGuestSession(recommendedDishes: Dish[]): AiSessionInit {
  return {
    profileStatus: 'empty',
    profileSummary: '',
    introMessage: DEFAULT_INTRO,
    recommendedDishes,
  };
}

function getProfileHint(sessionInit: AiSessionInit | null, isLoggedIn: boolean): string {
  if (!isLoggedIn) {
    return '登录后我会生成专属饮食画像，慢慢记住你的口味偏好噢！';
  }
  if (!sessionInit) {
    return '直接说今天想吃什么就行';
  }
  if (sessionInit.profileStatus === 'empty') {
    return '比如“我不吃香菜”或“今天想清淡一点”';
  }
  if (sessionInit.profileStatus === 'partial') {
    return '我已经记住一部分偏好，继续聊会更准哦！';
  }
  return '我会先按你的画像推荐，临时想换口味也可以直接说。';
}

function getDishReason(dish: Dish): string {
  const topTags = dish.tags.slice(0, 2);
  if (topTags.length > 0) {
    return topTags.join(' · ');
  }
  return `${dish.canteen} · ${dish.window}`;
}

const AIChat: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { transcript, isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition();

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionInit, setSessionInit] = useState<AiSessionInit | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const liveInput = isListening && transcript ? transcript : input;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setSessionLoading(true);
      setSessionError('');

      try {
        if (isLoggedIn) {
          const personalizedSession = await getAiSessionInit();
          if (!cancelled && personalizedSession) {
            setSessionInit(personalizedSession);
            return;
          }
        }

        const dishes = await getRecommendedDishes();
        if (!cancelled) {
          setSessionInit(buildGuestSession(dishes.slice(0, 3)));
        }
      } catch {
        if (!cancelled) {
          setSessionError('推荐暂时没加载出来，但你还是可以直接问我今天吃什么');
          setSessionInit(buildGuestSession([]));
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const refreshSession = async () => {
    if (!isLoggedIn) {
      return;
    }

    try {
      const personalizedSession = await getAiSessionInit();
      if (personalizedSession) {
        setSessionInit(personalizedSession);
      }
    } catch {
      // Keep current recommendations if refresh fails.
    }
  };

  const handleSend = (text?: string) => {
    const content = (text || liveInput).trim();
    if (!content || sending) {
      return;
    }

    const userMessage: DisplayMessage = {
      id: String(++idCounter.current),
      role: 'user',
      content,
    };
    const assistantMessage: DisplayMessage = {
      id: String(++idCounter.current),
      role: 'assistant',
      content: '',
      loading: true,
      streaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSending(true);

    const history: ChatMessage[] = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const assistantId = assistantMessage.id;

    abortRef.current = chatStream(
      history,
      (token) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + token, loading: false }
              : message
          )
        );
      },
      () => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, loading: false, streaming: false }
              : message
          )
        );
        setSending(false);
        abortRef.current = null;
        void refreshSession();
      },
      (error) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: error || 'AI 服务暂时不可用，请稍后再试。',
                  loading: false,
                  streaming: false,
                }
              : message
          )
        );
        setSending(false);
        abortRef.current = null;
      }
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
      return;
    }
    setInput('');
    startListening();
  };

  const handleClear = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setSending(false);
  };

  return (
    <div className="ai-chat">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="ai-chat-avatar" aria-hidden="true">🤖</span>
          <span>吃什么小助手</span>
        </div>
        <button className="ai-chat-clear" onClick={handleClear} aria-label="清空对话">
          清空
        </button>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-chat-welcome">
            <div className="ai-message assistant ai-message-intro">
              <span className="ai-message-avatar" aria-hidden="true">🤖</span>
              <div className="ai-message-bubble">
                <p>{sessionInit?.introMessage || DEFAULT_INTRO}</p>
                <p className="ai-message-subhint">{getProfileHint(sessionInit, isLoggedIn)}</p>
              </div>
            </div>

            {sessionError ? <div className="ai-profile-error">{sessionError}</div> : null}

            <div className="ai-profile-panel">
              <div className="ai-profile-panel-title">
                <span>先给你 3 个推荐</span>
                <span className="ai-profile-panel-subtitle">点开能看详情</span>
              </div>

              {sessionLoading ? (
                <div className="ai-profile-loading">正在准备你的推荐...</div>
              ) : sessionInit && sessionInit.recommendedDishes.length > 0 ? (
                <div className="ai-profile-recommendations">
                  {sessionInit.recommendedDishes.map((dish, index) => (
                    <button
                      key={dish.id}
                      type="button"
                      className="ai-profile-list-item"
                      onClick={() => navigate(`/dish/${dish.id}`)}
                    >
                      <div className="ai-profile-list-rank">{index + 1}</div>
                      <div className="ai-profile-list-main">
                        <div className="ai-profile-list-top">
                          <span className="ai-profile-name">{dish.name}</span>
                          <span className="ai-profile-price">¥{dish.price}</span>
                        </div>
                        <div className="ai-profile-reason">{getDishReason(dish)}</div>
                        <div className="ai-profile-meta-row">
                          <span>{dish.canteen}</span>
                          <span>{dish.window}</span>
                          <span>★ {dish.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <span className="ai-profile-emoji" aria-hidden="true">{dish.emoji}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ai-profile-loading">先告诉我你的口味，我马上开始推荐</div>
              )}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`ai-message ${message.role === 'user' ? 'user' : 'assistant'}`}
          >
            {message.role === 'assistant' ? (
              <span className="ai-message-avatar" aria-hidden="true">🤖</span>
            ) : null}
            <div className="ai-message-bubble">
              {message.loading ? (
                <div className="ai-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : message.role === 'assistant' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input-area">
        {messages.length === 0 ? (
          <div className="ai-quick-questions ai-quick-questions-docked">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                className="ai-quick-btn"
                onClick={() => handleSend(question)}
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ai-chat-input-row">
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-input"
            placeholder="比如：我不吃香菜，今天想吃快一点"
            value={liveInput}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          {isSupported ? (
            <button
              className={`ai-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleMicToggle}
              aria-label={isListening ? '停止语音输入' : '语音输入'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          ) : null}
          <button
            className="ai-chat-send"
            onClick={() => handleSend()}
            disabled={!liveInput.trim() || sending}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
