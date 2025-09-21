import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type YearStatus = 'draft' | 'published';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    const body = await request.json();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 }
      );
    }

    const { label, order_index, status } = body;

    // Validate status if provided
    if (status && !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', message: 'Status must be draft or published' },
        { status: 400 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (order_index !== undefined) updateData.order_index = order_index;
    if (status !== undefined) updateData.status = status as YearStatus;

    // Update year
    const year = await prisma.year.update({
      where: { id: year_id },
      data: updateData,
    });

    return NextResponse.json(year);
  } catch (error) {
    console.error('Error updating year:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 }
      );
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update year' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ year_id: string }> }
) {
  try {
    const { year_id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(year_id)) {
      return NextResponse.json(
        { error: 'Invalid ID format', message: 'Year ID must be a valid UUID' },
        { status: 400 }
      );
    }

    // Check if year has collections
    if (!force) {
      const collectionsCount = await prisma.collection.count({
        where: { year_id },
      });

      if (collectionsCount > 0) {
        return NextResponse.json(
          { 
            error: 'Conflict', 
            message: 'Cannot delete year with collections. Use force=true to override.' 
          },
          { status: 409 }
        );
      }
    }

    // Delete year (collections will be cascade deleted due to onDelete: Cascade)
    await prisma.year.delete({
      where: { id: year_id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting year:', error);

    // Handle not found error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Not found', message: 'Year not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete year' },
      { status: 500 }
    );
  }
}