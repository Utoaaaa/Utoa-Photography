import { getSiteUrl } from '@/lib/site-url';
import { createSitemapEntries, toSitemapXml } from '@/lib/sitemap';
import { loadYearLocationData } from '@/lib/year-location';

export const dynamic = 'force-dynamic';

export async function GET() {
  const payload = await loadYearLocationData();
  const entries = createSitemapEntries(getSiteUrl(), payload);
  const xml = toSitemapXml(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
}
