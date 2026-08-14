import type { Part, Assembly, BomEntry, BomTreeNode, QuoteItem, AppState, Product, CostCoefficients, CostBreakdown } from './types';

// ============================================================
// ID 生成
// ============================================================
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ============================================================
// 自动编号生成
// ============================================================

/** 根据已有编号列表生成下一个编号 */
function generateNextCode(
  existingCodes: string[],
  prefix: string,
  padLength: number = 6
): string {
  const maxNum = existingCodes
    .filter(c => c.startsWith(prefix))
    .map(c => {
      const num = parseInt(c.slice(prefix.length), 10);
      return isNaN(num) ? 0 : num;
    })
    .reduce((max, n) => Math.max(max, n), 0);

  return prefix + String(maxNum + 1).padStart(padLength, '0');
}

/** 生成零件编号 */
export function generatePartCode(parts: Part[]): string {
  return generateNextCode(parts.map(p => p.code), 'PRT-');
}

/** 生成组件编号 */
export function generateAssemblyCode(assemblies: Assembly[]): string {
  return generateNextCode(assemblies.map(a => a.code), 'ASM-');
}

/** 生成产品编号 */
export function generateProductCode(products: Product[]): string {
  return generateNextCode(products.map(p => p.code), 'PRD-');
}

// ============================================================
// 计算单个组件/零件的成本
// ============================================================

/** 获取零件的单价 */
export function getPartPrice(partId: string, parts: Part[]): number {
  return parts.find(p => p.id === partId)?.price ?? 0;
}

/**
 * 递归计算组件成本
 * 组件成本 = Σ(子件单价 × 用量 × (1 + 损耗率))
 */
export function calculateAssemblyCost(
  assemblyId: string,
  parts: Part[],
  assemblies: Assembly[],
  bomEntries: BomEntry[],
  visited: Set<string> = new Set()
): number {
  if (visited.has(assemblyId)) return 0; // 防止循环引用
  visited.add(assemblyId);

  const children = bomEntries.filter(b => b.parentId === assemblyId);
  let total = 0;

  for (const entry of children) {
    let childCost = 0;
    if (entry.childType === 'part') {
      childCost = getPartPrice(entry.childId, parts);
    } else {
      childCost = calculateAssemblyCost(entry.childId, parts, assemblies, bomEntries, visited);
    }
    total += childCost * entry.quantity * (1 + entry.wasteRate);
  }

  return total;
}

/**
 * 获取所有受价格变动影响的组件ID（向上追溯）
 */
export function getAffectedAssemblyIds(
  partId: string,
  bomEntries: BomEntry[]
): Set<string> {
  const affected = new Set<string>();
  const queue: string[] = [];

  // 找到所有直接使用此零件的组件
  for (const entry of bomEntries) {
    if (entry.childId === partId && entry.childType === 'part') {
      if (!affected.has(entry.parentId)) {
        affected.add(entry.parentId);
        queue.push(entry.parentId);
      }
    }
  }

  // 向上追溯
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const entry of bomEntries) {
      if (entry.childId === current && entry.childType === 'assembly') {
        if (!affected.has(entry.parentId)) {
          affected.add(entry.parentId);
          queue.push(entry.parentId);
        }
      }
    }
  }

  return affected;
}

/**
 * 获取所有受价格变动影响的零件ID（通过BOM链）
 */
export function getAffectedPartIds(
  changedPartId: string,
  parts: Part[],
  assemblies: Assembly[],
  bomEntries: BomEntry[]
): Set<string> {
  const affectedAssemblies = getAffectedAssemblyIds(changedPartId, bomEntries);
  const affectedParts = new Set<string>();

  // 收集所有受影响组件中使用的零件
  const collectParts = (assemblyId: string, visited: Set<string> = new Set()) => {
    if (visited.has(assemblyId)) return;
    visited.add(assemblyId);
    const children = bomEntries.filter(b => b.parentId === assemblyId);
    for (const entry of children) {
      if (entry.childType === 'part') {
        affectedParts.add(entry.childId);
      } else {
        collectParts(entry.childId, visited);
      }
    }
  };

  for (const asmId of affectedAssemblies) {
    collectParts(asmId);
  }

  return affectedParts;
}

// ============================================================
// 构建 BOM 树
// ============================================================
export function buildBomTree(
  rootId: string,
  rootType: 'assembly',
  parts: Part[],
  assemblies: Assembly[],
  bomEntries: BomEntry[],
  highlightedIds?: Set<string>,
  depth: number = 0,
  maxDepth: number = 10,
  visited: Set<string> = new Set()
): BomTreeNode | null {
  if (depth >= maxDepth || visited.has(rootId)) return null;
  visited.add(rootId);

  const assembly = assemblies.find(a => a.id === rootId);
  if (!assembly) return null;

  const children = bomEntries.filter(b => b.parentId === rootId);
  const childNodes: BomTreeNode[] = [];

  for (const entry of children) {
    let childNode: BomTreeNode | null = null;

    if (entry.childType === 'part') {
      const part = parts.find(p => p.id === entry.childId);
      if (part) {
        const unitCost = part.price;
        childNode = {
          id: part.id,
          code: part.code,
          name: part.name,
          type: 'part',
          quantity: entry.quantity,
          wasteRate: entry.wasteRate,
          unitCost,
          totalCost: unitCost * entry.quantity * (1 + entry.wasteRate),
          children: [],
          isHighlighted: highlightedIds?.has(part.id),
        };
      }
    } else {
      const childAssembly = assemblies.find(a => a.id === entry.childId);
      if (childAssembly) {
        const unitCost = calculateAssemblyCost(entry.childId, parts, assemblies, bomEntries);
        childNode = {
          id: childAssembly.id,
          code: childAssembly.code,
          name: childAssembly.name,
          type: 'assembly',
          quantity: entry.quantity,
          wasteRate: entry.wasteRate,
          unitCost,
          totalCost: unitCost * entry.quantity * (1 + entry.wasteRate),
          children: [],
          isHighlighted: highlightedIds?.has(childAssembly.id),
        };
        // 递归构建子树
        const subTree = buildBomTree(
          entry.childId, 'assembly', parts, assemblies, bomEntries,
          highlightedIds, depth + 1, maxDepth, new Set(visited)
        );
        if (subTree) {
          childNode.children = subTree.children;
        }
      }
    }

    if (childNode) {
      childNodes.push(childNode);
    }
  }

  const totalCost = calculateAssemblyCost(rootId, parts, assemblies, bomEntries);

  return {
    id: assembly.id,
    code: assembly.code,
    name: assembly.name,
    type: 'assembly',
    quantity: 1,
    wasteRate: 0,
    unitCost: totalCost,
    totalCost,
    children: childNodes,
    isHighlighted: highlightedIds?.has(assembly.id),
  };
}

// ============================================================
// 展开 BOM 为报价明细
// ============================================================
export function flattenBomForQuote(
  assemblyId: string,
  parts: Part[],
  assemblies: Assembly[],
  bomEntries: BomEntry[],
  level: number = 0,
  parentQuantity: number = 1,
  visited: Set<string> = new Set()
): QuoteItem[] {
  if (visited.has(assemblyId) || level > 10) return [];
  visited.add(assemblyId);

  const items: QuoteItem[] = [];
  const children = bomEntries.filter(b => b.parentId === assemblyId);

  for (const entry of children) {
    const effectiveQty = entry.quantity * parentQuantity;

    if (entry.childType === 'part') {
      const part = parts.find(p => p.id === entry.childId);
      if (part) {
        const subtotal = part.price * effectiveQty * (1 + entry.wasteRate);
        items.push({
          level,
          code: part.code,
          name: part.name,
          spec: part.spec,
          unit: part.unit,
          quantity: effectiveQty,
          unitPrice: part.price,
          wasteRate: entry.wasteRate,
          subtotal,
          isPart: true,
        });
      }
    } else {
      const assembly = assemblies.find(a => a.id === entry.childId);
      if (assembly) {
        const assemblyCost = calculateAssemblyCost(entry.childId, parts, assemblies, bomEntries);
        items.push({
          level,
          code: assembly.code,
          name: assembly.name,
          spec: '-',
          unit: '套',
          quantity: effectiveQty,
          unitPrice: assemblyCost,
          wasteRate: entry.wasteRate,
          subtotal: assemblyCost * effectiveQty * (1 + entry.wasteRate),
          isPart: false,
        });
        // 递归展开子组件
        const subItems = flattenBomForQuote(
          entry.childId, parts, assemblies, bomEntries,
          level + 1, effectiveQty, new Set(visited)
        );
        items.push(...subItems);
      }
    }
  }

  return items;
}

/** 计算产品总成本 */
export function calculateProductCost(
  topAssemblyId: string,
  state: AppState
): number {
  return calculateAssemblyCost(
    topAssemblyId,
    state.parts,
    state.assemblies,
    state.bomEntries
  );
}

/** 获取产品的综合成本系数 */
export function getProductCoefficients(
  product: Product | undefined,
  defaultCoefficients: CostCoefficients
): CostCoefficients {
  if (product?.coefficients) {
    return product.coefficients;
  }
  return defaultCoefficients;
}

/** 计算综合成本费用明细 */
export function calculateCostBreakdown(
  materialCost: number,
  coefficients: CostCoefficients
): CostBreakdown {
  const laborCost = materialCost * coefficients.labor / 100;
  const wasteCost = materialCost * coefficients.waste / 100;
  const freightCost = materialCost * coefficients.freight / 100;
  const taxCost = materialCost * coefficients.tax / 100;
  const rentCost = materialCost * coefficients.rent / 100;
  const utilitiesCost = materialCost * coefficients.utilities / 100;

  const totalCost = materialCost + laborCost + wasteCost + freightCost + taxCost + rentCost + utilitiesCost;

  return {
    materialCost,
    laborCost,
    laborRate: coefficients.labor,
    wasteCost,
    wasteRate: coefficients.waste,
    freightCost,
    freightRate: coefficients.freight,
    taxCost,
    taxRate: coefficients.tax,
    rentCost,
    rentRate: coefficients.rent,
    utilitiesCost,
    utilitiesRate: coefficients.utilities,
    totalCost,
  };
}

/** 获取组件的层级深度 */
export function getAssemblyDepth(
  assemblyId: string,
  bomEntries: BomEntry[],
  depth: number = 0,
  visited: Set<string> = new Set()
): number {
  if (visited.has(assemblyId)) return depth;
  visited.add(assemblyId);

  const parents = bomEntries.filter(
    b => b.childId === assemblyId && b.childType === 'assembly'
  );

  if (parents.length === 0) return depth;

  return Math.max(
    ...parents.map(p => getAssemblyDepth(p.parentId, bomEntries, depth + 1, new Set(visited)))
  );
}

/** 检查添加BOM条目是否会导致超过最大深度 */
export function wouldExceedMaxDepth(
  parentId: string,
  childId: string,
  childType: 'part' | 'assembly',
  bomEntries: BomEntry[],
  maxDepth: number = 10
): boolean {
  if (childType === 'part') return false; // 零件不增加深度

  // 计算 child 的子树深度
  const getChildDepth = (id: string, visited: Set<string> = new Set()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const children = bomEntries.filter(b => b.parentId === id && b.childType === 'assembly');
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(c => getChildDepth(c.childId, new Set(visited))));
  };

  // 计算 parent 当前的深度（到根）
  const getParentDepth = (id: string, visited: Set<string> = new Set()): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    const parents = bomEntries.filter(b => b.childId === id && b.childType === 'assembly');
    if (parents.length === 0) return 1;
    return 1 + Math.max(...parents.map(p => getParentDepth(p.parentId, new Set(visited))));
  };

  const parentDepth = getParentDepth(parentId);
  const childSubDepth = getChildDepth(childId);

  return (parentDepth + childSubDepth) > maxDepth;
}
