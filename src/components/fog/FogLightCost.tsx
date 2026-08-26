'use client';

import { useState, useCallback, useEffect } from 'react';
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

interface FogMaterialPrices {
  fogLight: number;           // 诱导灯（元/台）
  controlCabinet: number;     // 控制柜（元/套）
  detectionSensor: number;    // 检测传感器（元/个）
  powerCable: number;         // 电力电缆（元/m）
  signalCable: number;        // 信号电缆（元/m）
  mountingPole: number;       // 立杆（元/根）
  bracket: number;            // 安装支架（元/套）
  foundation: number;         // 基础施工（元/个）
  lightningProtection: number; // 防雷接地（元/套）
  installationLabor: number;  // 安装人工（元/台）
}

interface FogCoefficients {
  managementFee: number;
  taxRate: number;
  profitMargin: number;
}

interface FogLightConfig {
  id: string;
  name: string;
  // 项目参数
  roadLength: number;         // 路段长度 (m)
  lightSpacing: number;       // 灯具间距 (m)
  lightHeight: number;        // 灯具安装高度 (m)
  lightType: string;          // 诱导灯类型
  controlMode: string;        // 控制方式
  detectionType: string;      // 检测方式
  // 材料单价
  unitPrices: FogMaterialPrices;
  // 成本系数
  coefficients: FogCoefficients;
}

interface FogCalculationResult {
  lightCount: number;         // 灯具数量
  sensorCount: number;        // 传感器数量
  poleCount: number;          // 立杆数量
  powerCableLength: number;   // 电力电缆长度
  signalCableLength: number;  // 信号电缆长度
  controlCabinetCount: number; // 控制柜数量
  costBreakdown: { label: string; amount: number; percentage: number }[];
  totalCost: number;
  finalPrice: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LIGHT_TYPES = ['LED雾灯(圆形)', 'LED雾灯(方形)', '高亮诱导灯', '黄闪诱导灯', '双色诱导灯'];
const CONTROL_MODES = ['自动控制', '手动控制', '远程控制', '智能联动'];
const DETECTION_TYPES = ['能见度检测仪', '雷达检测', '视频检测', '气象站联动'];

const DEFAULT_UNIT_PRICES: FogMaterialPrices = {
  fogLight: 2800,
  controlCabinet: 15000,
  detectionSensor: 8500,
  powerCable: 35,
  signalCable: 18,
  mountingPole: 3200,
  bracket: 450,
  foundation: 1800,
  lightningProtection: 2500,
  installationLabor: 600,
};

const DEFAULT_COEFFICIENTS: FogCoefficients = {
  managementFee: 5,
  taxRate: 13,
  profitMargin: 15,
};

const DEFAULT_CONFIG: FogLightConfig = {
  id: '',
  name: '默认方案',
  roadLength: 1000,
  lightSpacing: 30,
  lightHeight: 6,
  lightType: 'LED雾灯(圆形)',
  controlMode: '自动控制',
  detectionType: '能见度检测仪',
  unitPrices: { ...DEFAULT_UNIT_PRICES },
  coefficients: { ...DEFAULT_COEFFICIENTS },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatMoney(v: number) {
  return `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculate(config: FogLightConfig): FogCalculationResult {
  const { roadLength, lightSpacing, lightHeight, unitPrices, coefficients } = config;

  // 灯具数量 = 路段长度 / 间距 (双侧布置 x2)
  const lightCount = Math.ceil(roadLength / lightSpacing) * 2;

  // 立杆数量 = 灯具数量 / 2 (每根杆装2盏灯)
  const poleCount = Math.ceil(lightCount / 2);

  // 传感器数量 = 按路段每200m一个
  const sensorCount = Math.max(2, Math.ceil(roadLength / 200));

  // 控制柜数量 = 按路段每500m一个
  const controlCabinetCount = Math.max(1, Math.ceil(roadLength / 500));

  // 电力电缆长度 = 每根杆到控制柜的距离
  const powerCableLength = Math.ceil(poleCount * lightHeight * 1.5 + controlCabinetCount * 50);

  // 信号电缆长度 = 传感器到控制柜 + 灯具间联动
  const signalCableLength = Math.ceil(sensorCount * 200 + poleCount * lightSpacing * 0.8);

  // 基础施工数量 = 立杆数量
  const foundationCount = poleCount;

  // 成本明细
  const fogLightCost = lightCount * unitPrices.fogLight;
  const controlCabinetCost = controlCabinetCount * unitPrices.controlCabinet;
  const sensorCost = sensorCount * unitPrices.detectionSensor;
  const powerCableCost = powerCableLength * unitPrices.powerCable;
  const signalCableCost = signalCableLength * unitPrices.signalCable;
  const poleCost = poleCount * unitPrices.mountingPole;
  const bracketCost = lightCount * unitPrices.bracket;
  const foundationCost = foundationCount * unitPrices.foundation;
  const lightningCost = controlCabinetCount * unitPrices.lightningProtection;
  const laborCost = lightCount * unitPrices.installationLabor;

  const items = [
    { label: '诱导灯', amount: fogLightCost },
    { label: '控制柜', amount: controlCabinetCost },
    { label: '检测传感器', amount: sensorCost },
    { label: '电力电缆', amount: powerCableCost },
    { label: '信号电缆', amount: signalCableCost },
    { label: '立杆', amount: poleCost },
    { label: '安装支架', amount: bracketCost },
    { label: '基础施工', amount: foundationCost },
    { label: '防雷接地', amount: lightningCost },
    { label: '安装人工', amount: laborCost },
  ];

  const materialTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const managementFee = materialTotal * coefficients.managementFee / 100;
  const profit = materialTotal * coefficients.profitMargin / 100;
  const subtotal = materialTotal + managementFee + profit;
  const tax = subtotal * coefficients.taxRate / 100;
  const totalCost = subtotal + tax;

  const allItems = [
    ...items,
    { label: '管理费', amount: managementFee },
    { label: '利润', amount: profit },
    { label: '税金', amount: tax },
  ];

  const costBreakdown = allItems.map(item => ({
    label: item.label,
    amount: Math.round(item.amount * 100) / 100,
    percentage: totalCost > 0 ? Math.round(item.amount / totalCost * 10000) / 100 : 0,
  }));

  return {
    lightCount,
    sensorCount,
    poleCount,
    powerCableLength,
    signalCableLength,
    controlCabinetCount,
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
      <Label className="text-xs text-slate-600 w-28 shrink-0">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-7 text-xs"
        step={step}
        min={min}
      />
      {unit && <span className="text-xs text-slate-400 w-12 shrink-0">{unit}</span>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FogLightCost() {
  const [config, setConfig] = useState<FogLightConfig>({ ...DEFAULT_CONFIG, id: generateId() });
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    prices: true,
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

  const updatePrice = useCallback((key: keyof FogMaterialPrices, value: number) => {
    setConfig(prev => ({
      ...prev,
      unitPrices: { ...prev.unitPrices, [key]: value },
    }));
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
      '════════════════════════════════════════',
      '    雾区诱导灯成本核算报告',
      '════════════════════════════════════════',
      '',
      `方案名称: ${config.name}`,
      `日期: ${new Date().toLocaleDateString()}`,
      '',
      '── 项目参数 ──',
      `路段长度: ${config.roadLength}m`,
      `灯具间距: ${config.lightSpacing}m`,
      `安装高度: ${config.lightHeight}m`,
      `诱导灯类型: ${config.lightType}`,
      `控制方式: ${config.controlMode}`,
      `检测方式: ${config.detectionType}`,
      '',
      '── 计算结果 ──',
      `诱导灯数量: ${result.lightCount}台`,
      `检测传感器: ${result.sensorCount}个`,
      `立杆数量: ${result.poleCount}根`,
      `控制柜数量: ${result.controlCabinetCount}套`,
      `电力电缆: ${result.powerCableLength}m`,
      `信号电缆: ${result.signalCableLength}m`,
      '',
      '── 成本明细 ──',
      ...result.costBreakdown.map(item =>
        `${item.label.padEnd(12, ' ')} ${formatMoney(item.amount).padStart(12)} (${item.percentage}%)`
      ),
      '',
      `总成本: ${formatMoney(result.totalCost)}`,
      '════════════════════════════════════════',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `雾区诱导灯核算_${config.name}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const result = calculate(config);

  // ─── Render ─────────────────────────────────────────────────────────────

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
          {/* Left: Parameters */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="项目参数" expanded={expandedSections.project} onToggle={() => toggleSection('project')} />
              </CardHeader>
              {expandedSections.project && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">方案名称</Label>
                    <Input value={config.name} onChange={e => updateConfig({ name: e.target.value })} className="h-7 text-xs" />
                  </div>
                  <NumInput label="路段长度" value={config.roadLength} onChange={v => updateConfig({ roadLength: v })} unit="m" />
                  <NumInput label="灯具间距" value={config.lightSpacing} onChange={v => updateConfig({ lightSpacing: v })} unit="m" />
                  <NumInput label="安装高度" value={config.lightHeight} onChange={v => updateConfig({ lightHeight: v })} unit="m" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">诱导灯类型</Label>
                    <Select value={config.lightType} onValueChange={v => updateConfig({ lightType: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LIGHT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">控制方式</Label>
                    <Select value={config.controlMode} onValueChange={v => updateConfig({ controlMode: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTROL_MODES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">检测方式</Label>
                    <Select value={config.detectionType} onValueChange={v => updateConfig({ detectionType: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DETECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="材料单价" expanded={expandedSections.prices} onToggle={() => toggleSection('prices')} />
              </CardHeader>
              {expandedSections.prices && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <NumInput label="诱导灯" value={config.unitPrices.fogLight} onChange={v => updatePrice('fogLight', v)} unit="元/台" />
                  <NumInput label="控制柜" value={config.unitPrices.controlCabinet} onChange={v => updatePrice('controlCabinet', v)} unit="元/套" />
                  <NumInput label="检测传感器" value={config.unitPrices.detectionSensor} onChange={v => updatePrice('detectionSensor', v)} unit="元/个" />
                  <NumInput label="电力电缆" value={config.unitPrices.powerCable} onChange={v => updatePrice('powerCable', v)} unit="元/m" step={0.5} />
                  <NumInput label="信号电缆" value={config.unitPrices.signalCable} onChange={v => updatePrice('signalCable', v)} unit="元/m" step={0.5} />
                  <NumInput label="立杆" value={config.unitPrices.mountingPole} onChange={v => updatePrice('mountingPole', v)} unit="元/根" />
                  <NumInput label="安装支架" value={config.unitPrices.bracket} onChange={v => updatePrice('bracket', v)} unit="元/套" />
                  <NumInput label="基础施工" value={config.unitPrices.foundation} onChange={v => updatePrice('foundation', v)} unit="元/个" />
                  <NumInput label="防雷接地" value={config.unitPrices.lightningProtection} onChange={v => updatePrice('lightningProtection', v)} unit="元/套" />
                  <NumInput label="安装人工" value={config.unitPrices.installationLabor} onChange={v => updatePrice('installationLabor', v)} unit="元/台" />
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="成本系数" expanded={expandedSections.coefficients} onToggle={() => toggleSection('coefficients')} />
              </CardHeader>
              {expandedSections.coefficients && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <NumInput label="管理费" value={config.coefficients.managementFee} onChange={v => updateCoefficient('managementFee', v)} unit="%" />
                  <NumInput label="税率" value={config.coefficients.taxRate} onChange={v => updateCoefficient('taxRate', v)} unit="%" />
                  <NumInput label="利润率" value={config.coefficients.profitMargin} onChange={v => updateCoefficient('profitMargin', v)} unit="%" />
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right: Results */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <SectionHeader label="计算结果" expanded={expandedSections.result} onToggle={() => toggleSection('result')} />
              </CardHeader>
              {expandedSections.result && (
                <CardContent className="px-3 pb-3 space-y-3">
                  {/* System specs */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">诱导灯</div>
                      <div className="text-sm font-bold text-amber-700">{result.lightCount}台</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">传感器</div>
                      <div className="text-sm font-bold text-blue-700">{result.sensorCount}个</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">立杆</div>
                      <div className="text-sm font-bold text-emerald-700">{result.poleCount}根</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">控制柜</div>
                      <div className="text-sm font-bold text-purple-700">{result.controlCabinetCount}套</div>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">电力电缆</div>
                      <div className="text-sm font-bold text-cyan-700">{result.powerCableLength}m</div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">信号电缆</div>
                      <div className="text-sm font-bold text-rose-700">{result.signalCableLength}m</div>
                    </div>
                  </div>

                  {/* Cost breakdown */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-2 py-1.5 font-medium text-slate-600">项目</th>
                          <th className="text-right px-2 py-1.5 font-medium text-slate-600">金额</th>
                          <th className="text-right px-2 py-1.5 font-medium text-slate-600">占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.costBreakdown.map((item, i) => (
                          <tr key={i} className="border-t hover:bg-slate-50">
                            <td className="px-2 py-1">{item.label}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatMoney(item.amount)}</td>
                            <td className="px-2 py-1 text-right text-slate-500">{item.percentage}%</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 bg-blue-50 font-semibold">
                          <td className="px-2 py-1.5">总计</td>
                          <td className="px-2 py-1.5 text-right font-mono text-blue-700">{formatMoney(result.totalCost)}</td>
                          <td className="px-2 py-1.5 text-right">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Saved configs */}
            {savedConfigs.length > 0 && (
              <Card>
                <CardHeader className="py-2 px-3">
                  <div className="text-sm font-medium text-slate-700">已保存方案</div>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {savedConfigs.map(saved => (
                    <div key={saved.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50">
                      <button
                        type="button"
                        className="text-xs text-left flex-1 cursor-pointer hover:text-blue-600"
                        onClick={() => loadConfig(saved)}
                      >
                        {saved.name}
                        <span className="text-slate-400 ml-2">{new Date(saved.createdAt).toLocaleDateString()}</span>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                        onClick={() => deleteConfig(saved.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
