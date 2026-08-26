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

interface PvMaterialPrices {
  solarPanel: number;        // 太阳能板（元/W）
  battery: number;           // 蓄电池（元/Ah）
  inverter: number;          // 逆变器（元/W）
  chargeController: number;  // 充电控制器（元/A）
  mountingStructure: number; // 安装支架（元/套）
  cables: number;            // 线缆（元/m）
  junctionBox: number;       // 接线盒（元/个）
  lightningProtection: number; // 防雷系统（元/套）
  monitoringSystem: number;  // 监控系统（元/套）
  installationLabor: number; // 安装人工（元/W）
}

interface PvCoefficients {
  managementFee: number;
  taxRate: number;
  profitMargin: number;
  lineLoss: number;          // 线损率 %
  systemEfficiency: number;  // 系统效率 %
}

interface PvSystemConfig {
  id: string;
  name: string;
  // 系统参数
  dailyLoad: number;         // 日负载功率 (W)
  workingHours: number;      // 每日工作小时数
  autonomyDays: number;      // 连续阴雨天备用天数
  peakSunHours: number;      // 当地峰值日照时数
  systemVoltage: number;     // 系统电压 (V)
  panelType: string;         // 太阳能板类型
  batteryType: string;       // 蓄电池类型
  // 材料单价
  unitPrices: PvMaterialPrices;
  // 成本系数
  coefficients: PvCoefficients;
}

interface PvCalculationResult {
  dailyEnergy: number;       // 日耗电量 (Wh)
  totalLoad: number;         // 总负载 (W)
  panelPower: number;        // 太阳能板总功率 (W)
  batteryCapacity: number;   // 蓄电池容量 (Ah)
  inverterPower: number;     // 逆变器功率 (W)
  controllerCurrent: number; // 控制器电流 (A)
  cableLength: number;       // 线缆长度 (m)
  costBreakdown: { label: string; amount: number; percentage: number }[];
  totalCost: number;
  finalPrice: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PANEL_TYPES = ['单晶硅', '多晶硅', '薄膜', 'HIT异质结', 'TOPCon'];
const BATTERY_TYPES = ['铅酸电池', '胶体电池', '锂电池(磷酸铁锂)', '锂电池(三元锂)'];
const SYSTEM_VOLTAGES = [12, 24, 48, 96, 110, 220];

const DEFAULT_UNIT_PRICES: PvMaterialPrices = {
  solarPanel: 3.5,
  battery: 8.0,
  inverter: 1.2,
  chargeController: 15.0,
  mountingStructure: 500,
  cables: 12.0,
  junctionBox: 85,
  lightningProtection: 1200,
  monitoringSystem: 3500,
  installationLabor: 0.8,
};

const DEFAULT_COEFFICIENTS: PvCoefficients = {
  managementFee: 5,
  taxRate: 13,
  profitMargin: 15,
  lineLoss: 3,
  systemEfficiency: 85,
};

const DEFAULT_CONFIG: PvSystemConfig = {
  id: '',
  name: '默认方案',
  dailyLoad: 500,
  workingHours: 8,
  autonomyDays: 3,
  peakSunHours: 4,
  systemVoltage: 48,
  panelType: '单晶硅',
  batteryType: '锂电池(磷酸铁锂)',
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

function calculate(config: PvSystemConfig): PvCalculationResult {
  const { dailyLoad, workingHours, autonomyDays, peakSunHours, systemVoltage, unitPrices, coefficients } = config;

  // 日耗电量 (Wh)
  const dailyEnergy = dailyLoad * workingHours;

  // 考虑线损后的实际日耗电量
  const actualDailyEnergy = dailyEnergy * (1 + coefficients.lineLoss / 100);

  // 太阳能板总功率 (W) - 考虑系统效率和峰值日照
  const panelPower = Math.ceil(actualDailyEnergy / (peakSunHours * coefficients.systemEfficiency / 100));

  // 蓄电池容量 (Ah) - 考虑备用天数和放电深度(0.8)
  const batteryCapacity = Math.ceil((dailyEnergy * autonomyDays) / (systemVoltage * 0.8));

  // 逆变器功率 (W) - 留20%余量
  const inverterPower = Math.ceil(dailyLoad * 1.2);

  // 控制器电流 (A)
  const controllerCurrent = Math.ceil(panelPower / systemVoltage * 1.25);

  // 线缆长度估算 (m) - 按系统规模估算
  const cableLength = Math.ceil(panelPower / 100 * 15 + 20);

  // 接线盒数量
  const junctionBoxCount = Math.ceil(panelPower / 300);

  // 成本明细
  const solarPanelCost = panelPower * unitPrices.solarPanel;
  const batteryCost = batteryCapacity * unitPrices.battery;
  const inverterCost = inverterPower * unitPrices.inverter;
  const controllerCost = controllerCurrent * unitPrices.chargeController;
  const mountingCost = unitPrices.mountingStructure;
  const cableCost = cableLength * unitPrices.cables;
  const junctionBoxCost = junctionBoxCount * unitPrices.junctionBox;
  const lightningCost = unitPrices.lightningProtection;
  const monitoringCost = unitPrices.monitoringSystem;
  const laborCost = panelPower * unitPrices.installationLabor;

  const items = [
    { label: '太阳能板', amount: solarPanelCost },
    { label: '蓄电池', amount: batteryCost },
    { label: '逆变器', amount: inverterCost },
    { label: '充电控制器', amount: controllerCost },
    { label: '安装支架', amount: mountingCost },
    { label: '线缆', amount: cableCost },
    { label: '接线盒', amount: junctionBoxCost },
    { label: '防雷系统', amount: lightningCost },
    { label: '监控系统', amount: monitoringCost },
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
    dailyEnergy: Math.round(dailyEnergy),
    totalLoad: dailyLoad,
    panelPower,
    batteryCapacity,
    inverterPower,
    controllerCurrent,
    cableLength,
    costBreakdown,
    totalCost: Math.round(totalCost * 100) / 100,
    finalPrice: Math.round(totalCost * 100) / 100,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SavedConfig {
  id: string;
  name: string;
  config: PvSystemConfig;
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

export default function PvSystemCost() {
  const [config, setConfig] = useState<PvSystemConfig>({ ...DEFAULT_CONFIG, id: generateId() });
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    system: true,
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
          const pvConfigs = data.filter((c: any) => c.data?.moduleType === 'pv');
          setSavedConfigs(pvConfigs.map((c: any) => ({
            id: c.id,
            name: c.name,
            config: c.data.config,
            createdAt: c.createdAt,
          })));
        }
      } catch (err) {
        console.error('Failed to load PV configs:', err);
      }
    };
    loadConfigs();
  }, []);

  const updateConfig = useCallback((updates: Partial<PvSystemConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const updatePrice = useCallback((key: keyof PvMaterialPrices, value: number) => {
    setConfig(prev => ({
      ...prev,
      unitPrices: { ...prev.unitPrices, [key]: value },
    }));
  }, []);

  const updateCoefficient = useCallback((key: keyof PvCoefficients, value: number) => {
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
      data: { moduleType: 'pv', config },
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
      console.error('Failed to save PV config:', err);
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
      console.error('Failed to delete PV config:', err);
    }
  }, []);

  const exportTxt = useCallback(() => {
    const result = calculate(config);
    const lines = [
      '════════════════════════════════════════',
      '    光伏供电系统成本核算报告',
      '════════════════════════════════════════',
      '',
      `方案名称: ${config.name}`,
      `日期: ${new Date().toLocaleDateString()}`,
      '',
      '── 系统参数 ──',
      `日负载功率: ${config.dailyLoad}W`,
      `每日工作: ${config.workingHours}小时`,
      `备用天数: ${config.autonomyDays}天`,
      `峰值日照: ${config.peakSunHours}小时`,
      `系统电压: ${config.systemVoltage}V`,
      `太阳能板类型: ${config.panelType}`,
      `蓄电池类型: ${config.batteryType}`,
      '',
      '── 计算结果 ──',
      `日耗电量: ${result.dailyEnergy}Wh`,
      `太阳能板功率: ${result.panelPower}W`,
      `蓄电池容量: ${result.batteryCapacity}Ah`,
      `逆变器功率: ${result.inverterPower}W`,
      `控制器电流: ${result.controllerCurrent}A`,
      `线缆长度: ${result.cableLength}m`,
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
    a.download = `光伏供电系统核算_${config.name}_${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const result = calculate(config);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <h2 className="text-base font-semibold">光伏供电系统成本核算</h2>
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
                <SectionHeader label="系统参数" expanded={expandedSections.system} onToggle={() => toggleSection('system')} />
              </CardHeader>
              {expandedSections.system && (
                <CardContent className="px-3 pb-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">方案名称</Label>
                    <Input value={config.name} onChange={e => updateConfig({ name: e.target.value })} className="h-7 text-xs" />
                  </div>
                  <NumInput label="日负载功率" value={config.dailyLoad} onChange={v => updateConfig({ dailyLoad: v })} unit="W" />
                  <NumInput label="每日工作" value={config.workingHours} onChange={v => updateConfig({ workingHours: v })} unit="小时" />
                  <NumInput label="备用天数" value={config.autonomyDays} onChange={v => updateConfig({ autonomyDays: v })} unit="天" />
                  <NumInput label="峰值日照" value={config.peakSunHours} onChange={v => updateConfig({ peakSunHours: v })} unit="小时" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">系统电压</Label>
                    <Select value={String(config.systemVoltage)} onValueChange={v => updateConfig({ systemVoltage: Number(v) })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SYSTEM_VOLTAGES.map(v => <SelectItem key={v} value={String(v)}>{v}V</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">太阳能板类型</Label>
                    <Select value={config.panelType} onValueChange={v => updateConfig({ panelType: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PANEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-28 shrink-0">蓄电池类型</Label>
                    <Select value={config.batteryType} onValueChange={v => updateConfig({ batteryType: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BATTERY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  <NumInput label="太阳能板" value={config.unitPrices.solarPanel} onChange={v => updatePrice('solarPanel', v)} unit="元/W" step={0.1} />
                  <NumInput label="蓄电池" value={config.unitPrices.battery} onChange={v => updatePrice('battery', v)} unit="元/Ah" step={0.5} />
                  <NumInput label="逆变器" value={config.unitPrices.inverter} onChange={v => updatePrice('inverter', v)} unit="元/W" step={0.1} />
                  <NumInput label="充电控制器" value={config.unitPrices.chargeController} onChange={v => updatePrice('chargeController', v)} unit="元/A" step={1} />
                  <NumInput label="安装支架" value={config.unitPrices.mountingStructure} onChange={v => updatePrice('mountingStructure', v)} unit="元/套" />
                  <NumInput label="线缆" value={config.unitPrices.cables} onChange={v => updatePrice('cables', v)} unit="元/m" step={0.5} />
                  <NumInput label="接线盒" value={config.unitPrices.junctionBox} onChange={v => updatePrice('junctionBox', v)} unit="元/个" />
                  <NumInput label="防雷系统" value={config.unitPrices.lightningProtection} onChange={v => updatePrice('lightningProtection', v)} unit="元/套" />
                  <NumInput label="监控系统" value={config.unitPrices.monitoringSystem} onChange={v => updatePrice('monitoringSystem', v)} unit="元/套" />
                  <NumInput label="安装人工" value={config.unitPrices.installationLabor} onChange={v => updatePrice('installationLabor', v)} unit="元/W" step={0.1} />
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
                  <NumInput label="线损率" value={config.coefficients.lineLoss} onChange={v => updateCoefficient('lineLoss', v)} unit="%" step={0.5} />
                  <NumInput label="系统效率" value={config.coefficients.systemEfficiency} onChange={v => updateCoefficient('systemEfficiency', v)} unit="%" />
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
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">日耗电量</div>
                      <div className="text-sm font-bold text-blue-700">{result.dailyEnergy}Wh</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">太阳能板</div>
                      <div className="text-sm font-bold text-amber-700">{result.panelPower}W</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">蓄电池</div>
                      <div className="text-sm font-bold text-emerald-700">{result.batteryCapacity}Ah</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">逆变器</div>
                      <div className="text-sm font-bold text-purple-700">{result.inverterPower}W</div>
                    </div>
                    <div className="bg-cyan-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">控制器</div>
                      <div className="text-sm font-bold text-cyan-700">{result.controllerCurrent}A</div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-slate-500">线缆</div>
                      <div className="text-sm font-bold text-rose-700">{result.cableLength}m</div>
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
