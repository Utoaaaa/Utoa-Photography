import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    runtime: 'unknown',
  };

  try {
    // Test Cloudflare environment
    const env = getCloudflareEnv();
    diagnostics.cloudflareEnv = {
      available: !!env,
      hasDB: !!env.DB,
      hasUploads: !!env.UPLOADS,
    };

    // Test D1 connection
    const db = getD1Database();
    if (db) {
      try {
        const result = await db.prepare('SELECT 1 as test').first();
        diagnostics.d1Test = { success: true, result };
      } catch (e: any) {
        diagnostics.d1Test = { success: false, error: e.message };
      }

      // Test years table
      try {
        const years = await db.prepare('SELECT COUNT(*) as count FROM years').first();
        diagnostics.yearsCount = years;
      } catch (e: any) {
        diagnostics.yearsCount = { error: e.message };
      }

      // Get sample years
      try {
        const sampleYears = await db.prepare('SELECT * FROM years LIMIT 5').all();
        diagnostics.sampleYears = sampleYears.results || [];
      } catch (e: any) {
        diagnostics.sampleYears = { error: e.message };
      }
    } else {
      diagnostics.d1Test = { success: false, error: 'D1 not available' };
    }

    // Test Prisma connection
    try {
      const { prisma } = await import('@/lib/db');
      const count = await prisma.year.count();
      diagnostics.prismaYearCount = count;

      const sampleYears = await prisma.year.findMany({ take: 5 });
      diagnostics.prismaSampleYears = sampleYears;
    } catch (e: any) {
      diagnostics.prismaTest = { success: false, error: e.message, stack: e.stack };
    }

  } catch (e: any) {
    diagnostics.error = e.message;
    diagnostics.stack = e.stack;
  }

  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    }
  });
}
