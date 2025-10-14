jest.mock('@/lib/db', () => {
  const collection = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  const location = {
    findUnique: jest.fn(),
  };

  return {
    __esModule: true,
    prisma: { collection, location },
  };
});

const prismaMock = jest.requireMock('@/lib/db').prisma as {
  collection: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  location: {
    findUnique: jest.Mock;
  };
};

import {
  assignCollectionLocation,
  CollectionServiceError,
} from '../../src/lib/prisma/collection-service';

const baseCollection = {
  id: '550e8400-e29b-41d4-a716-446655440300',
  year_id: 'year-1',
  title: 'Autumn Stories',
  slug: 'autumn-stories',
  status: 'draft' as const,
  location_id: null as string | null,
  order_index: '1.0',
  updated_at: new Date('2025-01-01T00:00:00Z'),
};

const baseLocation = {
  id: '550e8400-e29b-41d4-a716-446655440201',
  year_id: 'year-1',
};

function resetMocks() {
  prismaMock.collection.findUnique.mockReset();
  prismaMock.collection.update.mockReset();
  prismaMock.location.findUnique.mockReset();
}

describe('collection-service assignCollectionLocation', () => {
  beforeEach(() => {
    resetMocks();
  });

  test('assigns collection to location within same year', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(baseCollection);
    prismaMock.location.findUnique.mockResolvedValue(baseLocation);
    prismaMock.collection.update.mockResolvedValue({
      ...baseCollection,
      location_id: baseLocation.id,
      updated_at: new Date('2025-02-02T00:00:00Z'),
    });

    const result = await assignCollectionLocation(baseCollection.id, baseLocation.id);

    expect(prismaMock.collection.update).toHaveBeenCalledWith({
      where: { id: baseCollection.id },
      data: { location_id: baseLocation.id },
      select: expect.any(Object),
    });
    expect(result.collection.location_id).toBe(baseLocation.id);
    expect(result.previousLocationId).toBeNull();
  });

  test('throws when collection does not exist', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(null);

    await expect(assignCollectionLocation(baseCollection.id, baseLocation.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: '找不到作品集。',
    });
    expect(prismaMock.collection.update).not.toHaveBeenCalled();
  });

  test('throws when location does not exist', async () => {
    prismaMock.collection.findUnique.mockResolvedValue(baseCollection);
    prismaMock.location.findUnique.mockResolvedValue(null);

    await expect(assignCollectionLocation(baseCollection.id, baseLocation.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      field: 'locationId',
    });
  });

  test('throws when location belongs to different year', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({
      ...baseCollection,
      location_id: '550e8400-e29b-41d4-a716-446655440999',
    });
    prismaMock.location.findUnique.mockResolvedValue({
      id: baseLocation.id,
      year_id: 'year-2',
    });

    await expect(assignCollectionLocation(baseCollection.id, baseLocation.id)).rejects.toMatchObject({
      code: 'VALIDATION',
      field: 'locationId',
    });
    expect(prismaMock.collection.update).not.toHaveBeenCalled();
  });

  test('unassigns collection when locationId is null', async () => {
    prismaMock.collection.findUnique.mockResolvedValue({
      ...baseCollection,
      location_id: baseLocation.id,
    });
    prismaMock.collection.update.mockResolvedValue({
      ...baseCollection,
      location_id: null,
      updated_at: new Date('2025-03-03T00:00:00Z'),
    });

    const result = await assignCollectionLocation(baseCollection.id, null);

    expect(prismaMock.collection.update).toHaveBeenCalledWith({
      where: { id: baseCollection.id },
      data: { location_id: null },
      select: expect.any(Object),
    });
    expect(result.collection.location_id).toBeNull();
    expect(result.previousLocationId).toBe(baseLocation.id);
  });

  test('rejects invalid location ID format', async () => {
    expect.assertions(3);
    await expect(assignCollectionLocation(baseCollection.id, 'invalid')).rejects.toBeInstanceOf(CollectionServiceError);
    expect(prismaMock.collection.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.collection.update).not.toHaveBeenCalled();
  });
});