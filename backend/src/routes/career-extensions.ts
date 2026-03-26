import Router from '@koa/router';
import { ParameterizedContext } from 'koa';
import { optionalAuthMiddleware } from '../middleware/auth';
import {
  getCareerJobExtension,
  getCareerJobExtensions,
  upsertCareerJobExtension,
  deleteCareerJobExtension,
  getDocument
} from '../db/init';
import { chatWithAIStream } from '../lib/ai-client';

const router = new Router({ prefix: '/career-extensions' });

// 对话生成职业扩展
router.post('/generate', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const body = ctx.request.body as { sessionId: string; jobTitle: string; message: string; conversations?: any[]; currentContent?: string };
  const { sessionId, jobTitle, message, conversations, currentContent } = body;

  const document = getDocument(sessionId);
  if (!document) {
    // Return SSE error for consistency with streaming
    ctx.set('Content-Type', 'text/event-stream');
    ctx.set('Cache-Control', 'no-cache');
    ctx.body = `data: ${JSON.stringify({ error: '测评报告不存在', done: true })}\n\n`;
    return;
  }

  const systemPrompt = `你是一位专业的职业规划顾问。用户正在查看他们的职业测评报告，想要深入了解"${jobTitle}"这个职业方向。

用户原始测评报告中关于职业方向的部分：
${document.content}

${currentContent ? `当前已经生成的扩展内容：
${currentContent}

用户希望基于现有内容进行补充或修改。请根据用户的具体问题，对现有内容进行有针对性的更新、补充或优化。` : '请根据用户的具体问题，生成关于该职业的详细分析。'}

分析要点包括：
1. 职业详细描述和发展前景
2. 核心技能要求和能力匹配
3. 入门路径和学习建议
4. 行业现状和发展趋势
5. 薪资水平和晋升空间
6. 潜在挑战和应对策略
7. 具体的行动建议

请用Markdown格式输出，内容要详细、实用、有针对性。${currentContent ? '如果是修改或补充，请直接输出修改/补充后的完整内容部分，不需要重复整个文档。' : ''}`;

  const convos = conversations || [];
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const conv of convos) {
    messages.push({ role: 'user', content: conv.user });
    if (conv.assistant) {
      messages.push({ role: 'assistant', content: conv.assistant });
    }
  }
  messages.push({ role: 'user', content: message });

  ctx.set('Content-Type', 'text/event-stream');
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');

  let fullContent = '';

  try {
    const aiStream = await chatWithAIStream({
      messages,
      system: systemPrompt,
      maxTokens: 4096,
      temperature: 0.7,
    });

    const { PassThrough } = await import('stream');
    const passThrough = new PassThrough();

    aiStream.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString();
      passThrough.write(chunkStr);

      const lines = chunkStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const json = JSON.parse(data);
            if (json.text) fullContent += json.text;
            if (json.fullText) fullContent = json.fullText;
          } catch (e) {}
        }
      }
    });

    aiStream.on('end', () => {
      passThrough.end();
      const newConversations = [...convos, { user: message, assistant: fullContent }];
      upsertCareerJobExtension(sessionId, jobTitle, fullContent, JSON.stringify(newConversations));
    });

    aiStream.on('error', (err: Error) => {
      console.error('[CareerExtensions] AI stream error:', err);
      passThrough.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
      passThrough.end();
    });

    ctx.body = passThrough;
  } catch (error: any) {
    console.error('[CareerExtensions] Error:', error);
    ctx.body = `data: ${JSON.stringify({ error: error.message || 'AI调用失败', done: true })}\n\n`;
  }
});

// 获取扩展列表
router.get('/list/:sessionId', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;
  const extensions = getCareerJobExtensions(sessionId);
  ctx.body = {
    success: true,
    data: extensions.map(e => ({
      id: e.id,
      jobTitle: e.job_title,
      content: e.content,
      conversations: JSON.parse(e.conversations || '[]'),
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }))
  };
});

// 获取单个扩展
router.get('/item/:sessionId', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;
  const jobTitle = ctx.query.jobTitle as string;

  if (!jobTitle) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'jobTitle is required' };
    return;
  }

  const extension = getCareerJobExtension(sessionId, jobTitle);
  ctx.body = {
    success: true,
    data: extension ? {
      id: extension.id,
      jobTitle: extension.job_title,
      content: extension.content,
      conversations: JSON.parse(extension.conversations || '[]'),
      createdAt: extension.created_at,
      updatedAt: extension.updated_at
    } : null
  };
});

// 创建或更新扩展
router.post('/save', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const body = ctx.request.body as { sessionId: string; jobTitle: string; content?: string; conversations?: any[] };
  const { sessionId, jobTitle, content, conversations } = body;

  if (!sessionId || !jobTitle) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'sessionId and jobTitle are required' };
    return;
  }

  const id = upsertCareerJobExtension(
    sessionId,
    jobTitle,
    content || '',
    conversations ? JSON.stringify(conversations) : undefined
  );

  ctx.body = { success: true, data: { id, jobTitle } };
});

// 删除扩展
router.delete('/remove', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const sessionId = ctx.query.sessionId as string;
  const jobTitle = ctx.query.jobTitle as string;

  if (!sessionId || !jobTitle) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'sessionId and jobTitle are required' };
    return;
  }

  deleteCareerJobExtension(sessionId, jobTitle);
  ctx.body = { success: true };
});

export default router;