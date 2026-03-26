'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  getCareerJobExtension,
  streamCareerJobChat,
  saveCareerJobExtension,
  CareerJobExtension
} from '@/lib/api';

interface CareerJobDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  jobTitle: string;
  reportContent: string;
  token?: string;
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function CareerJobDrawer({
  isOpen,
  onClose,
  sessionId,
  jobTitle,
  reportContent,
  token
}: CareerJobDrawerProps) {
  const [content, setContent] = useState('');
  const [conversations, setConversations] = useState<Array<{ user: string; assistant: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 加载已保存的扩展内容
  useEffect(() => {
    if (isOpen && sessionId && jobTitle) {
      loadExtension();
    }
  }, [isOpen, sessionId, jobTitle]);

  const loadExtension = async () => {
    const extension = await getCareerJobExtension(sessionId, jobTitle, token);
    if (extension) {
      setContent(extension.content);
      setConversations(extension.conversations);
    } else {
      setContent('');
      setConversations([]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // 保存当前内容用于传递给后端
    const currentContent = content;

    // 添加临时消息
    setConversations(prev => [...prev, { user: userMessage, assistant: '' }]);

    await streamCareerJobChat(
      sessionId,
      jobTitle,
      userMessage,
      conversations,
      currentContent, // 传递当前内容
      (chunk) => {
        setConversations(prev => {
          const newConv = [...prev];
          const lastConv = newConv[newConv.length - 1];
          if (lastConv) {
            lastConv.assistant += chunk;
          }
          return newConv;
        });
      },
      (fullText) => {
        setConversations(prev => {
          const newConv = [...prev];
          const lastConv = newConv[newConv.length - 1];
          if (lastConv) {
            lastConv.assistant = fullText;
          }
          return newConv;
        });
        // 追加新内容到原有内容后面
        setContent(prev => prev ? `${prev}\n\n---\n\n${fullText}` : fullText);
        setIsLoading(false);
      },
      (error) => {
        console.error('Chat error:', error);
        setIsLoading(false);
      },
      token
    );
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveCareerJobExtension(sessionId, jobTitle, editContent, conversations, token);
      setContent(editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, jobTitle, editContent, conversations, token, isSaving]);

  const handleDownloadMD = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobTitle}-职业扩展详情.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;

    const element = contentRef.current.cloneNode(true) as HTMLElement;
    element.querySelectorAll('button').forEach(btn => btn.remove());

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${jobTitle}-职业扩展详情.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // 开始新对话生成扩展
  const startNewExtension = () => {
    // 直接触发对话
    const message = '请为我详细分析这个职业方向，包括发展前景、技能要求、入门路径、薪资水平和具体行动建议。';
    setInput('');
    setIsLoading(true);

    // 添加临时消息
    setConversations(prev => [...prev, { user: message, assistant: '' }]);

    streamCareerJobChat(
      sessionId,
      jobTitle,
      message,
      [],
      '', // 初始没有内容
      (chunk) => {
        setConversations(prev => {
          const newConv = [...prev];
          const lastConv = newConv[newConv.length - 1];
          if (lastConv) {
            lastConv.assistant += chunk;
          }
          return newConv;
        });
      },
      (fullText) => {
        setConversations(prev => {
          const newConv = [...prev];
          const lastConv = newConv[newConv.length - 1];
          if (lastConv) {
            lastConv.assistant = fullText;
          }
          return newConv;
        });
        setContent(fullText);
        setIsLoading(false);
      },
      (error) => {
        console.error('Chat error:', error);
        setIsLoading(false);
      },
      token
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-4xl bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{jobTitle}</h2>
              <p className="text-xs text-neutral-500">职业扩展详情</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：扩展内容 */}
          <div className="flex-1 flex flex-col border-r border-neutral-100">
            {content ? (
              <>
                {/* 工具栏 */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-neutral-100">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditContent(content);
                          setIsEditing(true);
                        }}
                        className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full hover:bg-neutral-800 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={handleDownloadMD}
                        className="px-3 py-1.5 bg-neutral-100 text-neutral-700 text-xs rounded-full hover:bg-neutral-200 transition-colors"
                      >
                        下载 MD
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="px-3 py-1.5 bg-neutral-100 text-neutral-700 text-xs rounded-full hover:bg-neutral-200 transition-colors"
                      >
                        导出 PDF
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1.5 bg-neutral-200 text-neutral-700 text-xs rounded-full hover:bg-neutral-300 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? '保存中...' : '保存'}
                      </button>
                    </>
                  )}
                </div>

                {/* 内容显示/编辑 */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full min-h-[400px] p-4 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm font-mono resize-none"
                      placeholder="编辑内容..."
                    />
                  ) : (
                    <div
                      ref={contentRef}
                      className="markdown-content prose prose-slate max-w-none
                        prose-headings:text-neutral-800 prose-headings:font-semibold
                        prose-h1:text-2xl prose-h1:border-b prose-h1:border-neutral-200 prose-h1:pb-3 prose-h1:mb-6
                        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
                        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                        prose-p:text-neutral-600 prose-p:leading-relaxed prose-p:my-4
                        prose-strong:text-neutral-800 prose-strong:font-semibold
                        prose-li:text-neutral-600 prose-li:my-1
                        prose-ul:my-4 prose-ol:my-4"
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >{content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </>
            ) : isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-neutral-900 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-neutral-500 text-sm">正在生成扩展内容...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-neutral-500 text-sm mb-4">还没有生成扩展内容</p>
                  <button
                    onClick={startNewExtension}
                    className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    开始生成
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 右侧：对话区 */}
          <div className="w-80 flex flex-col bg-neutral-50">
            <div className="px-4 py-3 border-b border-neutral-200 bg-white">
              <h3 className="text-sm font-medium text-neutral-700">对话记录</h3>
              <p className="text-xs text-neutral-400 mt-0.5">通过对话修改和完善内容</p>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversations.map((conv, index) => (
                <div key={index} className="space-y-2">
                  <div className="bg-white rounded-lg p-3 text-sm text-neutral-700 border border-neutral-200">
                    {conv.user}
                  </div>
                  {conv.assistant && (
                    <div className="bg-neutral-900 text-white rounded-lg p-3 text-sm">
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{conv.assistant}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && conversations.length > 0 && !conversations[conversations.length - 1].assistant && (
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="p-4 border-t border-neutral-200 bg-white">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入问题继续完善..."
                  className="flex-1 px-3 py-2 bg-neutral-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}