import Router from '@koa/router';
import { PsychologicalAgent } from '../agents/psychological';
import { AIToolsAgent } from '../agents/ai-tools';
import { CareerAgent } from '../agents/career';
import { getBlockMessage } from '../middleware/intent';
import { checkIntentWithAI } from '../lib/ai-client';
import { initConversation, getConversationHistory, getDocument, updateDocument } from '../db/init';
import { optionalAuthMiddleware, authMiddleware } from '../middleware/auth';
import { ParameterizedContext } from 'koa';
const router = new Router({ prefix: '' });

const agents = {
  psychological: new PsychologicalAgent(),
  aiTools: new AIToolsAgent(),
  career: new CareerAgent()
};

interface ChatRequest {
  input: string;
  userId?: string;
  stream?: boolean;
}

interface ChatResponse {
  success: boolean;
  data?: {
    text: string;
    recommendations: any[];
  };
  error?: string;
  isBlocked?: boolean;
  intentScore?: number;
}

// Streaming chat endpoint
router.post('/chat/:agentType/stream', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { agentType } = ctx.params;
  const body = ctx.request.body as ChatRequest;
  const { input } = body;
  const userId = ctx.user?.userId;

  // Validate agent type
  if (!agents[agentType as keyof typeof agents]) {
    ctx.status = 400;
    ctx.type = 'text/event-stream';
    ctx.body = `data: ${JSON.stringify({ error: 'Invalid agent type', done: true })}\n\n`;
    return;
  }

  // Validate input
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    ctx.status = 400;
    ctx.type = 'text/event-stream';
    ctx.body = `data: ${JSON.stringify({ error: 'Input is required', done: true })}\n\n`;
    return;
  }

  const agent = agents[agentType as keyof typeof agents];

  // Use AI for intent recognition (skip for career agent)
  const intentResult = await checkIntentWithAI(input, agentType as 'psychological' | 'aiTools' | 'career');

  // If intent is not relevant, return blocked response
  if (!intentResult.isRelevant && agentType !== 'career') {
    const blockMessage = getBlockMessage(agentType as 'psychological' | 'aiTools');
    ctx.type = 'text/event-stream';
    ctx.set('Cache-Control', 'no-cache');
    ctx.body = `data: ${JSON.stringify({ text: blockMessage, done: true, isBlocked: true })}\n\n`;
    return;
  }

  // Set SSE headers
  ctx.type = 'text/event-stream';
  ctx.set('Cache-Control', 'no-cache');
  ctx.set('Connection', 'keep-alive');
  ctx.set('X-Accel-Buffering', 'no');

  // Get stream from agent
  const stream = await agent.processStream(input, { userId });

  // Pipe stream to response
  ctx.body = stream;
});

// Non-streaming chat endpoint
router.post('/chat/:agentType', async (ctx: ParameterizedContext) => {
  const { agentType } = ctx.params;
  const body = ctx.request.body as ChatRequest;
  const { input, userId } = body;

  if (!agents[agentType as keyof typeof agents]) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Invalid agent type. Use "psychological" or "aiTools"'
    } as ChatResponse;
    return;
  }

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Input is required'
    } as ChatResponse;
    return;
  }

  const agent = agents[agentType as keyof typeof agents];

  // Use AI for intent recognition (skip for career agent)
  const intentResult = await checkIntentWithAI(input, agentType as 'psychological' | 'aiTools' | 'career');

  if (!intentResult.isRelevant && agentType !== 'career') {
    const blockMessage = getBlockMessage(agentType as 'psychological' | 'aiTools');

    ctx.body = {
      success: true,
      data: {
        text: blockMessage,
        recommendations: []
      },
      isBlocked: true,
      intentScore: intentResult.score
    } as ChatResponse;
    return;
  }

  const response = await agent.process(input, { userId });

  initConversation(agentType, input, response.text, intentResult.score, false);

  ctx.body = {
    success: true,
    data: {
      text: response.text,
      recommendations: response.recommendations || []
    },
    isBlocked: false,
    intentScore: intentResult.score
  } as ChatResponse;
});

// Get conversation history
router.get('/history/:agentType', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { agentType } = ctx.params;
  const limit = parseInt(ctx.query.limit as string) || 20;
  const userId = ctx.user?.userId;

  const history = getConversationHistory(agentType || undefined, limit, userId);

  ctx.body = {
    success: true,
    data: history
  };
});

router.get('/history', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const limit = parseInt(ctx.query.limit as string) || 20;
  const userId = ctx.user?.userId;

  const history = getConversationHistory(undefined, limit, userId);

  ctx.body = {
    success: true,
    data: history
  };
});

// Intent check endpoint
router.post('/intent-check', async (ctx: ParameterizedContext) => {
  const body = ctx.request.body as { input: string; agentType: 'psychological' | 'aiTools' | 'career' };
  const { input, agentType } = body;

  if (!input || !agentType) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Input and agentType are required'
    };
    return;
  }

  const result = await checkIntentWithAI(input, agentType);

  ctx.body = {
    success: true,
    data: result
  };
});

// Document endpoints for career assessment
router.get('/documents/:sessionId', async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;

  const doc = getDocument(sessionId);

  if (!doc) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      error: 'Document not found'
    };
    return;
  }

  ctx.body = {
    success: true,
    data: doc
  };
});

router.put('/documents/:sessionId', async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;
  const body = ctx.request.body as { content: string };

  if (!body.content) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Content is required'
    };
    return;
  }

  updateDocument(sessionId, body.content);

  ctx.body = {
    success: true,
    message: 'Document updated'
  };
});

export default router;