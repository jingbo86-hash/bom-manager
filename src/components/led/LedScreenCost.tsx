'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Download, Plus, Building2, Monitor, Zap, Radio, Lightbulb, Gauge, Wrench, Sun, Battery, Cable, Tv, Grid3X3 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LedModule {
  id: string; factory: string; model: string; pitch: string;
  moduleW: number; moduleH: number; brightness: number;
  refreshRate: number; power: number; scanMode: string; price: number; type: string;
}

interface AuxUnit {
  key: string; name: string; desc: string; icon: string;
  price: number; unit: string; perSqm: boolean;
}

interface LedCoefficients { assemblyFee: number; taxRate: number; profitMargin: number; }

interface LedScreenConfig {
  id: string; name: string; screenW: number; screenH: number;
  selectedModuleId: string | null; modulePrices: Record<string, number>;
  auxUnits: AuxUnit[]; coefficients: LedCoefficients;
}

// ─── Factory List ───────────────────────────────────────────────────────────

const FACTORIES = [
  '全部', '利亚德', '洲明科技', '艾比森', '强力巨彩',
  '雷曼光电', '海佳彩亮', '通用', '格莱光', '鑫恩拓', '光茗光电',
];

// ─── LED Module Specs ───────────────────────────────────────────────────────

const ALL_MODULES: LedModule[] = [
  // ─── 利亚德 ───
  { id: 'lyd-p1', factory: '利亚德', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 380, type: 'COB' },
  { id: 'lyd-p2', factory: '利亚德', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 320, type: 'COB' },
  { id: 'lyd-p3', factory: '利亚德', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 220, type: 'SMD' },
  { id: 'lyd-p4', factory: '利亚德', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 185, type: 'SMD' },
  { id: 'lyd-p5', factory: '利亚德', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 145, type: 'SMD' },
  { id: 'lyd-p6', factory: '利亚德', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 120, type: 'SMD' },
  { id: 'lyd-p7', factory: '利亚德', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 98, type: 'SMD' },
  { id: 'lyd-p8', factory: '利亚德', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 85, type: 'SMD' },
  { id: 'lyd-p9', factory: '利亚德', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 72, type: 'SMD' },
  { id: 'lyd-p10', factory: '利亚德', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 65, type: 'SMD' },
  { id: 'lyd-p10s', factory: '利亚德', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 55, type: 'SMD' },
  { id: 'lyd-p12', factory: '利亚德', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 58, type: 'SMD' },
  { id: 'lyd-p125', factory: '利亚德', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 52, type: 'SMD' },
  { id: 'lyd-p16', factory: '利亚德', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 48, type: 'SMD' },
  { id: 'lyd-p20', factory: '利亚德', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 42, type: 'SMD' },
  { id: 'lyd-p25', factory: '利亚德', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 38, type: 'SMD' },
  { id: 'lyd-p3125', factory: '利亚德', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 35, type: 'SMD' },
  { id: 'lyd-p3333', factory: '利亚德', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 32, type: 'SMD' },
  // ─── 洲明科技 ───
  { id: 'zm-p1', factory: '洲明科技', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 370, type: 'COB' },
  { id: 'zm-p2', factory: '洲明科技', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 310, type: 'COB' },
  { id: 'zm-p3', factory: '洲明科技', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 215, type: 'SMD' },
  { id: 'zm-p4', factory: '洲明科技', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 180, type: 'SMD' },
  { id: 'zm-p5', factory: '洲明科技', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 140, type: 'SMD' },
  { id: 'zm-p6', factory: '洲明科技', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 118, type: 'SMD' },
  { id: 'zm-p7', factory: '洲明科技', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 95, type: 'SMD' },
  { id: 'zm-p8', factory: '洲明科技', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 82, type: 'SMD' },
  { id: 'zm-p9', factory: '洲明科技', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 70, type: 'SMD' },
  { id: 'zm-p10', factory: '洲明科技', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 62, type: 'SMD' },
  { id: 'zm-p10s', factory: '洲明科技', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 52, type: 'SMD' },
  { id: 'zm-p12', factory: '洲明科技', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 56, type: 'SMD' },
  { id: 'zm-p125', factory: '洲明科技', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 50, type: 'SMD' },
  { id: 'zm-p16', factory: '洲明科技', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 46, type: 'SMD' },
  { id: 'zm-p20', factory: '洲明科技', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 40, type: 'SMD' },
  { id: 'zm-p25', factory: '洲明科技', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 36, type: 'SMD' },
  { id: 'zm-p3125', factory: '洲明科技', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 33, type: 'SMD' },
  { id: 'zm-p3333', factory: '洲明科技', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 30, type: 'SMD' },
  // ─── 艾比森 ───
  { id: 'abs-p1', factory: '艾比森', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 375, type: 'COB' },
  { id: 'abs-p2', factory: '艾比森', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 315, type: 'COB' },
  { id: 'abs-p3', factory: '艾比森', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 218, type: 'SMD' },
  { id: 'abs-p4', factory: '艾比森', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 182, type: 'SMD' },
  { id: 'abs-p5', factory: '艾比森', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 142, type: 'SMD' },
  { id: 'abs-p6', factory: '艾比森', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 115, type: 'SMD' },
  { id: 'abs-p7', factory: '艾比森', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 92, type: 'SMD' },
  { id: 'abs-p8', factory: '艾比森', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 80, type: 'SMD' },
  { id: 'abs-p9', factory: '艾比森', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 68, type: 'SMD' },
  { id: 'abs-p10', factory: '艾比森', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 60, type: 'SMD' },
  { id: 'abs-p10s', factory: '艾比森', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 50, type: 'SMD' },
  { id: 'abs-p12', factory: '艾比森', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 55, type: 'SMD' },
  { id: 'abs-p125', factory: '艾比森', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 49, type: 'SMD' },
  { id: 'abs-p16', factory: '艾比森', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 45, type: 'SMD' },
  { id: 'abs-p20', factory: '艾比森', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 39, type: 'SMD' },
  { id: 'abs-p25', factory: '艾比森', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 35, type: 'SMD' },
  { id: 'abs-p3125', factory: '艾比森', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 32, type: 'SMD' },
  { id: 'abs-p3333', factory: '艾比森', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 29, type: 'SMD' },
  // ─── 强力巨彩 ───
  { id: 'ql-p1', factory: '强力巨彩', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 360, type: 'COB' },
  { id: 'ql-p2', factory: '强力巨彩', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 300, type: 'COB' },
  { id: 'ql-p3', factory: '强力巨彩', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 210, type: 'SMD' },
  { id: 'ql-p4', factory: '强力巨彩', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 175, type: 'SMD' },
  { id: 'ql-p5', factory: '强力巨彩', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 135, type: 'SMD' },
  { id: 'ql-p6', factory: '强力巨彩', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 112, type: 'SMD' },
  { id: 'ql-p7', factory: '强力巨彩', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 90, type: 'SMD' },
  { id: 'ql-p8', factory: '强力巨彩', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 78, type: 'SMD' },
  { id: 'ql-p9', factory: '强力巨彩', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 65, type: 'SMD' },
  { id: 'ql-p10', factory: '强力巨彩', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 58, type: 'SMD' },
  { id: 'ql-p10s', factory: '强力巨彩', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 48, type: 'SMD' },
  { id: 'ql-p12', factory: '强力巨彩', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 52, type: 'SMD' },
  { id: 'ql-p125', factory: '强力巨彩', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 46, type: 'SMD' },
  { id: 'ql-p16', factory: '强力巨彩', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 42, type: 'SMD' },
  { id: 'ql-p20', factory: '强力巨彩', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 36, type: 'SMD' },
  { id: 'ql-p25', factory: '强力巨彩', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 32, type: 'SMD' },
  { id: 'ql-p3125', factory: '强力巨彩', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 29, type: 'SMD' },
  { id: 'ql-p3333', factory: '强力巨彩', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 26, type: 'SMD' },
  // ─── 雷曼光电 ───
  { id: 'lm-p1', factory: '雷曼光电', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 385, type: 'COB' },
  { id: 'lm-p2', factory: '雷曼光电', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 325, type: 'COB' },
  { id: 'lm-p3', factory: '雷曼光电', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 225, type: 'SMD' },
  { id: 'lm-p4', factory: '雷曼光电', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 190, type: 'SMD' },
  { id: 'lm-p5', factory: '雷曼光电', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 148, type: 'SMD' },
  { id: 'lm-p6', factory: '雷曼光电', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 125, type: 'SMD' },
  { id: 'lm-p7', factory: '雷曼光电', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 102, type: 'SMD' },
  { id: 'lm-p8', factory: '雷曼光电', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 88, type: 'SMD' },
  { id: 'lm-p9', factory: '雷曼光电', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 75, type: 'SMD' },
  { id: 'lm-p10', factory: '雷曼光电', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 68, type: 'SMD' },
  { id: 'lm-p10s', factory: '雷曼光电', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 58, type: 'SMD' },
  { id: 'lm-p12', factory: '雷曼光电', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 62, type: 'SMD' },
  { id: 'lm-p125', factory: '雷曼光电', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 55, type: 'SMD' },
  { id: 'lm-p16', factory: '雷曼光电', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 50, type: 'SMD' },
  { id: 'lm-p20', factory: '雷曼光电', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 44, type: 'SMD' },
  { id: 'lm-p25', factory: '雷曼光电', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 40, type: 'SMD' },
  { id: 'lm-p3125', factory: '雷曼光电', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 37, type: 'SMD' },
  { id: 'lm-p3333', factory: '雷曼光电', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 34, type: 'SMD' },
  // ─── 海佳彩亮 ───
  { id: 'hj-p1', factory: '海佳彩亮', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 355, type: 'COB' },
  { id: 'hj-p2', factory: '海佳彩亮', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 295, type: 'COB' },
  { id: 'hj-p3', factory: '海佳彩亮', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 205, type: 'SMD' },
  { id: 'hj-p4', factory: '海佳彩亮', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 170, type: 'SMD' },
  { id: 'hj-p5', factory: '海佳彩亮', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 132, type: 'SMD' },
  { id: 'hj-p6', factory: '海佳彩亮', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 108, type: 'SMD' },
  { id: 'hj-p7', factory: '海佳彩亮', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 88, type: 'SMD' },
  { id: 'hj-p8', factory: '海佳彩亮', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 75, type: 'SMD' },
  { id: 'hj-p9', factory: '海佳彩亮', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 62, type: 'SMD' },
  { id: 'hj-p10', factory: '海佳彩亮', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 55, type: 'SMD' },
  { id: 'hj-p10s', factory: '海佳彩亮', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 45, type: 'SMD' },
  { id: 'hj-p12', factory: '海佳彩亮', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 50, type: 'SMD' },
  { id: 'hj-p125', factory: '海佳彩亮', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 44, type: 'SMD' },
  { id: 'hj-p16', factory: '海佳彩亮', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 40, type: 'SMD' },
  { id: 'hj-p20', factory: '海佳彩亮', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 35, type: 'SMD' },
  { id: 'hj-p25', factory: '海佳彩亮', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 31, type: 'SMD' },
  { id: 'hj-p3125', factory: '海佳彩亮', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 28, type: 'SMD' },
  { id: 'hj-p3333', factory: '海佳彩亮', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 25, type: 'SMD' },
  // ─── 通用 ───
  { id: 'ty-p1', factory: '通用', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 350, type: 'COB' },
  { id: 'ty-p2', factory: '通用', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 290, type: 'COB' },
  { id: 'ty-p3', factory: '通用', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 200, type: 'SMD' },
  { id: 'ty-p4', factory: '通用', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 165, type: 'SMD' },
  { id: 'ty-p5', factory: '通用', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 128, type: 'SMD' },
  { id: 'ty-p6', factory: '通用', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 105, type: 'SMD' },
  { id: 'ty-p7', factory: '通用', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 85, type: 'SMD' },
  { id: 'ty-p8', factory: '通用', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 72, type: 'SMD' },
  { id: 'ty-p9', factory: '通用', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 60, type: 'SMD' },
  { id: 'ty-p10', factory: '通用', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 52, type: 'SMD' },
  { id: 'ty-p10s', factory: '通用', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 42, type: 'SMD' },
  { id: 'ty-p12', factory: '通用', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 48, type: 'SMD' },
  { id: 'ty-p125', factory: '通用', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 42, type: 'SMD' },
  { id: 'ty-p16', factory: '通用', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 38, type: 'SMD' },
  { id: 'ty-p20', factory: '通用', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 33, type: 'SMD' },
  { id: 'ty-p25', factory: '通用', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 30, type: 'SMD' },
  { id: 'ty-p3125', factory: '通用', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 27, type: 'SMD' },
  { id: 'ty-p3333', factory: '通用', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 24, type: 'SMD' },
  // ─── 格莱光 ───
  { id: 'glg-p1', factory: '格莱光', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 365, type: 'COB' },
  { id: 'glg-p2', factory: '格莱光', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 305, type: 'COB' },
  { id: 'glg-p3', factory: '格莱光', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 212, type: 'SMD' },
  { id: 'glg-p4', factory: '格莱光', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 178, type: 'SMD' },
  { id: 'glg-p5', factory: '格莱光', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 138, type: 'SMD' },
  { id: 'glg-p6', factory: '格莱光', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 115, type: 'SMD' },
  { id: 'glg-p7', factory: '格莱光', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 92, type: 'SMD' },
  { id: 'glg-p8', factory: '格莱光', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 80, type: 'SMD' },
  { id: 'glg-p9', factory: '格莱光', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 68, type: 'SMD' },
  { id: 'glg-p10', factory: '格莱光', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 60, type: 'SMD' },
  { id: 'glg-p10s', factory: '格莱光', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 50, type: 'SMD' },
  { id: 'glg-p12', factory: '格莱光', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 55, type: 'SMD' },
  { id: 'glg-p125', factory: '格莱光', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 48, type: 'SMD' },
  { id: 'glg-p16', factory: '格莱光', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 44, type: 'SMD' },
  { id: 'glg-p20', factory: '格莱光', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 38, type: 'SMD' },
  { id: 'glg-p25', factory: '格莱光', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 34, type: 'SMD' },
  { id: 'glg-p3125', factory: '格莱光', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 31, type: 'SMD' },
  { id: 'glg-p3333', factory: '格莱光', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 28, type: 'SMD' },
  // ─── 鑫恩拓 ───
  { id: 'xet-p1', factory: '鑫恩拓', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 345, type: 'COB' },
  { id: 'xet-p2', factory: '鑫恩拓', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 285, type: 'COB' },
  { id: 'xet-p3', factory: '鑫恩拓', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 198, type: 'SMD' },
  { id: 'xet-p4', factory: '鑫恩拓', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 162, type: 'SMD' },
  { id: 'xet-p5', factory: '鑫恩拓', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 125, type: 'SMD' },
  { id: 'xet-p6', factory: '鑫恩拓', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 102, type: 'SMD' },
  { id: 'xet-p7', factory: '鑫恩拓', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 82, type: 'SMD' },
  { id: 'xet-p8', factory: '鑫恩拓', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 70, type: 'SMD' },
  { id: 'xet-p9', factory: '鑫恩拓', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 58, type: 'SMD' },
  { id: 'xet-p10', factory: '鑫恩拓', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 50, type: 'SMD' },
  { id: 'xet-p10s', factory: '鑫恩拓', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 40, type: 'SMD' },
  { id: 'xet-p12', factory: '鑫恩拓', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 46, type: 'SMD' },
  { id: 'xet-p125', factory: '鑫恩拓', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 40, type: 'SMD' },
  { id: 'xet-p16', factory: '鑫恩拓', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 36, type: 'SMD' },
  { id: 'xet-p20', factory: '鑫恩拓', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 31, type: 'SMD' },
  { id: 'xet-p25', factory: '鑫恩拓', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 28, type: 'SMD' },
  { id: 'xet-p3125', factory: '鑫恩拓', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 25, type: 'SMD' },
  { id: 'xet-p3333', factory: '鑫恩拓', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 22, type: 'SMD' },
  // ─── 光茗光电 ───
  { id: 'gm-p1', factory: '光茗光电', model: 'P1.25', pitch: 'P1.25', moduleW: 200, moduleH: 150, brightness: 800, refreshRate: 3840, power: 350, scanMode: '1/32', price: 340, type: 'COB' },
  { id: 'gm-p2', factory: '光茗光电', model: 'P1.5', pitch: 'P1.5', moduleW: 200, moduleH: 150, brightness: 1000, refreshRate: 3840, power: 320, scanMode: '1/32', price: 280, type: 'COB' },
  { id: 'gm-p3', factory: '光茗光电', model: 'P2', pitch: 'P2', moduleW: 256, moduleH: 128, brightness: 1200, refreshRate: 3840, power: 280, scanMode: '1/16', price: 195, type: 'SMD' },
  { id: 'gm-p4', factory: '光茗光电', model: 'P2.5', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 1500, refreshRate: 3840, power: 250, scanMode: '1/16', price: 160, type: 'SMD' },
  { id: 'gm-p5', factory: '光茗光电', model: 'P3', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 1800, refreshRate: 3840, power: 220, scanMode: '1/8', price: 122, type: 'SMD' },
  { id: 'gm-p6', factory: '光茗光电', model: 'P4', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3000, refreshRate: 1920, power: 180, scanMode: '1/8', price: 100, type: 'SMD' },
  { id: 'gm-p7', factory: '光茗光电', model: 'P5', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4500, refreshRate: 1920, power: 160, scanMode: '1/8', price: 80, type: 'SMD' },
  { id: 'gm-p8', factory: '光茗光电', model: 'P6', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 5000, refreshRate: 1920, power: 140, scanMode: '1/4', price: 68, type: 'SMD' },
  { id: 'gm-p9', factory: '光茗光电', model: 'P8', pitch: 'P8', moduleW: 256, moduleH: 128, brightness: 5500, refreshRate: 1920, power: 120, scanMode: '1/4', price: 56, type: 'SMD' },
  { id: 'gm-p10', factory: '光茗光电', model: 'P10', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 6500, refreshRate: 1920, power: 110, scanMode: '1/4', price: 48, type: 'SMD' },
  { id: 'gm-p10s', factory: '光茗光电', model: 'P10-小', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, power: 120, scanMode: '1/4', price: 38, type: 'SMD' },
  { id: 'gm-p12', factory: '光茗光电', model: 'P12', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 8000, refreshRate: 1920, power: 110, scanMode: '1/2', price: 44, type: 'SMD' },
  { id: 'gm-p125', factory: '光茗光电', model: 'P12.5', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 38, type: 'SMD' },
  { id: 'gm-p16', factory: '光茗光电', model: 'P16', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 10000, refreshRate: 1920, power: 100, scanMode: '1/2', price: 34, type: 'SMD' },
  { id: 'gm-p20', factory: '光茗光电', model: 'P20', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 12000, refreshRate: 1920, power: 90, scanMode: '1/2', price: 30, type: 'SMD' },
  { id: 'gm-p25', factory: '光茗光电', model: 'P25', pitch: 'P25', moduleW: 200, moduleH: 200, brightness: 15000, refreshRate: 1920, power: 80, scanMode: '1/2', price: 26, type: 'SMD' },
  { id: 'gm-p3125', factory: '光茗光电', model: 'P31.25', pitch: 'P31.25', moduleW: 250, moduleH: 250, brightness: 20000, refreshRate: 960, power: 65, scanMode: '1/1', price: 23, type: 'SMD' },
  { id: 'gm-p3333', factory: '光茗光电', model: 'P33.33', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 18000, refreshRate: 960, power: 70, scanMode: '1/1', price: 20, type: 'SMD' },
];

// ─── Supporting Units ───────────────────────────────────────────────────────

const DEFAULT_AUX_UNITS: AuxUnit[] = [
  { key: 'metalShell', name: '金属外壳', desc: 'LED屏体钢结构外壳、防水箱体', icon: 'Building2', price: 350, unit: '元/m²', perSqm: true },
  { key: 'controlUnit', name: '控制单元', desc: '发送卡、接收卡、视频处理器', icon: 'Monitor', price: 3500, unit: '元/套', perSqm: false },
  { key: 'powerUnit', name: '供电单元', desc: '电源模块、配电箱、UPS', icon: 'Zap', price: 2800, unit: '元/套', perSqm: false },
  { key: 'network', name: '联网设备', desc: '光纤收发器、交换机、4G/5G模块', icon: 'Radio', price: 2000, unit: '元/套', perSqm: false },
  { key: 'warning', name: '声光警示单元', desc: '扬声器、警示灯、蜂鸣器', icon: 'Lightbulb', price: 1500, unit: '元/套', perSqm: false },
  { key: 'radar', name: '雷达检测单元', desc: '毫米波雷达、激光雷达、传感器', icon: 'Gauge', price: 2500, unit: '元/套', perSqm: false },
  { key: 'mounting', name: '安装杆件组装', desc: '立杆、横臂、法兰、紧固件', icon: 'Wrench', price: 3800, unit: '元/套', perSqm: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMoney(v: number) {
  return `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calcModules(screenW: number, screenH: number, moduleW: number, moduleH: number) {
  if (!screenW || !screenH || !moduleW || !moduleH) return null;
  const mw = moduleW / 1000;
  const mh = moduleH / 1000;
  const cols = Math.ceil(screenW / mw);
  const rows = Math.ceil(screenH / mh);
  const qty = cols * rows;
  const actualW = Math.round(cols * mw * 100) / 100;
  const actualH = Math.round(rows * mh * 100) / 100;
  const actualArea = Math.round(actualW * actualH * 100) / 100;
  return { cols, rows, qty, actualW, actualH, actualArea };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LedScreenCost() {
  const [activeFactory, setActiveFactory] = useState('全部');
  const [config, setConfig] = useState<LedScreenConfig>({
    id: '',
    name: '默认方案',
    screenW: 3.84,
    screenH: 2.08,
    selectedModuleId: null,
    modulePrices: {},
    auxUnits: DEFAULT_AUX_UNITS.map(u => ({ ...u })),
    coefficients: { assemblyFee: 5, taxRate: 13, profitMargin: 15 },
  });
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);

  const filteredModules = activeFactory === '全部'
    ? ALL_MODULES
    : ALL_MODULES.filter(m => m.factory === activeFactory);

  const selectedModule = ALL_MODULES.find(m => m.id === config.selectedModuleId);

  // Calculate module quantity
  const modCalc = calcModules(config.screenW, config.screenH,
    selectedModule?.moduleW ?? 0, selectedModule?.moduleH ?? 0);

  // Total cost calculation
  const costCalc = useCallback(() => {
    if (!selectedModule || !modCalc) return null;
    const modulePrice = config.modulePrices[selectedModule.id] ?? selectedModule.price;
    const moduleTotal = modulePrice * modCalc.qty;
    const pricePerSqm = modCalc.actualArea > 0 ? moduleTotal / modCalc.actualArea : 0;
    const auxCost = config.auxUnits.reduce((sum, u) => {
      if (u.perSqm) return sum + u.price * modCalc.actualArea;
      return sum + u.price;
    }, 0);
    const materialCost = moduleTotal + auxCost;
    const assemblyFee = materialCost * config.coefficients.assemblyFee / 100;
    const profit = materialCost * config.coefficients.profitMargin / 100;
    const subtotal = materialCost + assemblyFee + profit;
    const tax = subtotal * config.coefficients.taxRate / 100;
    const totalCost = subtotal + tax;
    return { moduleTotal, pricePerSqm, auxCost, materialCost, assemblyFee, profit, subtotal, tax, totalCost };
  }, [selectedModule, modCalc, config.modulePrices, config.auxUnits, config.coefficients]);

  const cost = costCalc();

  function updateConfig(updates: Partial<LedScreenConfig>) {
    setConfig(prev => ({ ...prev, ...updates }));
  }

  function updateModulePrice(moduleId: string, price: number) {
    setConfig(prev => ({ ...prev, modulePrices: { ...prev.modulePrices, [moduleId]: price } }));
  }

  function updateCoefficient(key: keyof LedCoefficients, value: number) {
    setConfig(prev => ({
      ...prev,
      coefficients: { ...prev.coefficients, [key]: value },
    }));
  }

  function updateAuxPrice(key: string, price: number) {
    setConfig(prev => ({
      ...prev,
      auxUnits: prev.auxUnits.map(u => u.key === key ? { ...u, price } : u),
    }));
  }

  // ─── Save / Load / Delete ─────────────────────────────────────────────────

  async function loadConfigs() {
    try {
      const res = await fetch('/api/data?type=ledConfigs');
      const data = await res.json();
      setSavedConfigs(data.data || []);
    } catch { setSavedConfigs([]); }
  }

  useEffect(() => { loadConfigs(); }, []);

  async function saveConfig() {
    if (!config.name.trim()) return;
    const payload = {
      name: config.name,
      moduleType: 'led',
      params: JSON.stringify({
        screenW: config.screenW, screenH: config.screenH,
        selectedModuleId: config.selectedModuleId,
        modulePrices: config.modulePrices,
        auxUnits: config.auxUnits,
        coefficients: config.coefficients,
      }),
    };
    const res = await fetch('/api/data?type=ledConfigs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { loadConfigs(); }
  }

  async function deleteConfig(id: string) {
    await fetch(`/api/data?type=ledConfigs&id=${id}`, { method: 'DELETE' });
    loadConfigs();
  }

  function loadConfig(c: any) {
    try {
      const p = JSON.parse(c.params);
      setConfig({
        id: c.id,
        name: c.name,
        screenW: p.screenW ?? 3.84,
        screenH: p.screenH ?? 2.08,
        selectedModuleId: p.selectedModuleId ?? null,
        modulePrices: p.modulePrices ?? {},
        auxUnits: p.auxUnits ?? DEFAULT_AUX_UNITS.map(u => ({ ...u })),
        coefficients: p.coefficients ?? { assemblyFee: 5, taxRate: 13, profitMargin: 15 },
      });
    } catch { /* ignore */ }
  }

  function exportTxt() {
    const lines: string[] = [];
    lines.push('═══ LED屏成本核算报告 ═══');
    lines.push(`方案名称: ${config.name}`);
    lines.push(`屏幕尺寸: ${config.screenW}m × ${config.screenH}m`);
    lines.push(`总面积: ${config.screenW * config.screenH}m²`);
    if (selectedModule && modCalc) {
      lines.push(`模组规格: ${selectedModule.factory} ${selectedModule.model}`);
      lines.push(`模组尺寸: ${selectedModule.moduleW}×${selectedModule.moduleH}mm`);
      lines.push(`实际尺寸: ${modCalc.actualW}m × ${modCalc.actualH}m`);
      lines.push(`实际面积: ${modCalc.actualArea}m²`);
      lines.push(`模组数量: ${modCalc.qty}块 (${modCalc.cols}列×${modCalc.rows}行)`);
      const mp = config.modulePrices[selectedModule.id] ?? selectedModule.price;
      lines.push(`模组单价: ${formatMoney(mp)}`);
      lines.push(`模组总价: ${formatMoney(cost?.moduleTotal ?? 0)}`);
      lines.push(`每平米价: ${formatMoney(cost?.pricePerSqm ?? 0)}/m²`);
    }
    lines.push('--- 辅助设备 ---');
    config.auxUnits.forEach(u => {
      const amt = u.perSqm && modCalc ? u.price * modCalc.actualArea : u.price;
      lines.push(`  ${u.name}: ${u.price}${u.perSqm ? '/m²' : ''} = ${formatMoney(amt)}`);
    });
    if (cost) {
      lines.push(`--- 成本明细 ---`);
      lines.push(`材料成本: ${formatMoney(cost.materialCost)}`);
      lines.push(`组装费(${config.coefficients.assemblyFee}%): ${formatMoney(cost.assemblyFee)}`);
      lines.push(`利润(${config.coefficients.profitMargin}%): ${formatMoney(cost.profit)}`);
      lines.push(`小计: ${formatMoney(cost.subtotal)}`);
      lines.push(`税金(${config.coefficients.taxRate}%): ${formatMoney(cost.tax)}`);
      lines.push(`总价: ${formatMoney(cost.totalCost)}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${config.name}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Icon Map ─────────────────────────────────────────────────────────────

  const iconMap: Record<string, any> = {
    Building2: <Building2 className="h-5 w-5 text-blue-600" />,
    Monitor: <Monitor className="h-5 w-5 text-blue-600" />,
    Zap: <Zap className="h-5 w-5 text-amber-500" />,
    Radio: <Radio className="h-5 w-5 text-green-600" />,
    Lightbulb: <Lightbulb className="h-5 w-5 text-red-500" />,
    Gauge: <Gauge className="h-5 w-5 text-purple-600" />,
    Wrench: <Wrench className="h-5 w-5 text-slate-600" />,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
        <h2 className="text-base font-semibold text-slate-800">LED屏成本核算</h2>
        <div className="flex items-center gap-2">
          <Input value={config.name} onChange={e => updateConfig({ name: e.target.value })}
            className="h-7 w-36 text-xs" placeholder="方案名称" />
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={saveConfig}>
            <Save className="h-3 w-3 mr-1" />保存
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exportTxt}>
            <Download className="h-3 w-3 mr-1" />导出
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left Panel: Screen + Module Selection ─── */}
        <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden">
          {/* Screen Size */}
          <div className="p-3 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600 whitespace-nowrap">屏幕宽度</Label>
                <Input type="number" value={config.screenW} step={0.01}
                  onChange={e => updateConfig({ screenW: parseFloat(e.target.value) || 0 })}
                  className="h-7 w-20 text-xs text-right" />
                <span className="text-xs text-slate-400">m</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600 whitespace-nowrap">屏幕高度</Label>
                <Input type="number" value={config.screenH} step={0.01}
                  onChange={e => updateConfig({ screenH: parseFloat(e.target.value) || 0 })}
                  className="h-7 w-20 text-xs text-right" />
                <span className="text-xs text-slate-400">m</span>
              </div>
              <div className="text-xs text-slate-500">
                面积: <span className="font-semibold text-blue-600">{(config.screenW * config.screenH).toFixed(2)}</span> m²
              </div>
            </div>
          </div>

          {/* Factory Tabs */}
          <div className="flex gap-1 p-2 border-b border-slate-100 overflow-x-auto bg-white shrink-0">
            {FACTORIES.map(f => (
              <button key={f} onClick={() => setActiveFactory(f)}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-colors ${
                  activeFactory === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{f}</button>
            ))}
          </div>

          {/* Module Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {filteredModules.map(m => {
                const isSelected = m.id === config.selectedModuleId;
                const mp = config.modulePrices[m.id] ?? m.price;
                const mc = calcModules(config.screenW, config.screenH, m.moduleW, m.moduleH);
                return (
                  <div key={m.id}
                    onClick={() => updateConfig({ selectedModuleId: m.id })}
                    className={`cursor-pointer rounded-lg border-2 p-2.5 transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-800">{m.model}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        m.type === 'COB' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                      }`}>{m.type}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1.5">
                      {m.factory} · {m.pitch} · {m.moduleW}×{m.moduleH}mm
                    </div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-[10px] text-slate-400">单价:</span>
                      <Input type="number" value={mp} step={1}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateModulePrice(m.id, parseFloat(e.target.value) || 0)}
                        className="h-6 w-20 text-xs text-right" />
                      <span className="text-[10px] text-slate-400">元/块</span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-400">
                      <span>{m.brightness}cd</span>
                      <span>{m.refreshRate}Hz</span>
                      <span>{m.power}W/m²</span>
                      <span>{m.scanMode}</span>
                    </div>
                    {mc && (
                      <div className="mt-1 text-[10px] text-blue-600 font-medium">
                        {mc.qty}块 · {Math.round(mp * mc.qty / mc.actualArea)}元/m²
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Calculation Results ─── */}
        <div className="w-[380px] shrink-0 flex flex-col overflow-hidden bg-white">
          {/* Calculation Results Section */}
          <div className="p-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Grid3X3 className="h-3.5 w-3.5 text-blue-600" />计算结果
            </h3>
            {selectedModule && modCalc ? (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-500">模组规格:</span>
                  <span className="text-slate-800 font-medium text-right">{selectedModule.factory} {selectedModule.model}</span>
                  <span className="text-slate-500">实际尺寸:</span>
                  <span className="text-slate-800 font-medium text-right">{modCalc.actualW}×{modCalc.actualH}m</span>
                  <span className="text-slate-500">模组排列:</span>
                  <span className="text-slate-800 font-medium text-right">{modCalc.cols}列×{modCalc.rows}行</span>
                  <span className="text-slate-500">模组数量:</span>
                  <span className="text-slate-800 font-bold text-right text-blue-700">{modCalc.qty}块</span>
                  <span className="text-slate-500">每平米价格:</span>
                  <span className="text-slate-800 font-bold text-right text-amber-600">{formatMoney(cost?.pricePerSqm ?? 0)}/m²</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">请选择模组规格</div>
            )}
          </div>

          {/* Auxiliary Units */}
          <div className="p-3 border-b border-slate-200 shrink-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">配套单元成本</h3>
            <div className="space-y-1.5">
              {config.auxUnits.map(u => (
                <div key={u.key} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    {iconMap[u.icon] || <Tv className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700">{u.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{u.desc}</div>
                  </div>
                  <Input type="number" value={u.price} step={1}
                    onChange={e => updateAuxPrice(u.key, parseFloat(e.target.value) || 0)}
                    className="h-6 w-20 text-xs text-right" />
                  <span className="text-[10px] text-slate-400 w-10">{u.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coefficients & Cost Breakdown */}
          <div className="p-3 border-b border-slate-200 shrink-0">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">成本系数</h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'assemblyFee' as const, label: '组装费', suffix: '%' },
                { key: 'taxRate' as const, label: '税率', suffix: '%' },
                { key: 'profitMargin' as const, label: '利润率', suffix: '%' },
              ]).map(cf => (
                <div key={cf.key} className="flex items-center gap-1">
                  <Label className="text-[10px] text-slate-500 whitespace-nowrap">{cf.label}</Label>
                  <Input type="number" value={config.coefficients[cf.key]} step={0.1}
                    onChange={e => updateCoefficient(cf.key, parseFloat(e.target.value) || 0)}
                    className="h-6 w-14 text-xs text-right" />
                  <span className="text-[10px] text-slate-400">{cf.suffix}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">成本明细</h3>
            {cost ? (
              <div className="space-y-1.5">
                {[
                  { label: 'LED模组', amount: cost.moduleTotal, color: 'text-blue-700' },
                  { label: '辅助设备', amount: cost.auxCost, color: 'text-slate-700' },
                  { label: '材料成本', amount: cost.materialCost, color: 'text-slate-800 font-medium', divider: true },
                  { label: '组装费', amount: cost.assemblyFee, color: 'text-slate-600' },
                  { label: '利润', amount: cost.profit, color: 'text-slate-600' },
                  { label: '小计', amount: cost.subtotal, color: 'text-slate-800 font-medium', divider: true },
                  { label: '税金', amount: cost.tax, color: 'text-slate-600' },
                  { label: '总价', amount: cost.totalCost, color: 'text-amber-600 font-bold text-sm', divider: true },
                ].map((item, i) => (
                  <div key={i} className={`flex justify-between items-center ${item.divider ? 'border-t border-slate-100 pt-1.5 mt-1.5' : ''}`}>
                    <span className="text-xs text-slate-600">{item.label}</span>
                    <span className={`text-xs ${item.color}`}>{formatMoney(item.amount)}</span>
                  </div>
                ))}
                {/* Percentage breakdown */}
                {cost.totalCost > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <div className="text-[10px] text-slate-400 mb-1">成本占比</div>
                    {[
                      { label: 'LED模组', amount: cost.moduleTotal, color: 'bg-blue-500' },
                      { label: '辅助设备', amount: cost.auxCost, color: 'bg-slate-400' },
                      { label: '组装费', amount: cost.assemblyFee, color: 'bg-green-400' },
                      { label: '利润', amount: cost.profit, color: 'bg-amber-400' },
                      { label: '税金', amount: cost.tax, color: 'bg-red-400' },
                    ].map((item, i) => {
                      const pct = item.amount / cost.totalCost * 100;
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <div className="flex items-center gap-1 w-16">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                            <span className="text-slate-500">{item.label}</span>
                          </div>
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                          <span className="text-slate-600 w-10 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400">选择模组后显示成本明细</div>
            )}
          </div>

          {/* Saved Configs */}
          {savedConfigs.length > 0 && (
            <div className="border-t border-slate-200 p-2 max-h-24 overflow-y-auto shrink-0">
              <div className="text-[10px] font-medium text-slate-500 mb-1">已保存方案</div>
              {savedConfigs.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-0.5">
                  <button onClick={() => loadConfig(c)}
                    className="text-[10px] text-blue-600 hover:underline truncate">{c.name}</button>
                  <button onClick={() => deleteConfig(c.id)} className="text-[10px] text-red-500 hover:underline shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
