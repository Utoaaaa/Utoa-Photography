import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // const auth = request.headers.get('authorization');
    // if (!auth || !auth.startsWith('Bearer ')) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized', message: 'Authentication required' },
    //     { status: 401 }
    //   );
    // }

    const body = await request.json();
    const { id, alt, caption, width, height, metadata_json } = body;

    // Validate required fields
    if (!id || !alt || !width || !height) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'ID, alt, width, and height are required' },
        { status: 400 }
      );
    }

    // Validate alt text length
    if (alt.length === 0 || alt.length > 200) {
      return NextResponse.json(
        { error: 'invalid alt', message: 'alt must be between 1 and 200 characters' },
        { status: 400 }
      );
    }

    // Validate caption length if provided
    if (caption && caption.length > 1000) {
      return NextResponse.json(
        { error: 'invalid caption', message: 'caption must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Validate dimensions with reasonable bounds (used by E2E tests)
    const minW = 200; const minH = 200; // minimum dimensions
    const maxW = 8000; const maxH = 8000; // maximum dimensions
    if (width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'width and height must be positive numbers' },
        { status: 400 }
      );
    }
    if (width < minW || height < minH) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'Image does not meet minimum dimensions' },
        { status: 400 }
      );
    }
    if (width > maxW || height > maxH) {
      return NextResponse.json(
        { error: 'invalid dimensions', message: 'Image exceeds maximum dimensions' },
        { status: 400 }
      );
    }

    // Check if asset already exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
    });

    if (existingAsset) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Asset with this ID already exists; please verify direct upload status before retrying', id: existingAsset.id },
        { status: 409 }
      );
    }

    // Serialize metadata_json if it's an object
    let serializedMetadata = null;
    if (metadata_json) {
      if (typeof metadata_json === 'object') {
        serializedMetadata = JSON.stringify(metadata_json);
      } else if (typeof metadata_json === 'string') {
        // Validate it's valid JSON
        try {
          JSON.parse(metadata_json);
          serializedMetadata = metadata_json;
        } catch {
          return NextResponse.json(
            { error: 'Invalid metadata', message: 'metadata_json must be valid JSON' },
            { status: 400 }
          );
        }
      }
    }

    // Create new asset
    const asset = await prisma.asset.create({
      data: {
        id,
        alt,
        caption,
        width: parseInt(width.toString()),
        height: parseInt(height.toString()),
        metadata_json: serializedMetadata,
      },
    });

    // Return metadata_json parsed back to object if possible
    const response: any = { ...asset };
    if (response.metadata_json && typeof response.metadata_json === 'string') {
      try { response.metadata_json = JSON.parse(response.metadata_json); } catch {}
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating asset:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Asset with this ID already exists; please verify direct upload status before retrying' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create asset' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const assets = await prisma.asset.findMany({
      orderBy: { created_at: 'desc' },
      take: Number.isNaN(limit) ? 50 : limit,
      skip: Number.isNaN(offset) ? 0 : offset,
    });

    // Parse metadata_json to objects when possible
    const result = assets.map((a: any) => {
      const obj: any = { ...a };
      if (obj.metadata_json && typeof obj.metadata_json === 'string') {
        try { obj.metadata_json = JSON.parse(obj.metadata_json); } catch { /* ignore */ }
      }
      return obj;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing assets:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to list assets' },
      { status: 500 }
    );
  }
}