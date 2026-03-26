'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Don't show sidebar on login/register pages
  const showSidebar = pathname !== '/login' && pathname !== '/register';

  // Load collapse state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapse state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  return (
    <div className="flex h-screen">
      {showSidebar && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      )}
      <main
        className={`flex-1 min-h-screen transition-all duration-300 overflow-hidden ${
          showSidebar
            ? isSidebarCollapsed
              ? 'lg:ml-16'
              : 'lg:ml-60'
            : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}