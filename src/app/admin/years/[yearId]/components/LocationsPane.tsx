'use client';

import LocationForm, { type AdminLocation } from '../locations/Form';
import LocationList from '../locations/List';
import type { DetailState, YearSummary } from '../types';

type LocationsPaneProps = {
  selectedYear: YearSummary | null;
  detailState: DetailState;
  detailError: string | null;
  locations: AdminLocation[];
  locationsLoading: boolean;
  locationsError: string | null;
  activeLocationId: string | null;
  isLocationFormOpen: boolean;
  editingLocation: AdminLocation | null;
  reorderLocationId: string | null;
  isLocationsBusy: boolean;
  onCreateLocation: () => void;
  onSelectLocation: (locationId: string) => void;
  onEditLocation: (location: AdminLocation) => void;
  onDeleteLocation: (location: AdminLocation) => void;
  onReorderLocation: (location: AdminLocation, direction: 'up' | 'down') => void;
  onCloseForm: () => void;
  onLocationSaved: (location: AdminLocation) => void;
};

export default function LocationsPane({
  selectedYear,
  detailState,
  detailError,
  locations,
  locationsLoading,
  locationsError,
  activeLocationId,
  isLocationFormOpen,
  editingLocation,
  reorderLocationId,
  isLocationsBusy,
  onCreateLocation,
  onSelectLocation,
  onEditLocation,
  onDeleteLocation,
  onReorderLocation,
  onCloseForm,
  onLocationSaved,
}: LocationsPaneProps) {
  return (
    <section className="space-y-5" data-testid="locations-pane">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">地點管理</h2>
          <p className="text-sm text-gray-600">新增、編輯並排序此年份底下的地點。</p>
        </div>
        <button
          type="button"
          onClick={onCreateLocation}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
          disabled={!selectedYear || detailState === 'loading' || locationsLoading}
          aria-disabled={!selectedYear || detailState === 'loading' || locationsLoading}
          data-testid="create-location-btn"
        >
          新增地點
        </button>
      </div>

      {detailState === 'loading' && (
        <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500" data-testid="locations-loading">
          載入年份資料中…
        </div>
      )}

      {detailState === 'error' && detailError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="locations-error">
          {detailError}
        </div>
      )}

      {detailState === 'idle' && !selectedYear && !detailError && (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600" data-testid="locations-empty-state">
          請從左側選擇一個年份以開始管理地點。
        </div>
      )}

      {detailState === 'idle' && selectedYear && (
        <div className="space-y-5">
          {locationsLoading ? (
            <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500" data-testid="locations-loading">
              載入地點中…
            </div>
          ) : locationsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700" data-testid="locations-error">
              {locationsError}
            </div>
          ) : locations.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600" data-testid="locations-empty">
              尚未建立任何地點，點擊右上角按鈕即可新增。
            </div>
          ) : (
            <LocationList
              locations={locations}
              activeLocationId={activeLocationId}
              onSelect={onSelectLocation}
              onEdit={onEditLocation}
              onDelete={onDeleteLocation}
              onReorder={onReorderLocation}
              disabled={isLocationsBusy}
              busyLocationId={reorderLocationId}
            />
          )}

          {isLocationFormOpen && selectedYear && (
            <LocationForm
              mode={editingLocation ? 'edit' : 'create'}
              yearId={selectedYear.id}
              yearLabel={selectedYear.label}
              location={editingLocation}
              onSaved={onLocationSaved}
              onCancel={onCloseForm}
            />
          )}
        </div>
      )}
    </section>
  );
}
