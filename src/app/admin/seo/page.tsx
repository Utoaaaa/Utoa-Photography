import type { Metadata } from 'next';
import SEOEditor from '@/components/admin/SEOEditor';

export const metadata: Metadata = {
  title: '搜尋與分享設定 | UTOA Photography',
  robots: { index: false, follow: false },
};
export default function SEOPage() {
  return <main className="min-h-screen bg-slate-50/80"><SEOEditor /></main>;
}
