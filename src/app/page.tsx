'use client';

import { useState, useCallback, useRef } from 'react';
import type { PageKey } from '@/lib/types';
import { useAppState } from '@/lib/store';
import { PartsLibrary } from '@/components/bom/PartsLibrary';
import { BomManagement } from '@/components/bom/BomManagement';
import { ProductManagement } from '@/components/bom/ProductManagement';
import { QuoteSheet } from '@/components/bom/QuoteSheet';
import { LedScreenCost } from '@/components/led/LedScreenCost';
import { generateSampleData } from '@/lib/generate-sample-data';

const NAV_ITEMS: { key: PageKey; label: string; icon: string }[] = [
  { key: 'parts', label: '零件库', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'bom', label: 'BOM管理', icon: 'M4 6h16M4 12h16M4 18h8' },
  { key: 'products', label: '产品管理', icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
  { key: 'quotes', label: '报价清单', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'led', label: 'LED屏成本核算', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

export default function Home() {
  const [activePage, setActivePage] = useState<PageKey>('parts');
  const [highlightedPartId, setHighlightedPartId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, loading, dispatch } = useAppState();

  const handlePriceChange = useCallback((partId: string) => {
    setHighlightedPartId(partId);
    setTimeout(() => setHighlightedPartId(null), 2500);
  }, []);

  const handleGenerateData = () => {
    if (generating) return;
    setGenerating(true);
    setGenMsg('');

    try {
      const sampleData = generateSampleData();
      // 更新状态（自动持久化到 MySQL）
      dispatch({ type: 'LOAD_STATE', payload: sampleData });
      setGenMsg('✓ 示例数据已生成，共 ' + sampleData.parts.length + ' 个零件、' +
        sampleData.assemblies.length + ' 个组件、' +
        sampleData.products.length + ' 个产品');
      // 3秒后清除消息
      setTimeout(() => setGenMsg(''), 3000);
    } catch (err: any) {
      setGenMsg('生成失败: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportData = () => {
    const data = {
      parts: state.parts,
      assemblies: state.assemblies,
      bomEntries: state.bomEntries,
      products: state.products,
      quotes: state.quotes,
      categories: state.categories,
      defaultCoefficients: state.defaultCoefficients,
    };
    const isEmpty = data.parts.length === 0 && data.assemblies.length === 0 && data.products.length === 0;
    if (isEmpty) {
      setGenMsg('没有可导出的数据');
      setTimeout(() => setGenMsg(''), 3000);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bom-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setGenMsg('✓ 数据已导出');
    setTimeout(() => setGenMsg(''), 3000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.parts || !data.assemblies) {
          setGenMsg('文件格式错误，不是有效的BOM数据文件');
          setTimeout(() => setGenMsg(''), 3000);
          return;
        }
        // 更新状态（自动持久化到 MySQL）
        dispatch({ type: 'LOAD_STATE', payload: data });
        setGenMsg('✓ 数据已导入，共 ' + data.parts.length + ' 个零件');
        setTimeout(() => setGenMsg(''), 3000);
      } catch {
        setGenMsg('文件解析失败，请检查文件格式');
        setTimeout(() => setGenMsg(''), 3000);
      }
    };
    reader.readAsText(file);
    // 重置 input 以便重复选择同一文件
    e.target.value = '';
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
      case 'led':
        return <LedScreenCost />;
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
            {/* 导出数据 */}
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" /></svg>
              导出数据
            </button>
            {/* 导入数据 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5-5 5 5M12 4v12" /></svg>
              导入数据
            </button>
            {/* 生成示例数据 */}
            <button
              onClick={handleGenerateData}
              disabled={generating || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <><div className="w-3 h-3 border border-blue-700 border-t-transparent rounded-full animate-spin" /> 生成中...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c.63.63.184 1.707-.707 1.707H5.707c-.891 0-1.336-1.077-.707-1.707l5-5A2 2 0 0010.586 11.172V5l-1-1z" /></svg> 生成示例数据</>
              )}
            </button>
            {genMsg && (
              <span className="text-xs text-emerald-600 font-medium">{genMsg}</span>
            )}
            <span className="text-xs text-slate-400 font-mono">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
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