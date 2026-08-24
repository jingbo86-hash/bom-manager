'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { LedScreenConfig, LedCostResult, LedCostItem } from '@/lib/types';

// ============================================================
// 工具函数
// ============================================================
const formatMoney = (v: number) => `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SectionHeader = ({ title, sectionKey, expanded, onToggle }: {
  title: string; sectionKey: string; expanded: boolean; onToggle: (key: string) => void;
}) => (
  <button
    onClick={() => onToggle(sectionKey)}
    className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
  >
    <span className="text-xs font-semibold text-slate-700">{title}</span>
    <svg
      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

// ============================================================
// 默认配置
// ============================================================
const DEFAULT_CONFIG: LedScreenConfig = {
  id: '',
  name: '新配置',
  width: 3,
  height: 2,
  pixelPitch: 2.5,
  indoorOutdoor: 'indoor',
  cabinetWidth: 640,
  cabinetHeight: 480,
  brightness: 1500,
  scanMode: 16,
  unitPrices: {
    ledBead: 0.018,
    driverIc: 0.35,
    pcb: 120,
    powerSupply: 85,
    cabinet: 350,
    receivingCard: 120,
    sendingCard: 350,
    cable: 15,
    labor: 45,
    shipping: 30,
    other: 20,
  },
  coefficients: {
    profitMargin: 15,
    taxRate: 13,
    managementRate: 5,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// 像素间距可选值
const PITCH_OPTIONS = [
  { value: 0.9, label: 'P0.9' },
  { value: 1.2, label: 'P1.2' },
  { value: 1.5, label: 'P1.5' },
  { value: 1.8, label: 'P1.8' },
  { value: 2.0, label: 'P2.0' },
  { value: 2.5, label: 'P2.5' },
  { value: 3, label: 'P3' },
  { value: 4, label: 'P4' },
  { value: 5, label: 'P5' },
  { value: 6, label: 'P6' },
  { value: 8, label: 'P8' },
  { value: 10, label: 'P10' },
];

// 箱体尺寸选项
const CABINET_OPTIONS = [
  { w: 500, h: 500, label: '500×500mm' },
  { w: 500, h: 1000, label: '500×1000mm' },
  { w: 640, h: 480, label: '640×480mm' },
  { w: 640, h: 640, label: '640×640mm' },
  { w: 960, h: 480, label: '960×480mm' },
  { w: 960, h: 960, label: '960×960mm' },
  { w: 1024, h: 768, label: '1024×768mm' },
];

// ============================================================
// 计算引擎
// ============================================================
function calcLedCost(config: LedScreenConfig): LedCostResult | null {
  const { width, height, pixelPitch, cabinetWidth, cabinetHeight, unitPrices, coefficients, scanMode } = config;
  if (width <= 0 || height <= 0 || pixelPitch <= 0) return null;

  const area = width * height;
  const pitchM = pixelPitch / 1000;
  const pixelsPerSqm = Math.round((1 / pitchM) ** 2);
  const totalPixels = Math.round(area * pixelsPerSqm);

  // 箱体数量
  const cabCols = Math.ceil((width * 1000) / cabinetWidth);
  const cabRows = Math.ceil((height * 1000) / cabinetHeight);
  const cabinetCount = cabCols * cabRows;

  // 实际箱体覆盖面积
  const actualCabWidth = cabCols * cabinetWidth / 1000;
  const actualCabHeight = cabRows * cabinetHeight / 1000;
  const actualArea = actualCabWidth * actualCabHeight;

  // 灯珠数量 = 总像素（全彩1像素=3颗灯珠）
  const ledCount = totalPixels * 3;
  const ledCost = ledCount * unitPrices.ledBead;

  // 驱动IC数量 = 总像素 / (扫描方式 × 16通道)
  const icCount = Math.ceil(totalPixels / (scanMode * 16));
  const icCost = icCount * unitPrices.driverIc;

  // PCB板
  const pcbCost = actualArea * unitPrices.pcb;

  // 电源：每6-8㎡一台
  const powerCount = Math.ceil(actualArea / 6);
  const powerCost = powerCount * unitPrices.powerSupply;

  // 箱体
  const cabinetCost = actualArea * unitPrices.cabinet;

  // 接收卡：每2个箱体一张
  const recvCardCount = Math.ceil(cabinetCount / 2);
  const recvCardCost = recvCardCount * unitPrices.receivingCard;

  // 发送卡：每4张接收卡配1张发送卡
  const sendCardCount = Math.max(1, Math.ceil(recvCardCount / 4));
  const sendCardCost = sendCardCount * unitPrices.sendingCard;

  // 线材
  const cableCost = actualArea * unitPrices.cable;

  const costItems: LedCostItem[] = [
    { name: 'LED灯珠', spec: `SMD ${pixelPitch}mm 全彩`, quantity: ledCount, unit: '颗', unitPrice: unitPrices.ledBead, amount: ledCost, ratio: 0 },
    { name: '驱动IC', spec: `恒流驱动 ${scanMode}扫`, quantity: icCount, unit: '颗', unitPrice: unitPrices.driverIc, amount: icCost, ratio: 0 },
    { name: 'PCB板', spec: '玻纤板', quantity: Math.round(actualArea * 100) / 100, unit: '㎡', unitPrice: unitPrices.pcb, amount: pcbCost, ratio: 0 },
    { name: '电源', spec: `${config.indoorOutdoor === 'indoor' ? '室内' : '室外'} 5V/40A`, quantity: powerCount, unit: '台', unitPrice: unitPrices.powerSupply, amount: powerCost, ratio: 0 },
    { name: '箱体', spec: `${cabinetWidth}×${cabinetHeight}mm 压铸铝`, quantity: Math.round(actualArea * 100) / 100, unit: '㎡', unitPrice: unitPrices.cabinet, amount: cabinetCost, ratio: 0 },
    { name: '接收卡', spec: 'HUB75接口', quantity: recvCardCount, unit: '张', unitPrice: unitPrices.receivingCard, amount: recvCardCost, ratio: 0 },
    { name: '发送卡', spec: '千兆网口', quantity: sendCardCount, unit: '张', unitPrice: unitPrices.sendingCard, amount: sendCardCost, ratio: 0 },
    { name: '线材', spec: '网线/电源线/排线', quantity: Math.round(actualArea * 100) / 100, unit: '㎡', unitPrice: unitPrices.cable, amount: cableCost, ratio: 0 },
  ];

  const materialCost = costItems.reduce((s, i) => s + i.amount, 0);
  const laborCost = actualArea * unitPrices.labor;
  const shippingCost = actualArea * unitPrices.shipping;
  const otherCost = actualArea * unitPrices.other;
  const subTotal = materialCost + laborCost + shippingCost + otherCost;
  const managementCost = subTotal * (coefficients.managementRate / 100);
  const taxCost = (subTotal + managementCost) * (coefficients.taxRate / 100);
  const totalCost = subTotal + managementCost + taxCost;
  const profit = totalCost * (coefficients.profitMargin / 100);
  const totalPrice = totalCost + profit;
  const pricePerSqm = totalPrice / actualArea;

  // 计算占比
  const grandTotal = totalPrice;
  for (const item of costItems) {
    item.ratio = grandTotal > 0 ? Math.round((item.amount / grandTotal) * 10000) / 100 : 0;
  }

  return {
    area: Math.round(actualArea * 100) / 100,
    cabinetCount,
    totalPixels,
    pixelsPerSqm,
    costItems,
    materialCost: Math.round(materialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    otherCost: Math.round(otherCost * 100) / 100,
    managementCost: Math.round(managementCost * 100) / 100,
    taxCost: Math.round(taxCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    pricePerSqm: Math.round(pricePerSqm * 100) / 100,
  };
}

// ============================================================
// 数字输入组件
// ============================================================
function NumInput({ label, value, onChange, unit, step = 1, min = 0 }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-600 w-24 flex-shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
        step={step}
        min={min}
        className="w-full h-8 px-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {unit && <span className="text-xs text-slate-400 w-8 flex-shrink-0">{unit}</span>}
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export function LedScreenCost() {
  const [config, setConfig] = useState<LedScreenConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('led_configs');
      if (saved) {
        try {
          const configs: LedScreenConfig[] = JSON.parse(saved);
          if (configs.length > 0) return configs[configs.length - 1];
        } catch {}
      }
    }
    return { ...DEFAULT_CONFIG, id: crypto.randomUUID?.() || Date.now().toString() };
  });
  const [savedConfigs, setSavedConfigs] = useState<LedScreenConfig[]>([]);
  const [configName, setConfigName] = useState(config.name);
  const [showSaved, setShowSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    screen: true,
    materials: false,
    coefficients: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载保存的配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('led_configs');
      if (saved) {
        try { setSavedConfigs(JSON.parse(saved)); } catch {}
      }
    }
  }, []);

  // 计算结果
  const result = useMemo(() => calcLedCost(config), [config]);

  // 更新配置片段
  const updateConfig = useCallback(<K extends keyof LedScreenConfig>(key: K, value: LedScreenConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value, updatedAt: Date.now() }));
  }, []);

  const updatePrice = useCallback((key: keyof typeof config.unitPrices, value: number) => {
    setConfig(prev => ({ ...prev, unitPrices: { ...prev.unitPrices, [key]: value }, updatedAt: Date.now() }));
  }, []);

  const updateCoefficient = useCallback((key: keyof typeof config.coefficients, value: number) => {
    setConfig(prev => ({ ...prev, coefficients: { ...prev.coefficients, [key]: value }, updatedAt: Date.now() }));
  }, []);

  // 保存配置
  const handleSave = () => {
    const newConfig = { ...config, name: configName, updatedAt: Date.now() };
    const existing = savedConfigs.filter(c => c.id !== newConfig.id);
    const updated = [...existing, newConfig];
    setSavedConfigs(updated);
    localStorage.setItem('led_configs', JSON.stringify(updated));
    setShowSaved(false);
  };

  // 加载配置
  const handleLoad = (cfg: LedScreenConfig) => {
    setConfig(cfg);
    setConfigName(cfg.name);
    setShowSaved(false);
  };

  // 删除配置
  const handleDelete = (id: string) => {
    const updated = savedConfigs.filter(c => c.id !== id);
    setSavedConfigs(updated);
    localStorage.setItem('led_configs', JSON.stringify(updated));
  };

  // 导出报告
  const handleExport = () => {
    if (!result) return;
    const lines = [
      '═══════════════════════════════════════',
      `  LED显示屏成本核算报告`,
      '═══════════════════════════════════════',
      '',
      `  配置名称: ${config.name}`,
      `  屏幕尺寸: ${config.width}m × ${config.height}m`,
      `  像素间距: P${config.pixelPitch}`,
      `  使用场景: ${config.indoorOutdoor === 'indoor' ? '室内' : '室外'}`,
      `  箱体规格: ${config.cabinetWidth}×${config.cabinetHeight}mm`,
      `  总面积: ${result.area}㎡`,
      `  箱体数量: ${result.cabinetCount}个`,
      `  总像素: ${result.totalPixels.toLocaleString()}点`,
      '',
      '─── 成本明细 ───',
      '',
      ...result.costItems.map(i =>
        `  ${i.name.padEnd(10)} ${i.quantity.toLocaleString()}${i.unit} × ${i.unitPrice} = ¥${i.amount.toLocaleString()} (${i.ratio}%)`
      ),
      '',
      '─── 费用汇总 ───',
      '',
      `  物料成本: ¥${result.materialCost.toLocaleString()}`,
      `  人工费用: ¥${result.laborCost.toLocaleString()}`,
      `  运输费用: ¥${result.shippingCost.toLocaleString()}`,
      `  其他费用: ¥${result.otherCost.toLocaleString()}`,
      `  管理费(${config.coefficients.managementRate}%): ¥${result.managementCost.toLocaleString()}`,
      `  税费(${config.coefficients.taxRate}%): ¥${result.taxCost.toLocaleString()}`,
      `  利润(${config.coefficients.profitMargin}%): ¥${result.profit.toLocaleString()}`,
      '',
      `  ─────────────────────────────`,
      `  总报价: ¥${result.totalPrice.toLocaleString()}`,
      `  单价: ¥${result.pricePerSqm}/㎡`,
      '',
      `  生成时间: ${new Date().toLocaleString()}`,
      '═══════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LED成本核算-${config.name}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex gap-4 h-full">
      {/* ============ 左侧：参数输入 ============ */}
      <div className="w-[420px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-2">
        {/* 配置名称 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={configName}
            onChange={e => setConfigName(e.target.value)}
            className="flex-1 h-8 px-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="配置名称"
          />
          <button onClick={handleSave} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
            保存
          </button>
          <button onClick={() => setShowSaved(!showSaved)} className="px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">
            历史
          </button>
        </div>

        {/* 保存的配置列表 */}
        {showSaved && savedConfigs.length > 0 && (
          <div className="border border-slate-200 rounded-md bg-white max-h-40 overflow-y-auto">
            {savedConfigs.map(cfg => (
              <div key={cfg.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0">
                <button onClick={() => handleLoad(cfg)} className="text-xs text-blue-600 hover:text-blue-800 text-left">
                  {cfg.name} <span className="text-slate-400">P{cfg.pixelPitch} {cfg.width}×{cfg.height}m</span>
                </button>
                <button onClick={() => handleDelete(cfg.id)} className="text-xs text-red-500 hover:text-red-700 ml-2">删除</button>
              </div>
            ))}
          </div>
        )}

        {/* 屏幕参数 */}
        <div className="space-y-2">
          <SectionHeader title="屏幕参数" sectionKey="screen" expanded={expandedSections.screen} onToggle={toggleSection} />
          {expandedSections.screen && (
            <div className="space-y-2 pl-1">
              <div className="flex gap-2">
                <NumInput label="宽度" value={config.width} onChange={v => updateConfig('width', v)} unit="m" step={0.1} />
                <NumInput label="高度" value={config.height} onChange={v => updateConfig('height', v)} unit="m" step={0.1} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-24">像素间距</label>
                <select
                  value={config.pixelPitch}
                  onChange={e => updateConfig('pixelPitch', parseFloat(e.target.value))}
                  className="flex-1 h-8 px-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {PITCH_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-24">使用场景</label>
                <select
                  value={config.indoorOutdoor}
                  onChange={e => updateConfig('indoorOutdoor', e.target.value as 'indoor' | 'outdoor')}
                  className="flex-1 h-8 px-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="indoor">室内</option>
                  <option value="outdoor">室外</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 w-24">箱体尺寸</label>
                <select
                  value={`${config.cabinetWidth}-${config.cabinetHeight}`}
                  onChange={e => {
                    const [w, h] = e.target.value.split('-').map(Number);
                    updateConfig('cabinetWidth', w);
                    updateConfig('cabinetHeight', h);
                  }}
                  className="flex-1 h-8 px-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {CABINET_OPTIONS.map(o => (
                    <option key={o.label} value={`${o.w}-${o.h}`}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <NumInput label="亮度" value={config.brightness} onChange={v => updateConfig('brightness', v)} unit="nits" step={100} />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 w-16">扫描</label>
                  <select
                    value={config.scanMode}
                    onChange={e => updateConfig('scanMode', parseInt(e.target.value))}
                    className="h-8 px-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={4}>1/4扫</option>
                    <option value={8}>1/8扫</option>
                    <option value={16}>1/16扫</option>
                    <option value={32}>1/32扫</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 材料单价 */}
        <div className="space-y-2">
          <SectionHeader title="材料单价" sectionKey="materials" expanded={expandedSections.materials} onToggle={toggleSection} />
          {expandedSections.materials && (
            <div className="space-y-2 pl-1">
              <NumInput label="LED灯珠" value={config.unitPrices.ledBead} onChange={v => updatePrice('ledBead', v)} unit="元/颗" step={0.001} />
              <NumInput label="驱动IC" value={config.unitPrices.driverIc} onChange={v => updatePrice('driverIc', v)} unit="元/颗" step={0.01} />
              <NumInput label="PCB板" value={config.unitPrices.pcb} onChange={v => updatePrice('pcb', v)} unit="元/㎡" step={1} />
              <NumInput label="电源" value={config.unitPrices.powerSupply} onChange={v => updatePrice('powerSupply', v)} unit="元/台" step={1} />
              <NumInput label="箱体" value={config.unitPrices.cabinet} onChange={v => updatePrice('cabinet', v)} unit="元/㎡" step={1} />
              <NumInput label="接收卡" value={config.unitPrices.receivingCard} onChange={v => updatePrice('receivingCard', v)} unit="元/张" step={1} />
              <NumInput label="发送卡" value={config.unitPrices.sendingCard} onChange={v => updatePrice('sendingCard', v)} unit="元/张" step={1} />
              <NumInput label="线材" value={config.unitPrices.cable} onChange={v => updatePrice('cable', v)} unit="元/㎡" step={1} />
              <NumInput label="人工组装" value={config.unitPrices.labor} onChange={v => updatePrice('labor', v)} unit="元/㎡" step={1} />
              <NumInput label="运输安装" value={config.unitPrices.shipping} onChange={v => updatePrice('shipping', v)} unit="元/㎡" step={1} />
              <NumInput label="其他费用" value={config.unitPrices.other} onChange={v => updatePrice('other', v)} unit="元/㎡" step={1} />
            </div>
          )}
        </div>

        {/* 成本系数 */}
        <div className="space-y-2">
          <SectionHeader title="成本系数" sectionKey="coefficients" expanded={expandedSections.coefficients} onToggle={toggleSection} />
          {expandedSections.coefficients && (
            <div className="space-y-2 pl-1">
              <NumInput label="利润率" value={config.coefficients.profitMargin} onChange={v => updateCoefficient('profitMargin', v)} unit="%" step={1} />
              <NumInput label="税率" value={config.coefficients.taxRate} onChange={v => updateCoefficient('taxRate', v)} unit="%" step={1} />
              <NumInput label="管理费" value={config.coefficients.managementRate} onChange={v => updateCoefficient('managementRate', v)} unit="%" step={1} />
            </div>
          )}
        </div>
      </div>

      {/* ============ 右侧：计算结果 ============ */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {/* 关键指标 */}
        {result && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">屏幕面积</div>
              <div className="text-lg font-bold text-slate-800">{result.area} <span className="text-xs font-normal text-slate-400">㎡</span></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">箱体数量</div>
              <div className="text-lg font-bold text-slate-800">{result.cabinetCount} <span className="text-xs font-normal text-slate-400">个</span></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">总报价</div>
              <div className="text-lg font-bold text-blue-600">{formatMoney(result.totalPrice)}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">单价</div>
              <div className="text-lg font-bold text-amber-600">{formatMoney(result.pricePerSqm)}<span className="text-xs font-normal text-slate-400">/㎡</span></div>
            </div>
          </div>
        )}

        {/* 成本明细表 */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">成本明细</h3>
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" /></svg>
                导出报告
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="text-left px-3 py-2 font-medium">项目</th>
                    <th className="text-left px-3 py-2 font-medium">规格</th>
                    <th className="text-right px-3 py-2 font-medium">数量</th>
                    <th className="text-right px-3 py-2 font-medium">单价</th>
                    <th className="text-right px-3 py-2 font-medium">金额</th>
                    <th className="text-right px-3 py-2 font-medium">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {result.costItems.map((item, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{item.name}</td>
                      <td className="px-3 py-2 text-slate-500">{item.spec}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatMoney(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">{formatMoney(item.amount)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{item.ratio}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 费用汇总 */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">费用汇总</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {[
                  { label: '物料成本', value: result.materialCost, color: '' },
                  { label: '人工费用', value: result.laborCost, color: '' },
                  { label: '运输费用', value: result.shippingCost, color: '' },
                  { label: '其他费用', value: result.otherCost, color: '' },
                  { label: '管理费', value: result.managementCost, color: '' },
                  { label: '税费', value: result.taxCost, color: '' },
                  { label: '', value: 0, color: '' }, // spacer
                  { label: '', value: 0, color: '' },
                  { label: '小计（成本）', value: result.totalCost, color: 'text-slate-800 font-semibold' },
                  { label: '利润', value: result.profit, color: 'text-emerald-600' },
                  { label: '总报价', value: result.totalPrice, color: 'text-blue-600 font-bold text-base' },
                  { label: '单价', value: result.pricePerSqm, color: 'text-amber-600 font-bold text-base', unit: '/㎡' },
                ].map((item, i) => (
                  item.label ? (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className={`text-xs font-mono ${item.color}`}>
                        {formatMoney(item.value)}{'unit' in item ? (item as any).unit : ''}
                      </span>
                    </div>
                  ) : <div key={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            请输入有效的屏幕参数以开始计算
          </div>
        )}
      </div>
    </div>
  );
}