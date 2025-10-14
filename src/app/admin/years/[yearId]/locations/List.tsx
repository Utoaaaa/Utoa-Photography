'use client';

import type { AdminLocation } from './Form';

interface LocationListProps {
  locations: AdminLocation[];
  activeLocationId: string | null;
  onSelect: (locationId: string) => void;
  onEdit: (location: AdminLocation) => void;
  onDelete: (location: AdminLocation) => void;
  onReorder: (location: AdminLocation, direction: 'up' | 'down') => void;
  disabled?: boolean;
  busyLocationId?: string | null;
}

export default function LocationList({
  locations,
  activeLocationId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  disabled = false,
  busyLocationId = null,
}: LocationListProps) {
  if (locations.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3" data-testid="locations-list">
      {locations.map((location, index) => {
        const isActive = location.id === activeLocationId;
        const isFirst = index === 0;
        const isLast = index === locations.length - 1;
        const isBusy = busyLocationId === location.id;
        const controlsDisabled = disabled || isBusy;

        return (
          <li
            key={location.id}
            className={`rounded-lg border px-4 py-3 text-sm shadow-sm transition hover:border-gray-300 hover:bg-white ${
              isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => onSelect(location.id)}
              data-testid={isActive ? 'location-item-active' : 'location-item'}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{location.name}</p>
                  <p className="mt-1 text-xs text-gray-500">slug：{location.slug}</p>
                  {location.summary && (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-600">{location.summary}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>排序：{location.orderIndex}</span>
                    <span>作品集：{location.collectionCount}</span>
                  </div>
                </div>
              </div>
            </button>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  onClick={() => onEdit(location)}
                  data-testid="edit-location-btn"
                  disabled={controlsDisabled}
                >
                  編輯
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-100 disabled:text-gray-400"
                  onClick={() => onDelete(location)}
                  data-testid="delete-location-btn"
                  disabled={controlsDisabled || location.collectionCount > 0}
                  aria-disabled={controlsDisabled || location.collectionCount > 0}
                  title={
                    location.collectionCount > 0
                      ? '已有作品集指派，請先重新指派後再刪除。'
                      : '刪除此地點'
                  }
                >
                  刪除
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  onClick={() => onReorder(location, 'up')}
                  data-testid="move-up-location-btn"
                  disabled={controlsDisabled || isFirst}
                  aria-disabled={controlsDisabled || isFirst}
                >
                  上移
                </button>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                  onClick={() => onReorder(location, 'down')}
                  data-testid="move-down-location-btn"
                  disabled={controlsDisabled || isLast}
                  aria-disabled={controlsDisabled || isLast}
                >
                  下移
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
