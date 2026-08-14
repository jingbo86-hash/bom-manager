'use client';

import { createContext, useContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState, Part, Assembly, BomEntry, Product, Quote, Category, CostCoefficients } from './types';

// ============================================================
// 初始状态
// ============================================================
const initialState: AppState = {
  parts: [],
  assemblies: [],
  bomEntries: [],
  products: [],
  quotes: [],
  categories: [],
  defaultCoefficients: {
    labor: 10,
    waste: 2,
    freight: 3,
    tax: 13,
    rent: 5,
    utilities: 3,
  },
};

// ============================================================
// Action 类型
// ============================================================
type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_PART'; payload: Part }
  | { type: 'UPDATE_PART'; payload: Part }
  | { type: 'DELETE_PART'; payload: string }
  | { type: 'ADD_ASSEMBLY'; payload: Assembly }
  | { type: 'UPDATE_ASSEMBLY'; payload: Assembly }
  | { type: 'DELETE_ASSEMBLY'; payload: string }
  | { type: 'ADD_BOM_ENTRY'; payload: BomEntry }
  | { type: 'UPDATE_BOM_ENTRY'; payload: BomEntry }
  | { type: 'DELETE_BOM_ENTRY'; payload: string }
  | { type: 'DELETE_BOM_ENTRIES_BY_PARENT'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'UPDATE_DEFAULT_COEFFICIENTS'; payload: CostCoefficients }
  | { type: 'ADD_QUOTE'; payload: Quote }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string };

// ============================================================
// API 工具函数
// ============================================================
async function apiCall(type: string, action: string, data?: any, id?: string) {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, action, data, id }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'API error');
  return result;
}

async function loadAllFromDB(): Promise<AppState> {
  const [parts, assemblies, bomEntries, products, quotes, categories, coeff] = await Promise.all([
    apiCall('parts', 'getAll'),
    apiCall('assemblies', 'getAll'),
    apiCall('bomEntries', 'getAll'),
    apiCall('products', 'getAll'),
    apiCall('quotes', 'getAll'),
    apiCall('categories', 'getAll'),
    apiCall('coefficients', 'getAll'),
  ]);

  return {
    parts: parts.data || [],
    assemblies: assemblies.data || [],
    bomEntries: bomEntries.data || [],
    products: products.data || [],
    quotes: quotes.data || [],
    categories: categories.data || [],
    defaultCoefficients: coeff.data || initialState.defaultCoefficients,
  };
}

// ============================================================
// Reducer
// ============================================================
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    // 零件
    case 'ADD_PART':
      return { ...state, parts: [...state.parts, action.payload] };
    case 'UPDATE_PART':
      return {
        ...state,
        parts: state.parts.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PART':
      return {
        ...state,
        parts: state.parts.filter(p => p.id !== action.payload),
        bomEntries: state.bomEntries.filter(b => b.childId !== action.payload),
      };

    // 组件
    case 'ADD_ASSEMBLY':
      return { ...state, assemblies: [...state.assemblies, action.payload] };
    case 'UPDATE_ASSEMBLY':
      return {
        ...state,
        assemblies: state.assemblies.map(a => a.id === action.payload.id ? action.payload : a),
      };
    case 'DELETE_ASSEMBLY': {
      const idsToRemove = new Set<string>();
      const collectChildren = (parentId: string) => {
        idsToRemove.add(parentId);
        state.bomEntries
          .filter(b => b.parentId === parentId && b.childType === 'assembly')
          .forEach(b => collectChildren(b.childId));
      };
      collectChildren(action.payload);
      return {
        ...state,
        assemblies: state.assemblies.filter(a => !idsToRemove.has(a.id)),
        bomEntries: state.bomEntries.filter(b => !idsToRemove.has(b.parentId) && !idsToRemove.has(b.childId)),
        products: state.products.filter(p => !idsToRemove.has(p.topAssemblyId)),
      };
    }

    // BOM 条目
    case 'ADD_BOM_ENTRY':
      return { ...state, bomEntries: [...state.bomEntries, action.payload] };
    case 'UPDATE_BOM_ENTRY':
      return {
        ...state,
        bomEntries: state.bomEntries.map(b => b.id === action.payload.id ? action.payload : b),
      };
    case 'DELETE_BOM_ENTRY':
      return {
        ...state,
        bomEntries: state.bomEntries.filter(b => b.id !== action.payload),
      };
    case 'DELETE_BOM_ENTRIES_BY_PARENT':
      return {
        ...state,
        bomEntries: state.bomEntries.filter(b => b.parentId !== action.payload),
      };

    // 产品
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload),
      };

    // 默认系数
    case 'UPDATE_DEFAULT_COEFFICIENTS':
      return { ...state, defaultCoefficients: action.payload };

    // 报价
    case 'ADD_QUOTE':
      return { ...state, quotes: [...state.quotes, action.payload] };

    // 目录
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CATEGORY': {
      const idsToRemove = new Set<string>();
      const collect = (parentId: string) => {
        idsToRemove.add(parentId);
        state.categories.filter(c => c.parentId === parentId).forEach(c => collect(c.id));
      };
      collect(action.payload);
      return {
        ...state,
        categories: state.categories.filter(c => !idsToRemove.has(c.id)),
        parts: state.parts.map(p => idsToRemove.has(p.categoryId) ? { ...p, categoryId: '' } : p),
      };
    }

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loading, setLoading] = useState(true);
  const persistTimer = useRef<NodeJS.Timeout | null>(null);
  const prevStateRef = useRef<AppState>(initialState);

  // 从 MySQL 加载
  useEffect(() => {
    loadAllFromDB()
      .then(data => {
        // 检查 MySQL 是否为空，且 localStorage 有备份数据
        const isEmpty = !data.parts.length && !data.assemblies.length && !data.products.length;
        if (isEmpty) {
          try {
            const saved = localStorage.getItem('bom-management-system');
            if (saved) {
              const parsed = JSON.parse(saved) as AppState;
              console.log('MySQL is empty, restoring from localStorage backup');
              dispatch({ type: 'LOAD_STATE', payload: parsed });
              prevStateRef.current = parsed;
              return;
            }
          } catch { /* ignore */ }
        }
        dispatch({ type: 'LOAD_STATE', payload: data });
        prevStateRef.current = data;
      })
      .catch(err => {
        console.error('Failed to load from MySQL, falling back to localStorage:', err);
        // 回退到 localStorage
        try {
          const saved = localStorage.getItem('bom-management-system');
          if (saved) {
            const parsed = JSON.parse(saved) as AppState;
            dispatch({ type: 'LOAD_STATE', payload: parsed });
            prevStateRef.current = parsed;
          }
        } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  }, []);

  // 持久化到 MySQL（防抖）
  useEffect(() => {
    if (loading) return;
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(async () => {
      try {
        // 批量同步所有数据到 MySQL
        const { parts, assemblies, bomEntries, products, quotes, categories, defaultCoefficients } = state;

        // 使用 batchCreate 全量覆盖
        await Promise.all([
          parts.length > 0 ? apiCall('parts', 'batchCreate', parts) : Promise.resolve(),
          assemblies.length > 0 ? apiCall('assemblies', 'batchCreate', assemblies) : Promise.resolve(),
          bomEntries.length > 0 ? apiCall('bomEntries', 'batchCreate', bomEntries) : Promise.resolve(),
          products.length > 0 ? apiCall('products', 'batchCreate', products) : Promise.resolve(),
          quotes.length > 0 ? apiCall('quotes', 'batchCreate', quotes) : Promise.resolve(),
          categories.length > 0 ? apiCall('categories', 'batchCreate', categories) : Promise.resolve(),
          apiCall('coefficients', 'create', defaultCoefficients),
        ]);
      } catch (err) {
        console.error('Failed to persist to MySQL:', err);
      }
    }, 1000);
  }, [state, loading]);

  return (
    <AppContext.Provider value={{ state, dispatch, loading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}

