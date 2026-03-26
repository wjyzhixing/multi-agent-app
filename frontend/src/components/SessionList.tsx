'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Session, getSessions, createSession, deleteSession } from '@/lib/api';

interface SessionListProps {
  agentType: 'pageBuilder' | 'career';
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  token?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export interface SessionListRef {
  refresh: () => void;
}

const SessionList = forwardRef<SessionListRef, SessionListProps>(({
  agentType,
  currentSessionId,
  onSelectSession,
  onNewSession,
  token,
  isOpen = true,
  onClose
}, ref) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadSessions = async () => {
    if (!token) {
      setLoading(false);
      setSessions([]);
      return;
    }
    setLoading(true);
    const data = await getSessions(agentType, token);
    setSessions(data);
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({
    refresh: loadSessions
  }));

  useEffect(() => {
    loadSessions();
  }, [agentType, token]);

  const handleNewSession = async () => {
    const sessionId = await createSession(agentType, undefined, token);
    if (sessionId) {
      await loadSessions();
      onSelectSession(sessionId);
      onNewSession();
      onClose?.();
    }
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose?.();
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个会话吗？')) {
      await deleteSession(agentType, sessionId, token);
      await loadSessions();
      if (sessionId === currentSessionId) {
        onNewSession();
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return '今天';
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  // Collapsed state - just show toggle button
  if (isCollapsed) {
    return (
      <>
        {token && (
          <div className="hidden lg:flex flex-col h-full bg-white border-r border-neutral-200 w-12 flex-shrink-0 items-center py-4">
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
              title="展开历史记录"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Desktop: collapsible sidebar */}
      {token && (
        <div className="hidden lg:flex flex-col h-full bg-white border-r border-neutral-200 w-56 flex-shrink-0">
          {/* Header with collapse toggle */}
          <div className="flex items-center justify-between p-3 border-b border-neutral-100">
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded hover:bg-neutral-100"
              title="收起"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-neutral-400 text-sm">加载中...</div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-neutral-400 text-sm">暂无历史记录</div>
            ) : (
              <div className="py-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                      session.id === currentSessionId
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'hover:bg-neutral-50 text-neutral-600 active:bg-neutral-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">
                        {session.title || (agentType === 'pageBuilder' ? '未命名页面' : '职业测评')}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">{formatDate(session.updatedAt)}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition-all rounded-full hover:bg-neutral-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile: drawer overlay */}
      {isOpen && token && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-800">会话历史</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  新建
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-neutral-400 text-sm">加载中...</div>
              ) : sessions.length === 0 ? (
                <div className="p-4 text-center text-neutral-400 text-sm">暂无历史记录</div>
              ) : (
                <div className="py-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                        session.id === currentSessionId
                          ? 'bg-neutral-100 text-neutral-900'
                          : 'hover:bg-neutral-50 text-neutral-600 active:bg-neutral-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium">
                          {session.title || (agentType === 'pageBuilder' ? '未命名页面' : '职业测评')}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">{formatDate(session.updatedAt)}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition-all rounded-full hover:bg-neutral-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SessionList.displayName = 'SessionList';

export default SessionList;