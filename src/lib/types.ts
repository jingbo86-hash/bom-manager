// ============================================================
// BOM 管理系统 - 数据类型定义
// ============================================================

/** 基础零件（最底层物料） */
export interface Part {
  id: string;
  code: string;        // 零件编号
  name: string;        // 名称
  spec: string;        // 规格型号
  unit: string;        // 单位
  price: number;       // 单价
  supplier: string;    // 供应商
  remark: string;      // 备注
  createdAt: number;
  updatedAt: number;
}

/** BOM 条目：定义父子关系 */
export interface BomEntry {
  id: string;
  parentId: string;      // 父件ID（组件/半成品ID）
  childId: string;       // 子件ID（零件ID 或 组件ID）
  childType: 'part' | 'assembly';  // 子件类型
  quantity: number;       // 用量
  wasteRate: number;      // 损耗率 (0~1, 如 0.05 = 5%)
}

/** 组件/半成品（由零件或其他组件组成） */
export interface Assembly {
  id: string;
  code: string;          // 组件编号
  name: string;          // 组件名称
  description: string;   // 描述
  createdAt: number;
  updatedAt: number;
}

/** 综合成本系数 */
export interface CostCoefficients {
  labor: number;       // 人工成本系数 (%)
  waste: number;       // 损耗系数 (%)
  freight: number;     // 运费系数 (%)
  tax: number;         // 税费系数 (%)
  rent: number;        // 房租分摊系数 (%)
  utilities: number;   // 水电分摊系数 (%)
}

/** 产品 */
export interface Product {
  id: string;
  code: string;          // 产品编号
  name: string;          // 产品名称
  model: string;         // 型号
  description: string;   // 描述
  topAssemblyId: string; // 关联的顶级组件ID
  coefficients?: CostCoefficients; // 自定义成本系数（可选，不设置则使用默认值）
  createdAt: number;
  updatedAt: number;
}

/** 费用明细 */
export interface CostBreakdown {
  materialCost: number;   // 物料成本
  laborCost: number;      // 人工费用
  laborRate: number;      // 人工费率
  wasteCost: number;      // 损耗费用
  wasteRate: number;      // 损耗费率
  freightCost: number;    // 运费
  freightRate: number;    // 运费费率
  taxCost: number;        // 税费
  taxRate: number;        // 税费费率
  rentCost: number;       // 房租分摊
  rentRate: number;       // 房租分摊费率
  utilitiesCost: number;  // 水电分摊
  utilitiesRate: number;  // 水电分摊费率
  totalCost: number;      // 总成本
}

/** 报价清单 */
export interface Quote {
  id: string;
  productId: string;
  productName: string;
  profitMargin: number;   // 利润率 (0~1)
  materialCost: number;   // 物料成本
  totalCost: number;      // 总成本（含各项费用）
  suggestedPrice: number; // 建议售价
  items: QuoteItem[];     // 展开的明细
  costBreakdown?: CostBreakdown; // 费用明细
  createdAt: number;
}

/** 报价明细项 */
export interface QuoteItem {
  level: number;          // 层级
  code: string;           // 编号
  name: string;           // 名称
  spec: string;           // 规格
  unit: string;           // 单位
  quantity: number;        // 用量
  unitPrice: number;      // 单价
  wasteRate: number;      // 损耗率
  subtotal: number;       // 小计
  isPart: boolean;        // 是否为基础零件
}

/** BOM 树节点（用于可视化展示） */
export interface BomTreeNode {
  id: string;
  code: string;
  name: string;
  type: 'part' | 'assembly';
  quantity: number;
  wasteRate: number;
  unitCost: number;       // 自身单价/成本
  totalCost: number;      // 总成本 = unitCost * quantity * (1 + wasteRate)
  children: BomTreeNode[];
  isHighlighted?: boolean; // 价格变动高亮
}

/** 全局应用状态 */
export interface AppState {
  parts: Part[];
  assemblies: Assembly[];
  bomEntries: BomEntry[];
  products: Product[];
  quotes: Quote[];
  defaultCoefficients: CostCoefficients;
}

/** 导航页面 */
export type PageKey = 'parts' | 'bom' | 'products' | 'quotes';