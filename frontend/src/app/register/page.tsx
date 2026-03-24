'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6个字符');
      return;
    }

    setLoading(true);

    const res = await register(username, email, password);

    if (res.success && res.data) {
      setAuth(res.data.user, res.data.token);
      router.push('/agents/career');
    } else {
      setError(res.error || '注册失败');
    }

    setLoading(false);
  };

  return (
    <div className="no-sidebar min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-800">注册</h1>
          <p className="text-neutral-500 text-sm mt-2">创建账号开始使用</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-sm"
              placeholder="3-20个字符，字母数字下划线"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-sm"
              placeholder="your@email.com"
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
              placeholder="至少6个字符"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1.5">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 text-sm"
              placeholder="再次输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          已有账号？{' '}
          <Link href="/login" className="text-neutral-900 hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}