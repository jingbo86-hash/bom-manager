'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  sample?: string;
}

export interface ImportRow {
  index: number;
  data: Record<string, string>;
  errors: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  templateFileName: string;
  columns: ImportColumn[];
  /** 字段映射：将导入的列名映射到标准字段名 */
  fieldMapping?: Record<string, string>;
  onImport: (rows: ImportRow[]) => Promise<void>;
}

export function BatchImportDialog({
  open,
  onOpenChange,
  title,
  description,
  templateFileName,
  columns,
  fieldMapping,
  onImport,
}: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 下载模板 */
  const downloadTemplate = useCallback(() => {
    const header = columns.map(c => c.label);
    const sampleRow = columns.map(c => c.sample ?? '');
    const ws = XLSX.utils.aoa_to_sheet([header, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, templateFileName]);

  /** 解析文件 */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setRows([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError('文件为空或无法读取');
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setError('文件中没有数据行');
        return;
      }

      // 获取列名映射
      const firstRow = jsonData[0];
      const fileColumns = Object.keys(firstRow);

      // 构建映射：文件列名 -> 标准字段名
      const columnMap = buildColumnMap(fileColumns, columns, fieldMapping);

      // 解析每一行
      const parsedRows: ImportRow[] = [];
      for (let i = 0; i < jsonData.length; i++) {
        const raw = jsonData[i];
        const errors: string[] = [];
        const data: Record<string, string> = {};

        for (const col of columns) {
          const fileCol = columnMap[col.key] || col.label;
          const value = (raw[fileCol] ?? '').toString().trim();
          data[col.key] = value;

          if (col.required && !value) {
            errors.push(`"${col.label}" 不能为空`);
          }
        }

        parsedRows.push({ index: i + 2, data, errors });
      }

      setRows(parsedRows);
    } catch (err) {
      setError('文件解析失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  }, [columns, fieldMapping]);

  /** 智能构建列名映射 */
  const buildColumnMap = (
    fileColumns: string[],
    standardColumns: ImportColumn[],
    mapping?: Record<string, string>
  ): Record<string, string> => {
    const map: Record<string, string> = {};

    for (const col of standardColumns) {
      // 1. 精确匹配字段名
      if (fileColumns.includes(col.key)) {
        map[col.key] = col.key;
        continue;
      }
      // 2. 精确匹配标签
      if (fileColumns.includes(col.label)) {
        map[col.key] = col.label;
        continue;
      }
      // 3. 自定义映射
      if (mapping && mapping[col.key]) {
        const mappedLabel = mapping[col.key];
        if (fileColumns.includes(mappedLabel)) {
          map[col.key] = mappedLabel;
          continue;
        }
      }
      // 4. 模糊匹配（包含）
      const matched = fileColumns.find(fc =>
        fc.includes(col.label) || col.label.includes(fc) ||
        fc.includes(col.key) || col.key.includes(fc)
      );
      if (matched) {
        map[col.key] = matched;
        continue;
      }
      // 5. 保留原标签
      map[col.key] = col.label;
    }

    return map;
  };

  /** 执行导入 */
  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      await onImport(rows);
      // 重置状态
      setRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onOpenChange(false);
    } catch (err) {
      setError('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const validCount = rows.filter(r => r.errors.length === 0).length;
  const errorCount = rows.filter(r => r.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            下载导入模板
          </Button>
          <div className="h-6 border-l border-slate-200" />
          <Label className="text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-50">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              选择文件上传
            </span>
          </Label>
          <span className="text-xs text-slate-400">支持 .xlsx / .xls / .csv</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="text-slate-500">共 {rows.length} 行数据</span>
              <span className="text-emerald-600 font-medium">{validCount} 行有效</span>
              {errorCount > 0 && (
                <span className="text-red-500 font-medium">{errorCount} 行有错误</span>
              )}
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-12 text-xs">行号</TableHead>
                    {columns.map(col => (
                      <TableHead key={col.key} className="text-xs whitespace-nowrap">
                        {col.label}
                        {col.required && <span className="text-red-500 ml-0.5">*</span>}
                      </TableHead>
                    ))}
                    {errorCount > 0 && (
                      <TableHead className="text-xs text-red-500 w-48">错误信息</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.index} className={row.errors.length > 0 ? 'bg-red-50/40' : ''}>
                      <TableCell className="text-xs text-slate-400">{row.index}</TableCell>
                      {columns.map(col => (
                        <TableCell
                          key={col.key}
                          className={`text-sm max-w-[180px] truncate ${
                            col.required && !row.data[col.key] ? 'text-red-400' : ''
                          }`}
                          title={row.data[col.key]}
                        >
                          {row.data[col.key] || '-'}
                        </TableCell>
                      ))}
                      {errorCount > 0 && (
                        <TableCell className="text-xs text-red-500">
                          {row.errors.join('; ')}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <Button variant="outline" size="sm" onClick={handleClose}>取消</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importing ? '导入中...' : `确认导入 (${validCount} 条)`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}