'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PageKey } from '@/lib/types';
import { useAppState } from '@/lib/store';
import { PartsLibrary } from '@/components/bom/PartsLibrary';
import { BomManagement } from '@/components/bom/BomManagement';
import { ProductManagement } from '@/components/bom/ProductManagement';
import { QuoteSheet } from '@/components/bom/QuoteSheet';

const NAV_ITEMS: { key: PageKey; label: string; icon: string }[] = [
  { key: 'parts', label: '零件库', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'bom', label: 'BOM管理', icon: 'M4 6h16M4 12h16M4 18h8' },
  { key: 'products', label: '产品管理', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
  { key: 'quotes', label: '报价清单', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function Home() {
  const [activePage, setActivePage] = useState<PageKey>('parts');
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');
  const { state, loading } = useAppState();

  // 检查是否有 localStorage 数据需要迁移
  useEffect(() => {
    const hasLocalData = !!localStorage.getItem('bom-management-system');
    if (hasLocalData) {
      setMigrateMsg('检测到本地数据，建议迁移到MySQL');
    }
  }, []);

  const handlePriceChange = useCallback((partId: string) => {
    setHighlightedPartId(partId);
    setTimeout(() => setHighlightedPartId(null), 2500);
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const localData = localStorage.getItem('bom-management-system');
      if (!localData) {
        setMigrateMsg('没有找到本地数据');
        return;
      }
      const data = JSON.parse(localData);
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await res.json();
      if (result.success) {
        setMigrated(true);
        setMigrateMsg(result.message);
        localStorage.removeItem('bom-management-system');
        // 刷新页面以从 MySQL 重新加载
        window.location.reload();
      } else {
        setMigrateMsg(result.error || '迁移失败');
      }
    } catch (err: any) {
      setMigrateMsg('迁移出错: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">正在加载数据...</span>
          </div>
        </div>
      );
    }
    switch (activePage) {
      case 'parts':
        return <PartsLibrary onPriceChange={handlePriceChange} />;
      case 'bom':
        return <BomManagement highlightedPartId={highlightedPartId} />;
      case 'products':
        return <ProductManagement />;
      case 'quotes':
        return <QuoteSheet />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* 侧边导航 */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-slate-700/50">
          <svg className="w-6 h-6 mr-2.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c.63.63.184 1.707-.707 1.707H5.707c-.891 0-1.336-1.077-.707-1.707l5-5A2 2 0 0010.586 11.172V5l-1-1z" />
          </svg>
          <span className="text-sm font-semibold tracking-wide">BOM管理系统</span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activePage === item.key
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <svg className="w-4.5 h-4.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        {/* 底部信息 */}
        <div className="px-4 py-3 border-t border-slate-700/50 space-y-1">
          <p className="text-xs text-slate-500">数据存储</p>
          <p className="text-xs text-slate-400 font-mono">MySQL 8.0</p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <h1 className="text-base font-semibold text-slate-800">
            {NAV_ITEMS.find(n => n.key === activePage)?.label}
          </h1>
          <div className="flex items-center gap-3">
            {/* 迁移提示 */}
            {migrateMsg && !migrated && (
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {migrating ? (
                  <><div className="w-3 h-3 border border-amber-700 border-t-transparent rounded-full animate-spin" /> 迁移中...</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> 迁移数据到MySQL</>
                )}
              </button>
            )}
            {migrated && (
              <span className="text-xs text-emerald-600 font-medium">✓ 已迁移到MySQL</span>
            )}
            <span className="text-xs text-slate-400 font-mono">v1.0</span>
          </div>
        </header>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}