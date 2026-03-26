'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamChat, getDocument, Message, getSessionConversations, createSession } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import MarkdownEditor from '@/components/MarkdownEditor';
import SessionList, { SessionListRef } from '@/components/SessionList';
import CareerJobDrawer from '@/components/CareerJobDrawer';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const WELCOME_MESSAGE = '你好！我是职业测评助手。我会通过一些问题来了解你，然后为你生成一份专属的职业测评报告。\n\n让我们开始吧！请告诉我你的名字或者你想从哪个方面开始聊？';

export default function CareerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [documentContent, setDocumentContent] = useState<string>('');
  const [showDocument, setShowDocument] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionListRef = useRef<SessionListRef>(null);
  const { token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message on mount
  useEffect(() => {
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date()
    }]);
  }, []);

  // Handle session selection
  const handleSelectSession = async (sid: string) => {
    setSessionId(sid);

    const conversations = await getSessionConversations(sid, 'career', token || undefined);
    setMessages(conversations.length > 0 ? conversations : [{
      id: generateId(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date()
    }]);

    const doc = await getDocument(sid);
    if (doc && doc.content) {
      setDocumentContent(doc.content);
      setShowDocument(true);
    } else {
      setDocumentContent('');
      setShowDocument(false);
    }
  };

  // Handle new session
  const handleNewSession = () => {
    setSessionId(undefined);
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date()
    }]);
    setDocumentContent('');
    setShowDocument(false);
  };

  // Refresh session list
  const refreshSessionList = useCallback(() => {
    sessionListRef.current?.refresh();
  }, []);

  // 打开职业扩展抽屉
  const handleJobExtend = useCallback((jobTitle: string) => {
    setSelectedJob(jobTitle);
    setDrawerOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create session if not exists
    let currentSessionId = sessionId;
    if (!currentSessionId && token) {
      const newSessionId = await createSession('career', undefined, token);
      if (newSessionId) {
        currentSessionId = newSessionId;
        setSessionId(newSessionId);
      }
    }

    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      await streamChat(
        'career',
        userMessage.content,
        (chunk: string) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        async (fullText: string, sid?: string, documentReady?: boolean) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullText }
              : msg
          ));
          setIsLoading(false);

          // Refresh session list after completion
          refreshSessionList();

          if (sid) {
            setSessionId(sid);
          }

          if (documentReady && sid) {
            const doc = await getDocument(sid);
            if (doc) {
              setDocumentContent(doc.content);
              setShowDocument(true);
            }
          }
        },
        (errorMsg: string) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: `出错了：${errorMsg}` }
              : msg
          ));
          setIsLoading(false);
        },
        token || undefined,
        undefined,
        currentSessionId || undefined
      );
    } catch (err) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Session List */}
      <SessionList
        ref={sessionListRef}
        agentType="career"
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        token={token || undefined}
        isOpen={showSessionList}
        onClose={() => setShowSessionList(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        {/* Chat Section */}
        <div className={`flex-1 flex flex-col ${showDocument ? 'lg:w-1/2 lg:max-w-[600px]' : ''} ${showDocument ? 'lg:border-r lg:border-neutral-200' : ''}`}>
          {/* Mobile header with session toggle */}
          {token && (
            <div className="lg:hidden flex items-center justify-between px-4 pt-14 pb-3 bg-white border-b border-neutral-100">
              <button
                onClick={() => setShowSessionList(true)}
                className="flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-neutral-700 font-medium">历史记录</span>
              </button>
              {documentContent && (
                <button
                  onClick={() => setShowDocument(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">查看报告</span>
                </button>
              )}
            </div>
          )}
          {!token && <div className="lg:hidden h-14" />}

          <div className="flex-1 overflow-y-auto lg:pt-8">
            <div className="max-w-2xl mx-auto px-6 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-5 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  {message.role === 'user' ? (
                    <div className="inline-block bg-neutral-900 text-white px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[85%]">
                      <p className="whitespace-pre-wrap text-sm text-left leading-relaxed">{message.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-[85%]">
                      {message.content === '' && isLoading ? (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-neutral-700 text-sm leading-relaxed">{message.content}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-neutral-100 bg-white">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="开始你的职业测评..."
                  className="flex-1 px-4 py-2.5 bg-neutral-100 rounded-full focus:outline-none focus:bg-neutral-200 text-neutral-800 text-sm transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 bg-neutral-900 text-white rounded-full flex items-center justify-center hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </form>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>

        {/* Document Section */}
        {showDocument && (
          <div className="fixed inset-0 lg:relative lg:flex-1 bg-white z-50 lg:z-auto overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 lg:hidden">
              <h2 className="text-base font-semibold text-neutral-800">职业测评报告</h2>
              <button
                onClick={() => setShowDocument(false)}
                className="p-2 -mr-2 text-neutral-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="h-[calc(100vh-60px)] lg:h-full overflow-y-auto">
              <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                <div className="mb-6 hidden lg:flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-neutral-800">职业测评报告</h2>
                  <button
                    onClick={() => setShowDocument(false)}
                    className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    关闭
                  </button>
                </div>
                <div className="bg-white rounded-xl border border-neutral-200 p-6 lg:p-8 shadow-sm">
                  <MarkdownEditor
                    content={documentContent}
                    sessionId={sessionId}
                    onSave={(content) => setDocumentContent(content)}
                    onJobExtend={handleJobExtend}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDocument(false)}
              className="lg:hidden fixed bottom-6 right-6 px-5 py-2.5 bg-neutral-900 text-white text-sm rounded-full shadow-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              返回对话
            </button>
          </div>
        )}

        {/* Show document button when document is ready - only on desktop */}
        {documentContent && !showDocument && (
          <div className="hidden lg:block fixed bottom-3 right-6 z-40">
            <button
              onClick={() => setShowDocument(true)}
              className="px-5 py-2.5 bg-neutral-900 text-white text-sm rounded-full shadow-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              查看报告
            </button>
          </div>
        )}
      </div>

      {/* 职业扩展抽屉 */}
      <CareerJobDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessionId={sessionId || ''}
        jobTitle={selectedJob}
        reportContent={documentContent}
        token={token || undefined}
      />
    </div>
  );
}