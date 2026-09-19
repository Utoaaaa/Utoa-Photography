import { NextRequest, NextResponse } from 'next/server';
import { adminAuthError } from '@/lib/auth';
import { seoFieldsSchema, seoTargetSchema } from '@/lib/seo/validation';

type Context = { params: Promise<{ entityType: string; entityId: string }> };
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: Context) {
  const authError = await adminAuthError(request);
  if (authError) return authError;
  const parsed = seoTargetSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: '無效的 SEO 頁面。' }, { status: 400 });
  try {
    const { getSEOTarget, getSEOEditor } = await import('@/lib/seo/store');
    const target = await getSEOTarget(parsed.data.entityType, parsed.data.entityId);
    if (!target) return NextResponse.json({ error: '找不到頁面。' }, { status: 404 });
    return NextResponse.json(await getSEOEditor(target), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to read SEO settings', error);
    return NextResponse.json({ error: '無法載入 SEO 設定。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  const authError = await adminAuthError(request);
  if (authError) return authError;
  const parsed = seoTargetSchema.safeParse(await context.params);
  const body = seoFieldsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !body.success) {
    return NextResponse.json({ error: '請檢查 SEO 欄位：標題最多 200 字，描述最多 500 字。' }, { status: 400 });
  }
  try {
    const { getSEOTarget, seoAssetExists, saveSEO } = await import('@/lib/seo/store');
    const target = await getSEOTarget(parsed.data.entityType, parsed.data.entityId);
    if (!target) return NextResponse.json({ error: '找不到頁面。' }, { status: 404 });
    if (body.data.og_asset_id && !(await seoAssetExists(body.data.og_asset_id))) {
      return NextResponse.json({ error: '分享圖片不存在，請重新選擇。' }, { status: 400 });
    }
    await saveSEO(target.type, target.id, body.data);
    const { revalidatePath } = await import('next/cache');
    let warning: string | undefined;
    try { revalidatePath(target.path); } catch (error) {
      console.error('SEO saved, cache revalidation failed', error);
      warning = '設定已儲存，但頁面快取尚未更新，請稍後確認。';
    }
    return NextResponse.json({ fields: body.data, warning }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to save SEO settings', error);
    return NextResponse.json({ error: 'SEO 設定未能儲存，請重試。' }, { status: 500 });
  }
}
