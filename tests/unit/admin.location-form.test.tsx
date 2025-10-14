import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationForm, { AdminLocation } from '../../src/app/admin/years/[yearId]/locations/Form';

describe('LocationForm integration with API responses', () => {
  const baseLocation: AdminLocation = {
    id: 'loc-1',
    yearId: 'year-1',
    name: 'Kyoto',
    slug: 'kyoto-24',
    summary: 'summary',
    coverAssetId: null,
    orderIndex: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    collectionCount: 0,
  };

  const onSaved = jest.fn();
  const onCancel = jest.fn();

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('shows server error message when API returns error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Slug already exists' }),
    });

    render(
      <LocationForm
        mode="create"
        yearId="year-1"
        yearLabel="2024"
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );

  fireEvent.change(screen.getByTestId('location-name-input'), { target: { value: 'Kyoto' } });
  fireEvent.change(screen.getByTestId('location-slug-input'), { target: { value: 'kyoto-24' } });

    fireEvent.submit(screen.getByTestId('location-form'));

  await waitFor(() => expect(screen.getByTestId('location-form-error')).toHaveTextContent('Slug already exists'));
    expect(onSaved).not.toHaveBeenCalled();
  });

  test('invokes onSaved and shows success message when API resolves', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => baseLocation,
    });

    render(
      <LocationForm
        mode="create"
        yearId="year-1"
        yearLabel="2024"
        onSaved={onSaved}
        onCancel={onCancel}
      />,
    );

  fireEvent.change(screen.getByTestId('location-name-input'), { target: { value: 'Kyoto' } });
  fireEvent.change(screen.getByTestId('location-slug-input'), { target: { value: 'kyoto-24' } });

    fireEvent.submit(screen.getByTestId('location-form'));

  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(baseLocation));
  expect(screen.getByTestId('location-form-message')).toHaveTextContent('地點已建立。');
  });
});
