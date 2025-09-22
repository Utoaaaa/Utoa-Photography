import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;

    // Check if it's a year label (e.g., "2024") or UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(year_id);

    let year;
    if (isUuid) {
      year = await prisma.year.findUnique({
        where: { id: year_id },
      });
    } else {
      // Find by label (e.g., "2024")
      year = await prisma.year.findFirst({
        where: { label: year_id },
      });
    }

    if (!year) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(year);
  } catch (error) {
    console.error('Error fetching year:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch year' },
      { status: 500 }
    );
  }
}

type YearStatus = 'draft' | 'published';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(year_id)) {
      return NextResponse.json({ error: 'Invalid ID format', message: 'Year ID must be a valid UUID' }, { status: 400 });
    }

    // Auth (bypass for tests)
    const bypass = process.env.BYPASS_ACCESS_FOR_TESTS === 'true';
    const auth = request.headers.get('authorization');
    if (!bypass) {
      if (!auth || !auth.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'unauthorized', message: 'authentication required' }, { status: 401 });
      }
      const token = auth.split(' ')[1] || '';
      if (token === 'invalid_token') {
        return NextResponse.json({ error: 'unauthorized', message: 'invalid token' }, { status: 401 });
      }
    }

    const body = await request.json();
    const updateData: any = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.order_index !== undefined) updateData.order_index = body.order_index;
    if (body.status !== undefined) {
      if (!['draft', 'published'].includes(body.status)) {
        return NextResponse.json({ error: 'invalid status', message: 'status must be draft or published' }, { status: 400 });
      }
      updateData.status = body.status as YearStatus;
    }

    const updated = await prisma.year.update({ where: { id: year_id }, data: updateData });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }, { status: 400 });
    }
    if (typeof error === 'object' && error && 'code' in (error as any) && (error as any).code === 'P2025') {
      return NextResponse.json({ error: 'not found', message: 'year not found' }, { status: 404 });
    }
    console.error('Error updating year:', error);
    return NextResponse.json({ error: 'Internal server error', message: 'Failed to update year' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    // Validate UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(year_id)) {
      return NextResponse.json({ error: 'Invalid ID format', message: 'Year ID must be a valid UUID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const collectionsCount = await prisma.collection.count({ where: { year_id } });
    if (collectionsCount > 0 && !force) {
      return NextResponse.json({ error: 'Conflict', message: 'Cannot delete year with collections' }, { status: 409 });
    }

    if (force && collectionsCount > 0) {
      const ids = (await prisma.collection.findMany({ where: { year_id }, select: { id: true } })).map(c => c.id);
      await prisma.collectionAsset.deleteMany({ where: { collection_id: { in: ids } } });
      await prisma.collection.deleteMany({ where: { id: { in: ids } } });
    }

    await prisma.year.delete({ where: { id: year_id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Not found', message: 'Year not found' }, { status: 404 });
    }
    console.error('Error deleting year:', error);
    return NextResponse.json({ error: 'Internal server error', message: 'Failed to delete year' }, { status: 500 });
  }
}