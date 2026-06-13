# 今天吃什么 — 前端

南京大学鼓楼校区校园餐饮推荐系统的 React SPA 前端。

## 技术栈

- React 19 + TypeScript 6
- React Router DOM 7（客户端路由）
- React Markdown（AI 回复渲染）
- Vite 8（开发服务器 + 构建工具）

## 开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（默认 localhost:5173）
npm run build    # 生产构建，输出到 dist/
npm run lint     # ESLint 检查
npm run preview  # 预览生产构建
```

## 代理配置

开发模式下 Vite 将 `/api` 和 `/static` 请求代理到后端（默认 `http://localhost:3000`）。配置在 `vite.config.ts` 中。

## 目录结构

参见项目根目录 README。
