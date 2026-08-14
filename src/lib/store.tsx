'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Part, Assembly, BomEntry, Product, Quote, CostCoefficients } from './types';

// ============================================================
// 初始状态
// ============================================================
const initialState: AppState = {
  parts: [],
  assemblies: [],
  bomEntries: [],
  products: [],
  quotes: [],
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
  | { type: 'ADD_QUOTE'; payload: Quote };

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
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'bom-management-system';

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
