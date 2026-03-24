'use client';

import { useState, useRef, useEffect } from 'react';
import { streamChat, Message } from '@/lib/api';

interface ChatInterfaceProps {
  agentType: 'psychological' | 'aiTools';
  placeholder?: string;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function ChatInterface({
  agentType,
  placeholder = '说点什么...'
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        agentType,
        userMessage.content,
        (chunk: string) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ));
        },
        (fullText: string) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullText }
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
        }
      );
    } catch (err) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50">
      <div className="flex-1 overflow-y-auto pt-14 lg:pt-8">
        <div className="max-w-2xl mx-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-neutral-400 text-sm">开始聊天吧</p>
            </div>
          )}

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
              placeholder={placeholder}
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
  );
}
