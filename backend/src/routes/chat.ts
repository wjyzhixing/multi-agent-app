import Router from '@koa/router';
import { PsychologicalAgent } from '../agents/psychological';
import { AIToolsAgent } from '../agents/ai-tools';
import { CareerAgent } from '../agents/career';
import { PageBuilderAgent } from '../agents/page-builder';
import { getBlockMessage } from '../middleware/intent';
import { checkIntentWithAI } from '../lib/ai-client';
import { initConversation, getConversationHistory, getDocument, updateDocument, updatePageSession, createPageVersion } from '../db/init';
import { optionalAuthMiddleware, authMiddleware } from '../middleware/auth';
import { ParameterizedContext } from 'koa';
import { PassThrough } from 'stream';
const router = new Router({ prefix: '' });

const agents = {
  psychological: new PsychologicalAgent(),
  aiTools: new AIToolsAgent(),
  career: new CareerAgent(),
  pageBuilder: new PageBuilderAgent()
};

interface ChatRequest {
  input: string;
  userId?: string;
  stream?: boolean;
  existingCode?: string;
  sessionId?: string;
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

  // Use AI for intent recognition (skip for career and pageBuilder agents)
  const intentResult = await checkIntentWithAI(input, agentType as 'psychological' | 'aiTools' | 'career' | 'pageBuilder');

  // If intent is not relevant, return blocked response
  if (!intentResult.isRelevant && agentType !== 'career' && agentType !== 'pageBuilder') {
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

  // Get stream from agent with existing code context
  const originalStream = await agent.processStream(input, {
    userId,
    existingCode: body.existingCode
  });

  // Wrap stream to save conversation and version
  const wrappedStream = new PassThrough();
  let fullText = '';

  originalStream.on('data', (chunk: Buffer) => {
    const str = chunk.toString();
    wrappedStream.write(str);

    // Extract text from SSE data
    const lines = str.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.text) {
            fullText += json.text;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  });

  originalStream.on('end', () => {
    console.log(`[Chat] Stream ended for ${agentType}, sessionId: ${body.sessionId}, fullText length: ${fullText.length}`);

    // Save conversation and version
    if (body.sessionId && fullText) {
      initConversation(agentType, input, fullText, 1, false, body.sessionId, userId);

      // For pageBuilder, save version and update title
      if (agentType === 'pageBuilder') {
        // Extract HTML code
        const htmlMatch = fullText.match(/```html\n([\s\S]*?)```/);
        if (htmlMatch) {
          const code = htmlMatch[1].trim();
          console.log(`[PageBuilder] Saving version for session ${body.sessionId}, code length: ${code.length}`);
          const version = createPageVersion(body.sessionId, code);
          console.log(`[PageBuilder] Created version ${version}`);
        } else {
          console.log(`[PageBuilder] No HTML code found in response for session ${body.sessionId}`);
          console.log(`[PageBuilder] Response preview: ${fullText.substring(0, 200)}...`);
        }

        // Extract title from first user message or set default
        updatePageSession(body.sessionId, input.slice(0, 50));
      }
    } else {
      console.log(`[Chat] Session not saved - sessionId: ${body.sessionId}, fullText length: ${fullText.length}`);
    }

    wrappedStream.end();
  });

  originalStream.on('error', (err) => {
    wrappedStream.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
    wrappedStream.end();
  });

  // Pipe stream to response
  ctx.body = wrappedStream;
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

  // Use AI for intent recognition (skip for career and pageBuilder agents)
  const intentResult = await checkIntentWithAI(input, agentType as 'psychological' | 'aiTools' | 'career' | 'pageBuilder');

  if (!intentResult.isRelevant && agentType !== 'career' && agentType !== 'pageBuilder') {
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