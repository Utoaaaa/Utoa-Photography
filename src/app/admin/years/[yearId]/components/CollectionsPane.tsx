'use client';

import type { AdminCollectionSummary } from '../collections/AssignLocation';
import CollectionManager from '../collections/CollectionManager';
import type { AdminLocation } from '../locations/Form';
import type { YearSummary } from '../types';

type CollectionsPaneProps = {
  selectedYear: YearSummary | null;
  locations: AdminLocation[];
  activeLocation: AdminLocation | null;
  onCollectionMutated: () => void;
  onCollectionRemoved: (collection: AdminCollectionSummary) => void;
  onCollectionCreated: (collection: AdminCollectionSummary) => void;
  refreshKey: number;
};

export default function CollectionsPane({
  selectedYear,
  locations,
  activeLocation,
  onCollectionMutated,
  onCollectionRemoved,
  onCollectionCreated,
  refreshKey,
}: CollectionsPaneProps) {
  return (
    <section className="space-y-5" data-testid="collections-pane">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-gray-900">作品集管理</h2>
        <p className="text-sm text-gray-600">在同一介面建立、排序作品集並管理照片。</p>
      </div>
      <CollectionManager
        yearId={selectedYear?.id ?? null}
        yearLabel={selectedYear?.label ?? null}
        locations={locations}
        activeLocation={activeLocation}
        onCollectionMutated={onCollectionMutated}
        onCollectionCreated={onCollectionCreated}
        onCollectionRemoved={onCollectionRemoved}
        refreshKey={refreshKey}
      />
    </section>
  );
}
