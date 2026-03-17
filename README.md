## AI Chat Assistant（Nuxt 3 + TypeScript + Tailwind CSS）

一个企业级风格的 **AI 对话助手前后端一体项目**，基于 **Nuxt 3 + TypeScript + Tailwind CSS + Prisma + PostgreSQL (Supabase)**，默认对接通义千问（DashScope）的 OpenAI 兼容接口，支持 **SSE 流式输出** 与会话持久化存储。

### 功能特性

- **流式对话体验**
  - 使用服务端 SSE（`text/event-stream`）逐 token 推送，前端实时渲染，体验类似 ChatGPT。
  - 请求中断支持：在生成过程中可点击「停止」中止本次回答。

- **安全的后端大模型调用**
  - API Key 通过 Nuxt `runtimeConfig` 注入，仅在服务端可见，不会暴露给前端。
  - 默认配置通义千问 DashScope 的 OpenAI 兼容接口，可按需切换至其他兼容模型。

- **会话管理与持久化**
  - 匿名 Session：通过 HttpOnly `sessionId` cookie 区分不同浏览器用户，无需登录。
  - 使用 **Prisma + PostgreSQL (Supabase)** 存储：
    - `Session`：会话归属
    - `Conversation`：对话（标题、时间等）
    - `Message`：消息内容（user/assistant）
  - 左侧会话列表支持：新建、切换、删除，对话历史刷新不丢失。

- **ChatGPT 风格 UI & 响应式布局**
  - Tailwind CSS 深色主题布局，侧边栏 + 主对话区结构。
  - 支持 **深色 / 浅色模式切换**，并记忆至 `localStorage`。
  - 移动端优化：
    - 抽屉式会话列表（小屏点击菜单打开）。
    - 气泡宽度与间距专门适配手机，使用 `100dvh` 规避地址栏高度抖动。
    - 新消息自动滚动到底部。

- **增强的对话操作体验**
  - **快捷提问按钮**：写代码 / 翻译 / 总结 / 写诗 —— 自动填充 Prompt 模板，加速常用场景。
  - **一键复制回答**
    - PC 端：默认通过系统复制快捷键使用。
    - 移动端：长按 AI 回复气泡触发复制，并在顶部显示 Toast 提示「已复制回答到剪贴板」。
  - **加载与思考状态**
    - AI 流式生成时在消息区域显示「思考中…」状态。
    - 发送按钮与「停止」按钮为互斥切换，避免重复提交。

### 技术栈

- 前端框架：**Nuxt 3**（Vue 3 + Vite）
- 语言：**TypeScript**
- 样式：**Tailwind CSS**
- 数据库：**PostgreSQL (Supabase)**
- ORM：**Prisma**
- 大模型接口：默认 **通义千问 DashScope** 的 OpenAI 兼容 API（可切换至其他兼容端点）

### 主要目录结构（核心部分）

- `pages/index.vue`：主对话界面（布局、主题切换、快捷提问、滚动与复制等 UI 逻辑）。
- `composables/useChat.ts`：前端聊天状态与 SSE 流解析逻辑。
- `server/api/chat.post.ts`：后端 SSE 聊天接口，调用大模型并将结果流式返回。
- `server/api/conversations/*.ts`：会话与消息的 CRUD 接口。
- `server/middleware/session.ts`：匿名 Session cookie 注入。
- `server/utils/prisma.ts`：Prisma Client 单例。
- `server/utils/session.ts`：`sessionId` 获取与 DB 中 `Session` 的保证存在。
- `prisma/schema.prisma`：Prisma 数据模型定义。

### 快速开始

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量（复制 `.env.example` 为 `.env`，并填入以下配置）：

   - **DashScope API Key**：获取自 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
   - **Supabase 数据库连接**：获取自 [Supabase 控制台](https://supabase.com/)

3. 初始化数据库：

```bash
npm run prisma:migrate
```

4. 启动开发服务器：

```bash
npm run dev
```

打开浏览器访问 `http://localhost:3000` 即可体验一个带有 **流式输出、会话存储、快捷提问、暗/亮主题切换** 的完整 AI 对话助手。

### 部署到 Vercel

1. **创建 Supabase 项目**：
   - 访问 [Supabase 控制台](https://supabase.com/)
   - 创建新项目并获取数据库连接字符串

2. **配置 Vercel 环境变量**：
   - 在 Vercel 项目设置 → Environment Variables 中添加：
     - `DATABASE_URL`：Supabase 连接池字符串
     - `DIRECT_DATABASE_URL`：Supabase 直接连接字符串
     - `DASHSCOPE_API_KEY`：你的 API 密钥

3. **部署**：
   - 推送代码到 GitHub 仓库
   - 在 Vercel 中导入仓库并部署
   - Vercel 会自动运行 `vercel-build` 脚本完成构建

部署完成后，访问 Vercel 提供的域名即可使用在线版本。

