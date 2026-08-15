'use client';

import { useState, useMemo, useRef } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, generateProductCode, calculateProductCost, calculateCostBreakdown } from '@/lib/bom-utils';
import type { Product, CostCoefficients } from '@/lib/types';
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
import { CostCoefficientEditor } from './CostCoefficientEditor';

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
    brand: '',
    description: '',
    parameters: '',
    images: [] as string[],
    topAssemblyIds: [] as string[],
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showCoefficients, setShowCoefficients] = useState(false);
  const [editCoefficients, setEditCoefficients] = useState<CostCoefficients>(state.defaultCoefficients);

  // 可关联的组件（没有被其他产品引用的组件）
  const availableAssemblies = useMemo(() => {
    const usedIds = new Set(
      state.products
        .filter(p => editingProduct ? p.id !== editingProduct.id : true)
        .flatMap(p => p.topAssemblyIds || [])
    );
    return state.assemblies.filter(a => !usedIds.has(a.id));
  }, [state.assemblies, state.products, editingProduct]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm({
      code: generateProductCode(state.products),
      name: '',
      model: '',
      brand: '',
      description: '',
      parameters: '',
      images: [],
      topAssemblyIds: [],
    });
    setEditCoefficients(state.defaultCoefficients);
    setShowCoefficients(false);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      code: product.code,
      name: product.name,
      model: product.model,
      brand: product.brand || '',
      description: product.description,
      parameters: product.parameters || '',
      images: product.images || [],
      topAssemblyIds: product.topAssemblyIds || [],
    });
    setEditCoefficients(product.coefficients || state.defaultCoefficients);
    setShowCoefficients(true);
    setDialogOpen(true);
  };

  const handleImageGenerate = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: form.name, prompt: `Professional product photo of "${form.name}", studio lighting, white background, 8K product photography` }),
      });
      const data = await res.json();
      if (data.imageUrls) {
        setForm(f => ({ ...f, images: [...f.images, ...data.imageUrls] }));
      }
    } catch {
      // ignore
    }
  };

  const handleImageUrlAdd = () => {
    const url = prompt('请输入图片URL:');
    if (url && url.trim()) {
      setForm(f => ({ ...f, images: [...f.images, url.trim()] }));
    }
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 前端校验
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 JPG/PNG/GIF/WebP/SVG 格式图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.imageUrl) {
        setForm(f => ({ ...f, images: [...f.images, data.imageUrl] }));
      } else {
        alert(data.error || '上传失败');
      }
    } catch {
      alert('上传图片失败，请重试');
    } finally {
      setUploading(false);
      // 重置 input 以便再次选择同一文件
      if (e.target) e.target.value = '';
    }
  };

  const handleImageRemove = (idx: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim() || form.topAssemblyIds.length === 0) return;
    const now = Date.now();
    const coefficients = showCoefficients && editCoefficients ? editCoefficients : undefined;

    const productData = {
      code: form.code.trim(),
      name: form.name.trim(),
      model: form.model.trim(),
      brand: form.brand.trim(),
      description: form.description.trim(),
      parameters: form.parameters.trim(),
      images: form.images,
      topAssemblyIds: form.topAssemblyIds,
      coefficients,
    };

    if (editingProduct) {
      dispatch({
        type: 'UPDATE_PRODUCT',
        payload: { ...editingProduct, ...productData, updatedAt: now },
      });
    } else {
      const newProduct: Product = {
        id: generateId(),
        ...productData,
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
        brand: '',
        description: row.data.description || '',
        parameters: '',
        images: [],
        topAssemblyIds: assembly?.id ? [assembly.id] : [],
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
          const assemblies = (product.topAssemblyIds || []).map(id => state.assemblies.find(a => a.id === id)).filter(Boolean);
          const cost = product.topAssemblyIds?.reduce((sum, id) => sum + calculateProductCost([id], state), 0) || 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-blue-600 font-medium">{product.code}</p>
                  <h3 className="text-base font-semibold text-slate-800 mt-0.5 truncate">{product.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    {product.brand && <span>品牌: {product.brand}</span>}
                    {product.model && <span>型号: {product.model}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0 ml-2">
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

              {product.images && product.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {product.images.slice(0, 3).map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-14 h-14 object-cover rounded border border-slate-200 flex-shrink-0" />
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">关联组件</span>
                  <span className="text-slate-700 font-medium truncate max-w-[200px]">{assemblies.map(a => a?.name).filter(Boolean).join(', ') || '未关联'}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">品牌</Label>
                <Input
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="产品品牌"
                  className="h-9"
                />
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">技术参数</Label>
              <textarea
                value={form.parameters}
                onChange={e => setForm(f => ({ ...f, parameters: e.target.value }))}
                placeholder="详细技术参数，每行一项"
                className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">产品图片</Label>
              <div className="flex flex-wrap gap-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => handleImageRemove(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* 本地图片上传 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className={`w-16 h-16 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  title="从本地上传图片"
                >
                  {uploading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleImageUrlAdd}
                  className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  title="添加图片URL"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleImageGenerate}
                  disabled={!form.name.trim()}
                  className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-md flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="AI生成图片"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-slate-400">支持本地图片上传、图片URL或AI生成产品图片</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">关联BOM组件 <span className="text-red-500">*</span></Label>
              <div className="flex flex-wrap gap-2 min-h-[36px] p-2 border border-slate-200 rounded-md bg-white">
                {form.topAssemblyIds.map(id => {
                  const asm = state.assemblies.find(a => a.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                      [{asm?.code}] {asm?.name}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, topAssemblyIds: f.topAssemblyIds.filter(i => i !== id) }))}
                        className="text-blue-400 hover:text-red-500 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                {form.topAssemblyIds.length < 20 && (
                  <Select
                    value=""
                    onValueChange={v => {
                      if (v && !form.topAssemblyIds.includes(v) && form.topAssemblyIds.length < 20) {
                        setForm(f => ({ ...f, topAssemblyIds: [...f.topAssemblyIds, v] }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 border-0 shadow-none text-xs text-slate-400 hover:text-slate-600 gap-1 w-auto min-w-[80px]">
                      <SelectValue placeholder="+ 添加组件" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.assemblies.filter(a => !form.topAssemblyIds.includes(a.id)).map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          [{a.code}] {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {form.topAssemblyIds.length === 0 && <p className="text-xs text-red-400">请至少选择一个BOM组件</p>}
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

            {/* 综合成本系数 */}
            <div className="border-t border-slate-200 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowCoefficients(!showCoefficients)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showCoefficients ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                综合成本系数设置
                {showCoefficients && editCoefficients && (
                  <span className="text-xs text-blue-500 font-normal">
                    (已启用)
                  </span>
                )}
              </button>
              {showCoefficients && (
                <div className="mt-3">
                  {form.topAssemblyIds.length > 0 && (
                    <CostCoefficientEditor
                      coefficients={editCoefficients}
                      onChange={setEditCoefficients}
                      materialCost={form.topAssemblyIds.length > 0 ? calculateProductCost(form.topAssemblyIds, state) : 0}
                    />
                  )}
                  {form.topAssemblyIds.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">请先选择关联BOM组件</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.code.trim() || !form.name.trim() || form.topAssemblyIds.length === 0}
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