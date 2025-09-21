'use client';

import { useState } from 'react';

interface Filters {
  year?: string;
  status?: 'draft' | 'published';
  checklistStatus?: 'pass' | 'pending';
}

interface PublishingFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  totalCollections: number;
}

// T028: Publishing filters component
export function PublishingFilters({ 
  filters, 
  onFilterChange, 
  totalCollections 
}: PublishingFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const handleFilterUpdate = (key: keyof Filters, value: string | undefined) => {
    const newFilters = { ...localFilters };
    
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }
    
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <div className="space-y-4">
      {/* Filter header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">篩選條件</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            清除全部
          </button>
        )}
      </div>

      {/* Year filter */}
      <div>
        <label htmlFor="year-filter" className="block text-xs font-medium text-gray-700 mb-1">
          年份
        </label>
        <select
          id="year-filter"
          value={localFilters.year || ''}
          onChange={(e) => handleFilterUpdate('year', e.target.value)}
          className="block w-full text-sm border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
        >
          <option value="">全部年份</option>
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
        </select>
      </div>

      {/* Status filter */}
      <div>
        <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
          發布狀態
        </label>
        <select
          id="status-filter"
          value={localFilters.status || ''}
          onChange={(e) => handleFilterUpdate('status', e.target.value)}
          className="block w-full text-sm border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
        >
          <option value="">全部狀態</option>
          <option value="published">已發布</option>
          <option value="draft">草稿</option>
        </select>
      </div>

      {/* Checklist status filter */}
      <div>
        <label htmlFor="checklist-filter" className="block text-xs font-medium text-gray-700 mb-1">
          檢查清單
        </label>
        <select
          id="checklist-filter"
          value={localFilters.checklistStatus || ''}
          onChange={(e) => handleFilterUpdate('checklistStatus', e.target.value)}
          className="block w-full text-sm border-gray-300 rounded-md focus:ring-gray-500 focus:border-gray-500"
        >
          <option value="">全部狀態</option>
          <option value="pass">✓ 通過</option>
          <option value="pending">⚠ 待完成</option>
        </select>
      </div>

      {/* Results count */}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          共 {totalCollections} 個作品集
          {hasActiveFilters && ' (已篩選)'}
        </p>
      </div>

      {/* Filter summary */}
      {hasActiveFilters && (
        <div className="pt-2">
          <div className="flex flex-wrap gap-1">
            {localFilters.year && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {localFilters.year}
                <button
                  onClick={() => handleFilterUpdate('year', undefined)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                  aria-label="移除年份篩選"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {localFilters.status === 'published' ? '已發布' : '草稿'}
                <button
                  onClick={() => handleFilterUpdate('status', undefined)}
                  className="ml-1 text-green-600 hover:text-green-800"
                  aria-label="移除狀態篩選"
                >
                  ×
                </button>
              </span>
            )}
            {localFilters.checklistStatus && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {localFilters.checklistStatus === 'pass' ? '通過' : '待完成'}
                <button
                  onClick={() => handleFilterUpdate('checklistStatus', undefined)}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                  aria-label="移除檢查清單篩選"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}