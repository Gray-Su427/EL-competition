/**
 * 小米 MiMo AI 服务模块
 * 使用 OpenAI 兼容协议调用 MiMo API
 * 文档：https://platform.mimopc.cn/docs
 */

const API_BASE = 'https://token-plan-cn.xiaomimimo.com/v1';
const API_KEY = 'tp-cn64j8obzlijezx4hupsg36kzhjkde86ufzgwsv8mz0yldff';
const MODEL = 'mimo-v2.5-pro';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 系统提示词：设定 AI 为校园餐饮顾问角色
 */
const SYSTEM_PROMPT = `你是"吃什么小助手"，一个专为南京大学仙林校区学生服务的 AI 餐饮顾问。

你的职责：
1. 根据学生的口味偏好、忌口、饥饿程度、当前状态（如赶时间、想放松、想吃辣等）推荐合适的菜品和食堂。
2. 了解南京大学仙林校区的食堂分布：一食堂（川菜窗口、小吃窗口）、二食堂（面食窗口、家常菜窗口）、三食堂（快餐窗口、轻食窗口）。
3. 根据就餐高峰期给出建议（如避开拥挤食堂）。
4. 回答要简洁、亲切、有校园感，像一个热心的学长/学姐。
5. 每次推荐要给出具体理由（如距离近、评分高、今天不拥挤等）。
6. 回复控制在 150 字以内，适合手机阅读。

当前食堂信息：
- 一食堂：距离 200m，开放时间 6:30-20:00，包含川菜窗口、小吃窗口
- 二食堂：距离 350m，开放时间 6:30-20:30，包含面食窗口、家常菜窗口
- 三食堂：距离 500m，开放时间 7:00-21:00，包含快餐窗口、轻食窗口`;

/**
 * 调用 MiMo API 获取 AI 回复
 * 后续替换：如果更换 AI 服务，只需修改 API_BASE、API_KEY、MODEL
 */
export async function chat(messages: ChatMessage[]): Promise<string> {
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: fullMessages,
        max_completion_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiMo API error:', response.status, errorText);
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('API 返回内容为空');
    }
    return content;
  } catch (error) {
    console.error('AI 服务调用失败:', error);
    throw error;
  }
}
