'use client';

import { useState, useRef, useEffect } from 'react';
import { streamChat, getDocument, Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import MarkdownEditor from '@/components/MarkdownEditor';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function CareerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [documentContent, setDocumentContent] = useState<string>('');
  const [showDocument, setShowDocument] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load history on mount - only if logged in
  useEffect(() => {
    const loadHistory = async () => {
      setLoadingHistory(true);

      // If not logged in, just show welcome message
      if (!token) {
        setMessages([{
          id: generateId(),
          role: 'assistant',
          content: '你好！我是职业测评助手。我会通过一些问题来了解你，然后为你生成一份专属的职业测评报告。\n\n让我们开始吧！请告诉我你的名字或者你想从哪个方面开始聊？',
          timestamp: new Date()
        }]);
        setLoadingHistory(false);
        return;
      }

      try {
        const API_BASE = process.env.NODE_ENV === 'development'
          ? 'http://localhost:3001'
          : '/api';

        const response = await fetch(`${API_BASE}/history/career?limit=50`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Convert history to messages format (user + assistant pairs)
          const formattedMessages: Message[] = [];
          let lastSessionId: string | undefined;

          // Reverse to show oldest first
          const historyData = [...data.data].reverse();

          historyData.forEach((item: any) => {
            // Track session_id for document loading
            if (item.session_id) {
              lastSessionId = item.session_id;
            }

            // User message
            formattedMessages.push({
              id: `${item.id}-user`,
              role: 'user',
              content: item.user_input,
              timestamp: new Date(item.created_at)
            });
            // Assistant message
            formattedMessages.push({
              id: `${item.id}-assistant`,
              role: 'assistant',
              content: item.agent_response,
              timestamp: new Date(item.created_at)
            });
          });

          setMessages(formattedMessages);

          // If there's a session_id, load the document
          if (lastSessionId) {
            setSessionId(lastSessionId);
            const doc = await getDocument(lastSessionId);
            if (doc && doc.content) {
              setDocumentContent(doc.content);
            }
          }
        } else {
          // No history, show welcome message
          setMessages([{
            id: generateId(),
            role: 'assistant',
            content: '你好！我是职业测评助手。我会通过一些问题来了解你，然后为你生成一份专属的职业测评报告。\n\n让我们开始吧！请告诉我你的名字或者你想从哪个方面开始聊？',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
        setMessages([{
          id: generateId(),
          role: 'assistant',
          content: '你好！我是职业测评助手。我会通过一些问题来了解你，然后为你生成一份专属的职业测评报告。\n\n让我们开始吧！请告诉我你的名字或者你想从哪个方面开始聊？',
          timestamp: new Date()
        }]);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [token]);

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

          if (sid) {
            setSessionId(sid);
          }

          if (documentReady && sid) {
            // Fetch the document
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
        token || undefined
      );
    } catch (err) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-50">
      {/* Chat Section */}
      <div className={`flex-1 flex flex-col ${showDocument ? 'lg:w-1/2 lg:max-w-[600px]' : ''} ${showDocument ? 'lg:border-r lg:border-neutral-200' : ''}`}>
        <div className="flex-1 overflow-y-auto pt-14 lg:pt-8">
          <div className="max-w-2xl mx-auto px-6 py-6">
            {loadingHistory ? (
              <div className="text-center py-16">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <p className="text-neutral-400 text-sm mt-4">加载历史记录...</p>
              </div>
            ) : (
              <>
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
              </>
            )}
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
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowDocument(false)}
            className="lg:hidden fixed bottom-20 right-6 px-4 py-2 bg-neutral-900 text-white text-sm rounded-full shadow-lg"
          >
            返回对话
          </button>
        </div>
      )}

      {/* Show document button when document is ready */}
      {documentContent && !showDocument && (
        <div className="fixed bottom-[76px] right-6 lg:bottom-3 z-40">
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
  );
}