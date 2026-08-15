'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, generateAssemblyCode, calculateAssemblyCost, buildBomTree } from '@/lib/bom-utils';
import type { Assembly, BomEntry, BomTreeNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiSelectEntryDialog } from './MultiSelectEntryDialog';

interface Props {
  highlightedPartId: string | null;
}

export function BomManagement({ highlightedPartId }: Props) {
  const { state, dispatch } = useAppState();
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [assemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);
  const [assemblyForm, setAssemblyForm] = useState<{ code: string; name: string; description: string; type: 'finished' | 'semi-finished' }>({ code: '', name: '', description: '', type: 'semi-finished' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'assembly' | 'entry'; id: string } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState<string>('');

  const selectedAssembly = useMemo(
    () => state.assemblies.find(a => a.id === selectedAssemblyId),
    [state.assemblies, selectedAssemblyId]
  );

  // 构建选中组件的BOM树
  const bomTree = useMemo(() => {
    if (!selectedAssemblyId) return null;
    // 收集所有需要高亮的ID
    const highlightedIds = new Set<string>();
    if (highlightedPartId) {
      highlightedIds.add(highlightedPartId);
      // 向上追溯受影响的组件
      const findParents = (childId: string) => {
        state.bomEntries
          .filter(b => b.childId === childId)
          .forEach(b => {
            highlightedIds.add(b.parentId);
            if (b.childType === 'assembly') findParents(b.parentId);
          });
      };
      findParents(highlightedPartId);
    }
    return buildBomTree(
      selectedAssemblyId, 'assembly',
      state.parts, state.assemblies, state.bomEntries,
      highlightedIds.size > 0 ? highlightedIds : undefined
    );
  }, [selectedAssemblyId, state, highlightedPartId]);

  // 当前组件的直接子条目
  const directEntries = useMemo(
    () => state.bomEntries.filter(b => b.parentId === selectedAssemblyId),
    [state.bomEntries, selectedAssemblyId]
  );

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!bomTree) return;
    const allIds = new Set<string>();
    const collect = (node: BomTreeNode) => {
      if (node.children.length > 0) {
        allIds.add(node.id);
        node.children.forEach(collect);
      }
    };
    collect(bomTree);
    setExpandedNodes(allIds);
  }, [bomTree]);

  const collapseAll = useCallback(() => setExpandedNodes(new Set()), []);

  // 组件 CRUD
  const openAddAssembly = () => {
    setEditingAssembly(null);
    setAssemblyForm({ code: generateAssemblyCode(state.assemblies), name: '', description: '', type: 'semi-finished' });
    setAssemblyDialogOpen(true);
  };

  const openEditAssembly = (asm: Assembly) => {
    setEditingAssembly(asm);
    setAssemblyForm({ code: asm.code, name: asm.name, description: asm.description, type: asm.type || 'semi-finished' });
    setAssemblyDialogOpen(true);
  };

  const handleSaveAssembly = () => {
    if (!assemblyForm.code.trim() || !assemblyForm.name.trim()) return;
    const now = Date.now();
    if (editingAssembly) {
      dispatch({
        type: 'UPDATE_ASSEMBLY',
        payload: { ...editingAssembly, ...assemblyForm, updatedAt: now },
      });
    } else {
      const newAsm: Assembly = {
        id: generateId(),
        ...assemblyForm,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_ASSEMBLY', payload: newAsm });
      setSelectedAssemblyId(newAsm.id);
    }
    setAssemblyDialogOpen(false);
  };

  const handleDeleteAssembly = (id: string) => {
    dispatch({ type: 'DELETE_ASSEMBLY', payload: id });
    if (selectedAssemblyId === id) setSelectedAssemblyId(null);
    setDeleteConfirm(null);
  };

  // BOM 条目 CRUD
  const openAddEntry = () => {
    setEntryDialogOpen(true);
  };

  const handleAddEntries = (entries: BomEntry[]) => {
    entries.forEach(entry => dispatch({ type: 'ADD_BOM_ENTRY', payload: entry }));
  };

  const handleDeleteEntry = (id: string) => {
    dispatch({ type: 'DELETE_BOM_ENTRY', payload: id });
    setDeleteConfirm(null);
  };

  const [editingEntry, setEditingEntry] = useState<{ id: string; quantity: number; wasteRate: number } | null>(null);

  const handleUpdateEntry = (id: string, quantity: number, wasteRate: number) => {
    const entry = state.bomEntries.find(b => b.id === id);
    if (entry) {
      dispatch({ type: 'UPDATE_BOM_ENTRY', payload: { ...entry, quantity, wasteRate } });
    }
  };

  // BOM导出
  const handleExportBom = () => {
    if (!selectedAssembly) return;
    const rows: string[][] = [['层级', '类型', '编号', '名称', '规格', '用量', '单价', '小计']];
    const flattenTree = (node: BomTreeNode, depth: number) => {
      const type = node.type === 'assembly' ? '组件' : '零件';
      const spec = node.type === 'part' ? (state.parts.find(p => p.id === node.id)?.spec || '') : '';
      const price = node.type === 'part' ? (state.parts.find(p => p.id === node.id)?.price || 0) : 0;
      rows.push([String(depth), type, node.code, node.name, spec, String(node.quantity), String(price), String(node.totalCost || 0)]);
      node.children.forEach(child => flattenTree(child, depth + 1));
    };
    if (bomTree) flattenTree(bomTree, 0);
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedAssembly.name}_BOM.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BOM导入
  const handleImportBom = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      if (json.length < 2) return;
      const headers = json[0].map(h => String(h).trim());
      const nameIdx = headers.findIndex(h => h.includes('名称'));
      const codeIdx = headers.findIndex(h => h.includes('编号'));
      const quantityIdx = headers.findIndex(h => h.includes('用量'));
      if (nameIdx === -1) return alert('未找到"名称"列');
      for (let i = 1; i < json.length; i++) {
        const row = json[i] as string[];
        if (!row[nameIdx]?.trim()) continue;
        const childName = String(row[nameIdx]).trim();
        const childCode = codeIdx > -1 ? String(row[codeIdx] || '').trim() : '';
        const quantity = quantityIdx > -1 ? parseFloat(String(row[quantityIdx] || '1')) || 1 : 1;
        // 查找零件或组件
        const part = state.parts.find(p => p.name === childName || p.code === childCode);
        if (part) {
          dispatch({
            type: 'ADD_BOM_ENTRY',
            payload: {
              id: generateId(), parentId: selectedAssemblyId!, childId: part.id,
              childType: 'part' as const, quantity, wasteRate: 0,
            },
          });
        } else {
          const asm = state.assemblies.find(a => a.name === childName);
          if (asm) {
            dispatch({
              type: 'ADD_BOM_ENTRY',
              payload: {
                id: generateId(), parentId: selectedAssemblyId!, childId: asm.id,
                childType: 'assembly' as const, quantity, wasteRate: 0,
              },
            });
          }
        }
      }
      alert('导入完成');
    };
    input.click();
  };

  // 渲染树节点
  const renderTreeNode = (node: BomTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isHighlighted = node.isHighlighted;

    return (
      <div key={node.id + depth} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-sm transition-all duration-300 ${
            isHighlighted ? 'animate-cost-pulse' : ''
          } ${node.type === 'assembly' ? 'font-medium' : ''}`}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-0.5 rounded hover:bg-slate-100 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-4.5" />
          )}

          {/* 类型图标 */}
          {node.type === 'part' ? (
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
            </svg>
          )}

          {/* 信息 */}
          <span className="font-mono text-xs text-slate-400">{node.code}</span>
          <span className={node.type === 'assembly' ? 'text-blue-700' : 'text-slate-700'}>{node.name}</span>

          {/* 数量和损耗 */}
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-3">
            <span>x{node.quantity.toFixed(1)}</span>
            {node.wasteRate > 0 && <span className="text-orange-500">+{(node.wasteRate * 100).toFixed(1)}%</span>}
            <span className="font-mono text-amber-600 font-medium min-w-[70px] text-right">
              ¥{node.totalCost.toFixed(2)}
            </span>
          </span>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-[9px]">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-5 h-full">
      {/* 左侧：组件列表 */}
      <div className="w-72 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">组件/半成品</h3>
          <Button size="sm" variant="outline" onClick={openAddAssembly} className="h-7 text-xs">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新建
          </Button>
        </div>

        <div className="space-y-1">
          {state.assemblies.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">暂无组件，点击"新建"创建</p>
          ) : (
            state.assemblies.map(asm => {
              const cost = calculateAssemblyCost(asm.id, state.parts, state.assemblies, state.bomEntries);
              const childCount = state.bomEntries.filter(b => b.parentId === asm.id).length;
              return (
                <div
                  key={asm.id}
                  onClick={() => setSelectedAssemblyId(asm.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAssemblyId === asm.id
                      ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-blue-600 font-medium">{asm.code}</p>
                      <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-1.5">
                        {asm.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          asm.type === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {asm.type === 'finished' ? '成品' : '半成品'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-0.5 ml-2 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); openEditAssembly(asm); }}
                        className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'assembly', id: asm.id }); }}
                        className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span>{childCount} 个子件</span>
                    <span className="font-mono text-amber-600 font-medium">¥{cost.toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 右侧：BOM树和条目管理 */}
      <div className="flex-1 min-w-0 space-y-4">
        {selectedAssembly ? (
          <>
            {/* 组件信息头 */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-blue-600 font-medium">{selectedAssembly.code}</span>
                    <span className="text-base font-semibold">{selectedAssembly.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedAssembly.type === 'finished' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedAssembly.type === 'finished' ? '成品' : '半成品'}
                    </span>
                  </div>
                  {selectedAssembly.description && (
                    <p className="text-sm text-slate-500 mt-1">{selectedAssembly.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">组件总成本</p>
                  <p className="text-xl font-mono font-bold text-amber-600">
                    ¥{bomTree?.totalCost.toFixed(2) ?? '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* 操作栏 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={openAddEntry} className="bg-blue-600 hover:bg-blue-700 h-8">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                添加子件
              </Button>
              <Button size="sm" variant="outline" onClick={expandAll} className="h-8">全部展开</Button>
              <Button size="sm" variant="outline" onClick={collapseAll} className="h-8">全部折叠</Button>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleExportBom} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                导出BOM
              </Button>
              <Button size="sm" variant="outline" onClick={handleImportBom} className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                导入BOM
              </Button>
            </div>

            {/* BOM 树 */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              {bomTree ? (
                <div>
                  {/* 根节点 */}
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                    </svg>
                    <span className="font-mono text-xs text-blue-600">{bomTree.code}</span>
                    <span className="font-semibold text-blue-700">{bomTree.name}</span>
                    <span className="ml-auto font-mono text-amber-600 font-bold">¥{bomTree.totalCost.toFixed(2)}</span>
                  </div>
                  {bomTree.children.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无子件，点击"添加子件"开始构建BOM</p>
                  ) : (
                    bomTree.children.map(child => renderTreeNode(child, 0))
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-6 text-center">无法构建BOM树</p>
              )}
            </div>

            {/* 条目列表 */}
            {directEntries.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-600">直接子件列表</h4>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">类型</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">编号</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">名称</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">规格型号</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">用量</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">损耗率</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">小计</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {directEntries.map(entry => {
                      const child = entry.childType === 'part'
                        ? state.parts.find(p => p.id === entry.childId)
                        : state.assemblies.find(a => a.id === entry.childId);
                      const unitCost = entry.childType === 'part'
                        ? (child ? (child as { price: number }).price : 0)
                        : calculateAssemblyCost(entry.childId, state.parts, state.assemblies, state.bomEntries);
                      const subtotal = unitCost * entry.quantity * (1 + entry.wasteRate);

                      return (
                        <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                              entry.childType === 'part'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}>
                              {entry.childType === 'part' ? '零件' : '组件'}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-slate-500">{child?.code ?? '-'}</td>
                          <td className="px-4 py-2">{child?.name ?? '-'}</td>
                          <td className="px-4 py-2 text-slate-500 text-sm">
                            {entry.childType === 'part'
                              ? (child as { spec?: string })?.spec || '-'
                              : (child as { description?: string })?.description || '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editingEntry?.id === entry.id ? editingEntry.quantity : entry.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setEditingEntry({ id: entry.id, quantity: val, wasteRate: entry.wasteRate });
                              }}
                              onBlur={() => {
                                if (editingEntry?.id === entry.id) {
                                  handleUpdateEntry(entry.id, editingEntry.quantity, entry.wasteRate);
                                  setEditingEntry(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                                if (e.key === 'Escape') {
                                  setEditingEntry(null);
                                }
                              }}
                              className="w-20 text-right font-mono px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-orange-500">
                            {entry.wasteRate > 0 ? `${(entry.wasteRate * 100).toFixed(1)}%` : '-'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-amber-600 font-medium">
                            ¥{subtotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => setDeleteConfirm({ type: 'entry', id: entry.id })}
                              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h8" />
              </svg>
              <p className="text-sm text-slate-400">选择左侧组件查看BOM结构</p>
              <p className="text-xs text-slate-300 mt-1">或创建新组件开始</p>
            </div>
          </div>
        )}
      </div>

      {/* 组件对话框 */}
      <Dialog open={assemblyDialogOpen} onOpenChange={setAssemblyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingAssembly ? '编辑组件' : '新建组件'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">组件编号 <span className="text-red-500">*</span></Label>
              <Input
                value={assemblyForm.code}
                onChange={e => setAssemblyForm(f => ({ ...f, code: e.target.value }))}
                placeholder="如: ASM-000001"
                className="h-9 font-mono text-xs"
                disabled={!editingAssembly}
              />
              {!editingAssembly && (
                <p className="text-[10px] text-slate-400">自动生成，不可修改</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">组件名称 <span className="text-red-500">*</span></Label>
              <Input
                value={assemblyForm.name}
                onChange={e => setAssemblyForm(f => ({ ...f, name: e.target.value }))}
                placeholder="组件名称"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类型</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssemblyForm(f => ({ ...f, type: 'semi-finished' }))}
                  className={`flex-1 h-9 text-sm rounded-md border transition-colors ${
                    assemblyForm.type === 'semi-finished'
                      ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  半成品
                </button>
                <button
                  type="button"
                  onClick={() => setAssemblyForm(f => ({ ...f, type: 'finished' }))}
                  className={`flex-1 h-9 text-sm rounded-md border transition-colors ${
                    assemblyForm.type === 'finished'
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700 font-medium'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  成品
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Input
                value={assemblyForm.description}
                onChange={e => setAssemblyForm(f => ({ ...f, description: e.target.value }))}
                placeholder="组件描述"
                className="h-9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAssemblyDialogOpen(false)}>取消</Button>
            <Button
              size="sm"
              onClick={handleSaveAssembly}
              disabled={!assemblyForm.code.trim() || !assemblyForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingAssembly ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 多选添加子件对话框 */}
      {selectedAssembly && (
        <MultiSelectEntryDialog
          open={entryDialogOpen}
          onOpenChange={setEntryDialogOpen}
          parentAssembly={selectedAssembly}
          onConfirm={handleAddEntries}
        />
      )}

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            {deleteConfirm?.type === 'assembly'
              ? '确定要删除此组件吗？其下所有BOM条目和子组件也会被移除。此操作不可撤销。'
              : '确定要移除此子件吗？'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (deleteConfirm?.type === 'assembly') handleDeleteAssembly(deleteConfirm.id);
                else if (deleteConfirm?.type === 'entry') handleDeleteEntry(deleteConfirm.id);
              }}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
