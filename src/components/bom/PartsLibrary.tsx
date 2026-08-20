'use client';

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useAppState } from '@/lib/store';
import { Part } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BatchImportDialog, ImportRow } from './BatchImportDialog';
import { CategoryTree, CategoryDialog } from './CategoryTree';
import { generateId } from '@/lib/bom-utils';
import { generatePartCode } from '@/lib/bom-utils';

interface Props {
  onPriceChange: (partId: string) => void;
}

const UNITS = ['个', '套', '件', '只', '米', '公斤', '块', '箱', '台', '根', '片', '卷', '条', '对', '组'];

const emptyPart = { code: '', name: '', spec: '', unit: '个', price: 0, quantity: 0, supplier: '', remark: '', purchaseLink: '', categoryId: '' };

const PART_IMPORT_COLUMNS = [
  { key: 'name', label: '零件名称', required: true, sample: '螺丝M6' },
  { key: 'spec', label: '规格型号', required: true, sample: 'M6×20 304不锈钢' },
  { key: 'unit', label: '单位', required: true, sample: '个' },
  { key: 'price', label: '单价', required: true, sample: '0.50' },
  { key: 'quantity', label: '数量', required: false, sample: '100' },
  { key: 'supplier', label: '供应商', required: false, sample: 'XX五金' },
  { key: 'remark', label: '备注', required: false, sample: '标准件' },
  { key: 'purchaseLink', label: '采购链接', required: false, sample: 'https://...' },
];

const PART_FIELD_MAPPING: Record<string, string> = {
  name: '名称',
  spec: '规格',
  unit: '单位',
  price: '单价',
  quantity: '数量',
  supplier: '厂商',
  remark: '备注',
  purchaseLink: '采购链接',
};

export function PartsLibrary({ onPriceChange }: Props) {
  const { state, dispatch } = useAppState();
  const [search, setSearch] = useState('');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [form, setForm] = useState(emptyPart);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 获取目录名称
  const getCategoryName = useCallback((categoryId: string) => {
    if (!categoryId) return '未分类';
    const cat = state.categories.find(c => c.id === categoryId);
    return cat ? cat.name : '未分类';
  }, [state.categories]);

  // 构建当前选中目录及其所有子目录的ID集合
  const selectedCategoryIds = useMemo(() => {
    if (!selectedCategoryId) return null; // null = 全部
    const ids = new Set<string>();
    const collect = (parentId: string) => {
      ids.add(parentId);
      state.categories
        .filter(c => c.parentId === parentId)
        .forEach(c => collect(c.id));
    };
    collect(selectedCategoryId);
    return ids;
  }, [selectedCategoryId, state.categories]);

  const filteredParts = useMemo(() => {
    return state.parts.filter(p => {
      const matchSearch = search === '' ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.spec.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier.toLowerCase().includes(search.toLowerCase());
      const matchUnit = filterUnit === 'all' || p.unit === filterUnit;
      const matchCategory = !selectedCategoryIds || selectedCategoryIds.has(p.categoryId || '');
      return matchSearch && matchUnit && matchCategory;
    });
  }, [state.parts, search, filterUnit, selectedCategoryIds]);

  const totalPages = Math.ceil(filteredParts.length / pageSize);
  const paginatedParts = useMemo(() => {
    return filteredParts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredParts, currentPage, pageSize]);

  // 筛选条件变化时重置到第1页
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterUnit, selectedCategoryIds]);

  const openAdd = () => {
    setEditingPart(null);
    setForm({ ...emptyPart, code: generatePartCode(state.parts) });
    setDialogOpen(true);
  };

  const openEdit = (part: Part) => {
    setEditingPart(part);
    setForm({
      code: part.code,
      name: part.name,
      spec: part.spec,
      unit: part.unit,
      price: part.price,
      quantity: part.quantity ?? 0,
      supplier: part.supplier,
      remark: part.remark,
      purchaseLink: part.purchaseLink || '',
      categoryId: part.categoryId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) return;
    const now = Date.now();

    if (editingPart) {
      const oldPrice = editingPart.price;
      const updated: Part = { ...editingPart, ...form, updatedAt: now };
      dispatch({ type: 'UPDATE_PART', payload: updated });
      if (oldPrice !== form.price) {
        onPriceChange(editingPart.id);
      }
    } else {
      const newPart: Part = {
        id: generateId(),
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_PART', payload: newPart });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_PART', payload: id });
    setDeleteConfirm(null);
  };

  const handleBatchImport = useCallback(async (rows: ImportRow[]) => {
    const now = Date.now();
    const validRows = rows.filter(r => r.errors.length === 0);
    const newParts: Part[] = [];
    const updateParts: Part[] = [];

    for (const row of validRows) {
      const price = parseFloat(row.data.price) || 0;
      const quantity = parseFloat(row.data.quantity) || 0;
      const name = row.data.name || '未命名';
      
      // 检查是否已存在同名零件
      const existingPart = state.parts.find(p => p.name === name);
      
      if (existingPart) {
        // 如果存在，更新现有零件
        updateParts.push({
          ...existingPart,
          spec: row.data.spec || existingPart.spec,
          unit: row.data.unit || existingPart.unit,
          price: Math.max(0, price) || existingPart.price,
          quantity: quantity || existingPart.quantity,
          supplier: row.data.supplier || existingPart.supplier,
          remark: row.data.remark || existingPart.remark,
          purchaseLink: row.data.purchaseLink || existingPart.purchaseLink,
          updatedAt: now,
        });
      } else {
        // 如果不存在，创建新零件
        const code = generatePartCode([...state.parts, ...newParts]);
        newParts.push({
          id: generateId(),
          code,
          name,
          spec: row.data.spec || '',
          unit: row.data.unit || '个',
          price: Math.max(0, price),
          quantity,
          supplier: row.data.supplier || '',
          remark: row.data.remark || '',
          purchaseLink: row.data.purchaseLink || '',
          categoryId: selectedCategoryId || '',
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 添加新零件
    for (const part of newParts) {
      dispatch({ type: 'ADD_PART', payload: part });
    }
    
    // 更新现有零件
    for (const part of updateParts) {
      dispatch({ type: 'UPDATE_PART', payload: part });
    }
  }, [state.parts, selectedCategoryId, dispatch]);

  // 批量编辑目录
  const handleBatchEditCategory = () => {
    if (selectedPartIds.size === 0) return;
    // 从已选零件中获取共同目录作为默认值
    const firstPart = state.parts.find(p => selectedPartIds.has(p.id));
    setBatchCategoryId(firstPart?.categoryId || 'none');
    setBatchDialogOpen(true);
  };

  const handleConfirmBatchCategory = () => {
    const now = Date.now();
    const categoryId = batchCategoryId === 'none' ? '' : batchCategoryId;
    for (const partId of selectedPartIds) {
      const part = state.parts.find(p => p.id === partId);
      if (part) {
        dispatch({
          type: 'UPDATE_PART',
          payload: { ...part, categoryId, updatedAt: now },
        });
      }
    }
    setBatchDialogOpen(false);
    setSelectedPartIds(new Set());
  };

  const toggleSelectPart = (partId: string) => {
    setSelectedPartIds(prev => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedPartIds.size === filteredParts.length) {
      setSelectedPartIds(new Set());
    } else {
      setSelectedPartIds(new Set(filteredParts.map(p => p.id)));
    }
  };

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      {/* 左侧目录树 */}
      <div className="w-64 flex-shrink-0 bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <span className="text-xs font-semibold text-slate-600">零件目录</span>
          <button
            onClick={() => setCategoryDialogOpen(true)}
            className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
            title="新建目录"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <CategoryTree
            categories={state.categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            parts={state.parts}
          />
        </div>
      </div>

      {/* 右侧零件列表 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="搜索编号、名称、规格、供应商..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="单位筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部单位</SelectItem>
              {UNITS.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {selectedPartIds.size > 0 && (
            <span className="text-xs text-blue-600 font-medium self-center">
              已选 {selectedPartIds.size} 项
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleBatchEditCategory}
            disabled={selectedPartIds.size === 0}
            className="h-9"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v4a2 2 0 002 2h14a2 2 0 002-2V7m-6 2l-4 4-4-4" />
            </svg>
            批量编辑目录
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="h-9"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            批量导入
          </Button>
          <Button onClick={openAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            添加零件
          </Button>
        </div>

        {/* 统计 */}
        <div className="flex gap-4 text-xs text-slate-500 flex-shrink-0">
          <span>共 {state.parts.length} 个零件</span>
          {selectedCategoryId && <span>当前目录: {state.categories.find(c => c.id === selectedCategoryId)?.name || '未分类'}</span>}
          {search && <span>筛选结果: {filteredParts.length} 个</span>}
          {selectedPartIds.size > 0 && <span className="text-blue-600 font-medium">已选 {selectedPartIds.size} 项</span>}
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="bg-white rounded-lg border border-slate-200">
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-8">
                  <Checkbox
                    checked={filteredParts.length > 0 && selectedPartIds.size === filteredParts.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 w-[100px]">零件编号</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[160px]">名称</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[180px]">规格型号</TableHead>
                <TableHead className="font-semibold text-slate-600 w-14">单位</TableHead>
                <TableHead className="font-semibold text-slate-600 text-right w-[70px]">单价(元)</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[100px]">供应商</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[90px]">所属目录</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[100px]">备注</TableHead>
                <TableHead className="font-semibold text-slate-600 w-[130px]">采购链接</TableHead>
                <TableHead className="w-24 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-slate-400">
                    {state.parts.length === 0 ? '暂无零件，点击"添加零件"或"批量导入"开始' : '未找到匹配的零件'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredParts.map(part => (
                  <TableRow key={part.id} className="group">
                    <TableCell className="w-8">
                      <Checkbox
                        checked={selectedPartIds.has(part.id)}
                        onCheckedChange={() => toggleSelectPart(part.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-blue-600 font-medium truncate">{part.code}</TableCell>
                    <TableCell className="font-medium truncate" title={part.name}>{part.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm truncate" title={part.spec}>{part.spec}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{part.unit}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium text-amber-600">
                      {Number(part.price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm truncate" title={part.supplier}>{part.supplier || '-'}</TableCell>
                    <TableCell className="text-slate-500 text-sm truncate">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium truncate max-w-full ${
                        part.categoryId
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-50 text-slate-400'
                      }`} title={getCategoryName(part.categoryId)}>
                        {getCategoryName(part.categoryId)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm truncate" title={part.remark}>{part.remark || '-'}</TableCell>
                    <TableCell className="text-slate-400 text-sm truncate">
                      {part.purchaseLink ? (
                        <a href={part.purchaseLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block" title={part.purchaseLink}>
                          {part.purchaseLink}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(part)}
                          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="编辑"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(part.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* 分页 */}
        {filteredParts.length > 0 && (
          <div className="flex items-center justify-between flex-shrink-0 pt-1">
            <span className="text-xs text-slate-500">
              共 {filteredParts.length} 条，每页 {pageSize} 条
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, idx, arr) => (
                  <Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-xs text-slate-400 px-1">...</span>
                    )}
                    <Button
                      variant={currentPage === p ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 min-w-[32px] px-2 text-xs ${currentPage === p ? 'bg-blue-600' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  </Fragment>
                ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}

        {/* 添加/编辑对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingPart ? '编辑零件' : '添加零件'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">零件编号</Label>
                  <Input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="如: PRT-000001"
                    className="h-9 font-mono text-xs"
                    disabled={!editingPart}
                  />
                  {!editingPart && (
                    <p className="text-[10px] text-slate-400">自动生成，不可修改</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">名称 <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="零件名称"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">规格型号</Label>
                  <Input
                    value={form.spec}
                    onChange={e => setForm(f => ({ ...f, spec: e.target.value }))}
                    placeholder="规格型号"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">单位</Label>
                  <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">单价(元)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price || ''}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">数量</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.quantity || ''}
                    onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">供应商</Label>
                  <Input
                    value={form.supplier}
                    onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="供应商名称"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">所属目录</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择目录" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无目录</SelectItem>
                    {state.categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">备注</Label>
                <Input
                  value={form.remark}
                  onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
                  placeholder="备注信息"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">采购链接</Label>
                <Input
                  value={form.purchaseLink}
                  onChange={e => setForm(f => ({ ...f, purchaseLink: e.target.value }))}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.code.trim() || !form.name.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingPart ? '保存' : '添加'}
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
              确定要删除此零件吗？相关的BOM条目也会被移除。此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>取消</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                删除
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 批量编辑目录 */}
        <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>批量编辑目录</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600">
                已选择 <span className="font-medium text-blue-600">{selectedPartIds.size}</span> 个零件，请选择要设置的目标目录：
              </p>
              <Select value={batchCategoryId} onValueChange={setBatchCategoryId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择目录" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无目录</SelectItem>
                  {state.categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setBatchDialogOpen(false)}>取消</Button>
              <Button size="sm" onClick={handleConfirmBatchCategory} className="bg-blue-600 hover:bg-blue-700">
                确认修改
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 批量导入 */}
        <BatchImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          title="批量导入零件"
          description="上传Excel或CSV文件，支持标准格式和材料清单格式"
          templateFileName="零件导入模板.xlsx"
          columns={PART_IMPORT_COLUMNS}
          fieldMapping={PART_FIELD_MAPPING}
          onImport={handleBatchImport}
        />

        {/* 目录管理对话框 */}
        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          categories={state.categories}
          dispatch={dispatch}
        />
      </div>
    </div>
  );
}