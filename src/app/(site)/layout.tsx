import type { Metadata } from 'next';
import MenuWrapper from '@/components/ui/MenuWrapper';
import { buildSiteMenuItems } from '@/lib/site-menu';

export const metadata: Metadata = {
  title: 'UTOA Photography',
  description: 'Moments In Focus',
};

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const menuItems = await buildSiteMenuItems();

  return (
    <div className="animated-site-shell">
      {children}
      <MenuWrapper menuItems={menuItems} />
      <style>{`
        .animated-site-shell {
          --animated-shell-gutter: max(1.5rem, calc((100vw - 80rem) / 2));
        }

        .animated-site-shell .sm-scope .sm-toggle {
          right: var(--animated-shell-gutter);
        }

        .animated-site-shell .sm-scope .sm-toggle .sm-toggle-line {
          font-family: var(--font-serif);
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        @media (min-width: 640px) {
          .animated-site-shell {
            --animated-shell-gutter: max(2rem, calc((100vw - 80rem) / 2));
          }
        }

        @media (min-width: 768px) {
          .animated-site-shell {
            --animated-shell-gutter: max(3rem, calc((100vw - 80rem) / 2));
          }
        }
      `}</style>
    </div>
  );
}
