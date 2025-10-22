import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CoverAssetPicker from '../../src/app/admin/years/[yearId]/components/CoverAssetPicker';

describe('CoverAssetPicker', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error restoring undefined fetch for test environment
      delete global.fetch;
    }
    jest.restoreAllMocks();
  });

  test('loads location assets and selects cover image', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify([{ id: 'asset-1', alt: 'Asset One' }]),
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const handleSelect = jest.fn();

    render(
      <CoverAssetPicker
        source={{ type: 'location', locationId: 'loc-1' }}
        selectedAssetId={null}
        onSelect={handleSelect}
      />,
    );

    const option = await screen.findByTestId('cover-asset-option');
    fireEvent.click(option);

    await waitFor(() => expect(handleSelect).toHaveBeenCalledWith('asset-1'));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/assets?limit=200&offset=0&location_folder_id=loc-1',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  test('loads collection assets and supports clearing selection', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ assets: [{ id: 'asset-2', order_index: '1', alt: 'Cover' }] }),
    });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    const handleSelect = jest.fn();

    render(
      <CoverAssetPicker
        source={{ type: 'collection', collectionId: 'col-2' }}
        selectedAssetId="asset-2"
        onSelect={handleSelect}
      />,
    );

    const clearButton = await screen.findByRole('button', { name: '清除選擇' });
    fireEvent.click(clearButton);

    await waitFor(() => expect(handleSelect).toHaveBeenCalledWith(null));
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/collections/col-2?include_assets=true',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
