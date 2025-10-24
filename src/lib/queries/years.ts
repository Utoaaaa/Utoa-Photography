import type { Prisma } from '@prisma/client';

import { shouldUseD1Direct, d1GetYears, d1GetYearById } from '@/lib/d1-queries';
import { d1FindYearByIdentifier } from '@/lib/d1/location-service';

type PrismaClient = import('@prisma/client').PrismaClient;

let prismaPromise: Promise<PrismaClient> | null = null;

async function getPrisma() {
  if (!prismaPromise) {
    prismaPromise = import('@/lib/db').then(({ prisma }) => prisma);
  }
  return prismaPromise;
}

function passthrough<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn> | TReturn) {
  return async (...args: TArgs) => fn(...args);
}

export const getPublishedYears = passthrough(async () => {
  try {
    if (shouldUseD1Direct()) {
      return await d1GetYears({ status: 'published', order: 'asc' });
    }
    const prisma = await getPrisma();
    return await prisma.year.findMany({
      where: { status: 'published' },
      orderBy: { order_index: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching published years:', error);
    return [];
  }
});

export async function getYears(params: { status?: 'draft' | 'published' | 'all'; order?: 'asc' | 'desc' } = {}) {
  const { status, order = 'desc' } = params;

  try {
    if (shouldUseD1Direct()) {
      return await d1GetYears({ status: (status as any) ?? 'all', order });
    }

    const prisma = await getPrisma();
    const where: { status?: 'draft' | 'published' } = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    return await prisma.year.findMany({ where, orderBy: { order_index: order } });
  } catch (error) {
    console.error('Error fetching years:', error);
    return [];
  }
}

export const getYearById = passthrough(async (id: string) => {
  try {
    if (shouldUseD1Direct()) {
      return await d1GetYearById(id);
    }
    const prisma = await getPrisma();
    return await prisma.year.findUnique({ where: { id } });
  } catch (error) {
    console.error('Error fetching year by ID:', error);
    return null;
  }
});

export const getYearByLabel = passthrough(async (label: string) => {
  try {
    if (shouldUseD1Direct()) {
      return await d1FindYearByIdentifier(label);
    }
    const prisma = await getPrisma();
    return await prisma.year.findFirst({
      where: { label, status: 'published' },
    });
  } catch (error) {
    console.error('Error fetching year by label:', error);
    return null;
  }
});

export async function getAllYears() {
  try {
    if (shouldUseD1Direct()) {
      return await d1GetYears({ status: 'all', order: 'asc' });
    }
    const prisma = await getPrisma();
    return await prisma.year.findMany({
      orderBy: { order_index: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching all years:', error);
    return [];
  }
}

export async function getYearByLabelDirect(label: string) {
  try {
    if (shouldUseD1Direct()) {
      return await d1FindYearByIdentifier(label);
    }
    const prisma = await getPrisma();
    return await prisma.year.findFirst({ where: { label, status: 'published' } });
  } catch (error) {
    console.error('Error (direct) fetching year by label:', error);
    return null;
  }
}

export async function getPublishedYearsDirect() {
  try {
    if (shouldUseD1Direct()) {
      return await d1GetYears({ status: 'published', order: 'asc' });
    }
    const prisma = await getPrisma();
    return await prisma.year.findMany({
      where: { status: 'published' },
      orderBy: { order_index: 'asc' },
    });
  } catch (error) {
    console.error('Error (direct) fetching published years:', error);
    return [];
  }
}
