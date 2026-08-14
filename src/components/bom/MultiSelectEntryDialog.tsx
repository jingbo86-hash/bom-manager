'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, calculateAssemblyCost, wouldExceedMaxDepth } from '@/lib/bom-utils';
import type { Assembly, Part, BomEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface SelectedItem {
  id: string;
  type: 'part' | 'assembly';
  quantity: number;
  wasteRate: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAssembly: Assembly;
  onConfirm: (entries: BomEntry[]) => void;
}

export function MultiSelectEntryDialog({ open, onOpenChange, parentAssembly, onConfirm }: Props) {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<'part' | 'assembly'>('part');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const leftListRef = useRef<HTMLDivElement>(null);
  const rightListRef = useRef<HTMLDivElement>(null);

  // 获取已使用的子件ID
  const usedChildIds = useMemo(() => {
    return new Set(
      state.bomEntries
        .filter(b => b.parentId === parentAssembly.id)
        .map(b => b.childId)
    );
  }, [state.bomEntries, parentAssembly.id]);

  // 获取所有祖先ID（用于避免循环引用）
  const ancestorIds = useMemo(() => {
    const ids = new Set<string>();
    ids.add(parentAssembly.id);
    const findAncestors = (asmId: string) => {
      state.bomEntries
        .filter(b => b.childId === asmId && b.childType === 'assembly')
        .forEach(b => {
          if (!ids.has(b.parentId)) {
            ids.add(b.parentId);
            findAncestors(b.parentId);
          }
        });
    };
    findAncestors(parentAssembly.id);
    return ids;
  }, [state.bomEntries, parentAssembly.id]);

  // 可用的零件列表
  const availableParts = useMemo(() => {
    let list = state.parts.filter(p => !usedChildIds.has(p.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.spec.toLowerCase().includes(q) ||
        (p.supplier && p.supplier.toLowerCase().includes(q))
      );
    }
    return list;
  }, [state.parts, usedChildIds, searchQuery]);

  // 可用的组件列表
  const availableAssemblies = useMemo(() => {
    let list = state.assemblies.filter(a =>
      a.id !== parentAssembly.id &&
      !usedChildIds.has(a.id) &&
      !ancestorIds.has(a.id)
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.assemblies, parentAssembly.id, usedChildIds, ancestorIds, searchQuery]);

  const currentList = activeTab === 'part' ? availableParts : availableAssemblies;

  const isSelected = useCallback((id: string) => {
    return selected.some(s => s.id === id);
  }, [selected]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const exists = prev.find(s => s.id === id);
      if (exists) {
        return prev.filter(s => s.id !== id);
      }
      return [...prev, { id, type: activeTab, quantity: 1, wasteRate: 0 }];
    });
  }, [activeTab]);

  const toggleSelectAll = useCallback(() => {
    const currentIds = new Set(currentList.map(i => i.id));
    const allSelected = currentList.every(i => isSelected(i.id));
    if (allSelected) {
      setSelected(prev => prev.filter(s => !currentIds.has(s.id)));
    } else {
      setSelected(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newItems: SelectedItem[] = currentList
          .filter(i => !existingIds.has(i.id))
          .map(i => ({ id: i.id, type: activeTab, quantity: 1, wasteRate: 0 }));
        return [...prev, ...newItems];
      });
    }
  }, [currentList, isSelected, activeTab]);

  const allVisibleSelected = currentList.length > 0 && currentList.every(i => isSelected(i.id));
  const someVisibleSelected = currentList.some(i => isSelected(i.id));

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setSelected(prev => prev.map(s =>
      s.id === id ? { ...s, quantity: Math.max(1, quantity) } : s
    ));
  }, []);

  const updateWasteRate = useCallback((id: string, wasteRate: number) => {
    setSelected(prev => prev.map(s =>
      s.id === id ? { ...s, wasteRate: Math.min(100, Math.max(0, wasteRate)) / 100 } : s
    ));
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  }, []);

  const getItemLabel = useCallback((id: string, type: 'part' | 'assembly') => {
    if (type === 'part') {
      const p = state.parts.find(p => p.id === id);
      return p ? `[${p.code}] ${p.name}` : '未知零件';
    }
    const a = state.assemblies.find(a => a.id === id);
    return a ? `[${a.code}] ${a.name}` : '未知组件';
  }, [state.parts, state.assemblies]);

  const getPartPrice = useCallback((id: string) => {
    const p = state.parts.find(p => p.id === id);
    return p?.price ?? 0;
  }, [state.parts]);

  const getAssemblyCost = useCallback((id: string) => {
    return calculateAssemblyCost(id, state.parts, state.assemblies, state.bomEntries);
  }, [state.parts, state.assemblies, state.bomEntries]);

  const validateDepth = useCallback((selectedItems: SelectedItem[]): boolean => {
    const assemblyItems = selectedItems.filter(s => s.type === 'assembly');
    if (assemblyItems.length === 0) return true;
    return assemblyItems.every(item =>
      !wouldExceedMaxDepth(parentAssembly.id, item.id, 'assembly', state.bomEntries)
    );
  }, [parentAssembly.id, state.bomEntries]);

  const handleConfirm = () => {
    if (selected.length === 0) return;

    if (!validateDepth(selected)) {
      alert('部分子件添加后将超过最大10层深度限制，请检查');
      return;
    }

    const entries: BomEntry[] = selected.map(s => ({
      id: generateId(),
      parentId: parentAssembly.id,
      childId: s.id,
      childType: s.type,
      quantity: s.quantity,
      wasteRate: s.wasteRate,
    }));

    onConfirm(entries);
    setSelected([]);
    setSearchQuery('');
    setActiveTab('part');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelected([]);
    setSearchQuery('');
    setActiveTab('part');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>添加子件到 {parentAssembly.name}</DialogTitle>
          <DialogDescription>从列表中选择零件或组件，支持多选批量添加</DialogDescription>
        </DialogHeader>

        {/* Tab 切换 */}
        <div className="flex-shrink-0">
          <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as 'part' | 'assembly'); setSearchQuery(''); }}>
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="part">零件</TabsTrigger>
              <TabsTrigger value="assembly">组件</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 搜索 + 全选 */}
        <div className="flex-shrink-0 flex items-center gap-3 mt-2">
          <Input
            placeholder="搜索编号/名称/规格..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Checkbox
            id="select-all"
            checked={allVisibleSelected}
            onCheckedChange={toggleSelectAll}
            className={someVisibleSelected && !allVisibleSelected ? 'data-[state=checked]:bg-blue-500' : ''}
          />
          <label htmlFor="select-all" className="text-xs text-slate-500 cursor-pointer select-none whitespace-nowrap">
            {allVisibleSelected ? '取消全选' : '全选'}
          </label>
          <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
            共 {currentList.length} 项
          </span>
        </div>

        {/* 主体：左右面板 */}
        <div className="flex gap-3 mt-3 flex-1 min-h-0" style={{ height: '55vh', maxHeight: '420px' }}>
          {/* 左侧：可选列表 */}
          <div className="flex-1 flex flex-col min-w-0 border rounded-lg border-slate-200 overflow-hidden">
            <div
              ref={leftListRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <div className="divide-y divide-slate-50">
                {currentList.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {searchQuery ? '无匹配结果' : activeTab === 'part' ? '零件库为空或已全部添加' : '无可用组件'}
                  </div>
                ) : (
                  currentList.map(item => {
                    const checked = isSelected(item.id);
                    const name = activeTab === 'part'
                      ? (item as Part).name
                      : (item as Assembly).name;
                    const code = activeTab === 'part'
                      ? (item as Part).code
                      : (item as Assembly).code;
                    const spec = activeTab === 'part' ? (item as Part).spec : '';
                    const price = activeTab === 'part'
                      ? `¥${Number((item as Part).price).toFixed(2)}`
                      : `¥${calculateAssemblyCost((item as Assembly).id, state.parts, state.assemblies, state.bomEntries).toFixed(2)}`;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors select-none ${
                          checked ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                        }`}
                        onClick={() => toggleSelect(item.id)}
                      >
                        <Checkbox
                          checked={checked}
                          className="pointer-events-none flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-mono text-slate-400">{code}</span>
                            <span className="text-sm text-slate-800 font-medium truncate">{name}</span>
                          </div>
                          {spec && (
                            <span className="text-xs text-slate-400 truncate block">{spec}</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-amber-600 flex-shrink-0">{price}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 右侧：已选列表 */}
          <div className="w-[260px] flex-shrink-0 flex flex-col border rounded-lg border-slate-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                已选 {selected.length} 项
              </span>
            </div>
            <div
              ref={rightListRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {selected.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  从左侧选择要添加的子件
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {selected.map(s => {
                    const label = getItemLabel(s.id, s.type);
                    const unitCost = s.type === 'part' ? getPartPrice(s.id) : getAssemblyCost(s.id);
                    const subtotal = unitCost * s.quantity * (1 + s.wasteRate);

                    return (
                      <div key={s.id} className="p-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-medium text-slate-700 truncate flex-1">{label}</span>
                          <button
                            onClick={() => removeSelected(s.id)}
                            className="p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 flex-shrink-0"
                            type="button"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400">用量</label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={s.quantity}
                              onChange={e => updateQuantity(s.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="h-7 text-xs"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">损耗率(%)</label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step={0.1}
                              value={s.wasteRate * 100 || ''}
                              onChange={e => updateWasteRate(s.id, Math.min(100, parseFloat(e.target.value) || 0))}
                              placeholder="0"
                              className="h-7 text-xs"
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="text-[10px] text-right text-amber-600 font-mono">
                          小计: ¥{subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮组 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {activeTab === 'assembly' && (
              <span>自动排除自身和上级组件（避免循环引用）</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="min-w-[80px]"
              type="button"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selected.length === 0}
              className="min-w-[150px] bg-blue-600 hover:bg-blue-700 text-white font-medium"
              size="lg"
              type="button"
            >
              确认添加 {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
