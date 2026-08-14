'use client';

import { useState, useMemo } from 'react';
import { generateId } from '@/lib/bom-utils';
import type { Category, Part } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderIcon, PlusIcon, PencilIcon, Trash2Icon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react';

interface CategoryTreeProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  parts: Part[];
}

export function CategoryTree({ categories, selectedId, onSelect, parts }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const rootCategories = useMemo(() => {
    return categories.filter(c => !c.parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [categories]);

  const getChildren = (parentId: string) => {
    return categories.filter(c => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countPartsInCategory = (catId: string): number => {
    const childIds = new Set<string>();
    const collect = (id: string) => {
      childIds.add(id);
      categories.filter(c => c.parentId === id).forEach(c => collect(c.id));
    };
    collect(catId);
    return parts.filter(p => p.categoryId && childIds.has(p.categoryId)).length;
  };

  const renderNode = (cat: Category, level: number) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const isSelected = selectedId === cat.id;
    const partCount = countPartsInCategory(cat.id);

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm group hover:bg-slate-100 ${
            isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => onSelect(cat.id)}
        >
          <button
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-slate-400 hover:text-slate-600"
            onClick={(e) => { e.stopPropagation(); toggleExpand(cat.id); }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />
            ) : (
              <span className="w-3.5" />
            )}
          </button>
          <FolderIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="truncate flex-1 ml-1">{cat.name}</span>
          <span className="text-[10px] text-slate-400">{partCount}</span>
        </div>
        {hasChildren && isExpanded && children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-0.5">
      {/* 全部零件 */}
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm hover:bg-slate-100 ${
          selectedId === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
        }`}
        onClick={() => onSelect(null)}
      >
        <FolderIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <span className="truncate flex-1 ml-1">全部零件</span>
        <span className="text-[10px] text-slate-400">{parts.length}</span>
      </div>

      {/* 未分类 */}
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm hover:bg-slate-100 ${
          selectedId === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
        }`}
        onClick={() => onSelect('')}
      >
        <FolderIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="truncate flex-1 ml-1 text-slate-500">未分类</span>
        <span className="text-[10px] text-slate-400">{parts.filter(p => !p.categoryId).length}</span>
      </div>

      {/* 目录分隔线 */}
      {rootCategories.length > 0 && <div className="border-t border-slate-100 my-1" />}

      {/* 目录树 */}
      {rootCategories.map(cat => renderNode(cat, 0))}
    </div>
  );
}

// ==================== 目录管理对话框 ====================

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  dispatch: React.Dispatch<any>;
}

export function CategoryDialog({ open, onOpenChange, categories, dispatch }: CategoryDialogProps) {
  const [categoryName, setCategoryName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const rootCategories = useMemo(() => {
    return categories.filter(c => !c.parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  }, [categories]);

  const getChildren = (parentId: string) => {
    return categories.filter(c => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  };

  const openAdd = (pid: string | null) => {
    setEditCategory(null);
    setParentId(pid);
    setCategoryName('');
  };

  const openEdit = (cat: Category) => {
    setEditCategory(cat);
    setParentId(cat.parentId);
    setCategoryName(cat.name);
  };

  const handleSave = () => {
    const name = categoryName.trim();
    if (!name) return;

    if (editCategory) {
      dispatch({
        type: 'UPDATE_CATEGORY',
        payload: { ...editCategory, name, updatedAt: Date.now() },
      });
    } else {
      const now = Date.now();
      dispatch({
        type: 'ADD_CATEGORY',
        payload: {
          id: generateId(),
          name,
          parentId,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    setCategoryName('');
    setEditCategory(null);
    setParentId(null);
  };

  const handleDelete = (catId: string) => {
    // 删除目录及其子目录
    const idsToDelete = [catId];
    const collect = (id: string) => {
      categories.filter(c => c.parentId === id).forEach(c => {
        idsToDelete.push(c.id);
        collect(c.id);
      });
    };
    collect(catId);
    idsToDelete.forEach(id => dispatch({ type: 'DELETE_CATEGORY', payload: id }));
    setDeleteConfirm(null);
  };

  const renderNode = (cat: Category, level: number) => {
    const children = getChildren(cat.id);
    const hasChildren = children.length > 0;

    return (
      <div key={cat.id}>
        <div
          className="flex items-center gap-2 py-1.5 px-2 rounded text-sm hover:bg-slate-50 group"
          style={{ paddingLeft: `${8 + level * 20}px` }}
        >
          <FolderIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="flex-1 truncate">{cat.name}</span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => openAdd(cat.id)}
              className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"
              title="添加子目录"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openEdit(cat)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              title="重命名"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteConfirm(cat.id)}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              title="删除"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {hasChildren && children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>管理零件目录</DialogTitle>
          </DialogHeader>

          {/* 添加/编辑表单 */}
          <div className="flex items-center gap-2">
            <Input
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder="输入目录名称"
              className="h-9 flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!categoryName.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-9"
            >
              {editCategory ? '重命名' : '添加'}
            </Button>
            {(editCategory || categoryName) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => { setCategoryName(''); setEditCategory(null); }}
              >
                取消
              </Button>
            )}
          </div>

          {/* 目录列表 */}
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            {rootCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                暂无目录，请在上方输入名称后点击"添加"
              </div>
            ) : (
              rootCategories.map(cat => renderNode(cat, 0))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>确认删除目录</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            删除目录后，其下的子目录和零件将变为未分类。此操作不可撤销。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}