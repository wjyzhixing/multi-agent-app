'use client';

import { useState, useRef, useEffect } from 'react';

interface CodePreviewProps {
  code: string;
  onCodeChange?: (code: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function CodePreview({ code, onCodeChange, onRefresh, loading = false }: CodePreviewProps) {
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [editableCode, setEditableCode] = useState(code);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update editable code when prop changes
  useEffect(() => {
    setEditableCode(code);
  }, [code]);

  // Force iframe refresh when switching to preview mode
  useEffect(() => {
    if (mode === 'preview') {
      setIframeKey(prev => prev + 1);
    }
  }, [mode]);

  const handleDownload = () => {
    const blob = new Blob([editableCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'page.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableCode);
      alert('代码已复制到剪贴板');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCodeEdit = (newCode: string) => {
    setEditableCode(newCode);
    onCodeChange?.(newCode);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Refresh iframe when entering/exiting fullscreen
      if (mode === 'preview') {
        setIframeKey(prev => prev + 1);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [mode]);

  // Extract code from markdown code block if present
  const extractCode = (rawCode: string): string => {
    const match = rawCode.match(/```html\n([\s\S]*?)```/);
    return match ? match[1].trim() : rawCode;
  };

  const displayCode = mode === 'code' ? editableCode : extractCode(editableCode);
  const previewCode = extractCode(editableCode);

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              mode === 'preview'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setMode('code')}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              mode === 'code'
                ? 'bg-neutral-900 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            代码
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
              title="刷新预览"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
            title="复制代码"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-full hover:bg-neutral-800 transition-colors"
          >
            下载
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-neutral-900 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-neutral-500 text-sm">正在生成页面...</p>
            </div>
          </div>
        ) : null}

        {mode === 'preview' ? (
          <iframe
            key={iframeKey}
            srcDoc={previewCode}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
          />
        ) : (
          <textarea
            value={displayCode}
            onChange={(e) => handleCodeEdit(e.target.value)}
            className="w-full h-full p-4 text-xs font-mono text-neutral-700 bg-neutral-50 resize-none focus:outline-none"
            placeholder="HTML代码将显示在这里..."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}