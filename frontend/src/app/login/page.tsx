'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.token);
      router.push('/agents/career');
    } else {
      setError(res.error || '登录失败');
    }

    setLoading(false);
  };

  return (
    <div className="no-sidebar min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-800">登录</h1>
          <p className="text-neutral-500 text-sm mt-2">登录以使用智能体助手</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">用户名 / 邮箱</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-sm"
              placeholder="输入用户名或邮箱"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-sm"
              placeholder="输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          还没有账号？{' '}
          <Link href="/register" className="text-neutral-900 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}