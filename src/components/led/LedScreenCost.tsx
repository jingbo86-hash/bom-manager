'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Save, Download, Plus, ChevronDown, ChevronRight, Pencil, Monitor, Box, Cable, Radio, Bell, Radar, Flame } from 'lucide-react';

// ─── Module Database ────────────────────────────────────────────────────────

interface LedModuleSpec {
  id: string;
  model: string;
  factory: string;
  type: 'COB' | 'SMD' | 'GOB';
  pitch: string;       // e.g. "P1.25"
  moduleW: number;     // mm
  moduleH: number;     // mm
  brightness: number;  // cd/m²
  refreshRate: number; // Hz
  powerConsumption: number; // W/m²
  scanMode: string;    // e.g. "1/32"
  price: number;       // 元/块
  cabinetW: number;    // 推荐箱体宽 mm
  cabinetH: number;    // 推荐箱体高 mm
}

const MODULE_DATABASE: LedModuleSpec[] = [
  // ── 利亚德 ──
  { id: 'lyd-p1.25', model: 'P1.25', factory: '利亚德', type: 'COB', pitch: 'P1.25', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 280, scanMode: '1/32', price: 320, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p1.5', model: 'P1.5', factory: '利亚德', type: 'COB', pitch: 'P1.5', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 260, scanMode: '1/32', price: 260, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p1.8', model: 'P1.8', factory: '利亚德', type: 'SMD', pitch: 'P1.8', moduleW: 320, moduleH: 160, brightness: 1800, refreshRate: 3840, powerConsumption: 240, scanMode: '1/32', price: 180, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p2.5', model: 'P2.5', factory: '利亚德', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 220, scanMode: '1/32', price: 120, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p3', model: 'P3', factory: '利亚德', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 200, scanMode: '1/16', price: 85, cabinetW: 576, cabinetH: 576 },
  { id: 'lyd-p4', model: 'P4', factory: '利亚德', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 180, scanMode: '1/16', price: 65, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p5', model: 'P5', factory: '利亚德', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 160, scanMode: '1/8', price: 55, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p6', model: 'P6', factory: '利亚德', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 150, scanMode: '1/8', price: 45, cabinetW: 576, cabinetH: 576 },
  { id: 'lyd-p8', model: 'P8', factory: '利亚德', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 3840, powerConsumption: 140, scanMode: '1/4', price: 38, cabinetW: 640, cabinetH: 480 },
  { id: 'lyd-p10', model: 'P10', factory: '利亚德', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 130, scanMode: '1/4', price: 32, cabinetW: 640, cabinetH: 480 },

  // ── 洲明科技 ──
  { id: 'zm-p1.2', model: 'P1.2', factory: '洲明科技', type: 'COB', pitch: 'P1.2', moduleW: 320, moduleH: 160, brightness: 1800, refreshRate: 3840, powerConsumption: 300, scanMode: '1/32', price: 350, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p1.5', model: 'P1.5', factory: '洲明科技', type: 'COB', pitch: 'P1.5', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 270, scanMode: '1/32', price: 280, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p2', model: 'P2', factory: '洲明科技', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 145, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p2.5', model: 'P2.5', factory: '洲明科技', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 115, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p3', model: 'P3', factory: '洲明科技', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 80, cabinetW: 576, cabinetH: 576 },
  { id: 'zm-p4', model: 'P4', factory: '洲明科技', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 60, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p5', model: 'P5', factory: '洲明科技', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 50, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p6', model: 'P6', factory: '洲明科技', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 42, cabinetW: 576, cabinetH: 576 },
  { id: 'zm-p8', model: 'P8', factory: '洲明科技', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 35, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p10', model: 'P10', factory: '洲明科技', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 30, cabinetW: 640, cabinetH: 480 },

  // ── 艾比森 ──
  { id: 'abs-p1.2', model: 'P1.2', factory: '艾比森', type: 'COB', pitch: 'P1.2', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 290, scanMode: '1/32', price: 340, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p1.5', model: 'P1.5', factory: '艾比森', type: 'COB', pitch: 'P1.5', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 265, scanMode: '1/32', price: 270, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p2', model: 'P2', factory: '艾比森', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 225, scanMode: '1/32', price: 140, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p2.5', model: 'P2.5', factory: '艾比森', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 205, scanMode: '1/32', price: 110, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p3', model: 'P3', factory: '艾比森', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 195, scanMode: '1/16', price: 78, cabinetW: 576, cabinetH: 576 },
  { id: 'abs-p4', model: 'P4', factory: '艾比森', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 175, scanMode: '1/16', price: 58, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p5', model: 'P5', factory: '艾比森', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 160, scanMode: '1/8', price: 48, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p8', model: 'P8', factory: '艾比森', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 138, scanMode: '1/4', price: 33, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p10', model: 'P10', factory: '艾比森', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 128, scanMode: '1/4', price: 28, cabinetW: 640, cabinetH: 480 },

  // ── 强力巨彩 ──
  { id: 'qljc-p1.5', model: 'P1.5', factory: '强力巨彩', type: 'COB', pitch: 'P1.5', moduleW: 320, moduleH: 160, brightness: 1800, refreshRate: 3840, powerConsumption: 270, scanMode: '1/32', price: 250, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p2', model: 'P2', factory: '强力巨彩', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 130, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p2.5', model: 'P2.5', factory: '强力巨彩', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 105, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p3', model: 'P3', factory: '强力巨彩', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 72, cabinetW: 576, cabinetH: 576 },
  { id: 'qljc-p4', model: 'P4', factory: '强力巨彩', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 52, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p5', model: 'P5', factory: '强力巨彩', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 45, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p6', model: 'P6', factory: '强力巨彩', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 38, cabinetW: 576, cabinetH: 576 },
  { id: 'qljc-p8', model: 'P8', factory: '强力巨彩', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 30, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p10', model: 'P10', factory: '强力巨彩', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 25, cabinetW: 640, cabinetH: 480 },

  // ── 雷曼光电 ──
  { id: 'lm-p1.2', model: 'P1.2', factory: '雷曼光电', type: 'COB', pitch: 'P1.2', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 300, scanMode: '1/32', price: 360, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p1.5', model: 'P1.5', factory: '雷曼光电', type: 'COB', pitch: 'P1.5', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 270, scanMode: '1/32', price: 290, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p2', model: 'P2', factory: '雷曼光电', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 150, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p2.5', model: 'P2.5', factory: '雷曼光电', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 118, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p3', model: 'P3', factory: '雷曼光电', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 82, cabinetW: 576, cabinetH: 576 },
  { id: 'lm-p4', model: 'P4', factory: '雷曼光电', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 62, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p5', model: 'P5', factory: '雷曼光电', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 52, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p6', model: 'P6', factory: '雷曼光电', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 42, cabinetW: 576, cabinetH: 576 },
  { id: 'lm-p8', model: 'P8', factory: '雷曼光电', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 35, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p10', model: 'P10', factory: '雷曼光电', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 30, cabinetW: 640, cabinetH: 480 },

  // ── 海佳彩亮 ──
  { id: 'hjcl-p2', model: 'P2', factory: '海佳彩亮', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 120, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p2.5', model: 'P2.5', factory: '海佳彩亮', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 95, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p3', model: 'P3', factory: '海佳彩亮', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 68, cabinetW: 576, cabinetH: 576 },
  { id: 'hjcl-p4', model: 'P4', factory: '海佳彩亮', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 48, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p5', model: 'P5', factory: '海佳彩亮', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 42, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p6', model: 'P6', factory: '海佳彩亮', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 35, cabinetW: 576, cabinetH: 576 },
  { id: 'hjcl-p8', model: 'P8', factory: '海佳彩亮', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 28, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p10', model: 'P10', factory: '海佳彩亮', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 22, cabinetW: 640, cabinetH: 480 },

  // ── 通用品牌 ──
  { id: 'ty-p2', model: 'P2', factory: '通用', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 110, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p2.5', model: 'P2.5', factory: '通用', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 90, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p3', model: 'P3', factory: '通用', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 65, cabinetW: 576, cabinetH: 576 },
  { id: 'ty-p4', model: 'P4', factory: '通用', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 45, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p5', model: 'P5', factory: '通用', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 40, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p6', model: 'P6', factory: '通用', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 32, cabinetW: 576, cabinetH: 576 },
  { id: 'ty-p8', model: 'P8', factory: '通用', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 25, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p10', model: 'P10', factory: '通用', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 20, cabinetW: 640, cabinetH: 480 },

  // ── 格莱光 ──
  { id: 'glg-p2', model: 'P2', factory: '格莱光', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 125, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p2.5', model: 'P2.5', factory: '格莱光', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 100, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p3', model: 'P3', factory: '格莱光', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 70, cabinetW: 576, cabinetH: 576 },
  { id: 'glg-p4', model: 'P4', factory: '格莱光', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 50, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p5', model: 'P5', factory: '格莱光', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 45, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p6', model: 'P6', factory: '格莱光', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 38, cabinetW: 576, cabinetH: 576 },
  { id: 'glg-p8', model: 'P8', factory: '格莱光', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 32, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p10', model: 'P10', factory: '格莱光', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 28, cabinetW: 640, cabinetH: 480 },

  // ── 鑫恩拓 ──
  { id: 'xet-p2', model: 'P2', factory: '鑫恩拓', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2000, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 115, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p2.5', model: 'P2.5', factory: '鑫恩拓', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 92, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p3', model: 'P3', factory: '鑫恩拓', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 65, cabinetW: 576, cabinetH: 576 },
  { id: 'xet-p4', model: 'P4', factory: '鑫恩拓', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 48, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p5', model: 'P5', factory: '鑫恩拓', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 42, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p6', model: 'P6', factory: '鑫恩拓', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 35, cabinetW: 576, cabinetH: 576 },
  { id: 'xet-p8', model: 'P8', factory: '鑫恩拓', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 28, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p10', model: 'P10', factory: '鑫恩拓', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 22, cabinetW: 640, cabinetH: 480 },

  // ── 光茗光电 ──
  { id: 'gm-p2', model: 'P2', factory: '光茗光电', type: 'SMD', pitch: 'P2', moduleW: 320, moduleH: 160, brightness: 2200, refreshRate: 3840, powerConsumption: 230, scanMode: '1/32', price: 118, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p2.5', model: 'P2.5', factory: '光茗光电', type: 'SMD', pitch: 'P2.5', moduleW: 320, moduleH: 160, brightness: 2500, refreshRate: 3840, powerConsumption: 210, scanMode: '1/32', price: 95, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p3', model: 'P3', factory: '光茗光电', type: 'SMD', pitch: 'P3', moduleW: 192, moduleH: 192, brightness: 3000, refreshRate: 3840, powerConsumption: 190, scanMode: '1/16', price: 68, cabinetW: 576, cabinetH: 576 },
  { id: 'gm-p4', model: 'P4', factory: '光茗光电', type: 'SMD', pitch: 'P4', moduleW: 256, moduleH: 128, brightness: 3500, refreshRate: 3840, powerConsumption: 170, scanMode: '1/16', price: 48, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p5', model: 'P5', factory: '光茗光电', type: 'SMD', pitch: 'P5', moduleW: 320, moduleH: 160, brightness: 4000, refreshRate: 3840, powerConsumption: 155, scanMode: '1/8', price: 42, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p6', model: 'P6', factory: '光茗光电', type: 'SMD', pitch: 'P6', moduleW: 192, moduleH: 192, brightness: 4500, refreshRate: 3840, powerConsumption: 145, scanMode: '1/8', price: 35, cabinetW: 576, cabinetH: 576 },
  { id: 'gm-p8', model: 'P8', factory: '光茗光电', type: 'SMD', pitch: 'P8', moduleW: 320, moduleH: 160, brightness: 5000, refreshRate: 1920, powerConsumption: 135, scanMode: '1/4', price: 28, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p10', model: 'P10', factory: '光茗光电', type: 'SMD', pitch: 'P10', moduleW: 320, moduleH: 160, brightness: 5500, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 22, cabinetW: 640, cabinetH: 480 },

  // ── P10-160×160 小模组 ──
  { id: 'lyd-p10s', model: 'P10', factory: '利亚德', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 130, scanMode: '1/4', price: 14, cabinetW: 640, cabinetH: 480 },
  { id: 'zm-p10s', model: 'P10', factory: '洲明科技', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 12, cabinetW: 640, cabinetH: 480 },
  { id: 'abs-p10s', model: 'P10', factory: '艾比森', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 128, scanMode: '1/4', price: 13, cabinetW: 640, cabinetH: 480 },
  { id: 'qljc-p10s', model: 'P10', factory: '强力巨彩', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 10, cabinetW: 640, cabinetH: 480 },
  { id: 'lm-p10s', model: 'P10', factory: '雷曼光电', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 14, cabinetW: 640, cabinetH: 480 },
  { id: 'hjcl-p10s', model: 'P10', factory: '海佳彩亮', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 9, cabinetW: 640, cabinetH: 480 },
  { id: 'ty-p10s', model: 'P10', factory: '通用', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 8, cabinetW: 640, cabinetH: 480 },
  { id: 'glg-p10s', model: 'P10', factory: '格莱光', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 11, cabinetW: 640, cabinetH: 480 },
  { id: 'xet-p10s', model: 'P10', factory: '鑫恩拓', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 9, cabinetW: 640, cabinetH: 480 },
  { id: 'gm-p10s', model: 'P10', factory: '光茗光电', type: 'SMD', pitch: 'P10', moduleW: 160, moduleH: 160, brightness: 3000, refreshRate: 1920, powerConsumption: 125, scanMode: '1/4', price: 10, cabinetW: 640, cabinetH: 480 },

  // ── P12.5户外全系列 ──
  { id: 'lyd-p12.5', model: 'P12.5', factory: '利亚德', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 16, cabinetW: 800, cabinetH: 600 },
  { id: 'zm-p12.5', model: 'P12.5', factory: '洲明科技', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 14, cabinetW: 800, cabinetH: 600 },
  { id: 'abs-p12.5', model: 'P12.5', factory: '艾比森', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 15, cabinetW: 800, cabinetH: 600 },
  { id: 'qljc-p12.5', model: 'P12.5', factory: '强力巨彩', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 12, cabinetW: 800, cabinetH: 600 },
  { id: 'lm-p12.5', model: 'P12.5', factory: '雷曼光电', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 16, cabinetW: 800, cabinetH: 600 },
  { id: 'hjcl-p12.5', model: 'P12.5', factory: '海佳彩亮', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 11, cabinetW: 800, cabinetH: 600 },
  { id: 'ty-p12.5', model: 'P12.5', factory: '通用', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 10, cabinetW: 800, cabinetH: 600 },
  { id: 'glg-p12.5', model: 'P12.5', factory: '格莱光', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 13, cabinetW: 800, cabinetH: 600 },
  { id: 'xet-p12.5', model: 'P12.5', factory: '鑫恩拓', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 11, cabinetW: 800, cabinetH: 600 },
  { id: 'gm-p12.5', model: 'P12.5', factory: '光茗光电', type: 'SMD', pitch: 'P12.5', moduleW: 200, moduleH: 100, brightness: 9000, refreshRate: 1920, powerConsumption: 105, scanMode: '1/2', price: 12, cabinetW: 800, cabinetH: 600 },

  // ── P12户外全系列 (亮度8000-12000) ──
  { id: 'lyd-p12', model: 'P12', factory: '利亚德', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 18, cabinetW: 768, cabinetH: 576 },
  { id: 'zm-p12', model: 'P12', factory: '洲明科技', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 16, cabinetW: 768, cabinetH: 576 },
  { id: 'abs-p12', model: 'P12', factory: '艾比森', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 17, cabinetW: 768, cabinetH: 576 },
  { id: 'qljc-p12', model: 'P12', factory: '强力巨彩', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 14, cabinetW: 768, cabinetH: 576 },
  { id: 'lm-p12', model: 'P12', factory: '雷曼光电', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 18, cabinetW: 768, cabinetH: 576 },
  { id: 'hjcl-p12', model: 'P12', factory: '海佳彩亮', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 13, cabinetW: 768, cabinetH: 576 },
  { id: 'ty-p12', model: 'P12', factory: '通用', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 12, cabinetW: 768, cabinetH: 576 },
  { id: 'glg-p12', model: 'P12', factory: '格莱光', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 15, cabinetW: 768, cabinetH: 576 },
  { id: 'xet-p12', model: 'P12', factory: '鑫恩拓', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 13, cabinetW: 768, cabinetH: 576 },
  { id: 'gm-p12', model: 'P12', factory: '光茗光电', type: 'SMD', pitch: 'P12', moduleW: 384, moduleH: 192, brightness: 10000, refreshRate: 1920, powerConsumption: 110, scanMode: '1/2', price: 14, cabinetW: 768, cabinetH: 576 },

  // ── P16户外全系列 (亮度10000-15000) ──
  { id: 'lyd-p16', model: 'P16', factory: '利亚德', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 15, cabinetW: 768, cabinetH: 576 },
  { id: 'zm-p16', model: 'P16', factory: '洲明科技', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 14, cabinetW: 768, cabinetH: 576 },
  { id: 'abs-p16', model: 'P16', factory: '艾比森', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 14, cabinetW: 768, cabinetH: 576 },
  { id: 'qljc-p16', model: 'P16', factory: '强力巨彩', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 12, cabinetW: 768, cabinetH: 576 },
  { id: 'lm-p16', model: 'P16', factory: '雷曼光电', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 15, cabinetW: 768, cabinetH: 576 },
  { id: 'hjcl-p16', model: 'P16', factory: '海佳彩亮', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 11, cabinetW: 768, cabinetH: 576 },
  { id: 'ty-p16', model: 'P16', factory: '通用', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 10, cabinetW: 768, cabinetH: 576 },
  { id: 'glg-p16', model: 'P16', factory: '格莱光', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 13, cabinetW: 768, cabinetH: 576 },
  { id: 'xet-p16', model: 'P16', factory: '鑫恩拓', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 11, cabinetW: 768, cabinetH: 576 },
  { id: 'gm-p16', model: 'P16', factory: '光茗光电', type: 'SMD', pitch: 'P16', moduleW: 256, moduleH: 128, brightness: 12000, refreshRate: 1920, powerConsumption: 100, scanMode: '1/2', price: 12, cabinetW: 768, cabinetH: 576 },

  // ── P20户外全系列 (亮度12000-18000) ──
  { id: 'lyd-p20', model: 'P20', factory: '利亚德', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 12, cabinetW: 960, cabinetH: 640 },
  { id: 'zm-p20', model: 'P20', factory: '洲明科技', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 11, cabinetW: 960, cabinetH: 640 },
  { id: 'abs-p20', model: 'P20', factory: '艾比森', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 11, cabinetW: 960, cabinetH: 640 },
  { id: 'qljc-p20', model: 'P20', factory: '强力巨彩', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 9, cabinetW: 960, cabinetH: 640 },
  { id: 'lm-p20', model: 'P20', factory: '雷曼光电', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 12, cabinetW: 960, cabinetH: 640 },
  { id: 'hjcl-p20', model: 'P20', factory: '海佳彩亮', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 8, cabinetW: 960, cabinetH: 640 },
  { id: 'ty-p20', model: 'P20', factory: '通用', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 7, cabinetW: 960, cabinetH: 640 },
  { id: 'glg-p20', model: 'P20', factory: '格莱光', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 10, cabinetW: 960, cabinetH: 640 },
  { id: 'xet-p20', model: 'P20', factory: '鑫恩拓', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 8, cabinetW: 960, cabinetH: 640 },
  { id: 'gm-p20', model: 'P20', factory: '光茗光电', type: 'SMD', pitch: 'P20', moduleW: 320, moduleH: 160, brightness: 15000, refreshRate: 1920, powerConsumption: 90, scanMode: '1/2', price: 9, cabinetW: 960, cabinetH: 640 },

  // ── P25户外全系列 (亮度15000-20000) ──
  { id: 'lyd-p25', model: 'P25', factory: '利亚德', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 10, cabinetW: 800, cabinetH: 600 },
  { id: 'zm-p25', model: 'P25', factory: '洲明科技', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 9, cabinetW: 800, cabinetH: 600 },
  { id: 'abs-p25', model: 'P25', factory: '艾比森', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 9, cabinetW: 800, cabinetH: 600 },
  { id: 'qljc-p25', model: 'P25', factory: '强力巨彩', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 7, cabinetW: 800, cabinetH: 600 },
  { id: 'lm-p25', model: 'P25', factory: '雷曼光电', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 10, cabinetW: 800, cabinetH: 600 },
  { id: 'hjcl-p25', model: 'P25', factory: '海佳彩亮', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 6, cabinetW: 800, cabinetH: 600 },
  { id: 'ty-p25', model: 'P25', factory: '通用', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 5, cabinetW: 800, cabinetH: 600 },
  { id: 'glg-p25', model: 'P25', factory: '格莱光', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 8, cabinetW: 800, cabinetH: 600 },
  { id: 'xet-p25', model: 'P25', factory: '鑫恩拓', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 6, cabinetW: 800, cabinetH: 600 },
  { id: 'gm-p25', model: 'P25', factory: '光茗光电', type: 'SMD', pitch: 'P25', moduleW: 400, moduleH: 200, brightness: 18000, refreshRate: 1920, powerConsumption: 80, scanMode: '1/2', price: 7, cabinetW: 800, cabinetH: 600 },

  // ── P33.33户外全系列 (亮度15000-20000) ──
  { id: 'lyd-p33', model: 'P33.33', factory: '利亚德', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 8, cabinetW: 960, cabinetH: 640 },
  { id: 'zm-p33', model: 'P33.33', factory: '洲明科技', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 7, cabinetW: 960, cabinetH: 640 },
  { id: 'abs-p33', model: 'P33.33', factory: '艾比森', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 7, cabinetW: 960, cabinetH: 640 },
  { id: 'qljc-p33', model: 'P33.33', factory: '强力巨彩', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 5, cabinetW: 960, cabinetH: 640 },
  { id: 'lm-p33', model: 'P33.33', factory: '雷曼光电', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 8, cabinetW: 960, cabinetH: 640 },
  { id: 'hjcl-p33', model: 'P33.33', factory: '海佳彩亮', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 4, cabinetW: 960, cabinetH: 640 },
  { id: 'ty-p33', model: 'P33.33', factory: '通用', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 3, cabinetW: 960, cabinetH: 640 },
  { id: 'glg-p33', model: 'P33.33', factory: '格莱光', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 6, cabinetW: 960, cabinetH: 640 },
  { id: 'xet-p33', model: 'P33.33', factory: '鑫恩拓', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 4, cabinetW: 960, cabinetH: 640 },
  { id: 'gm-p33', model: 'P33.33', factory: '光茗光电', type: 'SMD', pitch: 'P33.33', moduleW: 320, moduleH: 160, brightness: 20000, refreshRate: 960, powerConsumption: 70, scanMode: '1/1', price: 5, cabinetW: 960, cabinetH: 640 },
];

const FACTORIES = ['全部', '利亚德', '洲明科技', '艾比森', '强力巨彩', '雷曼光电', '海佳彩亮', '通用', '格莱光', '鑫恩拓', '光茗光电'];

// ─── Supporting Unit Types ──────────────────────────────────────────────────

interface SupportingUnit {
  id: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  unit: string;
  defaultPrice: number;
}

const SUPPORTING_UNITS: SupportingUnit[] = [
  { id: 'metalShell', icon: <Box className="w-4 h-4 text-slate-500" />, name: '金属外壳', description: 'LED屏体钢结构外壳、防水箱体', unit: '元/m²', defaultPrice: 280 },
  { id: 'controlUnit', icon: <Monitor className="w-4 h-4 text-blue-500" />, name: '控制单元', description: '发送卡、接收卡、视频处理器', unit: '元/套', defaultPrice: 3500 },
  { id: 'powerUnit', icon: <Flame className="w-4 h-4 text-orange-500" />, name: '供电单元', description: '电源模块、配电箱、UPS', unit: '元/套', defaultPrice: 2800 },
  { id: 'networkUnit', icon: <Cable className="w-4 h-4 text-cyan-500" />, name: '联网设备', description: '光纤收发器、交换机、4G/5G模块', unit: '元/套', defaultPrice: 1800 },
  { id: 'warningUnit', icon: <Bell className="w-4 h-4 text-amber-500" />, name: '声光警示单元', description: '扬声器、警示灯、蜂鸣器', unit: '元/套', defaultPrice: 3800 },
  { id: 'radarUnit', icon: <Radar className="w-4 h-4 text-emerald-500" />, name: '雷达检测单元', description: '毫米波雷达、激光雷达、传感器', unit: '元/套', defaultPrice: 6500 },
  { id: 'mountingUnit', icon: <Radio className="w-4 h-4 text-purple-500" />, name: '安装杆件组装', description: '立杆、横臂、法兰、紧固件', unit: '元/套', defaultPrice: 2200 },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface LedScreenConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  selectedModuleId: string;
  modulePrices: Record<string, number>;  // editable prices per module id
  supportingPrices: Record<string, number>;
  managementFee: number;
  taxRate: number;
  profitMargin: number;
}

interface CalculationResult {
  area: number;
  moduleCount: number;
  cabinetCount: number;
  totalPixels: number;
  pixelDensity: number;
  moduleCost: number;
  supportingCosts: { id: string; name: string; amount: number; unit: string }[];
  materialTotal: number;
  managementFee: number;
  tax: number;
  profit: number;
  finalPrice: number;
  pricePerM2: number;
  costBreakdown: { label: string; amount: number; percentage: number }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMoney(v: number) {
  return `¥${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function calculate(config: LedScreenConfig): CalculationResult | null {
  const mod = MODULE_DATABASE.find(m => m.id === config.selectedModuleId);
  if (!mod || config.width <= 0 || config.height <= 0) return null;

  const area = config.width * config.height;
  const moduleW = mod.moduleW / 1000;
  const moduleH = mod.moduleH / 1000;
  const modulesPerRow = Math.ceil(config.width / moduleW);
  const modulesPerCol = Math.ceil(config.height / moduleH);
  const moduleCount = modulesPerRow * modulesPerCol;

  const cabW = mod.cabinetW / 1000;
  const cabH = mod.cabinetH / 1000;
  const cabsPerRow = Math.ceil(config.width / cabW);
  const cabsPerCol = Math.ceil(config.height / cabH);
  const cabinetCount = cabsPerRow * cabsPerCol;

  const pitchMm = parseFloat(mod.pitch.replace('P', ''));
  const pixelsW = Math.round((config.width * 1000) / pitchMm);
  const pixelsH = Math.round((config.height * 1000) / pitchMm);
  const totalPixels = pixelsW * pixelsH;
  const pixelDensity = Math.round(totalPixels / area);

  // Module cost (use editable price if set, otherwise default)
  const modulePrice = config.modulePrices[mod.id] ?? mod.price;
  const moduleCost = modulePrice * moduleCount;

  // Supporting unit costs
  const supportingCosts = SUPPORTING_UNITS.map(u => {
    const price = config.supportingPrices[u.id] ?? u.defaultPrice;
    let amount: number;
    if (u.id === 'metalShell') {
      amount = price * area; // 元/m² × 面积
    } else {
      amount = price; // 单套
    }
    return { id: u.id, name: u.name, amount: Math.round(amount * 100) / 100, unit: u.unit };
  });

  const supportingTotal = supportingCosts.reduce((s, c) => s + c.amount, 0);
  const materialTotal = moduleCost + supportingTotal;
  const managementFee = materialTotal * config.managementFee / 100;
  const subtotal = materialTotal + managementFee;
  const tax = subtotal * config.taxRate / 100;
  const profit = (subtotal + tax) * config.profitMargin / 100;
  const finalPrice = subtotal + tax + profit;
  const pricePerM2 = finalPrice / area;

  const breakdown = [
    { label: 'LED模组', amount: moduleCost },
    ...supportingCosts.map(c => ({ label: c.name, amount: c.amount })),
    { label: '管理费', amount: managementFee },
    { label: '税金', amount: tax },
    { label: '利润', amount: profit },
  ];

  return {
    area: Math.round(area * 100) / 100,
    moduleCount,
    cabinetCount,
    totalPixels,
    pixelDensity,
    moduleCost,
    supportingCosts,
    materialTotal: Math.round(materialTotal * 100) / 100,
    managementFee: Math.round(managementFee * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    pricePerM2: Math.round(pricePerM2 * 100) / 100,
    costBreakdown: breakdown.map(item => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
      percentage: finalPrice > 0 ? Math.round(item.amount / finalPrice * 10000) / 100 : 0,
    })),
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LedScreenCost() {
  const [config, setConfig] = useState<LedScreenConfig>(() => ({
    id: generateId(),
    name: '新配置',
    width: 3,
    height: 2,
    selectedModuleId: 'glg-p4',
    modulePrices: {},
    supportingPrices: Object.fromEntries(SUPPORTING_UNITS.map(u => [u.id, u.defaultPrice])),
    managementFee: 5,
    taxRate: 13,
    profitMargin: 15,
  }));
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [configName, setConfigName] = useState('新配置');
  const [selectedFactory, setSelectedFactory] = useState('全部');
  const [msg, setMsg] = useState('');

  const selectedModule = MODULE_DATABASE.find(m => m.id === config.selectedModuleId);

  // Load from MySQL
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ledConfigs', action: 'getAll' }),
        });
        const json = await res.json();
        if (json.data) setSavedConfigs(json.data);
      } catch { /* ignore */ }
    })();
  }, []);

  const updateSupportingPrice = useCallback((id: string, price: number) => {
    setConfig(prev => ({
      ...prev,
      supportingPrices: { ...prev.supportingPrices, [id]: price },
    }));
  }, []);

  const handleSave = async () => {
    const name = configName.trim() || `配置_${Date.now()}`;
    const newConfig = { ...config, name };
    const existing = savedConfigs.findIndex((c: any) => c.id === config.id);
    let list: any[];
    let action: string;
    if (existing >= 0) {
      list = [...savedConfigs];
      list[existing] = newConfig;
      action = 'update';
    } else {
      list = [...savedConfigs, newConfig];
      action = 'create';
    }
    setSavedConfigs(list);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ledConfigs', action, data: newConfig }),
      });
    } catch { /* ignore */ }
    setMsg(`✓ 配置"${name}"已保存`);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleLoad = (id: string) => {
    const found = savedConfigs.find((c: any) => c.id === id);
    if (found) {
      setConfig(found);
      setConfigName(found.name);
      setMsg(`✓ 已加载"${found.name}"`);
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const handleDelete = async (id: string) => {
    const list = savedConfigs.filter((c: any) => c.id !== id);
    setSavedConfigs(list);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ledConfigs', action: 'delete', id }),
      });
    } catch { /* ignore */ }
    setMsg('✓ 配置已删除');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleNew = () => {
    setConfig({
      id: generateId(),
      name: '新配置',
      width: 3,
      height: 2,
      selectedModuleId: 'glg-p4',
      modulePrices: {},
      supportingPrices: Object.fromEntries(SUPPORTING_UNITS.map(u => [u.id, u.defaultPrice])),
      managementFee: 5,
      taxRate: 13,
      profitMargin: 15,
    });
    setConfigName('新配置');
  };

  const handleExport = () => {
    const result = calculate(config);
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
    if (selectedModule) {
      lines.push(`模组型号: ${selectedModule.model}`);
      lines.push(`生产厂家: ${selectedModule.factory}`);
      lines.push(`像素间距: ${selectedModule.pitch}`);
      lines.push(`模组尺寸: ${selectedModule.moduleW}×${selectedModule.moduleH}mm`);
      lines.push(`箱体尺寸: ${selectedModule.cabinetW}×${selectedModule.cabinetH}mm`);
    }
    lines.push(`模组数量: ${result.moduleCount} 块`);
    lines.push(`箱体数量: ${result.cabinetCount} 个`);
    lines.push(`总像素数: ${result.totalPixels.toLocaleString()} 像素`);
    lines.push(`像素密度: ${result.pixelDensity.toLocaleString()} 像素/m²`);
    lines.push('');

    lines.push(sep2);
    lines.push('【成本明细】');
    lines.push(sep2);
    for (const item of result.costBreakdown) {
      lines.push(`${item.label.padEnd(16)} ${formatMoney(item.amount).padStart(12)} ${item.percentage.toFixed(1).padStart(8)}%`);
    }
    lines.push(sep2);
    lines.push(`${'合计'.padEnd(16)} ${formatMoney(result.finalPrice).padStart(12)} 100.0%`);
    lines.push('');
    lines.push(`最终报价: ${formatMoney(result.finalPrice)}`);
    lines.push(`单位面积价格: ${formatMoney(result.pricePerM2)}/m²`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LED屏成本_${configName.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filteredModules = selectedFactory === '全部'
    ? MODULE_DATABASE
    : MODULE_DATABASE.filter(m => m.factory === selectedFactory);

  const result = calculate(config);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">LED屏成本核算</h2>
          <Input
            value={configName}
            onChange={e => setConfigName(e.target.value)}
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
          <span className="text-xs text-slate-500">加载配置:</span>
          <select
            className="h-7 text-xs border rounded px-2 bg-white"
            onChange={e => e.target.value && handleLoad(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>选择保存的配置</option>
            {savedConfigs.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {msg && <span className="text-xs text-emerald-600">{msg}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {/* ── Left: Screen Size + Module Selection ── */}
          <div className="lg:col-span-3 space-y-3">
            {/* 屏幕尺寸设定 */}
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <div className="w-1 h-4 bg-blue-500 rounded" />
                  屏幕尺寸设定
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-20 shrink-0">宽度</Label>
                    <Input type="number" value={config.width} onChange={e => setConfig(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs flex-1" step={0.1} min={0} />
                    <span className="text-xs text-slate-400 w-6">m</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600 w-20 shrink-0">高度</Label>
                    <Input type="number" value={config.height} onChange={e => setConfig(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs flex-1" step={0.1} min={0} />
                    <span className="text-xs text-slate-400 w-6">m</span>
                  </div>
                </div>
                {result && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                    显示面积: <strong>{result.area}m²</strong> | 模组数: {result.moduleCount}块 | 箱体数: {result.cabinetCount}个 | 总像素: {result.totalPixels.toLocaleString()} | 密度: {result.pixelDensity.toLocaleString()}/m²
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LED模组选择 */}
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <div className="w-1 h-4 bg-emerald-500 rounded" />
                  LED模组选择
                </div>
                {/* Factory tabs */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {FACTORIES.map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFactory(f)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedFactory === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {/* Module cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {filteredModules.map(mod => {
                    const isSelected = config.selectedModuleId === mod.id;
                    const modPrice = config.modulePrices[mod.id] ?? mod.price;
                    const pitchNum = parseFloat(mod.pitch.replace('P', ''));
                    // Calculate module count for this module
                    const mW = mod.moduleW / 1000;
                    const mH = mod.moduleH / 1000;
                    const modCount = Math.ceil(config.width / mW) * Math.ceil(config.height / mH);
                    const modArea = modCount * (mod.moduleW * mod.moduleH) / 1_000_000;
                    const pricePerM2 = modArea > 0 ? (modPrice * modCount) / modArea : 0;
                    return (
                      <div
                        key={mod.id}
                        className={`text-left border rounded-lg p-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          selectedModuleId: mod.id,
                          width: Math.ceil(prev.width / mW) * mW,
                          height: Math.ceil(prev.height / mH) * mH,
                        }))}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800">{mod.model}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            mod.type === 'COB' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {mod.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-1">
                          {mod.factory} | {mod.pitch} | {mod.moduleW}×{mod.moduleH}mm
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-slate-400 shrink-0">¥</span>
                            <Input
                              type="number"
                              value={modPrice}
                              onChange={e => {
                                const v = parseFloat(e.target.value) || 0;
                                setConfig(prev => ({
                                  ...prev,
                                  modulePrices: { ...prev.modulePrices, [mod.id]: v },
                                }));
                              }}
                              className="h-6 w-16 text-xs text-right"
                              step={1}
                              min={0}
                            />
                            <span className="text-xs text-slate-400">/块</span>
                          </div>
                          <span className="text-xs text-slate-400">{mod.scanMode}扫</span>
                        </div>
                        {isSelected && config.width > 0 && config.height > 0 && (
                          <div className="text-xs text-emerald-600 mt-1 font-medium">
                            需 {modCount} 块 · ¥{pricePerM2.toFixed(0)}/m²
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-2">
                          <span>{mod.brightness}cd</span>
                          <span>{mod.refreshRate}Hz</span>
                          <span>{mod.powerConsumption}W/m²</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Supporting Unit Costs + Coefficients + Results ── */}
          <div className="lg:col-span-2 space-y-3">
            {/* 配套单元成本 */}
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <div className="w-1 h-4 bg-amber-500 rounded" />
                  配套单元成本 <span className="text-xs font-normal text-slate-400">(可手动输入)</span>
                </div>
                <div className="space-y-1.5">
                  {SUPPORTING_UNITS.map(u => (
                    <div key={u.id} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5">
                      <div className="w-6 shrink-0 flex justify-center">{u.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-700">{u.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{u.description}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          value={config.supportingPrices[u.id]}
                          onChange={e => updateSupportingPrice(u.id, parseFloat(e.target.value) || 0)}
                          className="h-7 w-20 text-xs text-right"
                          step={10}
                          min={0}
                        />
                        <span className="text-[10px] text-slate-400 w-10">{u.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 成本系数 */}
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <div className="w-1 h-4 bg-slate-400 rounded" />
                  成本系数
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-slate-600 shrink-0">管理费</Label>
                    <Input type="number" value={config.managementFee} onChange={e => setConfig(prev => ({ ...prev, managementFee: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs flex-1" step={0.5} />
                    <span className="text-xs text-slate-400 w-4">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-slate-600 shrink-0">税率</Label>
                    <Input type="number" value={config.taxRate} onChange={e => setConfig(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs flex-1" step={0.5} />
                    <span className="text-xs text-slate-400 w-4">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Label className="text-xs text-slate-600 shrink-0">利润</Label>
                    <Input type="number" value={config.profitMargin} onChange={e => setConfig(prev => ({ ...prev, profitMargin: parseFloat(e.target.value) || 0 }))} className="h-7 text-xs flex-1" step={0.5} />
                    <span className="text-xs text-slate-400 w-4">%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 成本明细表 */}
            {result && (
              <Card className="border-2 border-blue-200">
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
                          <td className="px-2 py-1.5">最终报价</td>
                          <td className="px-2 py-1.5 text-right font-mono text-blue-700">{formatMoney(result.finalPrice)}</td>
                          <td className="px-2 py-1.5 text-right">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 text-center">
                    单位面积价格: <strong className="text-blue-600">{formatMoney(result.pricePerM2)}/m²</strong> | 材料成本: {formatMoney(result.materialTotal)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 已保存配置 */}
            {savedConfigs.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                    <div className="w-1 h-4 bg-slate-400 rounded" />
                    已保存配置 ({savedConfigs.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {savedConfigs.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50 border text-xs">
                        <span className="font-medium">{c.name}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5" onClick={() => handleLoad(c.id)}>加载</Button>
                          <Button size="sm" variant="ghost" className="h-5 text-xs px-1.5 text-red-500" onClick={() => handleDelete(c.id)}>
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
      </div>
    </div>
  );
}