'use client';

import { useState, useMemo } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, generateProductCode, calculateProductCost } from '@/lib/bom-utils';
import type { Product } from '@/lib/types';
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
import { BatchImportDialog, type ImportRow } from './BatchImportDialog';

const PRODUCT_IMPORT_COLUMNS = [
  { key: 'name', label: '产品名称', required: true, sample: '智能设备控制器' },
  { key: 'model', label: '产品型号', required: false, sample: 'CTRL-2000' },
  { key: 'assemblyName', label: '关联BOM组件名称', required: false, sample: '控制器总成' },
  { key: 'description', label: '描述', required: false, sample: '用于智能设备控制的核心模块' },
];

export function ProductManagement() {
  const { state, dispatch } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    model: '',
    description: '',
    topAssemblyId: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 可关联的顶级组件（没有被其他产品引用的组件）
  const availableAssemblies = useMemo(() => {
    const usedIds = new Set(
      state.products
        .filter(p => editingProduct ? p.id !== editingProduct.id : true)
        .map(p => p.topAssemblyId)
    );
    return state.assemblies.filter(a => !usedIds.has(a.id));
  }, [state.assemblies, state.products, editingProduct]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm({
      code: generateProductCode(state.products),
      name: '',
      model: '',
      description: '',
      topAssemblyId: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      code: product.code,
      name: product.name,
      model: product.model,
      description: product.description,
      topAssemblyId: product.topAssemblyId,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim() || !form.topAssemblyId) return;
    const now = Date.now();

    if (editingProduct) {
      dispatch({
        type: 'UPDATE_PRODUCT',
        payload: { ...editingProduct, ...form, updatedAt: now },
      });
    } else {
      const newProduct: Product = {
        id: generateId(),
        ...form,
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
    setDeleteConfirm(null);
  };

  /** 批量导入产品 */
  const handleBatchImport = async (rows: ImportRow[]) => {
    const now = Date.now();
    const validRows = rows.filter(r => r.errors.length === 0);
    const newProducts: Product[] = [];

    for (const row of validRows) {
      const assemblyName = row.data.assemblyName || '';
      const assembly = assemblyName
        ? state.assemblies.find(a => a.name.includes(assemblyName) || assemblyName.includes(a.name))
        : null;

      const code = generateProductCode([...state.products, ...newProducts]);
      newProducts.push({
        id: generateId(),
        code,
        name: row.data.name || '未命名',
        model: row.data.model || '',
        description: row.data.description || '',
        topAssemblyId: assembly?.id || '',
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const product of newProducts) {
      dispatch({ type: 'ADD_PRODUCT', payload: product });
    }
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">共 {state.products.length} 个产品</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            disabled={state.assemblies.length === 0}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            批量导入
          </Button>
          <Button
            onClick={openAdd}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={state.assemblies.length === 0}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            添加产品
          </Button>
        </div>
      </div>

      {state.assemblies.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          请先在"BOM管理"中创建组件，然后才能创建产品。
        </div>
      )}

      {/* 产品卡片 */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.products.map(product => {
          const assembly = state.assemblies.find(a => a.id === product.topAssemblyId);
          const cost = calculateProductCost(product.topAssemblyId, state);

          return (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-blue-600 font-medium">{product.code}</p>
                  <h3 className="text-base font-semibold text-slate-800 mt-0.5 truncate">{product.name}</h3>
                  {product.model && (
                    <p className="text-xs text-slate-400 mt-0.5">型号: {product.model}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(product)}
                    className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{product.description}</p>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">关联组件</span>
                  <span className="text-slate-700 font-medium">{assembly?.name ?? '未关联'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">产品成本</span>
                  <span className="font-mono text-amber-600 font-bold text-base">¥{cost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {state.products.length === 0 && state.assemblies.length > 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">暂无产品，点击"添加产品"或"批量导入"创建</p>
        </div>
      )}

      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? '编辑产品' : '添加产品'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">产品编号</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="如: PRD-000001"
                  className="h-9 font-mono text-xs"
                  disabled={!editingProduct}
                />
                {!editingProduct && (
                  <p className="text-[10px] text-slate-400">自动生成，不可修改</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">产品名称 <span className="text-red-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="产品名称"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">型号</Label>
              <Input
                value={form.model}
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="产品型号"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">关联BOM组件 <span className="text-red-500">*</span></Label>
              <Select value={form.topAssemblyId} onValueChange={v => setForm(f => ({ ...f, topAssemblyId: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择顶级组件..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAssemblies.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="产品描述"
                className="h-9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.code.trim() || !form.name.trim() || !form.topAssemblyId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingProduct ? '保存' : '创建'}
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
          <p className="text-sm text-slate-600 py-2">确定要删除此产品吗？此操作不可撤销。</p>
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

      {/* 批量导入对话框 */}
      <BatchImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="批量导入产品"
        description="上传Excel或CSV文件，批量导入产品。可选择关联现有的BOM组件。"
        templateFileName="产品导入模板.xlsx"
        columns={PRODUCT_IMPORT_COLUMNS}
        onImport={handleBatchImport}
      />
    </div>
  );
}