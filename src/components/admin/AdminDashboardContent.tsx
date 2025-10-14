'use client';

import Link from 'next/link';
import AdminPageLayout from '@/components/admin/AdminPageLayout';

interface AdminDashboardContentProps {
  publishedYears: number;
  draftYears: number;
  publishedCollections: number;
  draftCollections: number;
  hasError?: boolean;
}

export default function AdminDashboardContent({
  publishedYears,
  draftYears,
  publishedCollections,
  draftCollections,
  hasError = false,
}: AdminDashboardContentProps) {
  if (hasError) {
    return (
      <div className="min-h-screen bg-slate-50/80" data-testid="admin-dashboard">
        <AdminPageLayout
          breadcrumbItems={[{ label: '控制台' }]}
          title="管理控制台"
          description="載入控制台資料時發生錯誤，請稍後再試。"
          headerExtra={(
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 text-sm text-red-700">
              <p>目前無法取得統計資料，您仍可直接前往各管理頁面。</p>
            </div>
          )}
        >
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QuickActionLink
              href="/admin/years"
              title="年份管理"
              description="維護時間軸年份與草稿狀態。"
              dataTestId="nav-years"
            />
            <QuickActionLink
              href="/admin/uploads"
              title="素材上傳"
              description="上傳照片並管理現有檔案。"
              dataTestId="nav-uploads"
            />
          </section>
        </AdminPageLayout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80" data-testid="admin-dashboard">
      <AdminPageLayout
        breadcrumbItems={[{ label: '控制台' }]}
        title="管理控制台"
        description="快速檢視作品集內容統計並前往各項設定。"
        actions={(
          <div data-testid="user-info" className="rounded-full bg-white/70 px-4 py-1 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200/70">
            Cloudflare Access 使用者
          </div>
        )}
        contentClassName="space-y-8"
      >
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="已發布年份" value={publishedYears} accent="emerald" />
          <StatCard label="草稿年份" value={draftYears} accent="amber" />
          <StatCard label="已發布作品集" value={publishedCollections} accent="sky" />
          <StatCard label="草稿作品集" value={draftCollections} accent="slate" />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <QuickActionPanel
            href="/admin/years"
            title="年份管理"
            description="建立或調整作品集使用的年份，並管理各年份的狀態。"
            cta="前往年份管理"
            dataTestId="nav-years"
          />
          <QuickActionPanel
            href="/admin/uploads"
            title="素材上傳"
            description="批次上傳照片、指派地點資料夾並維護描述資訊。"
            cta="開啟素材上傳"
            dataTestId="nav-uploads"
          />
        </section>
      </AdminPageLayout>
    </div>
  );
}
type AccentKey = 'emerald' | 'amber' | 'sky' | 'slate';

function StatCard({ label, value, accent }: { label: string; value: number; accent: AccentKey }) {
  const accentClasses: Record<AccentKey, string> = {
    emerald: 'border-emerald-200/70 shadow-emerald-100/40',
    amber: 'border-amber-200/70 shadow-amber-100/40',
    sky: 'border-sky-200/70 shadow-sky-100/40',
    slate: 'border-gray-200/80 shadow-gray-100/50',
  };

  return (
    <div className={`rounded-2xl border bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60 backdrop-blur ${accentClasses[accent]}`}>
      <h3 className="text-sm font-medium text-gray-600">{label}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function QuickActionPanel({
  href,
  title,
  description,
  cta,
  dataTestId,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
  dataTestId?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60" data-testid={dataTestId}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        {cta}
      </Link>
    </div>
  );
}

function QuickActionLink({
  href,
  title,
  description,
  dataTestId,
}: {
  href: string;
  title: string;
  description: string;
  dataTestId?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60 transition-shadow hover:shadow-md"
      data-testid={dataTestId}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
