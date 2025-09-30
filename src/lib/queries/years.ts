import { prisma } from '@/lib/db';

// Simple wrapper that returns the original function without importing next/cache.
// In production Next runtime, we can later enhance to use unstable_cache via a separate adapter.
function passthrough<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn> | TReturn) {
  return (async (...args: TArgs) => await fn(...args));
}

export const getPublishedYears = passthrough(
  async () => {
    try {
      const years = await prisma.year.findMany({
        where: {
          status: 'published'
        },
        orderBy: {
          order_index: 'asc'
        }
      });
      
      return years;
    } catch (error) {
      console.error('Error fetching published years:', error);
      return [];
    }
  },
);

export async function getYears(params: { status?: 'draft' | 'published' | 'all'; order?: 'asc' | 'desc' } = {}) {
  const { status, order = 'desc' } = params;
  const where: { status?: 'draft' | 'published' } = {};
  if (status && status !== 'all') where.status = status;
  try {
    return await prisma.year.findMany({ where, orderBy: { order_index: order } });
  } catch (error) {
    console.error('Error fetching years:', error);
    return [] as const;
  }
}

export const getYearById = passthrough(
  async (id: string) => {
    try {
      const year = await prisma.year.findUnique({
        where: { id }
      });
      
      return year;
    } catch (error) {
      console.error('Error fetching year by ID:', error);
      return null;
    }
  },
);

export const getYearByLabel = passthrough(
  async (label: string) => {
    try {
      const year = await prisma.year.findFirst({
        where: { 
          label,
          status: 'published'
        }
      });
      
      return year;
    } catch (error) {
      console.error('Error fetching year by label:', error);
      return null;
    }
  },
);

export async function getAllYears() {
  try {
    const years = await prisma.year.findMany({
      orderBy: {
        order_index: 'asc'
      }
    });
    
    return years;
  } catch (error) {
    console.error('Error fetching all years:', error);
    return [];
  }
}

// Non-cached helpers for SSR/E2E where cache can interfere
export async function getYearByLabelDirect(label: string) {
  try {
    return await prisma.year.findFirst({
      where: { label, status: 'published' },
    });
  } catch (error) {
    console.error('Error (direct) fetching year by label:', error);
    return null;
  }
}

// Non-cached: fetch published years directly (SSR-safe, no unstable_cache)
export async function getPublishedYearsDirect() {
  try {
    return await prisma.year.findMany({
      where: { status: 'published' },
      orderBy: { order_index: 'asc' },
    });
  } catch (error) {
    console.error('Error (direct) fetching published years:', error);
    return [] as const;
  }
}