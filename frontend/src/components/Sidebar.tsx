'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const menuItems = [
  { path: '/agents/psychological', label: '心理疏导' },
  { path: '/agents/ai-tools', label: 'AI 工具' },
  { path: '/agents/career', label: '职业测评' },
  { path: '/agents/page-builder', label: '页面生成' },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
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
      {/* Mobile header */}
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

      {/* Desktop sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-neutral-100 z-50
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-60'}
          hidden lg:block
          ${isOpen ? 'translate-x-0 lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 shadow-sm z-10"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={`p-5 pt-6 ${isCollapsed ? 'px-3' : ''}`}>
          <h1 className={`text-lg font-semibold text-neutral-800 truncate ${isCollapsed ? 'text-center' : ''}`}>
            {isCollapsed ? '智' : '智能体助手'}
          </h1>
          {!isCollapsed && (
            <p className="text-xs text-neutral-400 mt-1">选择一个助手开始对话</p>
          )}
        </div>

        <nav className={`px-3 mt-2 ${isCollapsed ? 'px-2' : ''}`}>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-${isCollapsed ? 'center' : 'start'} px-${isCollapsed ? '2' : '4'} py-3 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {isCollapsed ? (
                      <span className="w-6 h-6 flex items-center justify-center">
                        {item.label.charAt(0)}
                      </span>
                    ) : (
                      item.label
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-100 ${isCollapsed ? 'px-2' : ''}`}>
          {loading ? null : user ? (
            <div className="space-y-2">
              {!isCollapsed && (
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-neutral-800 truncate">{user.username}</p>
                  <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className={`w-full px-${isCollapsed ? '2' : '4'} py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 rounded-lg transition-colors ${isCollapsed ? 'text-center' : 'text-left'}`}
                title={isCollapsed ? '退出登录' : undefined}
              >
                {isCollapsed ? (
                  <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                ) : (
                  '退出登录'
                )}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className={`block w-full px-${isCollapsed ? '2' : '4'} py-2.5 bg-neutral-900 text-white text-sm text-center rounded-lg hover:bg-neutral-800 transition-colors`}
            >
              {isCollapsed ? '登' : '登录'}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 bg-white border-r border-neutral-100 z-50
          transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
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