'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, calculateProductCost, calculateCostBreakdown, getProductCoefficients } from '@/lib/bom-utils';
import { numberToChinese, formatMoney, formatDate } from '@/lib/utils';
import type { Quote, QuoteProduct, CostBreakdown } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TEMPLATE_STORAGE_KEY = 'bom-quote-template';

interface QuoteTemplate {
  companyNameCN: string;
  companyNameEN: string;
  logoMain: string;
  logoSub: string;
  logoImage: string;
  headerLabels: {
    projectName: string;
    contactPerson: string;
    companyName: string;
    phone: string;
  };
  title: string;
  showCostBreakdown: boolean;
  footer: string;
  primaryColor: string;
}

const defaultTemplate: QuoteTemplate = {
  companyNameCN: '中控交安',
  companyNameEN: 'CHINA CONTROL TRAFFIC SECURE',
  logoMain: 'CCTS',
  logoSub: '中控交安',
  logoImage: '',
  headerLabels: {
    projectName: '项目名称',
    contactPerson: '姓名',
    companyName: '单位名称',
    phone: '电话',
  },
  title: '报价方案',
  showCostBreakdown: true,
  footer: '',
  primaryColor: '#DC2626',
};

function loadTemplate(): QuoteTemplate {
  if (typeof window === 'undefined') return defaultTemplate;
  try {
    const saved = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (saved) return { ...defaultTemplate, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultTemplate;
}

function saveTemplate(tpl: QuoteTemplate) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(tpl));
  } catch { /* ignore */ }
}

export function QuoteSheet() {
  const { state, dispatch } = useAppState();
  const printRef = useRef<HTMLDivElement>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [template, setTemplate] = useState<QuoteTemplate>(loadTemplate);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<QuoteTemplate>(template);

  // 报价生成表单
  const [quoteForm, setQuoteForm] = useState({
    title: '',
    projectName: '',
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    profitMargin: 15,
    selectedProducts: [] as string[], // product IDs
    quantities: {} as Record<string, number>,
  });

  const openGenerator = () => {
    setQuoteForm({
      title: '',
      projectName: '',
      companyName: '',
      contactPerson: '',
      contactPhone: '',
      profitMargin: 15,
      selectedProducts: [],
      quantities: {},
    });
    setShowGenerator(true);
  };

  const toggleProduct = (productId: string) => {
    setQuoteForm(f => {
      const selected = f.selectedProducts.includes(productId)
        ? f.selectedProducts.filter(id => id !== productId)
        : [...f.selectedProducts, productId];
      return { ...f, selectedProducts: selected };
    });
  };

  const setQuantity = (productId: string, qty: number) => {
    setQuoteForm(f => ({
      ...f,
      quantities: { ...f.quantities, [productId]: Math.max(1, qty) },
    }));
  };

  const handleGenerateQuote = () => {
    if (quoteForm.selectedProducts.length === 0) return;

    const now = Date.now();
    const products: QuoteProduct[] = [];

    for (const pid of quoteForm.selectedProducts) {
      const product = state.products.find(p => p.id === pid);
      if (!product) continue;

      const qty = quoteForm.quantities[pid] || 1;
      const materialCost = calculateProductCost(product.topAssemblyIds, state);
      const coefficients = getProductCoefficients(product, state.defaultCoefficients);
      const breakdown = calculateCostBreakdown(materialCost, coefficients);

      products.push({
        productId: product.id,
        productName: product.name,
        brand: product.brand || '-',
        model: product.model || '-',
        parameters: product.parameters || '-',
        quantity: qty,
        unit: '套',
        unitPrice: breakdown.totalCost,
        amount: breakdown.totalCost * qty,
        remark: '',
        images: product.images || [],
        costBreakdown: breakdown,
      });
    }

    const totalMaterialCost = products.reduce((s, p) => s + p.costBreakdown!.materialCost * p.quantity, 0);
    const totalCost = products.reduce((s, p) => s + p.amount, 0);
    const totalAmount = totalCost * (1 + quoteForm.profitMargin / 100);
    const profitMarginVal = quoteForm.profitMargin / 100;

    const newQuote: Quote = {
      id: generateId(),
      title: quoteForm.title || '报价方案',
      projectName: quoteForm.projectName,
      companyName: quoteForm.companyName,
      contactPerson: quoteForm.contactPerson,
      contactPhone: quoteForm.contactPhone,
      profitMargin: profitMarginVal,
      products,
      totalMaterialCost,
      totalCost,
      totalAmount,
      totalAmountCN: numberToChinese(totalAmount),
      suggestedPrice: totalAmount,
      createdAt: now,
    };

    dispatch({ type: 'ADD_QUOTE', payload: newQuote });
    setSelectedQuote(newQuote);
    setShowGenerator(false);
  };

  const sortedQuotes = useMemo(() =>
    [...state.quotes].sort((a, b) => b.createdAt - a.createdAt),
    [state.quotes]
  );

  const handlePrint = () => {
    window.print();
  };

  const handleSaveTemplate = () => {
    setTemplate(editTemplate);
    saveTemplate(editTemplate);
    setTemplateDialogOpen(false);
  };

  const handleExportTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 模板配置表
    const configData = [
      ['字段', '值'],
      ['公司中文名', template.companyNameCN],
      ['公司英文名', template.companyNameEN],
      ['Logo主文字', template.logoMain],
      ['Logo副文字', template.logoSub],
      ['Logo图片', template.logoImage],
      ['主题色', template.primaryColor],
      ['报价标题', template.title],
      ['项目名称标签', template.headerLabels.projectName],
      ['联系人标签', template.headerLabels.contactPerson],
      ['单位名称标签', template.headerLabels.companyName],
      ['电话标签', template.headerLabels.phone],
      ['显示费用明细', template.showCostBreakdown ? '是' : '否'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(configData);
    ws['!cols'] = [{ wch: 16 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, '模板配置');

    // 生成文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '报价单模板.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets['模板配置'];
        if (!ws) { alert('无效的模板文件：未找到"模板配置"工作表'); return; }
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
        const map = new Map<string, string>();
        for (const row of rows) {
          if (row[0] && row[1] !== undefined) map.set(row[0].trim(), String(row[1]));
        }
        const imported: Partial<QuoteTemplate> = {
          companyNameCN: map.get('公司中文名') || defaultTemplate.companyNameCN,
          companyNameEN: map.get('公司英文名') || defaultTemplate.companyNameEN,
          logoMain: map.get('Logo主文字') || defaultTemplate.logoMain,
          logoSub: map.get('Logo副文字') || defaultTemplate.logoSub,
          logoImage: map.get('Logo图片') || defaultTemplate.logoImage,
          primaryColor: map.get('主题色') || defaultTemplate.primaryColor,
          title: map.get('报价标题') || defaultTemplate.title,
          headerLabels: {
            projectName: map.get('项目名称标签') || defaultTemplate.headerLabels.projectName,
            contactPerson: map.get('联系人标签') || defaultTemplate.headerLabels.contactPerson,
            companyName: map.get('单位名称标签') || defaultTemplate.headerLabels.companyName,
            phone: map.get('电话标签') || defaultTemplate.headerLabels.phone,
          },
          showCostBreakdown: (map.get('显示费用明细') || '是') === '是',
        };
        const merged = { ...defaultTemplate, ...imported };
        setTemplate(merged);
        saveTemplate(merged);
        alert('模板导入成功');
      } catch (e) {
        alert('模板文件解析失败：' + (e instanceof Error ? e.message : '未知错误'));
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">共 {sortedQuotes.length} 份报价单</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditTemplate(template); setTemplateDialogOpen(true); }}
            className="h-9"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            模板编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTemplate}
            className="h-9"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportTemplate}
            className="h-9"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入模板
          </Button>
          <Button
            onClick={openGenerator}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            disabled={state.products.length === 0}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            生成报价单
          </Button>
        </div>
      </div>

      {state.products.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          请先在"产品管理"中创建产品，然后才能生成报价单。
        </div>
      )}

      {/* 报价列表 */}
      <div className="space-y-3">
        {sortedQuotes.map(quote => (
          <div
            key={quote.id}
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedQuote(quote)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">{quote.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {quote.products.length} 个产品 | 总金额: <span className="font-mono text-amber-600 font-medium">¥{formatMoney(quote.totalAmount)}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(quote.createdAt)}</p>
              </div>
              <div className="text-xs text-slate-400">
                {quote.companyName || '未填写单位'}
              </div>
            </div>
          </div>
        ))}
        {sortedQuotes.length === 0 && state.products.length > 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">暂无报价单，点击"生成报价单"创建</p>
          </div>
        )}
      </div>

      {/* 生成报价对话框 */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>生成报价单</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 头部信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">报价方案标题</Label>
                <Input
                  value={quoteForm.title}
                  onChange={e => setQuoteForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="如: LED显示屏报价方案"
                  className="h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap w-16">{template.headerLabels.projectName}：</Label>
                <Input
                  value={quoteForm.projectName}
                  onChange={e => setQuoteForm(f => ({ ...f, projectName: e.target.value }))}
                  placeholder={template.headerLabels.projectName}
                  className="h-9 flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap w-16">{template.headerLabels.companyName}：</Label>
                <Input
                  value={quoteForm.companyName}
                  onChange={e => setQuoteForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder={template.headerLabels.companyName}
                  className="h-9 flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap w-16">{template.headerLabels.contactPerson}：</Label>
                <Input
                  value={quoteForm.contactPerson}
                  onChange={e => setQuoteForm(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder={template.headerLabels.contactPerson}
                  className="h-9 flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap w-16">{template.headerLabels.phone}：</Label>
                <Input
                  value={quoteForm.contactPhone}
                  onChange={e => setQuoteForm(f => ({ ...f, contactPhone: e.target.value }))}
                  placeholder={template.headerLabels.phone}
                  className="h-9 flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap w-16">利润率(%)：</Label>
                <Input
                  type="number"
                  value={quoteForm.profitMargin}
                  onChange={e => setQuoteForm(f => ({ ...f, profitMargin: parseFloat(e.target.value) || 0 }))}
                  className="h-9 flex-1"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* 产品选择 */}
            <div className="border-t border-slate-200 pt-3">
              <Label className="text-xs font-medium mb-2 block">选择产品（可多选）</Label>
              <div className="space-y-1 max-h-[240px] overflow-y-auto border border-slate-200 rounded-md p-2">
                {state.products.map(product => {
                  const cost = calculateProductCost(product.topAssemblyIds, state);
                  const isSelected = quoteForm.selectedProducts.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProduct(product.id)}
                        id={`prod-${product.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`prod-${product.id}`} className="cursor-pointer flex items-center gap-2">
                          {product.images && product.images[0] && (
                            <img src={product.images[0]} alt="" className="w-8 h-8 object-cover rounded border border-slate-200 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{product.name}</p>
                            <p className="text-xs text-slate-400">
                              {product.brand && `${product.brand} `}
                              {product.model && `${product.model} `}
                              | 物料成本: ¥{cost.toFixed(2)}
                            </p>
                          </div>
                        </label>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-slate-400">数量:</span>
                          <Input
                            type="number"
                            value={quoteForm.quantities[product.id] || 1}
                            onChange={e => setQuantity(product.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-xs text-center"
                            min={1}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button variant="outline" size="sm" onClick={() => setShowGenerator(false)}>取消</Button>
            <Button
              size="sm"
              onClick={handleGenerateQuote}
              disabled={quoteForm.selectedProducts.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              生成报价单 ({quoteForm.selectedProducts.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 报价单详情（预览/打印） */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}>
        <DialogContent className="sm:max-w-[1100px] max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:shadow-none print:border-none">
          <div className="print:hidden flex justify-between items-center mb-4">
            <DialogTitle>报价单预览</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedQuote(null)}>关闭</Button>
              <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                打印/导出PDF
              </Button>
            </div>
          </div>

          {selectedQuote && (
            <div ref={printRef} className="bg-white p-6 print:p-4" style={{ fontFamily: "'Inter', 'Noto Sans SC', system-ui, sans-serif" }}>
              {/* 头部信息 */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  {template.logoImage ? (
                    <img src={template.logoImage} alt="Logo" className="h-12 object-contain" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded flex items-center justify-center text-white font-bold text-xs leading-tight text-center"
                      style={{ backgroundColor: template.primaryColor }}
                    >
                      {template.logoMain}<br /><span className="text-[8px] font-normal">{template.logoSub}</span>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400 leading-tight">
                    {template.companyNameEN}
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p><span className="text-slate-500">{template.headerLabels.projectName}:</span> {selectedQuote.projectName || '________'}</p>
                  <p><span className="text-slate-500">{template.headerLabels.contactPerson}:</span> {selectedQuote.contactPerson || '________'}</p>
                  <p><span className="text-slate-500">{template.headerLabels.companyName}:</span> {selectedQuote.companyName || '________'}</p>
                  <p><span className="text-slate-500">{template.headerLabels.phone}:</span> {selectedQuote.contactPhone || '________'}</p>
                </div>
              </div>

              {/* 标题 */}
              <h1 className="text-center text-xl font-bold mb-6" style={{ color: template.primaryColor }}>{selectedQuote.title}</h1>

              {/* 表格主体 */}
              <table className="w-full border-collapse text-xs mb-4">
                <thead>
                  <tr style={{ backgroundColor: template.primaryColor, color: '#fff' }}>
                    <th className="px-2 py-1.5 text-center w-8" style={{ borderColor: template.primaryColor }}>序号</th>
                    <th className="px-2 py-1.5 text-left" style={{ borderColor: template.primaryColor }}>产品名称</th>
                    <th className="px-2 py-1.5 text-left" style={{ borderColor: template.primaryColor }}>品牌</th>
                    <th className="px-2 py-1.5 text-left" style={{ borderColor: template.primaryColor }}>型号</th>
                    <th className="px-2 py-1.5 text-left" style={{ borderColor: template.primaryColor }}>技术参数</th>
                    <th className="px-2 py-1.5 text-center w-12" style={{ borderColor: template.primaryColor }}>数量</th>
                    <th className="px-2 py-1.5 text-center w-10" style={{ borderColor: template.primaryColor }}>单位</th>
                    <th className="px-2 py-1.5 text-right w-20" style={{ borderColor: template.primaryColor }}>单价</th>
                    <th className="px-2 py-1.5 text-right w-20" style={{ borderColor: template.primaryColor }}>金额</th>
                    <th className="px-2 py-1.5 text-left" style={{ borderColor: template.primaryColor }}>备注</th>
                    <th className="px-2 py-1.5 text-center w-16" style={{ borderColor: template.primaryColor }}>图片</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuote.products.map((p, idx) => (
                    <tr key={p.productId} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1.5 font-medium text-slate-800">{p.productName}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{p.brand}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{p.model}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-600 max-w-[120px]">
                        <div className="line-clamp-2 text-[10px]">{p.parameters}</div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">{p.quantity}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500">{p.unit}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono">¥{formatMoney(p.unitPrice)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-medium">¥{formatMoney(p.amount)}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-400 text-[10px]">{p.remark}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">
                        {p.images && p.images[0] ? (
                          <img src={p.images[0]} alt="" className="w-12 h-12 object-cover rounded mx-auto border border-slate-200" />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 合计区 */}
              <div className="flex justify-end mb-4">
                <table className="w-[300px] border-collapse text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-right bg-slate-50 w-20">合计</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-base text-amber-600">
                        ¥{formatMoney(selectedQuote.totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-right bg-slate-50">大写</td>
                      <td className="border border-slate-300 px-3 py-2 font-mono text-sm text-slate-700">
                        {selectedQuote.totalAmountCN}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 费用明细 */}
              {template.showCostBreakdown && selectedQuote.products[0]?.costBreakdown && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">费用明细</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1 text-left">费用项目</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">物料成本</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">人工</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">损耗</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">运费</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">税费</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">房租</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">水电</th>
                        <th className="border border-slate-300 px-2 py-1 text-right">总成本</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.products.map((p, idx) => (
                        <tr key={p.productId} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1 font-medium">{p.productName}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.materialCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.laborCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.wasteCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.freightCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.taxCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.rentCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(p.costBreakdown!.utilitiesCost * p.quantity)}</td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold">¥{formatMoney(p.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td className="border border-slate-300 px-2 py-1">合计</td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono">¥{formatMoney(selectedQuote.totalMaterialCost)}</td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-mono" colSpan={7}>
                          利润率: {(selectedQuote.profitMargin * 100).toFixed(0)}% | 
                          总成本: ¥{formatMoney(selectedQuote.totalCost)} | 
                          建议售价: <span className="text-amber-600">¥{formatMoney(selectedQuote.suggestedPrice)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 尾部信息 */}
              <div className="text-right text-xs text-slate-400 mt-4">
                报价时间: {formatDate(selectedQuote.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 模板编辑对话框 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑报价模板</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>公司中文名</Label>
                <Input value={editTemplate.companyNameCN} onChange={e => setEditTemplate({ ...editTemplate, companyNameCN: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>公司英文名</Label>
                <Input value={editTemplate.companyNameEN} onChange={e => setEditTemplate({ ...editTemplate, companyNameEN: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Logo主文字</Label>
                <Input value={editTemplate.logoMain} onChange={e => setEditTemplate({ ...editTemplate, logoMain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Logo副文字</Label>
                <Input value={editTemplate.logoSub} onChange={e => setEditTemplate({ ...editTemplate, logoSub: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Logo图片</Label>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
                      fileInput?.click();
                    }}
                  >
                    选择图片
                  </Button>
                  {editTemplate.logoImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => setEditTemplate({ ...editTemplate, logoImage: '' })}
                    >
                      清除
                    </Button>
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setEditTemplate({ ...editTemplate, logoImage: ev.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                {editTemplate.logoImage && (
                  <div className="mt-1 p-2 border rounded bg-slate-50">
                    <img src={editTemplate.logoImage} alt="预览" className="h-10 object-contain" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>主题色</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={editTemplate.primaryColor} onChange={e => setEditTemplate({ ...editTemplate, primaryColor: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" />
                  <Input value={editTemplate.primaryColor} onChange={e => setEditTemplate({ ...editTemplate, primaryColor: e.target.value })} className="flex-1 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>报价标题</Label>
                <Input value={editTemplate.title} onChange={e => setEditTemplate({ ...editTemplate, title: e.target.value })} />
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">头部字段标签</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>项目名称</Label>
                  <Input value={editTemplate.headerLabels.projectName} onChange={e => setEditTemplate({ ...editTemplate, headerLabels: { ...editTemplate.headerLabels, projectName: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>联系人</Label>
                  <Input value={editTemplate.headerLabels.contactPerson} onChange={e => setEditTemplate({ ...editTemplate, headerLabels: { ...editTemplate.headerLabels, contactPerson: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>单位名称</Label>
                  <Input value={editTemplate.headerLabels.companyName} onChange={e => setEditTemplate({ ...editTemplate, headerLabels: { ...editTemplate.headerLabels, companyName: e.target.value } })} />
                </div>
                <div className="space-y-2">
                  <Label>电话</Label>
                  <Input value={editTemplate.headerLabels.phone} onChange={e => setEditTemplate({ ...editTemplate, headerLabels: { ...editTemplate.headerLabels, phone: e.target.value } })} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="showCost" checked={editTemplate.showCostBreakdown} onCheckedChange={v => setEditTemplate({ ...editTemplate, showCostBreakdown: !!v })} />
              <Label htmlFor="showCost" className="cursor-pointer">显示费用明细</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(false)}>取消</Button>
            <Button size="sm" onClick={handleSaveTemplate}>保存模板</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 打印样式 */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:p-4 { padding: 1rem !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:max-h-none { max-height: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 0.5in; }
        }
      `}</style>
    </div>
  );
}