'use client';

import { useAppState } from '@/lib/store';
import type { CostCoefficients } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateCostBreakdown } from '@/lib/bom-utils';

interface Props {
  coefficients: CostCoefficients;
  onChange: (coeff: CostCoefficients) => void;
  materialCost: number;
  isDefault?: boolean;
  onSaveDefault?: () => void;
}

const FIELDS = [
  { key: 'labor' as const, label: '人工成本系数', desc: '生产人员工资、奖金等' },
  { key: 'waste' as const, label: '损耗系数', desc: '材料损耗、废品等' },
  { key: 'freight' as const, label: '运费系数', desc: '运输、物流费用' },
  { key: 'tax' as const, label: '税费系数', desc: '增值税、附加税等' },
  { key: 'rent' as const, label: '房租分摊系数', desc: '厂房/办公室租金分摊' },
  { key: 'utilities' as const, label: '水电分摊系数', desc: '水费、电费分摊' },
];

export function CostCoefficientEditor({ coefficients, onChange, materialCost, isDefault, onSaveDefault }: Props) {
  const breakdown = calculateCostBreakdown(materialCost, coefficients);
  const totalRate = FIELDS.reduce((sum, f) => sum + coefficients[f.key], 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">综合成本系数</h3>
          {isDefault && <p className="text-xs text-slate-400 mt-0.5">新产品的默认系数，可针对每个产品单独调整</p>}
        </div>
        {isDefault && onSaveDefault && (
          <Button variant="outline" size="sm" onClick={onSaveDefault}>
            保存为默认值
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {FIELDS.map(field => (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs font-medium text-slate-600">{field.label}</Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={coefficients[field.key]}
                onChange={e => {
                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                  onChange({ ...coefficients, [field.key]: val });
                }}
                className="h-8 pr-7 text-xs text-right"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">{field.desc}</p>
          </div>
        ))}
      </div>

      {materialCost > 0 && (
        <>
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-medium text-slate-600 mb-2">费用明细预览</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: '物料成本', value: breakdown.materialCost, cls: 'text-slate-900' },
                { label: `人工费用 (${breakdown.laborRate}%)`, value: breakdown.laborCost, cls: 'text-blue-600' },
                { label: `损耗费用 (${breakdown.wasteRate}%)`, value: breakdown.wasteCost, cls: 'text-amber-600' },
                { label: `运费 (${breakdown.freightRate}%)`, value: breakdown.freightCost, cls: 'text-emerald-600' },
                { label: `税费 (${breakdown.taxRate}%)`, value: breakdown.taxCost, cls: 'text-purple-600' },
                { label: `房租分摊 (${breakdown.rentRate}%)`, value: breakdown.rentCost, cls: 'text-orange-600' },
                { label: `水电分摊 (${breakdown.utilitiesRate}%)`, value: breakdown.utilitiesCost, cls: 'text-cyan-600' },
              ].map(item => (
                <div key={item.label} className="bg-white rounded border border-slate-100 p-2">
                  <div className="text-[10px] text-slate-400">{item.label}</div>
                  <div className={`text-sm font-mono font-medium ${item.cls}`}>¥{item.value.toFixed(2)}</div>
                </div>
              ))}
              <div className="bg-blue-50 rounded border border-blue-100 p-2 col-span-2 sm:col-span-3">
                <div className="text-[10px] text-blue-500 font-medium">费用合计（含物料）</div>
                <div className="text-lg font-mono font-bold text-blue-700">¥{breakdown.totalCost.toFixed(2)}</div>
                <div className="text-[10px] text-blue-400 mt-0.5">
                  综合费率: {totalRate.toFixed(1)}%
                  {totalRate > 0 && ` (物料成本 × ${(1 + totalRate / 100).toFixed(3)})`}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}