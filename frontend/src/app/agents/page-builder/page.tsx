'use client';

import { useState, useRef, useEffect } from 'react';
import { streamChat, Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import CodePreview from '@/components/CodePreview';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function PageBuilderPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: '你好！我是页面生成助手。告诉我你想创建什么样的网页，我会帮你生成代码。\n\n例如：\n- "帮我做一个登录页面"\n- "创建一个产品展示卡片"\n- "做一个响应式的导航栏"',
        timestamp: new Date()
      }]);
    }
  }, []);

  // Extract HTML code from response
  const extractHtmlCode = (text: string): string => {
    const match = text.match(/```html\n([\s\S]*?)```/);
    return match ? match[1].trim() : '';
  };

  // Extract non-code text for chat display
  const extractDescription = (text: string, hasCode: boolean): string => {
    if (hasCode) {
      // If there's code, show a brief message
      return text
        .replace(/```html\n[\s\S]*?```/g, '✅ 页面代码已更新，请在右侧预览区查看')
        .replace(/```\w*\n[\s\S]*?```/g, '')
        .trim();
    } else {
      // If no code, show the full response (it's a Q&A)
      return text.trim();
    }
  };

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

    // Show preview panel with loading state
    setShowPreview(true);

    const assistantMessageId = generateId();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      let fullText = '';

      await streamChat(
        'pageBuilder',
        userMessage.content,
        (chunk: string) => {
          fullText += chunk;

          // Extract code and update preview in real-time
          const htmlCode = extractHtmlCode(fullText);
          const hasCode = !!htmlCode;
          if (hasCode) {
            setGeneratedCode(htmlCode);
          }

          // Update chat message with description only
          const description = extractDescription(fullText, hasCode);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: description || '正在生成中...' }
              : msg
          ));
        },
        (finalText: string) => {
          fullText = finalText;

          // Final code extraction - only update if there's actually code
          const htmlCode = extractHtmlCode(finalText);
          const hasCode = !!htmlCode;
          if (hasCode) {
            setGeneratedCode(htmlCode);
          }

          // Final description
          const description = extractDescription(finalText, hasCode);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: description || '页面已生成完成！' }
              : msg
          ));
          setIsLoading(false);
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
        generatedCode || undefined // Pass existing code for modifications
      );
    } catch (err) {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setGeneratedCode(newCode);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-neutral-50">
      {/* Chat Section */}
      <div className={`flex-1 flex flex-col ${showPreview ? 'lg:w-1/2 lg:max-w-[600px]' : ''} ${showPreview ? 'lg:border-r lg:border-neutral-200' : ''}`}>
        <div className="flex-1 overflow-y-auto pt-14 lg:pt-8">
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
                      <div className="flex items-center gap-3 px-2 py-1">
                        <div className="relative w-5 h-5">
                          <div className="absolute inset-0 border-2 border-neutral-200 rounded-full"></div>
                          <div className="absolute inset-0 border-2 border-neutral-400 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <span className="text-neutral-500 text-sm">正在生成页面...</span>
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
                placeholder="描述你想要的页面..."
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

      {/* Preview Section */}
      {showPreview && (
        <div className="fixed inset-0 lg:relative lg:flex-1 bg-neutral-50 z-50 lg:z-auto overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-white lg:hidden">
            <h2 className="text-base font-semibold text-neutral-800">页面预览</h2>
            <button
              onClick={() => setShowPreview(false)}
              className="p-2 -mr-2 text-neutral-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-[calc(100vh-60px)] lg:h-full p-4 lg:p-6">
            <div className="hidden lg:flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">页面预览</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                关闭
              </button>
            </div>
            <div className="h-[calc(100%-2rem)] lg:h-full">
              <CodePreview
                code={generatedCode}
                onCodeChange={handleCodeChange}
                loading={isLoading && !generatedCode}
              />
            </div>
          </div>

          <button
            onClick={() => setShowPreview(false)}
            className="lg:hidden fixed bottom-20 right-6 px-4 py-2 bg-neutral-900 text-white text-sm rounded-full shadow-lg"
          >
            返回对话
          </button>
        </div>
      )}

      {/* Show preview button when code is ready but preview is hidden */}
      {generatedCode && !showPreview && (
        <div className="fixed bottom-[76px] right-6 lg:bottom-3 z-40">
          <button
            onClick={() => setShowPreview(true)}
            className="px-5 py-2.5 bg-neutral-900 text-white text-sm rounded-full shadow-lg flex items-center gap-2 hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            查看预览
          </button>
        </div>
      )}
    </div>
  );
}