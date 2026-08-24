'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Save, Download, Plus, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type PixelPitch = string; // "P1.2", "P1.5", ..., "P33.33"

interface MaterialPrices {
  ledModule: number;       // LED模组（元/块）
  cabinet: number;         // 箱体（元/个）
  solarPower: number;      // 太阳能供电系统（元/套）
  powerSupply: number;     // 电源（元/个）
  mountingFrame: number;   // 安装架体（元/m²）
  controlSystem: number;   // 控制系统（元/套）
  radarDetection: number;  // 雷达检测系统（元/套）
  warningSystem: number;   // 声光警示系统（元/套）
}

interface Coefficients {
  managementFee: number;   // 管理费 %
  taxRate: number;         // 税率 %
  profitMargin: number;    // 利润率 %
}

interface LedScreenConfig {
  id: string;
  name: string;
  // 屏幕参数
  width: number;           // 宽度(m)
  height: number;          // 高度(m)
  pitch: PixelPitch;       // 像素间距
  environment: 'indoor' | 'outdoor';
  manufacturer: string;
  moduleWidth: number;     // 模组宽度(mm)
  moduleHeight: number;    // 模组高度(mm)
  cabinetWidth: number;    // 箱体宽度(mm)
  cabinetHeight: number;   // 箱体高度(mm)
  // 材料单价
  unitPrices: MaterialPrices;
  // 数量系数
  materialQuantities: {
    solarPower: number;     // 太阳能供电系统数量
    controlSystem: number;  // 控制系统数量
    radarDetection: number; // 雷达检测系统数量
    warningSystem: number;  // 声光警示系统数量
    powerSupplyPerCabinet: number; // 每个箱体配电源数
  };
  // 成本系数
  coefficients: Coefficients;
}

interface CalculationResult {
  area: number;
  moduleCount: number;
  totalPixels: number;
  pixelDensity: number;
  cabinetCount: number;
  costBreakdown: { label: string; amount: number; percentage: number }[];
  totalCost: number;
  finalPrice: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PIXEL_PITCHES: PixelPitch[] = [
  'P1.2', 'P1.5', 'P1.8', 'P2.0', 'P2.5', 'P3', 'P4', 'P5',
  'P6', 'P8', 'P10', 'P16', 'P20', 'P25', 'P31.25', 'P33.33',
];

const MANUFACTURERS = ['格莱光', '鑫恩拓', '光茗光电'];

const PITCH_MM: Record<string, number> = {
  'P1.2': 1.2, 'P1.5': 1.5, 'P1.8': 1.8, 'P2.0': 2.0, 'P2.5': 2.5,
  'P3': 3, 'P4': 4, 'P5': 5, 'P6': 6, 'P8': 8, 'P10': 10,
  'P16': 16, 'P20': 20, 'P25': 25, 'P31.25': 31.25, 'P33.33': 33.33,
};

// 根据像素间距推荐模组尺寸 (mm)
const RECOMMENDED_MODULE_SIZE: Record<string, { w: number; h: number }> = {
  'P1.2': { w: 320, h: 160 }, 'P1.5': { w: 320, h: 160 }, 'P1.8': { w: 320, h: 160 },
  'P2.0': { w: 320, h: 160 }, 'P2.5': { w: 320, h: 160 },
  'P3': { w: 192, h: 192 }, 'P4': { w: 256, h: 128 }, 'P5': { w: 320, h: 160 },
  'P6': { w: 192, h: 192 }, 'P8': { w: 320, h: 160 }, 'P10': { w: 320, h: 160 },
  'P16': { w: 640, h: 320 }, 'P20': { w: 640, h: 320 }, 'P25': { w: 640, h: 320 },
  'P31.25': { w: 640, h: 320 }, 'P33.33': { w: 640, h: 320 },
};

// 根据像素间距推荐箱体尺寸 (mm)
const RECOMMENDED_CABINET_SIZE: Record<string, { w: number; h: number }> = {
  'P1.2': { w: 640, h: 480 }, 'P1.5': { w: 640, h: 480 }, 'P1.8': { w: 640, h: 480 },
  'P2.0': { w: 640, h: 480 }, 'P2.5': { w: 640, h: 480 },
  'P3': { w: 576, h: 576 }, 'P4': { w: 640, h: 480 }, 'P5': { w: 640, h: 480 },
  'P6': { w: 576, h: 576 }, 'P8': { w: 640, h: 480 }, 'P10': { w: 640, h: 480 },
  'P16': { w: 1280, h: 640 }, 'P20': { w: 1280, h: 640 }, 'P25': { w: 1280, h: 640 },
  'P31.25': { w: 1280, h: 640 }, 'P33.33': { w: 1280, h: 640 },
};

const DEFAULT_UNIT_PRICES: MaterialPrices = {
  ledModule: 85,
  cabinet: 350,
  solarPower: 5800,
  powerSupply: 120,
  mountingFrame: 180,
  controlSystem: 3200,
  radarDetection: 6500,
  warningSystem: 3800,
};

const DEFAULT_COEFFICIENTS: Coefficients = {
  managementFee: 5,
  taxRate: 13,
  profitMargin: 15,
};

const DEFAULT_MATERIAL_QTY = {
  solarPower: 1,
  controlSystem: 1,
  radarDetection: 1,
  warningSystem: 1,
  powerSupplyPerCabinet: 1,
};

function createDefaultConfig(name: string): LedScreenConfig {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    width: 3,
    height: 2,
    pitch: 'P4',
    environment: 'indoor',
    manufacturer: '格莱光',
    moduleWidth: 320,
    moduleHeight: 160,
    cabinetWidth: 640,
    cabinetHeight: 480,
    unitPrices: { ...DEFAULT_UNIT_PRICES },
    materialQuantities: { ...DEFAULT_MATERIAL_QTY },
    coefficients: { ...DEFAULT_COEFFICIENTS },
  };
}

function formatMoney(v: number): string {
  return `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// ─── Number Input ───────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChange,
  unit,
  step = 0.01,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-32 shrink-0 text-xs text-slate-600">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && v >= min) onChange(v);
        }}
        step={step}
        min={min}
        className="h-7 text-xs"
      />
      {unit && <span className="text-xs text-slate-500 w-10">{unit}</span>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LedScreenCost() {
  // 当前配置
  const [config, setConfig] = useState<LedScreenConfig>(() => createDefaultConfig('新配置'));
  // 保存的配置列表
  const [savedConfigs, setSavedConfigs] = useState<LedScreenConfig[]>([]);
  // 当前配置名称
  const [configName, setConfigName] = useState('新配置');
  // 展开折叠
  const [expanded, setExpanded] = useState({
    screen: true,
    materials: true,
    coefficients: true,
    result: true,
  });
  const [msg, setMsg] = useState('');

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const raw = localStorage.getItem('led_screen_configs');
      if (raw) {
        const list: LedScreenConfig[] = JSON.parse(raw);
        setSavedConfigs(list);
      }
    } catch { /* ignore */ }
  }, []);

  // 保存到 localStorage
  const saveConfigs = useCallback((list: LedScreenConfig[]) => {
    localStorage.setItem('led_screen_configs', JSON.stringify(list));
    setSavedConfigs(list);
  }, []);

  // 更新配置字段
  const updateConfig = useCallback(<K extends keyof LedScreenConfig>(
    key: K, value: LedScreenConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  // 更新材料单价
  const updatePrice = useCallback(<K extends keyof MaterialPrices>(
    key: K, value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      unitPrices: { ...prev.unitPrices, [key]: value },
    }));
  }, []);

  // 更新系数
  const updateCoefficient = useCallback(<K extends keyof Coefficients>(
    key: K, value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      coefficients: { ...prev.coefficients, [key]: value },
    }));
  }, []);

  // 更新材料数量
  const updateQuantity = useCallback(<K extends keyof LedScreenConfig['materialQuantities']>(
    key: K, value: number
  ) => {
    setConfig((prev) => ({
      ...prev,
      materialQuantities: { ...prev.materialQuantities, [key]: value },
    }));
  }, []);

  // 切换像素间距时自动更新推荐尺寸
  useEffect(() => {
    const mod = RECOMMENDED_MODULE_SIZE[config.pitch];
    const cab = RECOMMENDED_CABINET_SIZE[config.pitch];
    if (mod) {
      setConfig((prev) => ({ ...prev, moduleWidth: mod.w, moduleHeight: mod.h }));
    }
    if (cab) {
      setConfig((prev) => ({ ...prev, cabinetWidth: cab.w, cabinetHeight: cab.h }));
    }
  }, [config.pitch]);

  // ─── 计算结果 ────────────────────────────────────────────────────────

  const calc = useCallback((): CalculationResult | null => {
    const { width, height, pitch, moduleWidth, moduleHeight, cabinetWidth, cabinetHeight, unitPrices, materialQuantities, coefficients } = config;
    const pitchMm = PITCH_MM[pitch];
    if (!pitchMm || width <= 0 || height <= 0) return null;

    const area = width * height;
    const moduleW = moduleWidth / 1000;
    const moduleH = moduleHeight / 1000;
    const modulesPerRow = Math.ceil(width / moduleW);
    const modulesPerCol = Math.ceil(height / moduleH);
    const moduleCount = modulesPerRow * modulesPerCol;

    const cabW = cabinetWidth / 1000;
    const cabH = cabinetHeight / 1000;
    const cabsPerRow = Math.ceil(width / cabW);
    const cabsPerCol = Math.ceil(height / cabH);
    const cabinetCount = cabsPerRow * cabsPerCol;

    // 总像素 = (宽/mm间距) × (高/mm间距)
    const pixelsW = Math.round((width * 1000) / pitchMm);
    const pixelsH = Math.round((height * 1000) / pitchMm);
    const totalPixels = pixelsW * pixelsH;
    const pixelDensity = Math.round(totalPixels / area);

    // ─── 成本明细 ───
    const items: { label: string; amount: number }[] = [
      { label: 'LED模组', amount: unitPrices.ledModule * moduleCount },
      { label: '箱体', amount: unitPrices.cabinet * cabinetCount },
      { label: '电源', amount: unitPrices.powerSupply * cabinetCount * materialQuantities.powerSupplyPerCabinet },
      { label: '安装架体', amount: unitPrices.mountingFrame * area },
      { label: '太阳能供电系统', amount: unitPrices.solarPower * materialQuantities.solarPower },
      { label: '控制系统', amount: unitPrices.controlSystem * materialQuantities.controlSystem },
      { label: '雷达检测系统', amount: unitPrices.radarDetection * materialQuantities.radarDetection },
      { label: '声光警示系统', amount: unitPrices.warningSystem * materialQuantities.warningSystem },
    ];

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const managementFee = subtotal * coefficients.managementFee / 100;
    const totalWithManagement = subtotal + managementFee;
    const tax = totalWithManagement * coefficients.taxRate / 100;
    const totalWithTax = totalWithManagement + tax;
    const profit = totalWithTax * coefficients.profitMargin / 100;
    const finalPrice = totalWithTax + profit;

    const breakdown = [
      ...items,
      { label: '管理费', amount: managementFee },
      { label: '税金', amount: tax },
      { label: '利润', amount: profit },
    ];

    return {
      area: Math.round(area * 100) / 100,
      moduleCount,
      totalPixels,
      pixelDensity,
      cabinetCount,
      costBreakdown: breakdown.map((item) => ({
        ...item,
        percentage: finalPrice > 0 ? (item.amount / finalPrice) * 100 : 0,
      })),
      totalCost: subtotal,
      finalPrice,
    };
  }, [config]);

  const result = calc();

  // ─── 保存配置 ────────────────────────────────────────────────────────

  const handleSave = () => {
    const name = configName.trim() || `配置_${Date.now()}`;
    const newConfig = { ...config, name };
    const existing = savedConfigs.findIndex((c) => c.id === config.id);
    let list: LedScreenConfig[];
    if (existing >= 0) {
      list = [...savedConfigs];
      list[existing] = newConfig;
    } else {
      list = [...savedConfigs, newConfig];
    }
    saveConfigs(list);
    setMsg(`✓ 配置"${name}"已保存`);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleLoad = (id: string) => {
    const found = savedConfigs.find((c) => c.id === id);
    if (found) {
      setConfig(found);
      setConfigName(found.name);
      setMsg(`✓ 已加载"${found.name}"`);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const handleDelete = (id: string) => {
    const list = savedConfigs.filter((c) => c.id !== id);
    saveConfigs(list);
    setMsg('✓ 配置已删除');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleNew = () => {
    setConfig(createDefaultConfig('新配置'));
    setConfigName('新配置');
  };

  // ─── 导出 TXT ────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!result) return;
    const lines: string[] = [];
    const sep = '='.repeat(50);
    const sep2 = '-'.repeat(50);

    lines.push(sep);
    lines.push('  LED显示屏成本核算报告');
    lines.push(sep);
    lines.push('');
    lines.push(`配置名称: ${configName}`);
    lines.push(`生成时间: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push(sep2);
    lines.push('【屏幕参数】');
    lines.push(sep2);
    lines.push(`屏体尺寸: ${config.width}m × ${config.height}m`);
    lines.push(`显示面积: ${result.area}m²`);
    lines.push(`像素间距: ${config.pitch}`);
    lines.push(`使用环境: ${config.environment === 'indoor' ? '室内' : '户外'}`);
    lines.push(`生产厂家: ${config.manufacturer}`);
    lines.push(`模组尺寸: ${config.moduleWidth}×${config.moduleHeight}mm`);
    lines.push(`箱体尺寸: ${config.cabinetWidth}×${config.cabinetHeight}mm`);
    lines.push(`模组数量: ${result.moduleCount} 块`);
    lines.push(`箱体数量: ${result.cabinetCount} 个`);
    lines.push(`总像素数: ${result.totalPixels.toLocaleString()} 像素`);
    lines.push(`像素密度: ${result.pixelDensity.toLocaleString()} 像素/m²`);
    lines.push('');

    lines.push(sep2);
    lines.push('【成本明细】');
    lines.push(sep2);
    const header = '项目'.padEnd(16) + '金额'.padStart(12) + '占比'.padStart(10);
    lines.push(header);
    lines.push('-'.repeat(38));
    for (const item of result.costBreakdown) {
      lines.push(
        item.label.padEnd(16) +
        formatMoney(item.amount).padStart(12) +
        item.percentage.toFixed(1).padStart(8) + '%'
      );
    }
    lines.push('-'.repeat(38));
    lines.push(
      '合计'.padEnd(16) +
      formatMoney(result.finalPrice).padStart(12) +
      '100.0%'.padStart(10)
    );
    lines.push('');
    lines.push(`材料成本小计: ${formatMoney(result.totalCost)}`);
    lines.push(`管理费(${config.coefficients.managementFee}%): ${formatMoney(result.costBreakdown.find(i => i.label === '管理费')?.amount || 0)}`);
    lines.push(`税率(${config.coefficients.taxRate}%): ${formatMoney(result.costBreakdown.find(i => i.label === '税金')?.amount || 0)}`);
    lines.push(`利润(${config.coefficients.profitMargin}%): ${formatMoney(result.costBreakdown.find(i => i.label === '利润')?.amount || 0)}`);
    lines.push('');
    lines.push(`最终报价: ${formatMoney(result.finalPrice)}`);
    lines.push(`单位面积价格: ${formatMoney(result.finalPrice / result.area)}/m²`);
    lines.push('');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LED屏成本_${configName.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">LED屏成本核算</h2>
          <Input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            className="h-7 w-36 text-xs"
          />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleNew}>
            <Plus className="w-3 h-3 mr-1" /> 新建
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
            <Save className="w-3 h-3 mr-1" /> 保存
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExport} disabled={!result}>
            <Download className="w-3 h-3 mr-1" /> 导出TXT
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">加载配置:</Label>
          <Select onValueChange={handleLoad}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="选择保存的配置" />
            </SelectTrigger>
            <SelectContent>
              {savedConfigs.length === 0 && (
                <SelectItem value="__none" disabled>暂无保存的配置</SelectItem>
              )}
              {savedConfigs.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.pitch} / {c.width}m×{c.height}m)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        </div>
      </div>

      {/* 主内容区 - 滚动 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── 屏幕参数 ── */}
        <Card>
          <CardHeader className="py-2 px-3">
            <SectionHeader
              label="屏幕参数"
              expanded={expanded.screen}
              onToggle={() => setExpanded((e) => ({ ...e, screen: !e.screen }))}
            />
          </CardHeader>
          {expanded.screen && (
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <NumInput label="屏体宽度" value={config.width} onChange={(v) => updateConfig('width', v)} unit="m" />
                <NumInput label="屏体高度" value={config.height} onChange={(v) => updateConfig('height', v)} unit="m" />
                <div className="flex items-center gap-2">
                  <Label className="w-24 shrink-0 text-xs text-slate-600">像素间距</Label>
                  <Select
                    value={config.pitch}
                    onValueChange={(v) => updateConfig('pitch', v as PixelPitch)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIXEL_PITCHES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-24 shrink-0 text-xs text-slate-600">使用环境</Label>
                  <Select
                    value={config.environment}
                    onValueChange={(v) => updateConfig('environment', v as 'indoor' | 'outdoor')}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">室内</SelectItem>
                      <SelectItem value="outdoor">户外</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <Label className="w-24 shrink-0 text-xs text-slate-600">生产厂家</Label>
                  <Select
                    value={config.manufacturer}
                    onValueChange={(v) => updateConfig('manufacturer', v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MANUFACTURERS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <NumInput label="模组宽度" value={config.moduleWidth} onChange={(v) => updateConfig('moduleWidth', v)} unit="mm" />
                <NumInput label="模组高度" value={config.moduleHeight} onChange={(v) => updateConfig('moduleHeight', v)} unit="mm" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <NumInput label="箱体宽度" value={config.cabinetWidth} onChange={(v) => updateConfig('cabinetWidth', v)} unit="mm" />
                <NumInput label="箱体高度" value={config.cabinetHeight} onChange={(v) => updateConfig('cabinetHeight', v)} unit="mm" />
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── 自动计算结果 ── */}
        {result && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-semibold text-blue-800">自动计算结果</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                <div className="bg-white rounded p-2 border"><span className="text-slate-500">显示面积</span><br /><span className="text-lg font-bold text-blue-700">{result.area} m²</span></div>
                <div className="bg-white rounded p-2 border"><span className="text-slate-500">模组数量</span><br /><span className="text-lg font-bold text-blue-700">{result.moduleCount} 块</span></div>
                <div className="bg-white rounded p-2 border"><span className="text-slate-500">箱体数量</span><br /><span className="text-lg font-bold text-blue-700">{result.cabinetCount} 个</span></div>
                <div className="bg-white rounded p-2 border"><span className="text-slate-500">总像素数</span><br /><span className="text-lg font-bold text-blue-700">{result.totalPixels.toLocaleString()}</span></div>
                <div className="bg-white rounded p-2 border"><span className="text-slate-500">像素密度</span><br /><span className="text-lg font-bold text-blue-700">{result.pixelDensity.toLocaleString()} /m²</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 材料单价 ── */}
        <Card>
          <CardHeader className="py-2 px-3">
            <SectionHeader
              label="材料单价"
              expanded={expanded.materials}
              onToggle={() => setExpanded((e) => ({ ...e, materials: !e.materials }))}
            />
          </CardHeader>
          {expanded.materials && (
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <NumInput label="LED模组" value={config.unitPrices.ledModule} onChange={(v) => updatePrice('ledModule', v)} unit="元/块" step={1} />
                <NumInput label="箱体" value={config.unitPrices.cabinet} onChange={(v) => updatePrice('cabinet', v)} unit="元/个" step={1} />
                <NumInput label="电源" value={config.unitPrices.powerSupply} onChange={(v) => updatePrice('powerSupply', v)} unit="元/个" step={1} />
                <NumInput label="安装架体" value={config.unitPrices.mountingFrame} onChange={(v) => updatePrice('mountingFrame', v)} unit="元/m²" step={1} />
                <NumInput label="太阳能供电系统" value={config.unitPrices.solarPower} onChange={(v) => updatePrice('solarPower', v)} unit="元/套" step={10} />
                <NumInput label="控制系统" value={config.unitPrices.controlSystem} onChange={(v) => updatePrice('controlSystem', v)} unit="元/套" step={10} />
                <NumInput label="雷达检测系统" value={config.unitPrices.radarDetection} onChange={(v) => updatePrice('radarDetection', v)} unit="元/套" step={10} />
                  <NumInput label="声光警示系统" value={config.unitPrices.warningSystem} onChange={(v) => updatePrice('warningSystem', v)} unit="元/套" step={10} />
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs font-semibold text-slate-600 mb-2">数量系数</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <NumInput label="太阳能供电系统" value={config.materialQuantities.solarPower} onChange={(v) => updateQuantity('solarPower', v)} unit="套" step={1} min={0} />
                  <NumInput label="控制系统" value={config.materialQuantities.controlSystem} onChange={(v) => updateQuantity('controlSystem', v)} unit="套" step={1} min={0} />
                  <NumInput label="雷达检测系统" value={config.materialQuantities.radarDetection} onChange={(v) => updateQuantity('radarDetection', v)} unit="套" step={1} min={0} />
                  <NumInput label="声光警示系统" value={config.materialQuantities.warningSystem} onChange={(v) => updateQuantity('warningSystem', v)} unit="套" step={1} min={0} />
                  <NumInput label="每箱体配电源" value={config.materialQuantities.powerSupplyPerCabinet} onChange={(v) => updateQuantity('powerSupplyPerCabinet', v)} unit="个/箱" step={1} min={0} />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── 成本系数 ── */}
        <Card>
          <CardHeader className="py-2 px-3">
            <SectionHeader
              label="成本系数"
              expanded={expanded.coefficients}
              onToggle={() => setExpanded((e) => ({ ...e, coefficients: !e.coefficients }))}
            />
          </CardHeader>
          {expanded.coefficients && (
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <NumInput label="管理费" value={config.coefficients.managementFee} onChange={(v) => updateCoefficient('managementFee', v)} unit="%" step={0.5} />
                <NumInput label="税率" value={config.coefficients.taxRate} onChange={(v) => updateCoefficient('taxRate', v)} unit="%" step={0.5} />
                <NumInput label="利润率" value={config.coefficients.profitMargin} onChange={(v) => updateCoefficient('profitMargin', v)} unit="%" step={0.5} />
              </div>
            </CardContent>
          )}
        </Card>

        {/* ── 成本明细表 ── */}
        {result && (
          <Card>
            <CardHeader className="py-2 px-3">
              <SectionHeader
                label={`成本明细表 — 最终报价: ${formatMoney(result.finalPrice)}`}
                expanded={expanded.result}
                onToggle={() => setExpanded((e) => ({ ...e, result: !e.result }))}
              />
            </CardHeader>
            {expanded.result && (
              <CardContent className="px-3 pb-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-2 py-1.5 border">项目</th>
                        <th className="text-right px-2 py-1.5 border">金额</th>
                        <th className="text-right px-2 py-1.5 border">占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.costBreakdown.map((item, i) => (
                        <tr key={i} className={i < result.costBreakdown.length - 3 ? '' : 'bg-amber-50/50'}>
                          <td className="px-2 py-1 border">{item.label}</td>
                          <td className="text-right px-2 py-1 border font-mono">{formatMoney(item.amount)}</td>
                          <td className="text-right px-2 py-1 border">{item.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td className="px-2 py-1.5 border">最终报价</td>
                        <td className="text-right px-2 py-1.5 border font-mono text-blue-700">{formatMoney(result.finalPrice)}</td>
                        <td className="text-right px-2 py-1.5 border">100%</td>
                      </tr>
                      <tr className="text-xs text-slate-500">
                        <td className="px-2 py-1 border" colSpan={3}>
                          单位面积价格: {formatMoney(result.finalPrice / result.area)}/m²
                          &nbsp;|&nbsp; 材料成本: {formatMoney(result.totalCost)}
                          &nbsp;|&nbsp; 管理费: {config.coefficients.managementFee}%
                          &nbsp;|&nbsp; 税率: {config.coefficients.taxRate}%
                          &nbsp;|&nbsp; 利润: {config.coefficients.profitMargin}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* ── 已保存配置列表 ── */}
        {savedConfigs.length > 0 && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-semibold text-slate-700">已保存配置 ({savedConfigs.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-1">
                {savedConfigs.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50 border">
                    <div className="text-xs">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-slate-400 ml-2">
                        {c.pitch} | {c.width}m×{c.height}m | {c.manufacturer}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => handleLoad(c.id)}>
                        加载
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}