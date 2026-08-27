'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Download, Plus, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BOMItem {
  name: string;
  price: number;
  qty: number;
  unit: string;
}

interface FogCoefficients {
  managementFee: number;
  taxRate: number;
  profitMargin: number;
}

interface FogLightConfig {
  id: string;
  name: string;
  mainItems: BOMItem[];       // 雾区诱导灯本体组件
  auxItems: BOMItem[];        // 辅助设备组件
  coefficients: FogCoefficients;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_MAIN_ITEMS: BOMItem[] = [
  { name: '光伏板', price: 380, qty: 2, unit: '块' },
  { name: '壳体', price: 560, qty: 1, unit: '套' },
  { name: '电池', price: 420, qty: 1, unit: '个' },
  { name: '电源', price: 185, qty: 1, unit: '个' },
  { name: '灯板', price: 320, qty: 1, unit: '块' },
  { name: '文字板', price: 280, qty: 1, unit: '块' },
  { name: '雷达', price: 650, qty: 1, unit: '个' },
  { name: '线材', price: 45, qty: 1, unit: '套' },
  { name: '其他', price: 120, qty: 1, unit: '批' },
];

const DEFAULT_AUX_ITEMS: BOMItem[] = [
  { name: '控制主机', price: 5800, qty: 1, unit: '台' },
  { name: '控制箱', price: 3200, qty: 1, unit: '套' },
  { name: '集中供电', price: 4500, qty: 1, unit: '套' },
  { name: '安装杆件', price: 2800, qty: 1, unit: '根' },
  { name: '雾灯安装底座', price: 650, qty: 1, unit: '个' },
];

const DEFAULT_COEFFICIENTS: FogCoefficients = {
  managementFee: 5,
  taxRate: 13,
  profitMargin: 15,
};

const DEFAULT_CONFIG: FogLightConfig = {
  id: '',
  name: '默认方案',
  mainItems: DEFAULT_MAIN_ITEMS.map(i => ({ ...i })),
  auxItems: DEFAULT_AUX_ITEMS.map(i => ({ ...i })),
  coefficients: { ...DEFAULT_COEFFICIENTS },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatMoney(v: number) {
  return `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculate(config: FogLightConfig) {
  const mainTotal = config.mainItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const auxTotal = config.auxItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const materialTotal = mainTotal + auxTotal;
  const managementFee = materialTotal * config.coefficients.managementFee / 100;
  const profit = materialTotal * config.coefficients.profitMargin / 100;
  const subtotal = materialTotal + managementFee + profit;
  const tax = subtotal * config.coefficients.taxRate / 100;
  const totalCost = subtotal + tax;

  const allItems = [
    ...config.mainItems.map(item => ({
      label: item.name,
      amount: item.price * item.qty,
      category: 'main' as const,
    })),
    ...config.auxItems.map(item => ({
      label: item.name,
      amount: item.price * item.qty,
      category: 'aux' as const,
    })),
    { label: '管理费', amount: managementFee, category: 'fee' as const },
    { label: '利润', amount: profit, category: 'fee' as const },
    { label: '税金', amount: tax, category: 'fee' as const },
  ];

  const costBreakdown = allItems.map(item => ({
    label: item.label,
    amount: Math.round(item.amount * 100) / 100,
    category: item.category,
    percentage: totalCost > 0 ? Math.round(item.amount / totalCost * 10000) / 100 : 0,
  }));

  return {
    mainTotal: Math.round(mainTotal * 100) / 100,
    auxTotal: Math.round(auxTotal * 100) / 100,
    materialTotal: Math.round(materialTotal * 100) / 100,
    costBreakdown,
    totalCost: Math.round(totalCost * 100) / 100,
    finalPrice: Math.round(totalCost * 100) / 100,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SavedConfig {
  id: string;
  name: string;
  config: FogLightConfig;
  createdAt: string;
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-sm font-semibold text-slate-900 bg-slate-100 w-full px-3 py-2 rounded-md hover:bg-slate-200 transition-colors"
    >
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      {label}
    </button>
  );
}

// ─── BOM Item Row ───────────────────────────────────────────────────────────

function BOMItemRow({
  item,
  index,
  onChange,
}: {
  item: BOMItem;
  index: number;
  onChange: (index: number, field: keyof BOMItem, value: number | string) => void;
}) {
  const subtotal = item.price * item.qty;
  return (
    <div className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-1.5 items-center text-xs">
      <span className="text-slate-700 truncate">{item.name}</span>
      <Input
        type="number"
        value={item.price}
        onChange={e => onChange(index, 'price', parseFloat(e.target.value) || 0)}
        className="h-7 text-xs"
        step={0.1}
        min={0}
      />
      <Input
        type="number"
        value={item.qty}
        onChange={e => onChange(index, 'qty', Math.max(0, parseInt(e.target.value) || 0))}
        className="h-7 text-xs"
        step={1}
        min={0}
      />
      <span className="text-right font-mono text-slate-800">{formatMoney(subtotal)}</span>
      <span className="text-right text-slate-400">{item.unit}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FogLightCost() {
  const [config, setConfig] = useState<FogLightConfig>({ ...DEFAULT_CONFIG, id: generateId() });
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    aux: true,
    coefficients: true,
    result: true,
  });

  // Load saved configs from MySQL
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ledConfigs', action: 'getAll' }),
        });
        const { data } = await res.json();
        if (data && data.length > 0) {
          const fogConfigs = data.filter((c: any) => c.data?.moduleType === 'fog');
          setSavedConfigs(fogConfigs.map((c: any) => ({
            id: c.id,
            name: c.name,
            config: c.data.config,
            createdAt: c.createdAt,
          })));
        }
      } catch (err) {
        console.error('Failed to load fog configs:', err);
      }
    };
    loadConfigs();
  }, []);

  const updateConfig = useCallback((updates: Partial<FogLightConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleMainItemChange = useCallback((index: number, field: keyof BOMItem, value: number | string) => {
    setConfig(prev => {
      const items = [...prev.mainItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, mainItems: items };
    });
  }, []);

  const handleAuxItemChange = useCallback((index: number, field: keyof BOMItem, value: number | string) => {
    setConfig(prev => {
      const items = [...prev.auxItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, auxItems: items };
    });
  }, []);

  const updateCoefficient = useCallback((key: keyof FogCoefficients, value: number) => {
    setConfig(prev => ({
      ...prev,
      coefficients: { ...prev.coefficients, [key]: value },
    }));
  }, []);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const saveConfig = useCallback(async () => {
    const name = config.name || `方案_${new Date().toLocaleDateString()}`;
    const saveData = {
      id: generateId(),
      name,
      data: { moduleType: 'fog', config },
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ledConfigs', action: 'create', data: saveData }),
      });
      const result = await res.json();
      if (result.data) {
        setSavedConfigs(prev => [...prev, { id: result.data.id, name, config, createdAt: saveData.createdAt }]);
      }
    } catch (err) {
      console.error('Failed to save fog config:', err);
    }
  }, [config]);

  const loadConfig = useCallback((saved: SavedConfig) => {
    setConfig({ ...saved.config });
  }, []);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ledConfigs', action: 'delete', data: { id } }),
      });
      setSavedConfigs(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete fog config:', err);
    }
  }, []);

  const exportTxt = useCallback(() => {
    const result = calculate(config);
    const lines = [
      '═══════════════════════════════════════════════',
      '        雾区诱导灯成本核算报告',
      '═══════════════════════════════════════════════',
      '',
      `方案名称: ${config.name}`,
      `日期: ${new Date().toLocaleDateString()}`,
      '',
      '── 诱导灯本体组件 ──',
      ...config.mainItems.map(i =>
        `${i.name.padEnd(8, ' ')} ¥${String(i.price).padStart(8)} × ${i.qty}${i.unit} = ${formatMoney(i.price * i.qty)}`
      ),
      `小计: ${formatMoney(result.mainTotal)}`,
      '',
      '── 辅助设备 ──',
      ...config.auxItems.map(i =>
        `${i.name.padEnd(8, ' ')} ¥${String(i.price).padStart(8)} × ${i.qty}${i.unit} = ${formatMoney(i.price * i.qty)}`
      ),
      `小计: ${formatMoney(result.auxTotal)}`,
      '',
      '── 成本明细 ──',
      ...result.costBreakdown.map(item =>
        `${item.label.padEnd(12, ' ')} ${formatMoney(item.amount).padStart(12)} (${item.percentage}%)`
      ),
      '',
      `总成本: ${formatMoney(result.totalCost)}`,
      '═══════════════════════════════════════════════',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `雾区诱导灯核算_${config.name}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const result = useCallback(() => calculate(config), [config])();

  const mainTotal = config.mainItems.reduce((s, i) => s + i.price * i.qty, 0);
  const auxTotal = config.auxItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <h2 className="text-base font-semibold">雾区诱导灯成本核算</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={saveConfig} className="h-7 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" /> 保存方案
          </Button>
          <Button size="sm" variant="outline" onClick={exportTxt} className="h-7 text-xs">
            <Download className="h-3.5 w-3.5 mr-1" /> 导出TXT
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfig({ ...DEFAULT_CONFIG, id: generateId() })} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> 新建
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
          {/* Left: BOM */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="方案名称" expanded={true} onToggle={() => {}} />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <Input
                  value={config.name}
                  onChange={e => updateConfig({ name: e.target.value })}
                  className="h-7 text-xs"
                  placeholder="输入方案名称"
                />
              </CardContent>
            </Card>

            {/* 诱导灯本体组件 */}
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader
                  label={`诱导灯本体组件 小计: ${formatMoney(mainTotal)}`}
                  expanded={expandedSections.main}
                  onToggle={() => toggleSection('main')}
                />
              </CardHeader>
              {expandedSections.main && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-1.5 text-xs text-slate-400 px-1">
                    <span>名称</span>
                    <span className="text-center">单价</span>
                    <span className="text-center">数量</span>
                    <span className="text-right">小计</span>
                    <span className="text-right">单位</span>
                  </div>
                  {config.mainItems.map((item, i) => (
                    <BOMItemRow key={item.name} item={item} index={i} onChange={handleMainItemChange} />
                  ))}
                  {config.mainItems.length > 0 && (
                    <div className="border-t pt-2 flex justify-between text-sm font-semibold text-blue-600">
                      <span>本体组件小计</span>
                      <span>{formatMoney(mainTotal)}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* 辅助设备 */}
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader
                  label={`辅助设备 小计: ${formatMoney(auxTotal)}`}
                  expanded={expandedSections.aux}
                  onToggle={() => toggleSection('aux')}
                />
              </CardHeader>
              {expandedSections.aux && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="grid grid-cols-[1fr_80px_60px_80px_80px] gap-1.5 text-xs text-slate-400 px-1">
                    <span>名称</span>
                    <span className="text-center">单价</span>
                    <span className="text-center">数量</span>
                    <span className="text-right">小计</span>
                    <span className="text-right">单位</span>
                  </div>
                  {config.auxItems.map((item, i) => (
                    <BOMItemRow key={item.name} item={item} index={i} onChange={handleAuxItemChange} />
                  ))}
                  {config.auxItems.length > 0 && (
                    <div className="border-t pt-2 flex justify-between text-sm font-semibold text-amber-600">
                      <span>辅助设备小计</span>
                      <span>{formatMoney(auxTotal)}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* 成本系数 */}
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="成本系数" expanded={expandedSections.coefficients} onToggle={() => toggleSection('coefficients')} />
              </CardHeader>
              {expandedSections.coefficients && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">管理费 (%)</Label>
                    <Input
                      type="number"
                      value={config.coefficients.managementFee}
                      onChange={e => updateCoefficient('managementFee', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs flex-1"
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">税率 (%)</Label>
                    <Input
                      type="number"
                      value={config.coefficients.taxRate}
                      onChange={e => updateCoefficient('taxRate', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs flex-1"
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">利润率 (%)</Label>
                    <Input
                      type="number"
                      value={config.coefficients.profitMargin}
                      onChange={e => updateCoefficient('profitMargin', parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs flex-1"
                      step={0.1}
                      min={0}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right: Result */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="成本明细" expanded={expandedSections.result} onToggle={() => toggleSection('result')} />
              </CardHeader>
              {expandedSections.result && (
                <CardContent className="px-3 pb-3">
                  <div className="space-y-1">
                    {result.costBreakdown.map(item => (
                      <div
                        key={item.label}
                        className={`flex justify-between items-center py-1.5 px-2 rounded text-xs ${
                          item.category === 'fee' ? 'bg-slate-50' : ''
                        }`}
                      >
                        <span className="text-slate-700">{item.label}</span>
                        <span className="font-mono text-slate-800">{formatMoney(item.amount)}</span>
                        <span className="text-slate-400 w-10 text-right">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between items-center px-2">
                    <span className="font-semibold text-sm text-blue-600">总成本</span>
                    <span className="font-mono font-bold text-base text-blue-600">{formatMoney(result.totalCost)}</span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Saved Configs */}
            {savedConfigs.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <h3 className="text-xs font-semibold text-slate-600">已保存方案</h3>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {savedConfigs.map(sc => (
                    <div key={sc.id} className="flex items-center justify-between py-1">
                      <button
                        type="button"
                        onClick={() => loadConfig(sc)}
                        className="text-xs text-blue-600 hover:underline text-left"
                      >
                        {sc.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteConfig(sc.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}