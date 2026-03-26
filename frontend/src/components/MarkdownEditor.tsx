'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

interface MarkdownEditorProps {
  content: string;
  sessionId?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
}

// Initialize mermaid with colorful theme
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#fff',
      primaryBorderColor: '#2563eb',
      lineColor: '#64748b',
      secondaryColor: '#10b981',
      tertiaryColor: '#f59e0b',
      background: '#f8fafc',
      mainBkg: '#ffffff',
      secondBkg: '#f1f5f9',
      pieTitleText: '#171717',
      pieLegendText: '#171717',
      pie1: '#3b82f6',
      pie2: '#10b981',
      pie3: '#f59e0b',
      pie4: '#ef4444',
      pie5: '#8b5cf6',
      pie6: '#ec4899',
      pie7: '#06b6d4',
      pie8: '#84cc16',
      pie9: '#f97316',
      pie10: '#6366f1',
      pie11: '#14b8a6',
      pie12: '#a855f7',
    },
    pie: {
      textPosition: 0.7,
    },
    securityLevel: 'loose',
  });
}

// Component to render mermaid diagrams
function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const renderMermaid = async () => {
      if (!code || !ref.current) return;

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError('');
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || '图表渲染失败');
      }
    };

    renderMermaid();
  }, [code]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <p className="text-red-600 text-sm">图表渲染错误: {error}</p>
        <pre className="text-xs text-red-500 mt-2 overflow-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="mermaid-container my-6 flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function MarkdownEditor({
  content: initialContent,
  sessionId,
  onSave,
  readOnly = false
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = useCallback(async () => {
    if (!sessionId || isSaving) return;

    setIsSaving(true);
    try {
      const { updateDocument } = await import('@/lib/api');
      await updateDocument(sessionId, content);
      onSave?.(content);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }, [sessionId, content, isSaving, onSave]);

  const handleDownloadMD = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '职业测评报告.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;

    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;

    const element = contentRef.current.cloneNode(true) as HTMLElement;

    // Remove buttons from cloned element
    element.querySelectorAll('button').forEach(btn => btn.remove());

    const opt = {
      margin: [10, 10, 10, 10],
      filename: '职业测评报告.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  if (readOnly || !isEditing) {
    return (
      <div className="relative">
        {!readOnly && (
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-neutral-100">
            <button
              onClick={() => setIsEditing(true)}
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
          </div>
        )}
        <div ref={contentRef} className="markdown-content prose prose-slate max-w-none
          prose-headings:text-neutral-800 prose-headings:font-semibold
          prose-h1:text-2xl prose-h1:border-b prose-h1:border-neutral-200 prose-h1:pb-3 prose-h1:mb-6
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-neutral-600 prose-p:leading-relaxed prose-p:my-4
          prose-strong:text-neutral-800 prose-strong:font-semibold
          prose-li:text-neutral-600 prose-li:my-1
          prose-ul:my-4 prose-ol:my-4
          prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 prose-blockquote:bg-neutral-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:my-4 prose-blockquote:not-italic
          prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-neutral-700 prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-100 prose-pre:text-neutral-900 prose-pre:rounded-lg prose-pre:my-6"
        >
          <ReactMarkdown
            components={{
              code: ({ className, children, ...props }) => {
                const match = /language-mermaid/.exec(className || '');
                if (match) {
                  const code = String(children).replace(/\n$/, '');
                  return <MermaidBlock code={code} />;
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-slate-100 text-neutral-900 rounded-lg p-4 overflow-auto my-6">
                  {children}
                </pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-[500px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-500">编辑模式</span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setContent(initialContent);
              setIsEditing(false);
            }}
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
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[400px] w-full p-4 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm font-mono resize-y"
        placeholder="在此输入 Markdown 内容..."
      />
    </div>
  );
}