/**
 * AI 聊天服务 — 通过后端代理调用 MiMo API
 * API Key 安全存储在后端 .env 中，前端不接触
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 发送对话到后端 AI 代理端点
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
