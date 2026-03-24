import Router from '@koa/router';
import { ParameterizedContext } from 'koa';
import {
  createUser,
  getUserByUsername,
  getUserByEmail,
  verifyPassword,
  User
} from '../db/init';
import { generateToken, authMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/auth' });

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 6;
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

// Register
router.post('/register', async (ctx: ParameterizedContext) => {
  const body = ctx.request.body as RegisterRequest;
  const { username, email, password } = body;

  // Validation
  if (!username || !email || !password) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '用户名、邮箱和密码都是必填项'
    };
    return;
  }

  if (!validateUsername(username)) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '用户名必须是3-20个字符，只能包含字母、数字和下划线'
    };
    return;
  }

  if (!validateEmail(email)) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '邮箱格式不正确'
    };
    return;
  }

  if (!validatePassword(password)) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '密码长度至少6个字符'
    };
    return;
  }

  // Check if user exists
  const existingUsername = getUserByUsername(username);
  if (existingUsername) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '用户名已被使用'
    };
    return;
  }

  const existingEmail = getUserByEmail(email);
  if (existingEmail) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '邮箱已被注册'
    };
    return;
  }

  // Create user
  try {
    const userId = createUser(username, email, password);
    const user = getUserByUsername(username);

    if (!user) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: '创建用户失败'
      };
      return;
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    ctx.body = {
      success: true,
      data: {
        user: sanitizeUser(user),
        token
      }
    };
  } catch (error) {
    console.error('Register error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '注册失败，请稍后重试'
    };
  }
});

// Login
router.post('/login', async (ctx: ParameterizedContext) => {
  const body = ctx.request.body as LoginRequest;
  const { username, password } = body;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: '用户名和密码都是必填项'
    };
    return;
  }

  // Find user by username or email
  let user = getUserByUsername(username);
  if (!user) {
    user = getUserByEmail(username);
  }

  if (!user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '用户名或密码错误'
    };
    return;
  }

  // Verify password
  if (!verifyPassword(user, password)) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '用户名或密码错误'
    };
    return;
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role
  });

  ctx.body = {
    success: true,
    data: {
      user: sanitizeUser(user),
      token
    }
  };
});

// Get current user
router.get('/me', authMiddleware, async (ctx: ParameterizedContext) => {
  const userId = ctx.user?.userId;
  const { getUserById } = await import('../db/init');
  const user = getUserById(userId!);

  if (!user) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      error: '用户不存在'
    };
    return;
  }

  ctx.body = {
    success: true,
    data: sanitizeUser(user)
  };
});

export default router;