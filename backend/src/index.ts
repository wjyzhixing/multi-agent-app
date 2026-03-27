import * as dotenv from 'dotenv';
dotenv.config();

// Initialize database schema
import './db/schema';

import Koa, { DefaultState, DefaultContext } from 'koa';
import json from 'koa-json';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import chatRouter from './routes/chat';
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import careerExtensionsRouter from './routes/career-extensions';
import usersRouter from './routes/users';

const app = new Koa();
const PORT = Number(process.env.PORT) || 3001;

// Middleware - CORS 允许所有来源
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(json());
app.use(bodyParser());

// Routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());
app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());
app.use(sessionsRouter.routes());
app.use(sessionsRouter.allowedMethods());
app.use(careerExtensionsRouter.routes());
app.use(careerExtensionsRouter.allowedMethods());
app.use(chatRouter.routes());
app.use(chatRouter.allowedMethods());

// Health check
app.use(async (ctx: DefaultContext, next: () => Promise<void>) => {
  if (ctx.path === '/health') {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
    return;
  }
  await next();
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /auth/register - 用户注册`);
  console.log(`   POST /auth/login - 用户登录`);
  console.log(`   GET  /auth/me - 获取当前用户`);
  console.log(`   POST /chat/psychological - 心理疏导智能体`);
  console.log(`   POST /chat/aiTools - AI 工具推荐智能体`);
  console.log(`   POST /chat/career - 职业测评智能体`);
  console.log(`   POST /chat/pageBuilder - 页面生成智能体`);
  console.log(`   GET  /history/:agentType - 历史记录`);
  console.log(`   POST /intent-check - 意图检测`);
  console.log(`   GET/PUT /documents/:sessionId - 文档管理`);
  console.log(`   GET  /health - 健康检查`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
