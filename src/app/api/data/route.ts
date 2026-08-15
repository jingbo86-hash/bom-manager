import { NextRequest, NextResponse } from 'next/server';
import { query, getOne } from '@/lib/db';

// 表名映射
const TABLE_MAP: Record<string, string> = {
  parts: 'parts',
  assemblies: 'assemblies',
  bomEntries: 'bom_entries',
  products: 'products',
  quotes: 'quotes',
  categories: 'categories',
  coefficients: 'default_coefficients',
};

// 字段映射（前端字段名 → 数据库字段名）
const FIELD_MAP: Record<string, Record<string, string>> = {
  parts: {
    supplier: 'supplier',
    categoryId: 'category_id',
    purchaseLink: 'purchase_link',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  categories: {
    parentId: 'parent_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  assemblies: {
    type: 'type',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  bomEntries: {
    parentId: 'parent_id',
    childId: 'child_id',
    childType: 'child_type',
    wasteRate: 'waste_rate',
  },
  products: {
    topAssemblyId: 'top_assembly_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  quotes: {
    projectName: 'project_name',
    companyName: 'company_name',
    contactPerson: 'contact_person',
    contactPhone: 'contact_phone',
    profitMargin: 'profit_margin',
    totalMaterialCost: 'total_material_cost',
    totalCost: 'total_cost',
    totalAmount: 'total_amount',
    totalAmountCn: 'total_amount_cn',
    suggestedPrice: 'suggested_price',
    createdAt: 'created_at',
  },
};

function toDbField(type: string, field: string): string {
  return FIELD_MAP[type]?.[field] || field;
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// 数字字段列表（按表分组，MySQL DECIMAL 返回字符串需转数字）
const NUMERIC_FIELDS: Record<string, string[]> = {
  parts: ['price', 'quantity'],
  bomEntries: ['quantity', 'wasteRate'],
  products: ['totalMaterialCost', 'totalCost', 'totalAmount', 'suggestedPrice'],
  quotes: ['totalMaterialCost', 'totalCost', 'totalAmount', 'suggestedPrice', 'profitMargin'],
  coefficients: ['labor', 'waste', 'freight', 'tax', 'rent', 'utilities'],
};

function rowToCamel(row: any, type?: string): any {
  if (!row) return row;
  const result: any = {};
  for (const key of Object.keys(row)) {
    const camelKey = toCamelCase(key);
    // 数字字段转换
    if (type && NUMERIC_FIELDS[type]?.includes(camelKey)) {
      result[camelKey] = row[key] !== null ? Number(row[key]) : 0;
    } else {
      result[camelKey] = row[key];
    }
  }
  // 处理 JSON 字段
  if (result.images && typeof result.images === 'string') {
    try { result.images = JSON.parse(result.images); } catch { result.images = []; }
  }
  if (result.coefficients && typeof result.coefficients === 'string') {
    try { result.coefficients = JSON.parse(result.coefficients); } catch { result.coefficients = null; }
  }
  if (result.products && typeof result.products === 'string') {
    try { result.products = JSON.parse(result.products); } catch { result.products = []; }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, action, data, id } = body;
    const table = TABLE_MAP[type];

    if (!table) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    switch (action) {
      // ============ 查询全部 ============
      case 'getAll': {
        let sql: string;
        if (type === 'coefficients') {
          sql = 'SELECT * FROM default_coefficients WHERE id = 1';
          const row = await getOne(sql);
          return NextResponse.json({ data: row ? rowToCamel(row, table) : null });
        }
        const orderCol = table === 'bom_entries' ? 'id' : 'created_at';
        sql = `SELECT * FROM \`${table}\` ORDER BY \`${orderCol}\` DESC`;
        const rows = await query(sql);
        return NextResponse.json({ data: rows.map((r: Record<string, unknown>) => rowToCamel(r, table)) });
      }

      // ============ 查询单条 ============
      case 'getById': {
        const sql = `SELECT * FROM \`${table}\` WHERE id = ?`;
        const row = await getOne(sql, [id]);
        if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json({ data: rowToCamel(row, table) });
      }

      // ============ 创建 ============
      case 'create': {
        if (type === 'coefficients') {
          const { labor, waste, freight, tax, rent, utilities } = data;
          await query(
            'UPDATE default_coefficients SET labor=?, waste=?, freight=?, tax=?, rent=?, utilities=? WHERE id=1',
            [labor, waste, freight, tax, rent, utilities]
          );
          const row = await getOne('SELECT * FROM default_coefficients WHERE id=1');
          return NextResponse.json({ data: rowToCamel(row) });
        }

        const fields = Object.keys(data);
        const dbFields = fields.map(f => `\`${toDbField(type, f)}\``);
        const placeholders = fields.map(() => '?');
        const values = fields.map(f => {
          const v = data[f];
          if (Array.isArray(v) || (typeof v === 'object' && v !== null)) return JSON.stringify(v);
          return v;
        });

        const sql = `INSERT INTO \`${table}\` (${dbFields.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await query(sql, values);
        const row = await getOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [data.id]);
        return NextResponse.json({ data: rowToCamel(row) });
      }

      // ============ 更新 ============
      case 'update': {
        if (type === 'coefficients') {
          const { labor, waste, freight, tax, rent, utilities } = data;
          await query(
            'UPDATE default_coefficients SET labor=?, waste=?, freight=?, tax=?, rent=?, utilities=? WHERE id=1',
            [labor, waste, freight, tax, rent, utilities]
          );
          const row = await getOne('SELECT * FROM default_coefficients WHERE id=1');
          return NextResponse.json({ data: rowToCamel(row) });
        }

        const fields = Object.keys(data).filter(f => f !== 'id');
        const setClauses = fields.map(f => `\`${toDbField(type, f)}\` = ?`);
        const values = fields.map(f => {
          const v = data[f];
          if (Array.isArray(v) || (typeof v === 'object' && v !== null)) return JSON.stringify(v);
          return v;
        });
        values.push(id);

        const sql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} WHERE id = ?`;
        await query(sql, values);
        const row = await getOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
        return NextResponse.json({ data: rowToCamel(row) });
      }

      // ============ 删除 ============
      case 'delete': {
        await query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
        return NextResponse.json({ success: true });
      }

      // ============ 批量导入 ============
      case 'batchCreate': {
        if (!Array.isArray(data) || data.length === 0) {
          return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }
        for (const item of data) {
          const fields = Object.keys(item);
          const dbFields = fields.map(f => `\`${toDbField(type, f)}\``);
          const placeholders = fields.map(() => '?');
          const values = fields.map(f => {
            const v = item[f];
            if (Array.isArray(v) || (typeof v === 'object' && v !== null)) return JSON.stringify(v);
            return v;
          });
          await query(
            `INSERT IGNORE INTO \`${table}\` (${dbFields.join(', ')}) VALUES (${placeholders.join(', ')})`,
            values
          );
        }
        const orderCol = table === 'bom_entries' ? 'id' : 'created_at';
        const rows = await query(`SELECT * FROM \`${table}\` ORDER BY \`${orderCol}\` DESC`);
        return NextResponse.json({ data: rows.map(rowToCamel) });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API data] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}