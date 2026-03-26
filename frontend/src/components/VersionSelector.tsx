'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PageVersion, getPageVersions, getPageVersion } from '@/lib/api';

interface VersionSelectorProps {
  sessionId?: string;
  currentVersion?: number;
  onSelectVersion: (code: string, version: number) => void;
  token?: string;
}

export interface VersionSelectorRef {
  refresh: () => void;
}

const VersionSelector = forwardRef<VersionSelectorRef, VersionSelectorProps>(({
  sessionId,
  currentVersion,
  onSelectVersion,
  token
}, ref) => {
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadVersions = async () => {
    if (!sessionId) return;
    setLoading(true);
    const data = await getPageVersions(sessionId, token);
    setVersions(data);
    setLoading(false);
  };

  useImperativeHandle(ref, () => ({
    refresh: loadVersions
  }));

  useEffect(() => {
    if (sessionId) {
      loadVersions();
    } else {
      setVersions([]);
    }
  }, [sessionId, token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectVersion = async (version: number) => {
    if (!sessionId) return;
    const data = await getPageVersion(sessionId, version, token);
    if (data) {
      onSelectVersion(data.code, version);
    }
    setIsOpen(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!sessionId || versions.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-full transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        v{currentVersion || versions[0]?.version}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
          <div className="px-3 py-1.5 text-xs font-medium text-neutral-400 border-b border-neutral-100">
            版本历史
          </div>
          {loading ? (
            <div className="px-3 py-2 text-xs text-neutral-400">加载中...</div>
          ) : (
            versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVersion(v.version)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  v.version === currentVersion
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <span>v{v.version}</span>
                <span className="text-xs text-neutral-400">{formatDate(v.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});

VersionSelector.displayName = 'VersionSelector';

export default VersionSelector;