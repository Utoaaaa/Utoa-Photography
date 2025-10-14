import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AssignLocation, { type AdminCollectionSummary } from '../../src/app/admin/years/[yearId]/collections/AssignLocation';
import type { AdminLocation } from '../../src/app/admin/years/[yearId]/locations/Form';
import { ToastProvider } from '../../src/components/admin/Toast';

function createFetchResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    headers: { get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as any;
}

describe('AssignLocation component', () => {
  const locations: AdminLocation[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      yearId: 'year-1',
      name: 'Kyoto',
      slug: 'kyoto-24',
      summary: null,
      coverAssetId: null,
      orderIndex: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collectionCount: 0,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440202',
      yearId: 'year-1',
      name: 'Osaka',
      slug: 'osaka-24',
      summary: null,
      coverAssetId: null,
      orderIndex: '2.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      collectionCount: 0,
    },
  ];

  const collectionsApiResponse = [
    {
      id: '550e8400-e29b-41d4-a716-446655440301',
      year_id: 'year-1',
      title: 'Autumn Set',
      slug: 'autumn-set',
      status: 'draft' as const,
      location_id: null,
      order_index: '1.0',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const updatedCollection: AdminCollectionSummary = {
    id: '550e8400-e29b-41d4-a716-446655440301',
    yearId: 'year-1',
    title: 'Autumn Set',
    slug: 'autumn-set',
    status: 'draft',
  locationId: '550e8400-e29b-41d4-a716-446655440201',
    orderIndex: '1.0',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockResolvedValueOnce(createFetchResponse(collectionsApiResponse))
      .mockResolvedValueOnce(createFetchResponse(updatedCollection));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('assigns collection to selected location and invokes callback', async () => {
    const onAssignmentChange = jest.fn();

    render(
      <ToastProvider>
        <AssignLocation
          yearId="year-1"
          yearLabel="2024"
          activeLocation={locations[0]}
          locations={locations}
          onAssignmentChange={onAssignmentChange}
        />
      </ToastProvider>,
    );

    const assignButton = await screen.findByTestId('assignment-assign-btn');

    fireEvent.click(assignButton);

    await waitFor(() => expect(onAssignmentChange).toHaveBeenCalledTimes(1));

    const [firstCallArg, prevLocation] = onAssignmentChange.mock.calls[0];
    expect(firstCallArg).toEqual(updatedCollection);
    expect(prevLocation).toBeNull();

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/collections/550e8400-e29b-41d4-a716-446655440301/location',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locationId: '550e8400-e29b-41d4-a716-446655440201' }),
      }),
    );
    const assignedItem = await screen.findByTestId('assignment-item-assigned');
    expect(assignedItem).toHaveTextContent('Autumn Set');

    const toast = await screen.findByTestId('toast-item');
    expect(toast).toHaveTextContent('已將 Autumn Set 指派至 Kyoto');
  });

  test('transfers collection from another location', async () => {
    const onAssignmentChange = jest.fn();

    const transferResponse = [
      {
        id: '550e8400-e29b-41d4-a716-446655440302',
        year_id: 'year-1',
        title: 'Night Streets',
        slug: 'night-streets',
        status: 'published' as const,
        location_id: '550e8400-e29b-41d4-a716-446655440202',
        order_index: '2.0',
        updated_at: '2024-02-01T00:00:00Z',
      },
    ];

    const updatedTransfer = {
      id: '550e8400-e29b-41d4-a716-446655440302',
      yearId: 'year-1',
      title: 'Night Streets',
      slug: 'night-streets',
      status: 'published' as const,
      locationId: '550e8400-e29b-41d4-a716-446655440201',
      orderIndex: '2.0',
      updatedAt: '2024-02-01T00:00:00Z',
    } satisfies AdminCollectionSummary;

    global.fetch = jest.fn()
      .mockResolvedValueOnce(createFetchResponse(transferResponse))
      .mockResolvedValueOnce(createFetchResponse(updatedTransfer));

    render(
      <ToastProvider>
        <AssignLocation
          yearId="year-1"
          yearLabel="2024"
          activeLocation={locations[0]}
          locations={locations}
          onAssignmentChange={onAssignmentChange}
        />
      </ToastProvider>,
    );

    const toggle = await screen.findByTestId('assignment-transfer-toggle');
    fireEvent.click(toggle);

    const transferItem = await screen.findByTestId('assignment-item-transfer');
    expect(transferItem).toHaveTextContent('Night Streets');

    const transferButton = await screen.findByTestId('assignment-transfer-btn');
    fireEvent.click(transferButton);

    await waitFor(() => expect(onAssignmentChange).toHaveBeenCalledTimes(1));
    const [collectionArg, prevLocation] = onAssignmentChange.mock.calls[0];
    expect(collectionArg).toEqual(updatedTransfer);
    expect(prevLocation).toBe('550e8400-e29b-41d4-a716-446655440202');

    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/admin/collections/550e8400-e29b-41d4-a716-446655440302/location',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locationId: '550e8400-e29b-41d4-a716-446655440201' }),
      }),
    );

    const toast = await screen.findByTestId('toast-item');
    expect(toast).toHaveTextContent('已將 Night Streets 指派至 Kyoto');
  });
});
