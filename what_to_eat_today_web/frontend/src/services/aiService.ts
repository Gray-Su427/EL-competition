import type { AiSessionInit } from '../types';
import { authHeaders } from './authService';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getAiSessionInit(): Promise<AiSessionInit | null> {
  const headers = authHeaders();
  if (!('Authorization' in headers)) {
    return null;
  }

  const response = await fetch('/api/ai/session/init', { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `加载 AI 个性化信息失败: ${response.status}`);
  }
  return response.json();
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || `AI 请求失败: ${response.status}`);
  }

  const data = await response.json();
  if (!data.reply) {
    throw new Error('AI 返回内容为空');
  }
  return data.reply;
}

export function chatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  void (async () => {
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onError(data.detail || `AI 请求失败: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('当前浏览器不支持流式读取');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }

          const payload = line.slice(6);
          if (payload === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(payload) as {
              content?: string;
              error?: string;
            };
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.content) {
              onToken(parsed.content);
            }
          } catch {
            // Ignore malformed SSE chunks.
          }
        }
      }

      onDone();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      onError('AI 服务连接失败');
    }
  })();

  return controller;
}
