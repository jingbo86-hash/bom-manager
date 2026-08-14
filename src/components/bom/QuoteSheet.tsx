'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useAppState } from '@/lib/store';
import { generateId, flattenBomForQuote, calculateProductCost, getProductCoefficients, calculateCostBreakdown } from '@/lib/bom-utils';
import type { Quote, QuoteItem, CostBreakdown } from '@/lib/types';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function QuoteSheet() {
  const { state, dispatch } = useAppState();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [profitMargin, setProfitMargin] = useState<number>(15);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(
    () => state.products.find(p => p.id === selectedProductId),
    [state.products, selectedProductId]
  );

  const previewCost = useMemo(() => {
    if (!selectedProduct) return 0;
    return calculateProductCost(selectedProduct.topAssemblyId, state);
  }, [selectedProduct, state]);

  const handleGenerate = () => {
    if (!selectedProduct) return;
    const totalCost = calculateProductCost(selectedProduct.topAssemblyId, state);
    const items = flattenBomForQuote(
      selectedProduct.topAssemblyId,
      state.parts,
      state.assemblies,
      state.bomEntries
    );
    const margin = profitMargin / 100;

    // 计算综合成本系数明细
    const coefficients = getProductCoefficients(selectedProduct, state.defaultCoefficients);
    const breakdown = calculateCostBreakdown(totalCost, coefficients);

    const suggestedPrice = breakdown.totalCost * (1 + margin);

    const quote: Quote = {
      id: generateId(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      profitMargin: margin,
      materialCost: totalCost,
      totalCost: breakdown.totalCost,
      suggestedPrice,
      items,
      costBreakdown: breakdown,
      createdAt: Date.now(),
    };

    dispatch({ type: 'ADD_QUOTE', payload: quote });
    setGenerateDialogOpen(false);
    setViewingQuote(quote);
  };

  const handleDelete = (id: string) => {
    // 手动重建quotes数组
    const updatedQuotes = state.quotes.filter(q => q.id !== id);
    // 由于没有DELETE_QUOTE action，我们使用LOAD_STATE
    dispatch({
      type: 'LOAD_STATE',
      payload: { ...state, quotes: updatedQuotes },
    });
    setDeleteConfirm(null);
    if (viewingQuote?.id === id) setViewingQuote(null);
  };

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>报价清单</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
          th { background: #f1f5f9; padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 600; color: #475569; }
          td { padding: 8px 12px; border: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: "SF Mono", "Cascadia Mono", monospace; }
          .font-bold { font-weight: 700; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 22px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-4 { margin-top: 16px; }
          .p-4 { padding: 16px; }
          .border { border: 1px solid #e2e8f0; }
          .rounded { border-radius: 6px; }
          .bg-slate-50 { background: #f8fafc; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
          .gap-4 { gap: 16px; }
          .text-sm { font-size: 14px; }
          .text-xs { font-size: 12px; }
          .text-slate-500 { color: #64748b; }
          .text-slate-600 { color: #475569; }
          .text-blue-600 { color: #2563eb; }
          .text-amber-600 { color: #d97706; }
          .text-emerald-600 { color: #059669; }
          .indent-1 { padding-left: 24px; }
          .indent-2 { padding-left: 48px; }
          .indent-3 { padding-left: 72px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.print();
  }, []);

  return (
    <div className="space-y-4">
      {/* 生成报价 */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">生成报价清单</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-[200px]">
            <Label className="text-xs">选择产品</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="选择产品..." />
              </SelectTrigger>
              <SelectContent>
                {state.products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-36">
            <Label className="text-xs">利润率(%)</Label>
            <Input
              type="number"
              min={0}
              max={999}
              step={1}
              value={profitMargin}
              onChange={e => setProfitMargin(parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          {selectedProduct && (
            <div className="text-sm">
              <span className="text-slate-500">物料成本: </span>
              <span className="font-mono font-bold text-amber-600">¥{previewCost.toFixed(2)}</span>
              <span className="text-slate-400 mx-2">|</span>
              <span className="text-slate-500">综合费用: </span>
              <span className="font-mono font-bold text-blue-600">¥{(selectedProduct ? (() => {
                const coeff = getProductCoefficients(selectedProduct, state.defaultCoefficients);
                const breakdown = calculateCostBreakdown(previewCost, coeff);
                return breakdown.totalCost - previewCost;
              })() : 0).toFixed(2)}</span>
              <span className="text-slate-400 mx-2">|</span>
              <span className="text-slate-500">建议售价: </span>
              <span className="font-mono font-bold text-emerald-600">
                ¥{(selectedProduct ? (() => {
                  const coeff = getProductCoefficients(selectedProduct, state.defaultCoefficients);
                  const breakdown = calculateCostBreakdown(previewCost, coeff);
                  return breakdown.totalCost * (1 + profitMargin / 100);
                })() : 0).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex-1" />
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            disabled={!selectedProduct}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            生成报价
          </Button>
        </div>
      </div>

      {/* 历史报价列表 */}
      {state.quotes.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200">
            <h4 className="text-xs font-semibold text-slate-600">历史报价 ({state.quotes.length})</h4>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">产品名称</TableHead>
                <TableHead className="text-xs text-right">物料成本</TableHead>
                <TableHead className="text-xs text-right">总成本</TableHead>
                <TableHead className="text-xs text-right">利润率</TableHead>
                <TableHead className="text-xs text-right">建议售价</TableHead>
                <TableHead className="text-xs text-right">生成时间</TableHead>
                <TableHead className="w-24 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.quotes.map(quote => (
                <TableRow key={quote.id} className="group">
                  <TableCell className="font-medium">{quote.productName}</TableCell>
                  <TableCell className="text-right font-mono text-slate-500">¥{quote.materialCost?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell className="text-right font-mono text-amber-600">¥{quote.totalCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{(quote.profitMargin * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600 font-medium">¥{quote.suggestedPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-xs text-slate-500">
                    {new Date(quote.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewingQuote(quote)}
                        className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                        title="查看"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(quote.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                        title="删除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 查看报价详情 */}
      <Dialog open={!!viewingQuote} onOpenChange={() => setViewingQuote(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>报价清单详情</DialogTitle>
              <Button size="sm" variant="outline" onClick={handlePrint} className="mr-8">
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                打印 / 导出PDF
              </Button>
            </div>
          </DialogHeader>

          {viewingQuote && (
            <div ref={printRef} className="mt-2">
              {/* 报价头 */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">报价清单</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(viewingQuote.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>

              {/* 产品信息 */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500">产品名称</span>
                  <p className="text-sm font-semibold">{viewingQuote.productName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">利润率</span>
                  <p className="text-sm font-semibold">{(viewingQuote.profitMargin * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* 成本汇总 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-xs text-amber-600">物料成本</span>
                  <p className="text-xl font-mono font-bold text-amber-700">¥{viewingQuote.materialCost.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xs text-emerald-600">建议售价</span>
                  <p className="text-xl font-mono font-bold text-emerald-700">¥{viewingQuote.suggestedPrice.toFixed(2)}</p>
                </div>
              </div>

              {/* 费用明细 */}
              {viewingQuote.costBreakdown && (
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="text-xs font-semibold text-slate-600 mb-2">费用明细</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: '物料成本', value: viewingQuote.costBreakdown.materialCost, rate: null, cls: 'text-slate-900' },
                      { label: `人工费用`, value: viewingQuote.costBreakdown.laborCost, rate: viewingQuote.costBreakdown.laborRate, cls: 'text-blue-600' },
                      { label: `损耗费用`, value: viewingQuote.costBreakdown.wasteCost, rate: viewingQuote.costBreakdown.wasteRate, cls: 'text-amber-600' },
                      { label: `运费`, value: viewingQuote.costBreakdown.freightCost, rate: viewingQuote.costBreakdown.freightRate, cls: 'text-emerald-600' },
                      { label: `税费`, value: viewingQuote.costBreakdown.taxCost, rate: viewingQuote.costBreakdown.taxRate, cls: 'text-purple-600' },
                      { label: `房租分摊`, value: viewingQuote.costBreakdown.rentCost, rate: viewingQuote.costBreakdown.rentRate, cls: 'text-orange-600' },
                      { label: `水电分摊`, value: viewingQuote.costBreakdown.utilitiesCost, rate: viewingQuote.costBreakdown.utilitiesRate, cls: 'text-cyan-600' },
                    ].map(item => (
                      <div key={item.label} className="bg-white rounded border border-slate-100 p-2">
                        <div className="text-[10px] text-slate-400">
                          {item.label}
                          {item.rate !== null && ` (${item.rate}%)`}
                        </div>
                        <div className={`text-sm font-mono font-medium ${item.cls}`}>¥{item.value.toFixed(2)}</div>
                      </div>
                    ))}
                    <div className="bg-blue-50 rounded border border-blue-100 p-2 col-span-2 sm:col-span-3">
                      <div className="text-[10px] text-blue-500 font-medium">总成本（含各项费用）</div>
                      <div className="text-lg font-mono font-bold text-blue-700">¥{viewingQuote.totalCost.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-4 text-sm">
                    <span className="text-slate-500">利润率: <strong>{(viewingQuote.profitMargin * 100).toFixed(1)}%</strong></span>
                    <span className="text-slate-500">利润: <strong className="text-emerald-600 font-mono">¥{(viewingQuote.suggestedPrice - viewingQuote.totalCost).toFixed(2)}</strong></span>
                    <span className="text-slate-500 font-semibold">建议售价: <strong className="text-emerald-600 font-mono text-lg">¥{viewingQuote.suggestedPrice.toFixed(2)}</strong></span>
                  </div>
                </div>
              )}

              {/* 明细表 */}
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b">层级</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b">编号</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b">名称</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b">规格</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 border-b">单位</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 border-b">数量</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 border-b">单价</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 border-b">损耗</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 border-b">小计</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingQuote.items.map((item, idx) => (
                    <QuoteItemRow key={idx} item={item} />
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={8} className="px-3 py-2.5 text-right text-sm border-t-2 border-slate-300">
                      合计成本
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-600 border-t-2 border-slate-300">
                      ¥{viewingQuote.totalCost.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 生成确认 */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认生成报价</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2 text-sm">
            <p>产品: <span className="font-medium">{selectedProduct?.name}</span></p>
            <p>利润率: <span className="font-medium">{profitMargin}%</span></p>
            <p>物料成本: <span className="font-mono font-medium text-amber-600">¥{previewCost.toFixed(2)}</span></p>
            {selectedProduct && (() => {
              const coeff = getProductCoefficients(selectedProduct, state.defaultCoefficients);
              const totalRate = Object.values(coeff).reduce((a, b) => a + b, 0);
              return (
                <p>综合费用率: <span className="font-medium">{totalRate.toFixed(1)}%</span></p>
              );
            })()}
            {selectedProduct && (() => {
              const coeff = getProductCoefficients(selectedProduct, state.defaultCoefficients);
              const breakdown = calculateCostBreakdown(previewCost, coeff);
              return (
                <p>总成本: <span className="font-mono font-medium text-blue-600">¥{breakdown.totalCost.toFixed(2)}</span></p>
              );
            })()}
            <p>建议售价: <span className="font-mono font-medium text-emerald-600">¥{(selectedProduct ? (() => {
              const coeff = getProductCoefficients(selectedProduct, state.defaultCoefficients);
              const breakdown = calculateCostBreakdown(previewCost, coeff);
              return breakdown.totalCost * (1 + profitMargin / 100);
            })() : 0).toFixed(2)}</span></p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setGenerateDialogOpen(false)}>取消</Button>
            <Button size="sm" onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">确认生成</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">确定要删除此报价记录吗？</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button size="sm" variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuoteItemRow({ item }: { item: QuoteItem }) {
  const indentClass = item.level === 0 ? '' : item.level === 1 ? 'indent-1' : item.level === 2 ? 'indent-2' : 'indent-3';

  return (
    <tr className={`border-b border-slate-100 ${!item.isPart ? 'bg-blue-50/30' : ''}`}>
      <td className={`px-3 py-1.5 text-xs text-slate-500 ${indentClass}`}>
        L{item.level + 1}
      </td>
      <td className={`px-3 py-1.5 font-mono text-xs ${indentClass} ${!item.isPart ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
        {item.code}
      </td>
      <td className={`px-3 py-1.5 ${indentClass} ${!item.isPart ? 'font-medium text-blue-700' : ''}`}>
        {item.name}
      </td>
      <td className={`px-3 py-1.5 text-slate-500 text-xs ${indentClass}`}>{item.spec}</td>
      <td className="px-3 py-1.5 text-center text-xs">{item.unit}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs">{item.quantity}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs">¥{item.unitPrice.toFixed(2)}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs text-orange-500">
        {item.wasteRate > 0 ? `${(item.wasteRate * 100).toFixed(1)}%` : '-'}
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-xs font-medium text-amber-600">
        ¥{item.subtotal.toFixed(2)}
      </td>
    </tr>
  );
}
