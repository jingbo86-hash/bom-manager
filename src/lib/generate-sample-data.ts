import type { AppState, Part, Assembly, BomEntry, Product, Category, CostCoefficients } from './types';
import { generateId } from './bom-utils';

// ============================================================
// 示例数据生成器
// 为 BOM 管理系统生成一套完整的示例数据
// ============================================================

// ---------- 工具函数 ----------
function now(): number {
  return Date.now();
}

function daysAgo(n: number): number {
  return now() - n * 86400000;
}

// ---------- 分类目录 ----------
function generateCategories(): Category[] {
  const categories: Category[] = [];
  const add = (id: string, name: string, parentId: string | null) => {
    categories.push({ id, name, parentId, createdAt: now(), updatedAt: now() });
  };

  add('cat-electronic', '电子元器件', null);
  add('cat-structural', '结构件', null);
  add('cat-hardware', '五金标准件', null);
  add('cat-wire', '线缆连接器', null);
  add('cat-packaging', '包装辅材', null);

  // 电子元器件 子分类
  add('cat-ic', '集成电路', 'cat-electronic');
  add('cat-passive', '被动元件', 'cat-electronic');
  add('cat-module', '功能模块', 'cat-electronic');
  add('cat-pcb', 'PCB电路板', 'cat-electronic');

  // 结构件 子分类
  add('cat-sheet', '钣金件', 'cat-structural');
  add('cat-plastic', '注塑件', 'cat-structural');
  add('cat-aluminum', '铝型材', 'cat-structural');

  // 五金标准件 子分类
  add('cat-screw', '螺丝螺柱', 'cat-hardware');
  add('cat-washer', '垫片弹垫', 'cat-hardware');
  add('cat-spring', '弹簧卡扣', 'cat-hardware');

  // 线缆连接器 子分类
  add('cat-cable', '线缆', 'cat-wire');
  add('cat-connector', '连接器', 'cat-wire');

  return categories;
}

// ---------- 零件 ----------
function generateParts(): Part[] {
  const parts: Part[] = [];
  const add = (code: string, name: string, spec: string, unit: string, price: number,
    quantity: number, supplier: string, remark: string, categoryId: string) => {
    parts.push({
      id: generateId(),
      code, name, spec, unit, price, quantity, supplier, remark,
      purchaseLink: '', categoryId,
      createdAt: daysAgo(Math.floor(Math.random() * 60)),
      updatedAt: daysAgo(Math.floor(Math.random() * 10)),
    });
  };

  // === 集成电路 ===
  add('PRT-000001', '主控芯片 STM32F407', 'STM32F407VGT6', '颗', 45.00, 100, 'ST意法半导体', 'ARM Cortex-M4 32位MCU', 'cat-ic');
  add('PRT-000002', 'FPGA芯片 XC7A100T', 'XC7A100T-2FGG484I', '颗', 185.00, 50, 'Xilinx', 'Artix-7系列 FPGA', 'cat-ic');
  add('PRT-000003', 'DDR3内存颗粒', 'MT41J256M16HA-125', '颗', 28.50, 200, 'Micron', '4Gb DDR3 SDRAM', 'cat-ic');
  add('PRT-000004', 'Flash存储 W25Q128', 'W25Q128JVSIQ', '颗', 8.50, 500, 'Winbond', '128Mb SPI NOR Flash', 'cat-ic');
  add('PRT-000005', '电源管理IC LM2596', 'LM2596S-ADJ', '颗', 6.80, 300, 'TI德州仪器', '可调降压DC-DC', 'cat-ic');

  // === 被动元件 ===
  add('PRT-000006', '贴片电阻 10KΩ', '0805 10KΩ ±1%', '颗', 0.05, 10000, '国巨', '厚膜贴片电阻', 'cat-passive');
  add('PRT-000007', '贴片电容 100nF', '0805 100nF 50V X7R', '颗', 0.08, 10000, '村田', '多层陶瓷电容', 'cat-passive');
  add('PRT-000008', '电解电容 1000μF', '10×16mm 1000μF 25V', '颗', 1.20, 500, '红宝石', '铝电解电容', 'cat-passive');
  add('PRT-000009', '电感 10μH', 'CD54 10μH ±20%', '颗', 0.35, 1000, '顺络', '贴片功率电感', 'cat-passive');
  add('PRT-000010', '晶振 25MHz', 'HC-49S 25MHz 20ppm', '颗', 0.85, 500, '惠伦晶体', '石英晶体谐振器', 'cat-passive');

  // === 功能模块 ===
  add('PRT-000011', 'RS485通信模块', 'MAX3485模块', '个', 12.00, 200, '通用', '3.3V供电 RS485收发', 'cat-module');
  add('PRT-000012', 'WIFI模块 ESP8266', 'ESP-12F', '个', 15.00, 300, '乐鑫', '串口WiFi模块', 'cat-module');
  add('PRT-000013', '蓝牙模块 HC-05', 'HC-05 主从一体', '个', 18.50, 150, '汇承', '蓝牙2.0串口模块', 'cat-module');
  add('PRT-000014', 'GPS定位模块', 'NEO-6M', '个', 45.00, 80, 'u-blox', 'GPS定位导航模块', 'cat-module');

  // === PCB电路板 ===
  add('PRT-000015', '主控板PCB', 'FR-4 四层板 150×100mm', '片', 35.00, 50, '兴森科技', '主控板 PCB 镀金工艺', 'cat-pcb');
  add('PRT-000016', '驱动板PCB', 'FR-4 双层板 80×60mm', '片', 12.00, 200, '兴森科技', '驱动板 PCB 喷锡', 'cat-pcb');
  add('PRT-000017', '电源板PCB', 'FR-4 双层板 100×70mm', '片', 18.00, 100, '深南电路', '电源板 PCB 加厚铜箔', 'cat-pcb');

  // === 钣金件 ===
  add('PRT-000018', '设备外壳 上盖', 'SPCC 1.5mm 430×300×15mm', '件', 28.00, 100, '金诚精密', '钣金冲压成型 表面喷塑', 'cat-sheet');
  add('PRT-000019', '设备外壳 底壳', 'SPCC 1.5mm 430×300×40mm', '件', 32.00, 100, '金诚精密', '钣金冲压成型 表面喷塑', 'cat-sheet');
  add('PRT-000020', '安装支架 L型', 'Q235 3mm 80×60mm', '件', 5.50, 500, '华丰五金', '镀锌折弯支架', 'cat-sheet');
  add('PRT-000021', '前面板', '铝合金 5mm 430×200mm', '件', 45.00, 50, '金诚精密', '拉丝氧化处理', 'cat-sheet');

  // === 注塑件 ===
  add('PRT-000022', '面板按钮帽', 'ABS 黑色 φ12×8mm', '个', 0.60, 2000, '华塑科技', '注塑成型 磨砂面', 'cat-plastic');
  add('PRT-000023', 'LED指示灯罩', 'PC透明 φ5×10mm', '个', 0.30, 3000, '华塑科技', '注塑透明 散光型', 'cat-plastic');
  add('PRT-000024', '接线端子座', 'PA66 黑色 12位', '个', 2.80, 500, '华塑科技', '尼龙66阻燃', 'cat-plastic');
  add('PRT-000025', '设备脚垫', '硅胶 φ20×5mm', '个', 0.40, 1000, '华塑科技', '防滑硅胶垫', 'cat-plastic');

  // === 铝型材 ===
  add('PRT-000026', '散热器 型材', '6063-T5 200×120×40mm', '件', 18.00, 150, '中铝', '铝挤压成型 表面阳极氧化', 'cat-aluminum');
  add('PRT-000027', '设备拉手', '6063-T5 弧形 120mm', '件', 8.00, 200, '中铝', '铝型材弯弧 喷砂氧化', 'cat-aluminum');

  // === 螺丝螺柱 ===
  add('PRT-000028', '内六角螺钉 M3×8', '304不锈钢 M3×8', '颗', 0.12, 5000, '固万基', '全螺纹 弹簧垫圈组合', 'cat-screw');
  add('PRT-000029', '十字盘头螺钉 M4×12', '镀锌碳钢 M4×12', '颗', 0.08, 5000, '固万基', '十字槽盘头 全螺纹', 'cat-screw');
  add('PRT-000030', '六角螺柱 M3×15+6', 'H62黄铜 M3×15×6', '颗', 0.35, 1000, '固万基', '六角隔离螺柱 双头内螺纹', 'cat-screw');
  add('PRT-000031', '自攻螺钉 ST3.5×16', '410不锈钢 ST3.5×16', '颗', 0.10, 5000, '固万基', '十字槽沉头自攻', 'cat-screw');

  // === 垫片弹垫 ===
  add('PRT-000032', '平垫圈 M3', '304不锈钢 M3', '颗', 0.03, 10000, '固万基', '标准平垫 外径7mm', 'cat-washer');
  add('PRT-000033', '弹簧垫圈 M4', '65Mn M4', '颗', 0.05, 8000, '固万基', '标准弹簧垫圈 发黑处理', 'cat-washer');

  // === 弹簧卡扣 ===
  add('PRT-000034', '卡扣式扎带', 'PA66 2.5×100mm', '根', 0.15, 5000, '凯士士', '尼龙扎带 自锁式', 'cat-spring');
  add('PRT-000035', 'USB弹片', '磷铜 C5191', '个', 0.25, 2000, '富鑫达', 'USB母座弹片 镀金', 'cat-spring');

  // === 线缆 ===
  add('PRT-000036', '排线 2.54间距 10P', '2.54mm 10芯 灰排线 30cm', '根', 1.50, 1000, '兴达电子', '彩色灰排线 端子压接', 'cat-cable');
  add('PRT-000037', '电源线 3×0.75mm²', 'RVV 3×0.75mm² 1.5m', '根', 6.00, 300, '兴达电子', '三芯护套线 品字尾', 'cat-cable');
  add('PRT-000038', '网线 CAT6 1m', 'SFTP CAT6 8芯 1m', '根', 4.50, 200, '山泽', '屏蔽六类网线 成品跳线', 'cat-cable');
  add('PRT-000039', '杜邦线 公对母 20cm', '20cm 26AWG', '根', 0.35, 2000, '兴达电子', '杜邦线 公母头 彩色', 'cat-cable');

  // === 连接器 ===
  add('PRT-000040', '排针 2.54 2×5P', '2.54mm 双排弯针 2×5P', '个', 0.45, 2000, '维峰电子', '排针 弯脚 镀金', 'cat-connector');
  add('PRT-000041', '排母 2.54 2×5P', '2.54mm 双排直母 2×5P', '个', 0.55, 2000, '维峰电子', '排母 直脚 镀金', 'cat-connector');
  add('PRT-000042', 'DC电源插座 5.5×2.1', 'DC-005 内径2.1mm', '个', 0.80, 500, '德力西', 'DC电源插座 带开关', 'cat-connector');
  add('PRT-000043', 'RJ45网络接口', 'RJ45 8P8C 带屏蔽', '个', 1.20, 500, '维峰电子', '千兆网络接口 带LED', 'cat-connector');
  add('PRT-000044', 'DB9串口母座', 'DB9 母座 弯脚', '个', 1.80, 300, '维峰电子', 'DB9 串口连接器 镀金', 'cat-connector');

  // === 包装辅材 ===
  add('PRT-000045', '珍珠棉 内衬', 'EPE 500×400×30mm', '张', 3.50, 500, '永盛包装', '防静电珍珠棉 定制成型', 'cat-packaging');
  add('PRT-000046', '纸箱 400×300×200mm', '瓦楞纸板 三层', '个', 4.00, 300, '永盛包装', '瓦楞纸箱 印刷唛头', 'cat-packaging');
  add('PRT-000047', '干燥剂 5g', '硅胶干燥剂 5g/包', '包', 0.20, 5000, '永盛包装', '防潮干燥剂 指示型', 'cat-packaging');
  add('PRT-000048', '气泡膜 500mm宽', 'PE气泡膜 30cm/张', '张', 0.80, 1000, '永盛包装', '防震气泡膜 每张30cm', 'cat-packaging');

  return parts;
}

// ---------- 组件 (成品/半成品) ----------
function generateAssemblies(partIds: { [key: string]: string }): Assembly[] {
  const assemblies: Assembly[] = [];
  const add = (code: string, name: string, type: 'finished' | 'semi-finished', description: string) => {
    assemblies.push({
      id: generateId(),
      code, name, type, description,
      createdAt: daysAgo(Math.floor(Math.random() * 45)),
      updatedAt: daysAgo(Math.floor(Math.random() * 5)),
    });
  };

  add('ASM-000001', '主控板组件', 'semi-finished', '设备核心控制主板，含MCU及外围电路');
  add('ASM-000002', '电源模块', 'semi-finished', 'AC-DC隔离电源模块，输入220V输出12V/3A');
  add('ASM-000003', '通信接口板', 'semi-finished', 'RS485 + 以太网通信接口板');
  add('ASM-000004', '显示驱动板', 'semi-finished', 'LED/LCD显示屏驱动板');
  add('ASM-000005', '散热组件', 'semi-finished', '铝合金散热器+风扇');
  add('ASM-000006', '设备外壳组', 'semi-finished', '钣金外壳+面板+脚垫');
  add('ASM-000007', '线缆组', 'semi-finished', '内部连接线缆组装');
  add('ASM-000008', '数据采集终端', 'finished', '工业数据采集终端整机');
  add('ASM-000009', '智能网关', 'finished', 'IoT边缘智能网关');

  return assemblies;
}

// ---------- BOM 层级关系 ----------
function generateBomEntries(
  assemblyIds: { [key: string]: string },
  partIds: { [key: string]: string }
): BomEntry[] {
  const entries: BomEntry[] = [];
  const add = (parentId: string, childId: string, childType: 'part' | 'assembly', quantity: number, wasteRate: number = 0) => {
    entries.push({
      id: generateId(),
      parentId, childId, childType, quantity, wasteRate,
    });
  };

  // === 主控板组件 (ASM-000001) ===
  // 使用零件
  add(assemblyIds['ASM-000001'], partIds['PRT-000001'], 'part', 1, 0.02);   // 主控芯片 STM32F407
  add(assemblyIds['ASM-000001'], partIds['PRT-000004'], 'part', 1, 0.02);   // Flash W25Q128
  add(assemblyIds['ASM-000001'], partIds['PRT-000003'], 'part', 2, 0.03);   // DDR3 内存 ×2
  add(assemblyIds['ASM-000001'], partIds['PRT-000010'], 'part', 1, 0.01);   // 晶振 25MHz
  add(assemblyIds['ASM-000001'], partIds['PRT-000006'], 'part', 20, 0.05);  // 贴片电阻 10KΩ ×20
  add(assemblyIds['ASM-000001'], partIds['PRT-000007'], 'part', 15, 0.05);  // 贴片电容 100nF ×15
  add(assemblyIds['ASM-000001'], partIds['PRT-000008'], 'part', 3, 0.03);   // 电解电容 ×3
  add(assemblyIds['ASM-000001'], partIds['PRT-000009'], 'part', 2, 0.03);   // 电感 10μH ×2
  add(assemblyIds['ASM-000001'], partIds['PRT-000015'], 'part', 1, 0.02);   // 主控板PCB
  add(assemblyIds['ASM-000001'], partIds['PRT-000040'], 'part', 4, 0.02);   // 排针 2×5P ×4
  add(assemblyIds['ASM-000001'], partIds['PRT-000041'], 'part', 2, 0.02);   // 排母 2×5P ×2
  add(assemblyIds['ASM-000001'], partIds['PRT-000028'], 'part', 4, 0.05);   // 螺钉 M3×8 ×4
  add(assemblyIds['ASM-000001'], partIds['PRT-000030'], 'part', 4, 0.03);   // 螺柱 M3×15+6 ×4
  add(assemblyIds['ASM-000001'], partIds['PRT-000032'], 'part', 4, 0.05);   // 平垫圈 M3 ×4

  // === 电源模块 (ASM-000002) ===
  add(assemblyIds['ASM-000002'], partIds['PRT-000005'], 'part', 1, 0.02);   // 电源管理IC LM2596
  add(assemblyIds['ASM-000002'], partIds['PRT-000006'], 'part', 8, 0.05);   // 贴片电阻 ×8
  add(assemblyIds['ASM-000002'], partIds['PRT-000007'], 'part', 6, 0.05);   // 贴片电容 ×6
  add(assemblyIds['ASM-000002'], partIds['PRT-000008'], 'part', 4, 0.03);   // 电解电容 ×4
  add(assemblyIds['ASM-000002'], partIds['PRT-000009'], 'part', 2, 0.03);   // 电感 ×2
  add(assemblyIds['ASM-000002'], partIds['PRT-000017'], 'part', 1, 0.02);   // 电源板PCB
  add(assemblyIds['ASM-000002'], partIds['PRT-000042'], 'part', 1, 0.01);   // DC电源插座
  add(assemblyIds['ASM-000002'], partIds['PRT-000024'], 'part', 1, 0.02);   // 接线端子座
  add(assemblyIds['ASM-000002'], partIds['PRT-000028'], 'part', 4, 0.05);   // 螺钉 M3×8 ×4

  // === 通信接口板 (ASM-000003) ===
  add(assemblyIds['ASM-000003'], partIds['PRT-000011'], 'part', 2, 0.02);   // RS485模块 ×2
  add(assemblyIds['ASM-000003'], partIds['PRT-000012'], 'part', 1, 0.02);   // WIFI模块 ESP8266
  add(assemblyIds['ASM-000003'], partIds['PRT-000016'], 'part', 1, 0.02);   // 驱动板PCB
  add(assemblyIds['ASM-000003'], partIds['PRT-000043'], 'part', 1, 0.01);   // RJ45接口
  add(assemblyIds['ASM-000003'], partIds['PRT-000044'], 'part', 1, 0.01);   // DB9串口母座
  add(assemblyIds['ASM-000003'], partIds['PRT-000006'], 'part', 10, 0.05);  // 贴片电阻 ×10
  add(assemblyIds['ASM-000003'], partIds['PRT-000007'], 'part', 10, 0.05);  // 贴片电容 ×10
  add(assemblyIds['ASM-000003'], partIds['PRT-000028'], 'part', 4, 0.05);   // 螺钉 M3×8 ×4

  // === 显示驱动板 (ASM-000004) ===
  add(assemblyIds['ASM-000004'], partIds['PRT-000002'], 'part', 1, 0.01);   // FPGA芯片
  add(assemblyIds['ASM-000004'], partIds['PRT-000016'], 'part', 1, 0.02);   // 驱动板PCB
  add(assemblyIds['ASM-000004'], partIds['PRT-000006'], 'part', 15, 0.05);  // 贴片电阻 ×15
  add(assemblyIds['ASM-000004'], partIds['PRT-000007'], 'part', 12, 0.05);  // 贴片电容 ×12
  add(assemblyIds['ASM-000004'], partIds['PRT-000023'], 'part', 4, 0.02);   // LED指示灯罩 ×4
  add(assemblyIds['ASM-000004'], partIds['PRT-000028'], 'part', 4, 0.05);   // 螺钉 M3×8 ×4

  // === 散热组件 (ASM-000005) ===
  add(assemblyIds['ASM-000005'], partIds['PRT-000026'], 'part', 1, 0.02);   // 散热器型材
  add(assemblyIds['ASM-000005'], partIds['PRT-000028'], 'part', 4, 0.05);   // 螺钉 M3×8 ×4

  // === 设备外壳组 (ASM-000006) ===
  add(assemblyIds['ASM-000006'], partIds['PRT-000018'], 'part', 1, 0.02);   // 上盖
  add(assemblyIds['ASM-000006'], partIds['PRT-000019'], 'part', 1, 0.02);   // 底壳
  add(assemblyIds['ASM-000006'], partIds['PRT-000021'], 'part', 1, 0.02);   // 前面板
  add(assemblyIds['ASM-000006'], partIds['PRT-000020'], 'part', 4, 0.03);   // L型支架 ×4
  add(assemblyIds['ASM-000006'], partIds['PRT-000022'], 'part', 2, 0.02);   // 按钮帽 ×2
  add(assemblyIds['ASM-000006'], partIds['PRT-000025'], 'part', 4, 0.02);   // 脚垫 ×4
  add(assemblyIds['ASM-000006'], partIds['PRT-000027'], 'part', 2, 0.01);   // 拉手 ×2
  add(assemblyIds['ASM-000006'], partIds['PRT-000029'], 'part', 8, 0.05);   // 螺钉 M4×12 ×8
  add(assemblyIds['ASM-000006'], partIds['PRT-000031'], 'part', 6, 0.05);   // 自攻螺钉 ×6
  add(assemblyIds['ASM-000006'], partIds['PRT-000033'], 'part', 8, 0.05);   // 弹簧垫圈 M4 ×8

  // === 线缆组 (ASM-000007) ===
  add(assemblyIds['ASM-000007'], partIds['PRT-000036'], 'part', 2, 0.03);   // 排线 ×2
  add(assemblyIds['ASM-000007'], partIds['PRT-000037'], 'part', 1, 0.02);   // 电源线
  add(assemblyIds['ASM-000007'], partIds['PRT-000038'], 'part', 1, 0.02);   // 网线
  add(assemblyIds['ASM-000007'], partIds['PRT-000039'], 'part', 10, 0.05);  // 杜邦线 ×10
  add(assemblyIds['ASM-000007'], partIds['PRT-000034'], 'part', 5, 0.05);   // 扎带 ×5
  add(assemblyIds['ASM-000007'], partIds['PRT-000035'], 'part', 2, 0.03);   // USB弹片 ×2

  // === 数据采集终端 (ASM-000008) - 成品 ===
  // 由多个半成品组件 + 零件组成
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000001'], 'assembly', 1, 0.01);  // 主控板组件
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000002'], 'assembly', 1, 0.01);  // 电源模块
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000003'], 'assembly', 1, 0.01);  // 通信接口板
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000004'], 'assembly', 1, 0.01);  // 显示驱动板
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000005'], 'assembly', 1, 0.02);  // 散热组件
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000006'], 'assembly', 1, 0.02);  // 设备外壳组
  add(assemblyIds['ASM-000008'], assemblyIds['ASM-000007'], 'assembly', 1, 0.02);  // 线缆组
  add(assemblyIds['ASM-000008'], partIds['PRT-000013'], 'part', 1, 0.02);           // 蓝牙模块
  add(assemblyIds['ASM-000008'], partIds['PRT-000014'], 'part', 1, 0.02);           // GPS模块
  add(assemblyIds['ASM-000008'], partIds['PRT-000045'], 'part', 1, 0.03);           // 珍珠棉内衬
  add(assemblyIds['ASM-000008'], partIds['PRT-000046'], 'part', 1, 0.02);           // 纸箱
  add(assemblyIds['ASM-000008'], partIds['PRT-000047'], 'part', 2, 0.05);           // 干燥剂 ×2
  add(assemblyIds['ASM-000008'], partIds['PRT-000048'], 'part', 1, 0.03);           // 气泡膜

  // === 智能网关 (ASM-000009) - 成品 ===
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000001'], 'assembly', 1, 0.01);  // 主控板组件
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000002'], 'assembly', 1, 0.01);  // 电源模块
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000003'], 'assembly', 1, 0.01);  // 通信接口板
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000005'], 'assembly', 1, 0.02);  // 散热组件
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000006'], 'assembly', 1, 0.02);  // 设备外壳组
  add(assemblyIds['ASM-000009'], assemblyIds['ASM-000007'], 'assembly', 1, 0.02);  // 线缆组
  add(assemblyIds['ASM-000009'], partIds['PRT-000045'], 'part', 1, 0.03);           // 珍珠棉内衬
  add(assemblyIds['ASM-000009'], partIds['PRT-000046'], 'part', 1, 0.02);           // 纸箱
  add(assemblyIds['ASM-000009'], partIds['PRT-000047'], 'part', 2, 0.05);           // 干燥剂 ×2
  add(assemblyIds['ASM-000009'], partIds['PRT-000048'], 'part', 1, 0.03);           // 气泡膜

  return entries;
}

// ---------- 产品 ----------
function generateProducts(assemblyIds: { [key: string]: string }): Product[] {
  const products: Product[] = [];

  products.push({
    id: generateId(),
    code: 'PRD-000001',
    name: '工业数据采集终端 DTU-2000',
    model: 'DTU-2000',
    brand: 'IntelliLink',
    description: '支持RS485/以太网/WiFi多种通信方式，适用于工业现场数据采集与远程监控',
    parameters: `供电电压：DC 12~24V\n工作温度：-20℃~70℃\n通信接口：RS485×2, RJ45×1, WiFi\n采集频率：最高100Hz\n防护等级：IP40\n安装方式：导轨安装`,
    images: [],
    topAssemblyIds: [assemblyIds['ASM-000008']],
    coefficients: {
      labor: 12,
      waste: 2,
      freight: 3,
      tax: 13,
      rent: 5,
      utilities: 3,
    },
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  });

  products.push({
    id: generateId(),
    code: 'PRD-000002',
    name: '边缘智能网关 EGW-100',
    model: 'EGW-100',
    brand: 'IntelliLink',
    description: '边缘计算网关，支持数据预处理和云端转发，适用于IoT场景',
    parameters: `供电电压：DC 12V\n工作温度：-10℃~60℃\n通信接口：RJ45×1, RS485×1, WiFi/BT\n算力：1.2GHz Cortex-A7\n内存：512MB DDR3\n存储：8GB eMMC`,
    images: [],
    topAssemblyIds: [assemblyIds['ASM-000009']],
    coefficients: {
      labor: 10,
      waste: 2,
      freight: 3,
      tax: 13,
      rent: 4,
      utilities: 2,
    },
    createdAt: daysAgo(25),
    updatedAt: daysAgo(1),
  });

  return products;
}

// ============================================================
// 主入口：生成完整示例数据
// ============================================================
export function generateSampleData(): AppState {
  const categories = generateCategories();
  const parts = generateParts();
  const assemblies = generateAssemblies({});

  // 建立名称到ID的映射
  const partMap: { [key: string]: string } = {};
  for (const p of parts) {
    partMap[p.code] = p.id;
  }

  // 重新生成 assemblies 获取正确 ID
  const assembledAssemblies = generateAssemblies({});
  const assemblyMap: { [key: string]: string } = {};
  for (const a of assembledAssemblies) {
    assemblyMap[a.code] = a.id;
  }

  const bomEntries = generateBomEntries(assemblyMap, partMap);
  const products = generateProducts(assemblyMap);

  return {
    parts,
    assemblies: assembledAssemblies,
    bomEntries,
    products,
    quotes: [],
    categories,
    defaultCoefficients: {
      labor: 10,
      waste: 2,
      freight: 3,
      tax: 13,
      rent: 5,
      utilities: 3,
    },
  };
}