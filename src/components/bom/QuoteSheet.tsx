'use client';

import { useState, useMemo, useRef } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, calculateProductCost, calculateCostBreakdown, getProductCoefficients } from '@/lib/bom-utils';
import { numberToChinese, formatMoney, formatDate } from '@/lib/utils';
import type { Quote, QuoteProduct, CostBreakdown } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function QuoteSheet() {
  const { state, dispatch } = useAppState();
  const printRef = useRef<HTMLDivElement>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

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
      const materialCost = calculateProductCost(product.topAssemblyId, state);
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

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">共 {sortedQuotes.length} 份报价单</div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">报价方案标题</Label>
                <Input
                  value={quoteForm.title}
                  onChange={e => setQuoteForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="如: LED显示屏报价方案"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">项目名称</Label>
                <Input
                  value={quoteForm.projectName}
                  onChange={e => setQuoteForm(f => ({ ...f, projectName: e.target.value }))}
                  placeholder="项目名称"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">单位名称</Label>
                <Input
                  value={quoteForm.companyName}
                  onChange={e => setQuoteForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="单位名称"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">联系人</Label>
                <Input
                  value={quoteForm.contactPerson}
                  onChange={e => setQuoteForm(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="联系人"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">电话</Label>
                <Input
                  value={quoteForm.contactPhone}
                  onChange={e => setQuoteForm(f => ({ ...f, contactPhone: e.target.value }))}
                  placeholder="电话"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">利润率 (%)</Label>
                <Input
                  type="number"
                  value={quoteForm.profitMargin}
                  onChange={e => setQuoteForm(f => ({ ...f, profitMargin: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
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
                  const cost = calculateProductCost(product.topAssemblyId, state);
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
                  <div className="w-12 h-12 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs leading-tight text-center">
                    CCTS<br /><span className="text-[8px] font-normal">中控交安</span>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    CHINA CONTROL<br />TRAFFIC SECURE
                  </div>
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <p><span className="text-slate-500">项目名称:</span> {selectedQuote.projectName || '________'}</p>
                  <p><span className="text-slate-500">姓名:</span> {selectedQuote.contactPerson || '________'}</p>
                  <p><span className="text-slate-500">单位名称:</span> {selectedQuote.companyName || '________'}</p>
                  <p><span className="text-slate-500">电话:</span> {selectedQuote.contactPhone || '________'}</p>
                </div>
              </div>

              {/* 标题 */}
              <h1 className="text-center text-xl font-bold text-red-600 mb-6">{selectedQuote.title}</h1>

              {/* 表格主体 */}
              <table className="w-full border-collapse text-xs mb-4">
                <thead>
                  <tr className="bg-red-600 text-white">
                    <th className="border border-red-600 px-2 py-1.5 text-center w-8">序号</th>
                    <th className="border border-red-600 px-2 py-1.5 text-left">产品名称</th>
                    <th className="border border-red-600 px-2 py-1.5 text-left">品牌</th>
                    <th className="border border-red-600 px-2 py-1.5 text-left">型号</th>
                    <th className="border border-red-600 px-2 py-1.5 text-left">技术参数</th>
                    <th className="border border-red-600 px-2 py-1.5 text-center w-12">数量</th>
                    <th className="border border-red-600 px-2 py-1.5 text-center w-10">单位</th>
                    <th className="border border-red-600 px-2 py-1.5 text-right w-20">单价</th>
                    <th className="border border-red-600 px-2 py-1.5 text-right w-20">金额</th>
                    <th className="border border-red-600 px-2 py-1.5 text-left">备注</th>
                    <th className="border border-red-600 px-2 py-1.5 text-center w-16">图片</th>
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
              {selectedQuote.products[0]?.costBreakdown && (
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