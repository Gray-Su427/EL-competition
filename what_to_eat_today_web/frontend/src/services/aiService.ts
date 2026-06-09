/**
 * AI 聊天服务 — 通过后端代理调用 MiMo API
 * API Key 安全存储在后端 .env 中，前端不接触
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 发送对话到后端 AI 代理端点（非流式，保留兼容）
 * POST /api/ai/chat
 */
export async function chat(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || `API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    if (!data.reply) {
      throw new Error('API 返回内容为空');
    }
    return data.reply;
  } catch (error) {
    console.error('AI 服务调用失败:', error);
    throw error;
  }
}

/**
 * 流式对话 — 通过 SSE 逐 token 接收 AI 回复
 * POST /api/ai/chat/stream
 *
 * @param messages 对话历史
 * @param onToken  每收到一个 token 调用，参数为本次增量文本
 * @param onDone   流结束时调用
 * @param onError  出错时调用
 * @returns AbortController，调用 .abort() 可取消请求
 */
export function chatStream(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onError(data.detail || `API 请求失败: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('浏览器不支持流式读取');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
            if (parsed.content) {
              onToken(parsed.content);
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }
      // 流正常结束但没收到 [DONE]
      onDone();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      onError('AI 服务连接失败');
    }
  })();

  return controller;
}
