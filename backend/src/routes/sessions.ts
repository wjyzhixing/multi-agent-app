import Router from '@koa/router';
import { ParameterizedContext } from 'koa';
import { optionalAuthMiddleware } from '../middleware/auth';
import {
  createPageSession,
  getPageSessions,
  getPageSession,
  deletePageSession,
  updatePageSession,
  createPageVersion,
  getPageVersions,
  getPageVersion,
  getLatestPageVersion,
  getConversationsBySession,
  getCareerSessions,
  deleteCareerSession,
  createCareerSession
} from '../db/init';

const router = new Router({ prefix: '' });

// Get sessions list
router.get('/sessions/:agentType', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { agentType } = ctx.params;
  const userId = ctx.user?.userId;

  if (agentType === 'pageBuilder') {
    const sessions = getPageSessions(userId);
    ctx.body = {
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        title: s.title || '未命名页面',
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
    };
  } else if (agentType === 'career') {
    const sessions = getCareerSessions(userId);
    ctx.body = {
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        stage: s.stage,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
    };
  } else {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Invalid agent type' };
  }
});

// Create new session
router.post('/sessions/:agentType', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { agentType } = ctx.params;
  const userId = ctx.user?.userId;
  const body = ctx.request.body as { title?: string };

  let sessionId: string;

  if (agentType === 'pageBuilder') {
    sessionId = createPageSession(userId, body.title);
  } else if (agentType === 'career') {
    sessionId = createCareerSession(userId);
  } else {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Invalid agent type' };
    return;
  }

  ctx.body = {
    success: true,
    data: { sessionId }
  };
});

// Delete session
router.delete('/sessions/:agentType/:sessionId', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { agentType, sessionId } = ctx.params;

  if (agentType === 'pageBuilder') {
    deletePageSession(sessionId);
  } else if (agentType === 'career') {
    deleteCareerSession(sessionId);
  } else {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Invalid agent type' };
    return;
  }

  ctx.body = { success: true };
});

// Get session conversations
router.get('/sessions/:agentType/:sessionId/conversations', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;

  const conversations = getConversationsBySession(sessionId);
  ctx.body = {
    success: true,
    data: conversations
  };
});

// Page version endpoints - IMPORTANT: latest route must come before :version route
router.get('/page-versions/:sessionId/latest', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;

  const pageVersion = getLatestPageVersion(sessionId);

  if (!pageVersion) {
    ctx.status = 404;
    ctx.body = { success: false, error: 'No versions found' };
    return;
  }

  ctx.body = {
    success: true,
    data: pageVersion
  };
});

router.get('/page-versions/:sessionId', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;

  const versions = getPageVersions(sessionId);
  ctx.body = {
    success: true,
    data: versions.map(v => ({
      id: v.id,
      version: v.version,
      description: v.description,
      createdAt: v.created_at
    }))
  };
});

router.post('/page-versions/:sessionId', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId } = ctx.params;
  const body = ctx.request.body as { code: string; description?: string };

  if (!body.code) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Code is required' };
    return;
  }

  const version = createPageVersion(sessionId, body.code, body.description);

  ctx.body = {
    success: true,
    data: { version }
  };
});

router.get('/page-versions/:sessionId/:version', optionalAuthMiddleware, async (ctx: ParameterizedContext) => {
  const { sessionId, version } = ctx.params;

  const pageVersion = getPageVersion(sessionId, parseInt(version));

  if (!pageVersion) {
    ctx.status = 404;
    ctx.body = { success: false, error: 'Version not found' };
    return;
  }

  ctx.body = {
    success: true,
    data: pageVersion
  };
});

export default router;