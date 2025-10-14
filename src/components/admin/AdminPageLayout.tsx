import type { ReactNode } from 'react';
import Breadcrumb, { type BreadcrumbItem } from '@/components/admin/Breadcrumb';

interface AdminPageLayoutProps {
  breadcrumbItems: BreadcrumbItem[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  headerExtra?: ReactNode;
  children: ReactNode;
  dataTestId?: string;
  contentClassName?: string;
}

export default function AdminPageLayout({
  breadcrumbItems,
  title,
  description,
  actions,
  headerExtra,
  children,
  dataTestId,
  contentClassName,
}: AdminPageLayoutProps) {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-8 px-6 pb-12 pt-4 sm:px-8 lg:px-12" data-testid={dataTestId}>
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {headerExtra}

      <div className={contentClassName ?? 'space-y-6'}>
        {children}
      </div>
    </div>
  );
}
