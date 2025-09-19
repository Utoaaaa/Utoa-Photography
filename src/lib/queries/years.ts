import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache';

export const getPublishedYears = unstable_cache(
  async () => {
    try {
      const years = await prisma.year.findMany({
        where: {
          status: 'published'
        },
        orderBy: {
          order_index: 'desc'
        }
      });
      
      return years;
    } catch (error) {
      console.error('Error fetching published years:', error);
      return [];
    }
  },
  ['published-years'],
  {
    tags: [CACHE_TAGS.YEARS],
    revalidate: 3600, // 1 hour
  }
);

export const getYearById = unstable_cache(
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
  ['year-by-id'],
  {
    tags: [CACHE_TAGS.YEARS],
    revalidate: 3600,
  }
);

export const getYearByLabel = unstable_cache(
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
  ['year-by-label'],
  {
    tags: [CACHE_TAGS.YEARS],
    revalidate: 3600,
  }
);

export async function getAllYears() {
  try {
    const years = await prisma.year.findMany({
      orderBy: {
        order_index: 'desc'
      }
    });
    
    return years;
  } catch (error) {
    console.error('Error fetching all years:', error);
    return [];
  }
}