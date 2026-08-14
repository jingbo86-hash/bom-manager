import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'bom_system',
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]): Promise<any> {
  const p = await getPool();
  const [rows] = await p.execute(sql, params || []);
  return rows;
}

export async function getOne(sql: string, params?: any[]): Promise<any> {
  const rows = await query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}