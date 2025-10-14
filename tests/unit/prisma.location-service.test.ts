jest.mock('@/lib/db', () => {
  const location = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const year = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  };

  return {
    __esModule: true,
    prisma: { location, year },
  };
});

const prismaMock = jest.requireMock('@/lib/db').prisma as {
  location: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  year: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
  };
};

import {
  createLocation,
  deleteLocation,
  findYearByIdentifier,
  listLocationsForYear,
  LocationServiceError,
  updateLocation,
} from '../../src/lib/prisma/location-service';

function resetMocks() {
  Object.values(prismaMock.location).forEach((fn) => fn.mockReset());
  Object.values(prismaMock.year).forEach((fn) => fn.mockReset());
}

describe('location-service', () => {
  beforeEach(() => {
    resetMocks();
  });

  test('createLocation throws validation error for invalid slug', async () => {
    let thrown: unknown;
    try {
      await createLocation('year-1', { name: 'Kyoto', slug: 'INVALID' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(LocationServiceError);
    if (thrown instanceof LocationServiceError) {
      expect(thrown.code).toBe('VALIDATION');
      expect(thrown.field).toBe('slug');
    }
    expect(prismaMock.location.create).not.toHaveBeenCalled();
  });

  test('createLocation throws conflict when slug already exists', async () => {
    prismaMock.location.findFirst.mockResolvedValueOnce({ id: 'existing' });

    let thrown: unknown;
    try {
      await createLocation('year-1', { name: 'Kyoto', slug: 'kyoto-24' });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(LocationServiceError);
    if (thrown instanceof LocationServiceError) {
      expect(thrown.code).toBe('CONFLICT');
    }
  });

  test('createLocation computes next order index when missing', async () => {
    prismaMock.location.findFirst
      .mockResolvedValueOnce(null) // slug availability
      .mockResolvedValueOnce({ order_index: '3.0' }); // last order index

    prismaMock.location.create.mockResolvedValue({
      id: 'loc-1',
      year_id: 'year-1',
      name: 'Kyoto',
      slug: 'kyoto-24',
      summary: null,
      cover_asset_id: null,
      order_index: '4.0',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
      _count: { collections: 0 },
    });

    const result = await createLocation('year-1', { name: 'Kyoto', slug: 'kyoto-24' });

    expect(prismaMock.location.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ order_index: '4.0' }),
    }));
    expect(result.order_index).toBe('4.0');
  });

  test('updateLocation returns changes payload', async () => {
    prismaMock.location.findFirst
      .mockResolvedValueOnce({
        id: 'loc-1',
        year_id: 'year-1',
        name: 'Kyoto',
        slug: 'kyoto-24',
        summary: null,
        cover_asset_id: null,
        order_index: '1.0',
      })
      .mockResolvedValueOnce(null); // slug availability check

    prismaMock.location.update.mockResolvedValue({
      id: 'loc-1',
      year_id: 'year-1',
      name: 'Osaka',
      slug: 'osaka-24',
      summary: 'test',
      cover_asset_id: 'asset-1',
      order_index: '2.0',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-02T00:00:00Z'),
      _count: { collections: 1 },
    });

    const { location, changes } = await updateLocation('year-1', 'loc-1', {
      name: 'Osaka',
      slug: 'osaka-24',
      summary: 'test',
      coverAssetId: 'asset-1',
      orderIndex: '2.0',
    });

    expect(location.slug).toBe('osaka-24');
    expect(changes).toEqual({
      name: 'Osaka',
      slug: 'osaka-24',
      summary: 'test',
      coverAssetId: 'asset-1',
      orderIndex: '2.0',
    });
  });

  test('deleteLocation prevents removal when collections exist', async () => {
    prismaMock.location.findFirst.mockResolvedValue({
      id: 'loc-1',
      year_id: 'year-1',
      _count: { collections: 2 },
    });

    let thrown: unknown;
    try {
      await deleteLocation('year-1', 'loc-1');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(LocationServiceError);
    if (thrown instanceof LocationServiceError) {
      expect(thrown.code).toBe('HAS_COLLECTIONS');
    }
    expect(prismaMock.location.delete).not.toHaveBeenCalled();
  });

  test('findYearByIdentifier resolves by label fallback', async () => {
    prismaMock.year.findUnique.mockResolvedValue(null);
    prismaMock.year.findFirst.mockResolvedValue({ id: 'year-1', label: '2024' });

    const year = await findYearByIdentifier('2024');
    expect(year).toEqual({ id: 'year-1', label: '2024' });
    expect(prismaMock.year.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.year.findFirst).toHaveBeenCalled();
  });

  test('findYearByIdentifier prefers UUID lookup', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    prismaMock.year.findUnique.mockResolvedValue({ id: uuid, label: '2024' });

    const year = await findYearByIdentifier(uuid);
    expect(year).toEqual({ id: uuid, label: '2024' });
    expect(prismaMock.year.findUnique).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(prismaMock.year.findFirst).not.toHaveBeenCalled();
  });

  test('listLocationsForYear proxies to prisma client', async () => {
    prismaMock.location.findMany.mockResolvedValue([]);
    const list = await listLocationsForYear('year-1');
    expect(list).toEqual([]);
    expect(prismaMock.location.findMany).toHaveBeenCalledWith({
      where: { year_id: 'year-1' },
      orderBy: { order_index: 'asc' },
      include: { _count: { select: { collections: true } } },
    });
  });
});
