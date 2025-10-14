'use client';

import AssignLocation, { type AdminCollectionSummary } from '../collections/AssignLocation';
import type { AdminLocation } from '../locations/Form';
import type { YearSummary } from '../types';

type AssignmentPaneProps = {
  selectedYear: YearSummary | null;
  activeLocation: AdminLocation | null;
  locations: AdminLocation[];
  onAssignmentChange: (collection: AdminCollectionSummary, previousLocationId: string | null) => void;
  refreshKey: number;
};

export default function AssignmentPane({
  selectedYear,
  activeLocation,
  locations,
  onAssignmentChange,
  refreshKey,
}: AssignmentPaneProps) {
  return (
    <section className="space-y-5" data-testid="assignment-pane">
      <div>
        <h2 className="text-lg font-medium text-gray-900">作品集指派</h2>
        <p className="text-sm text-gray-600">選擇地點後，可在此調整作品集的歸屬地點。</p>
      </div>
      {activeLocation && selectedYear ? (
        <AssignLocation
          yearId={selectedYear.id}
          yearLabel={selectedYear.label}
          activeLocation={activeLocation}
          locations={locations}
          onAssignmentChange={onAssignmentChange}
          refreshKey={refreshKey}
        />
      ) : (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600" data-testid="collections-placeholder">
          <p className="font-medium text-gray-800">等待地點選取</p>
          <p className="mt-2 text-gray-600">先完成地點建立或選取，即可調整作品集指派。</p>
        </div>
      )}
    </section>
  );
}
