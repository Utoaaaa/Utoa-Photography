import { NextRequest, NextResponse } from 'next/server';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_IMAGES_API_TOKEN = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

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
    const { filename, content_type } = body;

    // Validate required fields
    if (!filename) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'Filename is required' },
        { status: 400 }
      );
    }

    // Validate supported image types
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (content_type && !supportedTypes.includes(content_type)) {
      return NextResponse.json(
        { error: 'Unsupported file type', message: 'Only JPEG, PNG, WebP, and AVIF images are supported' },
        { status: 400 }
      );
    }

    // For development, return mock data
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_IMAGES_API_TOKEN) {
      console.warn('Cloudflare credentials not configured, returning mock response');
      
      const mockImageId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const mockUploadUrl = `https://upload.imagedelivery.net/mock-url/${mockImageId}`;
      
      return NextResponse.json({
        upload_url: mockUploadUrl,
        image_id: mockImageId,
        form_data: {
          id: mockImageId,
          requireSignedURLs: 'false',
          metadata: JSON.stringify({ filename }),
        },
      });
    }

    // Generate direct upload URL with Cloudflare Images API
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_IMAGES_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requireSignedURLs: false,
          metadata: {
            filename,
            content_type,
            uploaded_at: new Date().toISOString(),
          },
        }),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudflare Images API error:', errorText);
      
      return NextResponse.json(
        { error: 'External service error', message: 'Failed to generate upload URL' },
        { status: 502 }
      );
    }

    const uploadData = await uploadResponse.json();

    if (!uploadData.success) {
      console.error('Cloudflare Images API returned error:', uploadData);
      return NextResponse.json(
        { error: 'External service error', message: 'Failed to generate upload URL' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      upload_url: uploadData.result.uploadURL,
      image_id: uploadData.result.id,
      form_data: {
        id: uploadData.result.id,
        ...uploadData.result,
      },
    });

  } catch (error) {
    console.error('Error generating direct upload URL:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}