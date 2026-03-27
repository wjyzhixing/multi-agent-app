import Router from '@koa/router';
import { ParameterizedContext } from 'koa';
import { authMiddleware } from '../middleware/auth';
import { getAllUsers } from '../db/init';

const router = new Router({ prefix: '/users' });

// 特定用户权限检查 - 只有 whmjack 可以访问
const specialUserMiddleware = async (ctx: ParameterizedContext, next: () => Promise<void>) => {
  if (!ctx.user || ctx.user.username !== 'whmjack') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      error: '无权访问此页面'
    };
    return;
  }
  await next();
};

// 获取所有用户列表 - 只有 whmjack 可以访问
router.get('/list', authMiddleware, specialUserMiddleware, async (ctx: ParameterizedContext) => {
  try {
    const users = getAllUsers();

    // 移除敏感信息
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    ctx.body = {
      success: true,
      data: safeUsers
    };
  } catch (error) {
    console.error('Get users error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: '获取用户列表失败'
    };
  }
});

// 检查当前用户是否有用户管理权限
router.get('/can-manage', authMiddleware, async (ctx: ParameterizedContext) => {
  const canManage = ctx.user?.username === 'whmjack';
  ctx.body = {
    success: true,
    data: { canManage }
  };
});

export default router;