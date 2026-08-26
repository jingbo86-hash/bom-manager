'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Save, Download, Plus, Calculator } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PvSystemConfig {
  id: string;
  name: string;
  // 负载参数
  totalLoadPower: number;      // 总负载功率 (W)
  dailyWorkHours: number;      // 平均每日工作时间 (小时)
  // 日照参数
  sunMode: 'standard' | 'custom'; // 标准系数 / 自定系数
  city: string;                // 所在城市
  sunCoefficient: number;      // 日照系数
  longitude: number;           // 经度
  latitude: number;            // 纬度
  customCoefficient: number;   // 自定系数
  // 太阳辐照参数
  avgRadiation: number;        // 平均辐射量 (KW/m2)
  // 蓄电池参数
  workVoltage: number;         // 工作电压 (V)
  dischargeDepth: number;      // 放电深度 (%)
  cloudyDays: number;          // 持续阴雨天数
  chargeDays: number;          // 蓄电池需充电天数
  // 材料单价
  unitPrices: PvMaterialPrices;
  // 成本系数
  coefficients: PvCoefficients;
}

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
  lineLoss: number;
  systemEfficiency: number;
}

interface PvCalculationResult {
  dailyEnergyWh: number;     // 每日总耗电瓦时 (Wh)
  dailyLoadAh: number;       // 每日负载耗电量 (AH)
  panelPower: number;        // 需求电池板功率 (W)
  batteryCapacity: number;   // 需求蓄电池容量 (AH)
  // 成本相关
  inverterPower: number;
  controllerCurrent: number;
  cableLength: number;
  costBreakdown: { label: string; amount: number; percentage: number }[];
  totalCost: number;
}

// ─── City Solar Data (中国主要城市日照系数) ──────────────────────────────────

interface CitySolarData {
  name: string;
  coefficient: number;  // 日照系数
  longitude: number;
  latitude: number;
  avgRadiation: number; // 平均辐射量 KW/m2
}

const CITY_SOLAR_DATA: CitySolarData[] = [
  { name: '北京', coefficient: 4.2, longitude: 116.4, latitude: 39.9, avgRadiation: 4.8 },
  { name: '上海', coefficient: 3.6, longitude: 121.5, latitude: 31.2, avgRadiation: 4.0 },
  { name: '广州', coefficient: 3.8, longitude: 113.3, latitude: 23.1, avgRadiation: 4.2 },
  { name: '深圳', coefficient: 3.9, longitude: 114.1, latitude: 22.5, avgRadiation: 4.3 },
  { name: '成都', coefficient: 3.0, longitude: 104.1, latitude: 30.7, avgRadiation: 3.4 },
  { name: '重庆', coefficient: 2.8, longitude: 106.5, latitude: 29.6, avgRadiation: 3.2 },
  { name: '武汉', coefficient: 3.5, longitude: 114.3, latitude: 30.6, avgRadiation: 3.9 },
  { name: '西安', coefficient: 3.8, longitude: 108.9, latitude: 34.3, avgRadiation: 4.2 },
  { name: '拉萨', coefficient: 5.5, longitude: 91.1, latitude: 29.7, avgRadiation: 6.2 },
  { name: '乌鲁木齐', coefficient: 4.5, longitude: 87.6, latitude: 43.8, avgRadiation: 5.0 },
  { name: '呼和浩特', coefficient: 4.8, longitude: 111.7, latitude: 40.8, avgRadiation: 5.3 },
  { name: '银川', coefficient: 4.6, longitude: 106.3, latitude: 38.5, avgRadiation: 5.1 },
  { name: '兰州', coefficient: 4.0, longitude: 103.8, latitude: 36.1, avgRadiation: 4.5 },
  { name: '西宁', coefficient: 4.8, longitude: 101.8, latitude: 36.6, avgRadiation: 5.4 },
  { name: '昆明', coefficient: 4.5, longitude: 102.7, latitude: 25.0, avgRadiation: 5.0 },
  { name: '贵阳', coefficient: 2.8, longitude: 106.7, latitude: 26.6, avgRadiation: 3.1 },
  { name: '长沙', coefficient: 3.2, longitude: 113.0, latitude: 28.2, avgRadiation: 3.6 },
  { name: '南京', coefficient: 3.5, longitude: 118.8, latitude: 32.1, avgRadiation: 3.9 },
  { name: '杭州', coefficient: 3.6, longitude: 120.2, latitude: 30.3, avgRadiation: 4.0 },
  { name: '合肥', coefficient: 3.5, longitude: 117.3, latitude: 31.9, avgRadiation: 3.9 },
  { name: '济南', coefficient: 4.0, longitude: 117.0, latitude: 36.7, avgRadiation: 4.4 },
  { name: '郑州', coefficient: 3.8, longitude: 113.6, latitude: 34.8, avgRadiation: 4.2 },
  { name: '太原', coefficient: 4.2, longitude: 112.6, latitude: 37.9, avgRadiation: 4.7 },
  { name: '石家庄', coefficient: 4.0, longitude: 114.5, latitude: 38.0, avgRadiation: 4.4 },
  { name: '天津', coefficient: 4.0, longitude: 117.2, latitude: 39.1, avgRadiation: 4.4 },
  { name: '哈尔滨', coefficient: 3.8, longitude: 126.6, latitude: 45.8, avgRadiation: 4.2 },
  { name: '长春', coefficient: 4.0, longitude: 125.3, latitude: 43.8, avgRadiation: 4.4 },
  { name: '沈阳', coefficient: 3.9, longitude: 123.4, latitude: 41.8, avgRadiation: 4.3 },
  { name: '大连', coefficient: 4.0, longitude: 121.6, latitude: 38.9, avgRadiation: 4.4 },
  { name: '青岛', coefficient: 3.9, longitude: 120.3, latitude: 36.1, avgRadiation: 4.3 },
  { name: '厦门', coefficient: 4.0, longitude: 118.1, latitude: 24.5, avgRadiation: 4.4 },
  { name: '福州', coefficient: 3.7, longitude: 119.3, latitude: 26.1, avgRadiation: 4.1 },
  { name: '南宁', coefficient: 3.5, longitude: 108.3, latitude: 22.8, avgRadiation: 3.9 },
  { name: '海口', coefficient: 4.2, longitude: 110.3, latitude: 20.0, avgRadiation: 4.7 },
  { name: '三亚', coefficient: 4.5, longitude: 109.5, latitude: 18.3, avgRadiation: 5.0 },
  { name: '南昌', coefficient: 3.3, longitude: 115.9, latitude: 28.7, avgRadiation: 3.7 },
  { name: '呼和浩特', coefficient: 4.8, longitude: 111.7, latitude: 40.8, avgRadiation: 5.3 },
  { name: '敦煌', coefficient: 5.2, longitude: 94.7, latitude: 40.1, avgRadiation: 5.8 },
  { name: '格尔木', coefficient: 5.0, longitude: 94.9, latitude: 36.4, avgRadiation: 5.6 },
];

const WORK_VOLTAGES = [12, 24, 48, 96, 110, 220];
const CLOUDY_DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const CHARGE_DAYS_OPTIONS = [1, 2, 3, 4, 5];

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
  totalLoadPower: 80,
  dailyWorkHours: 8,
  sunMode: 'standard',
  city: '北京',
  sunCoefficient: 4.2,
  longitude: 116.4,
  latitude: 39.9,
  customCoefficient: 5,
  avgRadiation: 1,
  workVoltage: 24,
  dischargeDepth: 70,
  cloudyDays: 4,
  chargeDays: 3,
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

/**
 * 按照图中公式计算：
 * 每日总耗电瓦时 = 总负载功率 × 平均每天工作时间
 * 每日负载耗电量 = 每日总耗电瓦时 / 工作电压
 * 需求电池板功率 = 100 × 每日总耗电瓦时 × 持续阴雨天数 / 放电深度 / 蓄电池需充电天数 / 日照系数 / 平均辐射量
 * 需求蓄电池容量 = 100 × 每日总耗电瓦时 × (持续阴雨天数 + 1) / 放电深度 / 工作电压
 */
function calculate(config: PvSystemConfig): PvCalculationResult {
  const {
    totalLoadPower, dailyWorkHours, workVoltage,
    dischargeDepth, cloudyDays, chargeDays,
    sunCoefficient, avgRadiation,
    unitPrices, coefficients,
  } = config;

  // 每日总耗电瓦时 (Wh)
  const dailyEnergyWh = totalLoadPower * dailyWorkHours;

  // 每日负载耗电量 (AH)
  const dailyLoadAh = dailyEnergyWh / workVoltage;

  // 需求电池板功率 (W)
  // = 100 × 每日总耗电瓦时 × 持续阴雨天数 / 放电深度 / 蓄电池需充电天数 / 日照系数 / 平均辐射量
  const panelPower = Math.ceil(
    (100 * dailyEnergyWh * cloudyDays) /
    (dischargeDepth * chargeDays * sunCoefficient * avgRadiation)
  );

  // 需求蓄电池容量 (AH)
  // = 100 × 每日总耗电瓦时 × (持续阴雨天数 + 1) / 放电深度 / 工作电压
  const batteryCapacity = Math.ceil(
    (100 * dailyEnergyWh * (cloudyDays + 1)) /
    (dischargeDepth * workVoltage)
  );

  // 逆变器功率 (W) - 留20%余量
  const inverterPower = Math.ceil(totalLoadPower * 1.2);

  // 控制器电流 (A)
  const controllerCurrent = Math.ceil(panelPower / workVoltage * 1.25);

  // 线缆长度估算 (m)
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
    dailyEnergyWh: Math.round(dailyEnergyWh),
    dailyLoadAh: Math.round(dailyLoadAh * 100) / 100,
    panelPower,
    batteryCapacity,
    inverterPower,
    controllerCurrent,
    cableLength,
    costBreakdown,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface SavedConfig {
  id: string;
  name: string;
  config: PvSystemConfig;
  createdAt: string;
}

// ─── Number Input ───────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, unit, step = 1, min = 0, className = '' }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label className="text-xs text-slate-600 w-32 shrink-0">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="h-7 text-xs flex-1"
        step={step}
        min={min}
      />
      {unit && <span className="text-xs text-slate-400 w-14 shrink-0">{unit}</span>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PvSystemCost() {
  const [config, setConfig] = useState<PvSystemConfig>({ ...DEFAULT_CONFIG, id: generateId() });
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [showPrices, setShowPrices] = useState(false);
  const [showCoefficients, setShowCoefficients] = useState(false);

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

  // 选择城市时自动填充日照系数、经纬度、辐射量
  const handleCityChange = useCallback((cityName: string) => {
    const cityData = CITY_SOLAR_DATA.find(c => c.name === cityName);
    if (cityData) {
      setConfig(prev => ({
        ...prev,
        city: cityName,
        sunCoefficient: cityData.coefficient,
        longitude: cityData.longitude,
        latitude: cityData.latitude,
        avgRadiation: cityData.avgRadiation,
      }));
    }
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
      '── 负载参数 ──',
      `总负载功率: ${config.totalLoadPower}W`,
      `平均每日工作时间: ${config.dailyWorkHours}小时`,
      '',
      '── 日照参数 ─',
      `日照模式: ${config.sunMode === 'standard' ? '标准系数' : '自定系数'}`,
      `所在城市: ${config.city}`,
      `日照系数: ${config.sunCoefficient}`,
      `经度: ${config.longitude}`,
      `纬度: ${config.latitude}`,
      `平均辐射量: ${config.avgRadiation} KW/m2`,
      '',
      '── 蓄电池参数 ──',
      `工作电压: ${config.workVoltage}V`,
      `放电深度: ${config.dischargeDepth}%`,
      `持续阴雨天数: ${config.cloudyDays}天`,
      `蓄电池需充电天数: ${config.chargeDays}天`,
      '',
      '── 计算结果 ──',
      `每日总耗电瓦时: ${result.dailyEnergyWh}Wh`,
      `每日负载耗电量: ${result.dailyLoadAh}AH`,
      `需求电池板功率: ${result.panelPower}W`,
      `需求蓄电池容量: ${result.batteryCapacity}AH`,
      `逆变器功率: ${result.inverterPower}W`,
      `控制器电流: ${result.controllerCurrent}A`,
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
        <div className="max-w-3xl mx-auto space-y-3">
          {/* 负载参数 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-blue-500 rounded" />
                负载参数
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="总负载功率" value={config.totalLoadPower} onChange={v => updateConfig({ totalLoadPower: v })} unit="W" />
                <NumInput label="平均每日工作时间" value={config.dailyWorkHours} onChange={v => updateConfig({ dailyWorkHours: v })} unit="小时" />
              </div>
            </CardContent>
          </Card>

          {/* 日照参数 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-amber-500 rounded" />
                日照参数
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      checked={config.sunMode === 'standard'}
                      onChange={() => updateConfig({ sunMode: 'standard' })}
                      className="accent-blue-600"
                    />
                    标准系数
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      checked={config.sunMode === 'custom'}
                      onChange={() => updateConfig({ sunMode: 'custom' })}
                      className="accent-blue-600"
                    />
                    自定系数
                  </label>
                </div>

                {config.sunMode === 'standard' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600 w-20 shrink-0">所在城市</Label>
                      <Select value={config.city} onValueChange={handleCityChange}>
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CITY_SOLAR_DATA.map(c => (
                            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <NumInput label="日照系数" value={config.sunCoefficient} onChange={v => updateConfig({ sunCoefficient: v })} step={0.1} />
                    <NumInput label="经度" value={config.longitude} onChange={v => updateConfig({ longitude: v })} step={0.1} />
                    <NumInput label="纬度" value={config.latitude} onChange={v => updateConfig({ latitude: v })} step={0.1} />
                  </div>
                ) : (
                  <NumInput label="自定系数" value={config.customCoefficient} onChange={v => updateConfig({ customCoefficient: v })} step={0.1} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* 太阳辐照参数 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-orange-500 rounded" />
                太阳辐照参数
              </div>
              <NumInput label="平均辐射量" value={config.avgRadiation} onChange={v => updateConfig({ avgRadiation: v })} unit="KW/m2" step={0.1} />
            </CardContent>
          </Card>

          {/* 蓄电池参数 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-emerald-500 rounded" />
                蓄电池参数
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 w-20 shrink-0">工作电压</Label>
                  <Select value={String(config.workVoltage)} onValueChange={v => updateConfig({ workVoltage: Number(v) })}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_VOLTAGES.map(v => <SelectItem key={v} value={String(v)}>{v}V</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <NumInput label="放电深度" value={config.dischargeDepth} onChange={v => updateConfig({ dischargeDepth: v })} unit="%" />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 w-20 shrink-0">持续阴雨天数</Label>
                  <Select value={String(config.cloudyDays)} onValueChange={v => updateConfig({ cloudyDays: Number(v) })}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOUDY_DAYS_OPTIONS.map(v => <SelectItem key={v} value={String(v)}>{v}天</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600 w-20 shrink-0">蓄电池需充电天数</Label>
                  <Select value={String(config.chargeDays)} onValueChange={v => updateConfig({ chargeDays: Number(v) })}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARGE_DAYS_OPTIONS.map(v => <SelectItem key={v} value={String(v)}>{v}天</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 计算方法 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-purple-500 rounded" />
                计算方法
              </div>
              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded p-2 font-mono">
                <div>每日总耗电瓦时 = 总负载功率 × 平均每天工作时间</div>
                <div>每日负载耗电量 = 每日总耗电瓦时 / 工作电压</div>
                <div>需求电池板功率 = 100 × 每日总耗电瓦时 × 持续阴雨天数 / 放电深度 / 蓄电池需充电天数 / 日照系数 / 平均辐射量</div>
                <div>需求蓄电池容量 = 100 × 每日总耗电瓦时 × (持续阴雨天数 + 1) / 放电深度 / 工作电压</div>
              </div>
            </CardContent>
          </Card>

          {/* 计算结果 */}
          <Card className="border-2 border-blue-200">
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1">
                <Calculator className="w-4 h-4 text-blue-600" />
                计算结果
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                  <div className="text-xs text-slate-500 mb-1">每日负载耗电量</div>
                  <div className="text-lg font-bold text-blue-700 font-mono">{result.dailyLoadAh}</div>
                  <div className="text-xs text-slate-400">AH</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                  <div className="text-xs text-slate-500 mb-1">需求电池板功率</div>
                  <div className="text-lg font-bold text-amber-700 font-mono">{result.panelPower}</div>
                  <div className="text-xs text-slate-400">W</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                  <div className="text-xs text-slate-500 mb-1">需求蓄电池容量</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono">{result.batteryCapacity}</div>
                  <div className="text-xs text-slate-400">AH</div>
                </div>
              </div>

              {/* 补充信息 */}
              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-slate-400">每日总耗电</div>
                  <div className="text-sm font-semibold text-slate-700 font-mono">{result.dailyEnergyWh} Wh</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">逆变器功率</div>
                  <div className="text-sm font-semibold text-slate-700 font-mono">{result.inverterPower} W</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">控制器电流</div>
                  <div className="text-sm font-semibold text-slate-700 font-mono">{result.controllerCurrent} A</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 材料单价 (可展开) */}
          <Card>
            <button
              type="button"
              onClick={() => setShowPrices(!showPrices)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-t-lg"
            >
              <span className="flex items-center gap-1">
                <div className="w-1 h-4 bg-slate-400 rounded" />
                材料单价
              </span>
              <span className="text-xs text-slate-400">{showPrices ? '收起' : '展开'}</span>
            </button>
            {showPrices && (
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="太阳能板" value={config.unitPrices.solarPanel} onChange={v => updatePrice('solarPanel', v)} unit="元/W" step={0.1} />
                  <NumInput label="蓄电池" value={config.unitPrices.battery} onChange={v => updatePrice('battery', v)} unit="元/Ah" step={0.5} />
                  <NumInput label="逆变器" value={config.unitPrices.inverter} onChange={v => updatePrice('inverter', v)} unit="元/W" step={0.1} />
                  <NumInput label="充电控制器" value={config.unitPrices.chargeController} onChange={v => updatePrice('chargeController', v)} unit="元/A" />
                  <NumInput label="安装支架" value={config.unitPrices.mountingStructure} onChange={v => updatePrice('mountingStructure', v)} unit="元/套" />
                  <NumInput label="线缆" value={config.unitPrices.cables} onChange={v => updatePrice('cables', v)} unit="元/m" step={0.5} />
                  <NumInput label="接线盒" value={config.unitPrices.junctionBox} onChange={v => updatePrice('junctionBox', v)} unit="元/个" />
                  <NumInput label="防雷系统" value={config.unitPrices.lightningProtection} onChange={v => updatePrice('lightningProtection', v)} unit="元/套" />
                  <NumInput label="监控系统" value={config.unitPrices.monitoringSystem} onChange={v => updatePrice('monitoringSystem', v)} unit="元/套" />
                  <NumInput label="安装人工" value={config.unitPrices.installationLabor} onChange={v => updatePrice('installationLabor', v)} unit="元/W" step={0.1} />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 成本系数 (可展开) */}
          <Card>
            <button
              type="button"
              onClick={() => setShowCoefficients(!showCoefficients)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-t-lg"
            >
              <span className="flex items-center gap-1">
                <div className="w-1 h-4 bg-slate-400 rounded" />
                成本系数
              </span>
              <span className="text-xs text-slate-400">{showCoefficients ? '收起' : '展开'}</span>
            </button>
            {showCoefficients && (
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="管理费" value={config.coefficients.managementFee} onChange={v => updateCoefficient('managementFee', v)} unit="%" />
                  <NumInput label="税率" value={config.coefficients.taxRate} onChange={v => updateCoefficient('taxRate', v)} unit="%" />
                  <NumInput label="利润率" value={config.coefficients.profitMargin} onChange={v => updateCoefficient('profitMargin', v)} unit="%" />
                  <NumInput label="线损率" value={config.coefficients.lineLoss} onChange={v => updateCoefficient('lineLoss', v)} unit="%" step={0.5} />
                  <NumInput label="系统效率" value={config.coefficients.systemEfficiency} onChange={v => updateCoefficient('systemEfficiency', v)} unit="%" />
                </div>
              </CardContent>
            )}
          </Card>

          {/* 成本明细表 */}
          <Card>
            <CardContent className="p-3">
              <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <div className="w-1 h-4 bg-blue-500 rounded" />
                成本明细表
              </div>
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
          </Card>

          {/* 已保存方案 */}
          {savedConfigs.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <div className="w-1 h-4 bg-slate-400 rounded" />
                  已保存方案
                </div>
                <div className="space-y-1">
                  {savedConfigs.map(sc => (
                    <div key={sc.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{sc.name}</span>
                        <span className="text-slate-400">{new Date(sc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5" onClick={() => loadConfig(sc)}>加载</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5 text-red-500" onClick={() => deleteConfig(sc.id)}>
                          <Trash2 className="h-3 w-3" />
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
    </div>
  );
}
