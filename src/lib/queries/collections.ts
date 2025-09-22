import { prisma } from '@/lib/db';

export async function getCollectionsByYear(yearId: string) {
  try {
    const collections = await prisma.collection.findMany({
      where: {
        year_id: yearId,
        status: 'published'
      },
      include: {
        _count: {
          select: {
            collection_assets: true
          }
        }
      },
      orderBy: {
        order_index: 'asc'
      }
    });
    
    return collections;
  } catch (error) {
    console.error('Error fetching collections by year:', error);
    return [];
  }
}

export async function getCollectionBySlug(yearId: string, slug: string) {
  try {
    const collection = await prisma.collection.findUnique({
      where: {
        year_id_slug: {
          year_id: yearId,
          slug: slug
        }
      },
      include: {
        year: true,
        collection_assets: {
          include: {
            asset: true
          },
          orderBy: {
            order_index: 'asc'
          }
        }
      }
    });
    
    return collection;
  } catch (error) {
    console.error('Error fetching collection by slug:', error);
    return null;
  }
}

export async function getAllCollections() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        year: true,
        _count: {
          select: {
            collection_assets: true
          }
        }
      },
      orderBy: [
        { year: { order_index: 'desc' } },
        { order_index: 'asc' }
      ]
    });
    
    return collections;
  } catch (error) {
    console.error('Error fetching all collections:', error);
    return [];
  }
}

export async function getCollectionById(id: string) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        year: true,
        collection_assets: {
          include: {
            asset: true
          },
          orderBy: {
            order_index: 'asc'
          }
        }
      }
    });
    
    return collection;
  } catch (error) {
    console.error('Error fetching collection by ID:', error);
    return null;
  }
}