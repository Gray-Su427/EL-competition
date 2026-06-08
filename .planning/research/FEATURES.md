# Feature Landscape

**Domain:** 校园餐饮推荐 API 后端（Campus Dining Recommendation API Backend）
**Project:** 今天吃什么 — 南京大学鼓楼校区
**Researched:** 2026-06-08

---

## Table Stakes

Features the frontend already calls. Missing = frontend breaks or renders broken state.

| Feature | Why Expected | Complexity | Endpoint | Notes |
|---------|--------------|------------|----------|-------|
| 食堂列表 | HomePage 首屏并行加载，CanteenHeat 渲染 | Low | `GET /api/canteens` | 返回 `Canteen[]`，含 id/name/status/distance/openTime |
| 推荐菜品列表 | HomePage 首屏并行加载，DishList 渲染前三项 | Low | `GET /api/dishes/recommended` | 返回 `Dish[]`，含完整字段含 tags/emoji/heatStatus |
| 菜品搜索 | SearchPage 输入关键词后触发，匹配 name/canteen/window/tags | Low | `GET /api/dishes/search?keyword=xxx` | 空关键词返回空数组或全量均可 |
| 今日推荐文案 | HomePage 首屏 + 换一换按钮，RecommendCard 展示 | Low | `GET /api/suggestion/today` | 返回 `{ text, highlightDish? }`，highlightDish 是完整 Dish 对象 |
| 热门搜索关键词 | SearchPage 挂载时加载，展示热词标签列表 | Low | `GET /api/search/hot-keywords` | 返回 `string[]`，共 10 个热词 |
| 搜索建议（输入联想） | SearchPage 输入时 debounce 触发 | Low | `GET /api/search/suggestions?keyword=xxx` | 返回 `string[]`，最多 8 条；空 keyword 返回空数组 |
| AI 对话代理 | AIChat 组件发送/接收消息 | Medium | `POST /api/ai/chat` | 转发到 MiMo API，不在前端暴露 API Key |
| CORS 中间件 | 前端从 localhost:5173 调用 localhost:8000 | Low | 全局 | 必须允许前端 origin |

---

## Response Formats

精确格式由前端 `types.ts` 和 `mockApi.ts` 推导而来。**后端必须严格匹配这些结构，不可新增必填字段。**

### Canteen

```json
{
  "id": "c1",
  "name": "一食堂",
  "status": "正常",
  "distance": "200m",
  "openTime": "6:30-20:00"
}
```

`status` 枚举值：`"空闲" | "正常" | "拥挤"`

### Dish

```json
{
  "id": "d1",
  "name": "宫保鸡丁",
  "price": 12,
  "canteen": "一食堂",
  "window": "川菜窗口",
  "rating": 4.6,
  "reviewCount": 238,
  "tags": ["微辣", "高人气", "下饭"],
  "heatStatus": "正常",
  "emoji": "🍗"
}
```

`heatStatus` 枚举值：`"空闲" | "正常" | "拥挤"`

### TodaySuggestion

```json
{
  "text": "今天二食堂比较拥挤，建议去一食堂川菜窗口试试宫保鸡丁。",
  "highlightDish": { ...Dish }
}
```

`highlightDish` 为可选字段（`?`）；后端每次从预设文案中随机返回一条即可。

### Hot Keywords

```json
["麻辣香锅", "宫保鸡丁", "清淡", "快餐", "沙拉", "面食", "下饭", "实惠", "高人气", "暖胃"]
```

### Search Suggestions

```json
["宫保鸡丁", "快餐窗口"]
```

最多 8 条；空 keyword 时返回 `[]`。

### AI Chat Request

```json
{
  "messages": [
    { "role": "user", "content": "今天吃什么好？" },
    { "role": "assistant", "content": "推荐一食堂..." },
    { "role": "user", "content": "有辣的吗？" }
  ]
}
```

### AI Chat Response

```json
{
  "reply": "推荐一食堂川菜窗口的宫保鸡丁，..."
}
```

前端 `aiService.ts` 目前直接调用 MiMo，后端代理后只需返回 `reply` 字符串即可（不需要完整 OpenAI 格式）。

---

## Seed Data Requirements

后端需要内置以下种子数据（来自 mockApi.ts 和开发指南）：

**3 个食堂：**
- 一食堂（id: c1，距离 200m，6:30-20:00，状态：正常）
- 二食堂（id: c2，距离 350m，6:30-20:30，状态：拥挤）
- 三食堂（id: c3，距离 500m，7:00-21:00，状态：空闲）

**7 道菜品（对应 3 个食堂、6 个窗口）：**
- 宫保鸡丁（一食堂/川菜窗口）
- 番茄牛腩面（二食堂/面食窗口）
- 麻辣香锅（一食堂/麻辣烫窗口）
- 鸡蛋炒饭（三食堂/快餐窗口）
- 轻食沙拉（三食堂/轻食窗口）
- 红烧排骨（二食堂/家常菜窗口）
- 酸辣粉（一食堂/小吃窗口）

**5 条今日推荐文案（随机返回其中一条）：**
对应 mockApi.ts 中 `suggestions` 数组，每条含 `text` + `highlightDish`。

---

## AI Chat Proxy Feature Detail

| 子功能 | 说明 | 复杂度 |
|--------|------|--------|
| 接收前端消息历史 | 接收 `ChatMessage[]`（不含 system prompt） | Low |
| 追加 system prompt | 后端追加角色设定（校园餐饮顾问），不暴露给前端 | Low |
| httpx 转发到 MiMo | 调用 `https://token-plan-cn.xiaomimimo.com/v1/chat/completions` | Medium |
| API Key 管理 | 从 `.env` 读取，启动时校验存在 | Low |
| 错误处理 | MiMo API 失败时返回 500 含友好 message | Medium |
| 超时控制 | httpx 设置合理 timeout（建议 30s） | Low |

---

## Differentiators

Not strictly required for frontend to work, but add real value if time allows.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 今日推荐文案多样性 | 每次刷新随机返回不同推荐，体验更好 | Low | 后端随机选 5 条之一即可；不需要真正的智能推荐算法 |
| 搜索权重排序 | 菜品名匹配 > 食堂名匹配 > tag 匹配，结果更相关 | Low | 可在 searchDishes 中用优先级排序替代顺序遍历 |
| 食堂拥挤状态动态感 | status 字段目前静态，若能按时间段变化则更真实 | Medium | 可通过时间规则静态模拟（如 11:00-13:00 标记为拥挤） |
| 热门搜索词动态计算 | 根据实际搜索频次排序 | High | v1 用静态列表即可；需要搜索日志表才能动态化 |

---

## Anti-Features

Features to explicitly NOT build in v1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 用户认证/注册系统 | PROJECT.md 明确排除；无前端页面支持 | 完全不建 |
| 分页（Pagination） | 前端不传 page/limit 参数；数据量 7 条不需要 | 直接返回全量列表 |
| 评价/评论 CRUD | CommentsPage 前端无数据结构定义；本阶段 out of scope | 不建，待前端定义后再做 |
| 真实 AI 推荐算法 | 菜品数量太少，算法无意义 | 随机 + 静态规则替代 |
| 管理后台 / CMS | 无需求，增加部署复杂度 | 种子数据在代码中维护 |
| 图片上传 / 存储 | emoji 字段已满足前端展示需求 | 继续用 emoji 字符 |
| 缓存层（Redis 等） | 数据量极小，SQLite 足够；增加部署依赖 | 内存或 SQLite 直接返回 |
| WebSocket / 实时推送 | 前端无实时需求；搜索建议用 debounce HTTP 轮询 | 保持 HTTP REST |
| 多校区支持 | 只针对鼓楼校区；aiService.ts 中 system prompt 也写死了校区 | 不建多租户逻辑 |

---

## Feature Dependencies

```
SQLite 数据库初始化 → 种子数据 → 所有 GET 端点
CORS 中间件 → 所有端点（无 CORS 则前端全部 blocked）
.env 配置 → AI 代理端点
Canteen 模型 → GET /api/canteens
Dish 模型 → GET /api/dishes/recommended
                GET /api/dishes/search
                GET /api/suggestion/today（highlightDish 引用 Dish）
                GET /api/search/hot-keywords（静态，无模型依赖）
                GET /api/search/suggestions（查 Dish 表）
```

---

## MVP Checklist

实现以下内容后，前端可完整联调，MVP 成立：

1. CORS 中间件（全局）
2. SQLite 数据库 + Canteen + Dish 模型
3. 种子数据（3 食堂 + 7 菜品 + 5 推荐文案）
4. `GET /api/canteens`
5. `GET /api/dishes/recommended`
6. `GET /api/dishes/search?keyword=xxx`
7. `GET /api/suggestion/today`
8. `GET /api/search/hot-keywords`
9. `GET /api/search/suggestions?keyword=xxx`
10. `POST /api/ai/chat`（httpx 代理 + .env API Key）

全部 10 项属于 table stakes。无 nice-to-have 是 MVP 阻塞项。

---

## Sources

- `what_to_eat_today_web/frontend/src/types.ts` — Canteen / Dish / TodaySuggestion 类型定义（权威来源）
- `what_to_eat_today_web/frontend/src/mock/mockApi.ts` — 7 道菜品种子数据、5 条推荐文案、搜索逻辑
- `what_to_eat_today_web/frontend/src/services/aiService.ts` — MiMo API 调用方式、ChatMessage 结构
- `what_to_eat_today_web/frontend/src/components/AIChat.tsx` — 前端 AI 对话交互逻辑
- `what_to_eat_today_web/frontend/src/pages/HomePage.tsx` — 首页并行 API 调用模式
- `.planning/PROJECT.md` — Out of Scope 确认（认证、评论、Android 集成）
- `开发指南-v3.md` — 技术栈、目录结构、端点清单、种子数据规范
