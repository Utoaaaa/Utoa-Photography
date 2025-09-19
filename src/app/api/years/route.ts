import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type YearStatus = 'draft' | 'published';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const order = searchParams.get('order') || 'desc';

    // Validate status parameter
    if (status && !['draft', 'published', 'all'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft, published, or all' },
        { status: 400 }
      );
    }

    // Validate order parameter
    if (!['asc', 'desc'].includes(order)) {
      return NextResponse.json(
        { error: 'Invalid order', message: 'Order must be asc or desc' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status as YearStatus;
    }

    // Query years
    const years = await prisma.year.findMany({
      where,
      orderBy: {
        order_index: order as 'asc' | 'desc',
      },
    });

    return NextResponse.json(years);
  } catch (error) {
    console.error('Error fetching years:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch years' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, order_index, status = 'draft' } = body;

    // Validate required fields
    if (!label) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'Label is required' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft or published' },
        { status: 400 }
      );
    }

    // Auto-generate order_index if not provided
    const finalOrderIndex = order_index || `${new Date().getFullYear()}.0`;

    // Create new year
    const year = await prisma.year.create({
      data: {
        label,
        order_index: finalOrderIndex,
        status: status as YearStatus,
      },
    });

    return NextResponse.json(year, { status: 201 });
  } catch (error) {
    console.error('Error creating year:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create year' },
      { status: 500 }
    );
  }
}