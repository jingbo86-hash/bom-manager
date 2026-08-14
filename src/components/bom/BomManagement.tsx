'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, generateAssemblyCode, calculateAssemblyCost, buildBomTree, wouldExceedMaxDepth } from '@/lib/bom-utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  highlightedPartId: string | null;
}

export function BomManagement({ highlightedPartId }: Props) {
  const { state, dispatch } = useAppState();
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [assemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);
  const [assemblyForm, setAssemblyForm] = useState({ code: '', name: '', description: '' });
  const [entryForm, setEntryForm] = useState({
    childId: '',
    childType: 'part' as 'part' | 'assembly',
    quantity: 1,
    wasteRate: 0,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'assembly' | 'entry'; id: string } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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
    setAssemblyForm({ code: generateAssemblyCode(state.assemblies), name: '', description: '' });
    setAssemblyDialogOpen(true);
  };

  const openEditAssembly = (asm: Assembly) => {
    setEditingAssembly(asm);
    setAssemblyForm({ code: asm.code, name: asm.name, description: asm.description });
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
    setEntryForm({ childId: '', childType: 'part', quantity: 1, wasteRate: 0 });
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = () => {
    if (!selectedAssemblyId || !entryForm.childId) return;
    if (entryForm.childType === 'assembly' && wouldExceedMaxDepth(
      selectedAssemblyId, entryForm.childId, 'assembly', state.bomEntries
    )) {
      alert('添加此条目将超过最大10层深度限制');
      return;
    }
    const entry: BomEntry = {
      id: generateId(),
      parentId: selectedAssemblyId,
      childId: entryForm.childId,
      childType: entryForm.childType,
      quantity: entryForm.quantity,
      wasteRate: entryForm.wasteRate,
    };
    dispatch({ type: 'ADD_BOM_ENTRY', payload: entry });
    setEntryDialogOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    dispatch({ type: 'DELETE_BOM_ENTRY', payload: id });
    setDeleteConfirm(null);
  };

  // 可选的子件列表
  const availableChildren = useMemo(() => {
    if (!selectedAssemblyId) return { parts: state.parts, assemblies: [] as Assembly[] };
    const usedChildIds = new Set(directEntries.map(e => e.childId));
    return {
      parts: state.parts.filter(p => !usedChildIds.has(p.id)),
      assemblies: state.assemblies.filter(a => a.id !== selectedAssemblyId && !usedChildIds.has(a.id)),
    };
  }, [state.parts, state.assemblies, directEntries, selectedAssemblyId]);

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
            <span>x{node.quantity}</span>
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
                      <p className="text-sm font-medium text-slate-800 truncate">{asm.name}</p>
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
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openAddEntry} className="bg-blue-600 hover:bg-blue-700 h-8">
                <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                添加子件
              </Button>
              <Button size="sm" variant="outline" onClick={expandAll} className="h-8">全部展开</Button>
              <Button size="sm" variant="outline" onClick={collapseAll} className="h-8">全部折叠</Button>
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
                          <td className="px-4 py-2 text-right font-mono">{entry.quantity}</td>
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

      {/* 添加子件对话框 */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>添加子件到 {selectedAssembly?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">子件类型</Label>
              <Select
                value={entryForm.childType}
                onValueChange={v => setEntryForm(f => ({ ...f, childType: v as 'part' | 'assembly', childId: '' }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part">零件</SelectItem>
                  <SelectItem value="assembly">组件/半成品</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">选择子件</Label>
              <Select value={entryForm.childId} onValueChange={v => setEntryForm(f => ({ ...f, childId: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="请选择..." />
                </SelectTrigger>
                <SelectContent>
                  {entryForm.childType === 'part' ? (
                    availableChildren.parts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        [{p.code}] {p.name} (¥{p.price.toFixed(2)})
                      </SelectItem>
                    ))
                  ) : (
                    availableChildren.assemblies.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        [{a.code}] {a.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {entryForm.childType === 'part' && availableChildren.parts.length === 0 && (
                <p className="text-xs text-slate-400">所有零件已添加或零件库为空</p>
              )}
              {entryForm.childType === 'assembly' && availableChildren.assemblies.length === 0 && (
                <p className="text-xs text-slate-400">无可用组件</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">用量</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={entryForm.quantity}
                  onChange={e => setEntryForm(f => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">损耗率(%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={entryForm.wasteRate * 100 || ''}
                  onChange={e => setEntryForm(f => ({ ...f, wasteRate: Math.min(100, parseFloat(e.target.value) || 0) / 100 }))}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEntryDialogOpen(false)}>取消</Button>
            <Button
              size="sm"
              onClick={handleSaveEntry}
              disabled={!entryForm.childId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
