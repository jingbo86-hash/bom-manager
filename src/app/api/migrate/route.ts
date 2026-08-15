import { NextRequest, NextResponse } from 'next/server';
import { query, getOne } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const { parts, assemblies, bomEntries, products, quotes, defaultCoefficients } = data;
    let migrated = 0;

    // 迁移零件
    if (parts?.length) {
      for (const p of parts) {
        await query(
          `INSERT INTO parts (id, code, name, spec, unit, price, supplier, remark, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), spec=VALUES(spec), unit=VALUES(unit),
           price=VALUES(price), supplier=VALUES(supplier), remark=VALUES(remark), updated_at=VALUES(updated_at)`,
          [p.id, p.code, p.name, p.spec, p.unit, p.price, p.supplier, p.remark, p.createdAt, p.updatedAt]
        );
        migrated++;
      }
    }

    // 迁移组件
    if (assemblies?.length) {
      for (const a of assemblies) {
        await query(
          `INSERT INTO assemblies (id, code, name, description, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), updated_at=VALUES(updated_at)`,
          [a.id, a.code, a.name, a.description, a.createdAt, a.updatedAt]
        );
        migrated++;
      }
    }

    // 迁移 BOM 关系
    if (bomEntries?.length) {
      for (const b of bomEntries) {
        await query(
          `INSERT INTO bom_entries (id, parent_id, child_id, child_type, quantity, waste_rate)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity=VALUES(quantity), waste_rate=VALUES(waste_rate)`,
          [b.id, b.parentId, b.childId, b.childType, b.quantity, b.wasteRate]
        );
        migrated++;
      }
    }

    // 迁移产品
    if (products?.length) {
      for (const p of products) {
        await query(
          `INSERT INTO products (id, code, name, model, brand, description, parameters, images, top_assembly_id, coefficients, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), model=VALUES(model), brand=VALUES(brand),
           description=VALUES(description), parameters=VALUES(parameters), images=VALUES(images),
           top_assembly_id=VALUES(top_assembly_id), coefficients=VALUES(coefficients), updated_at=VALUES(updated_at)`,
          [
            p.id, p.code, p.name, p.model || '', p.brand || '', p.description || '',
            p.parameters || '', JSON.stringify(p.images || []),
            JSON.stringify(p.topAssemblyIds || (p.topAssemblyId ? [p.topAssemblyId] : [])),
            p.coefficients ? JSON.stringify(p.coefficients) : null, p.createdAt, p.updatedAt
          ]
        );
        migrated++;
      }
    }

    // 迁移报价
    if (quotes?.length) {
      for (const q of quotes) {
        await query(
          `INSERT INTO quotes (id, title, project_name, company_name, contact_person, contact_phone,
           profit_margin, products, total_material_cost, total_cost, total_amount, total_amount_cn, suggested_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title=VALUES(title), project_name=VALUES(project_name),
           company_name=VALUES(company_name), profit_margin=VALUES(profit_margin),
           products=VALUES(products), total_cost=VALUES(total_cost), total_amount=VALUES(total_amount)`,
          [
            q.id, q.title || '', q.projectName || '', q.companyName || '',
            q.contactPerson || '', q.contactPhone || '', q.profitMargin || 0,
            JSON.stringify(q.products || []), q.totalMaterialCost || 0, q.totalCost || 0,
            q.totalAmount || 0, q.totalAmountCN || '', q.suggestedPrice || 0, q.createdAt
          ]
        );
        migrated++;
      }
    }

    // 迁移默认系数
    if (defaultCoefficients) {
      const { labor, waste, freight, tax, rent, utilities } = defaultCoefficients;
      await query(
        `INSERT INTO default_coefficients (id, labor, waste, freight, tax, rent, utilities)
         VALUES (1, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE labor=VALUES(labor), waste=VALUES(waste), freight=VALUES(freight),
         tax=VALUES(tax), rent=VALUES(rent), utilities=VALUES(utilities)`,
        [labor, waste, freight, tax, rent, utilities]
      );
      migrated++;
    }

    return NextResponse.json({ success: true, migrated, message: `成功迁移 ${migrated} 条记录` });
  } catch (error: any) {
    console.error('[API migrate] Error:', error);
    return NextResponse.json({ error: error.message || '迁移失败' }, { status: 500 });
  }
}