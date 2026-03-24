'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const menuItems = [
  { path: '/agents/psychological', label: '心理疏导' },
  { path: '/agents/ai-tools', label: 'AI 工具' },
  { path: '/agents/career', label: '职业测评' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4 z-50">
        <h1 className="text-base font-semibold text-neutral-800">智能体助手</h1>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-2 text-neutral-600"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-white border-r border-neutral-100 z-50
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-5 pt-6">
          <h1 className="text-lg font-semibold text-neutral-800">智能体助手</h1>
          <p className="text-xs text-neutral-400 mt-1">选择一个助手开始对话</p>
        </div>

        <nav className="px-3 mt-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-100">
          {loading ? null : user ? (
            <div className="space-y-2">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-neutral-800 truncate">{user.username}</p>
                <p className="text-xs text-neutral-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 rounded-lg transition-colors text-left"
              >
                退出登录
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block w-full px-4 py-2.5 bg-neutral-900 text-white text-sm text-center rounded-lg hover:bg-neutral-800 transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
