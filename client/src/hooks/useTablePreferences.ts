import { useState, useEffect, useCallback, useMemo } from 'react';

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface ColumnVisibility {
  [columnKey: string]: boolean;
}

export interface TablePreferences {
  sortConfig: SortConfig[];
  columnVisibility: ColumnVisibility;
  pageSize: number;
}

export interface UseTablePreferencesOptions {
  tableId: string;
  defaultSortConfig?: SortConfig[];
  defaultPageSize?: number;
  columns?: string[];
  defaultHiddenColumns?: string[];
}

export interface UseTablePreferencesReturn {
  // Sort
  sortConfig: SortConfig[];
  setSortConfig: React.Dispatch<React.SetStateAction<SortConfig[]>>;
  handleSort: (key: string) => void;
  getSortIndicator: (key: string) => string | null;
  clearSort: () => void;

  // Column visibility
  columnVisibility: ColumnVisibility;
  setColumnVisibility: React.Dispatch<React.SetStateAction<ColumnVisibility>>;
  toggleColumn: (columnKey: string) => void;
  isColumnVisible: (columnKey: string) => boolean;
  visibleColumns: string[];
  showAllColumns: () => void;
  hideAllColumns: () => void;

  // Page size
  pageSize: number;
  setPageSize: (size: number) => void;

  // Utilities
  resetPreferences: () => void;
  exportPreferences: () => TablePreferences;
  importPreferences: (preferences: Partial<TablePreferences>) => void;
}

const STORAGE_KEY_PREFIX = 'table_preferences_';

function getStorageKey(tableId: string): string {
  return `${STORAGE_KEY_PREFIX}${tableId}`;
}

function loadPreferences(tableId: string): Partial<TablePreferences> | null {
  try {
    const stored = localStorage.getItem(getStorageKey(tableId));
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load table preferences:', error);
  }
  return null;
}

function savePreferences(tableId: string, preferences: TablePreferences): void {
  try {
    localStorage.setItem(getStorageKey(tableId), JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save table preferences:', error);
  }
}

export function useTablePreferences({
  tableId,
  defaultSortConfig = [],
  defaultPageSize = 25,
  columns = [],
  defaultHiddenColumns = [],
}: UseTablePreferencesOptions): UseTablePreferencesReturn {
  // Initialize with defaults, then override with stored preferences
  const storedPrefs = useMemo(() => loadPreferences(tableId), [tableId]);

  const [sortConfig, setSortConfig] = useState<SortConfig[]>(
    storedPrefs?.sortConfig ?? defaultSortConfig
  );

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    if (storedPrefs?.columnVisibility) {
      return storedPrefs.columnVisibility;
    }
    // Default: all columns visible except those in defaultHiddenColumns
    const visibility: ColumnVisibility = {};
    columns.forEach((col) => {
      visibility[col] = !defaultHiddenColumns.includes(col);
    });
    return visibility;
  });

  const [pageSize, setPageSizeState] = useState<number>(
    storedPrefs?.pageSize ?? defaultPageSize
  );

  // Save preferences whenever they change
  useEffect(() => {
    savePreferences(tableId, {
      sortConfig,
      columnVisibility,
      pageSize,
    });
  }, [tableId, sortConfig, columnVisibility, pageSize]);

  // Sort handlers
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map((s) =>
            s.key === key ? { key, direction: 'desc' as const } : s
          );
        } else {
          // Remove sort on third click
          return prev.filter((s) => s.key !== key);
        }
      } else {
        return [...prev, { key, direction: 'asc' as const }];
      }
    });
  }, []);

  const getSortIndicator = useCallback(
    (key: string): string | null => {
      const entry = sortConfig.find((s) => s.key === key);
      if (!entry) return null;
      return entry.direction === 'asc' ? '▲' : '▼';
    },
    [sortConfig]
  );

  const clearSort = useCallback(() => {
    setSortConfig([]);
  }, []);

  // Column visibility handlers
  const toggleColumn = useCallback((columnKey: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  }, []);

  const isColumnVisible = useCallback(
    (columnKey: string): boolean => {
      return columnVisibility[columnKey] !== false;
    },
    [columnVisibility]
  );

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => columnVisibility[col] !== false);
  }, [columns, columnVisibility]);

  const showAllColumns = useCallback(() => {
    const visibility: ColumnVisibility = {};
    columns.forEach((col) => {
      visibility[col] = true;
    });
    setColumnVisibility(visibility);
  }, [columns]);

  const hideAllColumns = useCallback(() => {
    const visibility: ColumnVisibility = {};
    columns.forEach((col) => {
      visibility[col] = false;
    });
    setColumnVisibility(visibility);
  }, [columns]);

  // Page size handler
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setSortConfig(defaultSortConfig);
    setPageSizeState(defaultPageSize);
    const visibility: ColumnVisibility = {};
    columns.forEach((col) => {
      visibility[col] = !defaultHiddenColumns.includes(col);
    });
    setColumnVisibility(visibility);
  }, [defaultSortConfig, defaultPageSize, columns, defaultHiddenColumns]);

  // Export/Import preferences
  const exportPreferences = useCallback((): TablePreferences => {
    return {
      sortConfig,
      columnVisibility,
      pageSize,
    };
  }, [sortConfig, columnVisibility, pageSize]);

  const importPreferences = useCallback((preferences: Partial<TablePreferences>) => {
    if (preferences.sortConfig) {
      setSortConfig(preferences.sortConfig);
    }
    if (preferences.columnVisibility) {
      setColumnVisibility(preferences.columnVisibility);
    }
    if (preferences.pageSize) {
      setPageSizeState(preferences.pageSize);
    }
  }, []);

  return {
    // Sort
    sortConfig,
    setSortConfig,
    handleSort,
    getSortIndicator,
    clearSort,

    // Column visibility
    columnVisibility,
    setColumnVisibility,
    toggleColumn,
    isColumnVisible,
    visibleColumns,
    showAllColumns,
    hideAllColumns,

    // Page size
    pageSize,
    setPageSize,

    // Utilities
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
}

export default useTablePreferences;
