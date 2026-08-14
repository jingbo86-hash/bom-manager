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

/** 产品 */
export interface Product {
  id: string;
  code: string;          // 产品编号
  name: string;          // 产品名称
  model: string;         // 型号
  description: string;   // 描述
  topAssemblyId: string; // 关联的顶级组件ID
  createdAt: number;
  updatedAt: number;
}

/** 报价清单 */
export interface Quote {
  id: string;
  productId: string;
  productName: string;
  profitMargin: number;   // 利润率 (0~1)
  totalCost: number;      // 总成本
  suggestedPrice: number; // 建议售价
  items: QuoteItem[];     // 展开的明细
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
}

/** 导航页面 */
export type PageKey = 'parts' | 'bom' | 'products' | 'quotes';
