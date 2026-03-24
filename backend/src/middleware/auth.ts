import { ParameterizedContext } from 'koa';
import jwt from 'jsonwebtoken';
import { getUserById } from '../db/init';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

declare module 'koa' {
  interface DefaultContext {
    user?: JWTPayload;
  }
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function authMiddleware(ctx: ParameterizedContext, next: () => Promise<void>) {
  const authHeader = ctx.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '未提供认证令牌'
    };
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '无效或过期的令牌'
    };
    return;
  }

  // Verify user exists
  const user = getUserById(payload.userId);
  if (!user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '用户不存在'
    };
    return;
  }

  ctx.user = payload;
  await next();
}

export async function adminMiddleware(ctx: ParameterizedContext, next: () => Promise<void>) {
  if (!ctx.user || ctx.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      error: '需要管理员权限'
    };
    return;
  }
  await next();
}

// Optional auth - doesn't require login but sets user if token present
export async function optionalAuthMiddleware(ctx: ParameterizedContext, next: () => Promise<void>) {
  const authHeader = ctx.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = getUserById(payload.userId);
      if (user) {
        ctx.user = payload;
      }
    }
  }

  await next();
}