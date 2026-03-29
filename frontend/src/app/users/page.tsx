'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

// 本地开发用 /api，生产环境由 Nginx 转发
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : '/api';

export default function UsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 检查权限
    if (!authLoading && (!user || user.username !== 'whmjack')) {
      router.push('/agents/psychological');
      return;
    }

    // 获取用户列表
    if (token && user?.username === 'whmjack') {
      fetchUsers();
    }
  }, [user, token, authLoading]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.error || '获取用户列表失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-neutral-500">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-8 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-800">用户管理</h1>
          <p className="text-neutral-500 mt-1">查看所有用户信息（只读）</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-semibold text-neutral-800">{users.length}</p>
            <p className="text-sm text-neutral-500">总用户数</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-semibold text-neutral-800">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-sm text-neutral-500">管理员</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-semibold text-neutral-800">{users.filter(u => u.role === 'user').length}</p>
            <p className="text-sm text-neutral-500">普通用户</p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <p className="text-2xl font-semibold text-neutral-800">
              {users.filter(u => {
                const date = new Date(u.createdAt);
                const now = new Date();
                const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
                return diffDays <= 7;
              }).length}
            </p>
            <p className="text-sm text-neutral-500">近7天新增</p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">用户名</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">邮箱</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">角色</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-neutral-600">注册时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-neutral-600">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-neutral-800">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-sm">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              暂无用户数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}