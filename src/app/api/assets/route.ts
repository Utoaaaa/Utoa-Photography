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
        { error: 'Invalid alt text', message: 'Alt text must be between 1 and 200 characters' },
        { status: 400 }
      );
    }

    // Validate caption length if provided
    if (caption && caption.length > 1000) {
      return NextResponse.json(
        { error: 'Invalid caption', message: 'Caption must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      return NextResponse.json(
        { error: 'Invalid dimensions', message: 'Width and height must be positive numbers' },
        { status: 400 }
      );
    }

    // Check if asset already exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id },
    });

    if (existingAsset) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Asset with this ID already exists' },
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

    return NextResponse.json(asset, { status: 201 });
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
        { error: 'Conflict', message: 'Asset with this ID already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create asset' },
      { status: 500 }
    );
  }
}