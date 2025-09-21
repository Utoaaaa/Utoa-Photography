'use client';

import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
            <p className="text-gray-600 mb-8">Welcome to UTOA Photography Admin</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <QuickActionLink
                href="/admin/years"
                title="Years"
                description="Manage timeline years"
              />
              <QuickActionLink
                href="/admin/collections"
                title="Collections"
                description="Manage photo collections"
              />
              <QuickActionLink
                href="/admin/uploads"
                title="Uploads"
                description="Upload new images"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage your photography portfolio content</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard label="Published Years" value={publishedYears} />
          <StatCard label="Draft Years" value={draftYears} />
          <StatCard label="Published Collections" value={publishedCollections} />
          <StatCard label="Draft Collections" value={draftCollections} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionPanel
            href="/admin/years"
            title="Years Management"
            description="Create and organize timeline years for your photography collections."
            cta="Manage Years"
          />
          <QuickActionPanel
            href="/admin/collections"
            title="Collections Management"
            description="Create photo collections and organize them within years."
            cta="Manage Collections"
          />
          <QuickActionPanel
            href="/admin/uploads"
            title="Image Uploads"
            description="Upload new photos and manage existing assets in your collections."
            cta="Upload Images"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function QuickActionPanel({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <Link
        href={href}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
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
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
}
