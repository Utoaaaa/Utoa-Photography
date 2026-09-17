import { NextResponse } from 'next/server';

// Retired write endpoint. Never redirect mutations or read the request body.
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed', message: 'Use the /api/admin endpoint for writes' },
    { status: 405, headers: { Allow: 'OPTIONS', 'Cache-Control': 'no-store' } });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'OPTIONS' } });
}
