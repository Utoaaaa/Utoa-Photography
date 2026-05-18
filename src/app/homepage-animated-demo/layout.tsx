import MenuWrapper from '@/components/ui/MenuWrapper';
import type { StaggeredMenuItem } from '@/components/ui/StaggeredMenu';

const demoMenuItems: StaggeredMenuItem[] = [
  {
    label: 'Home',
    ariaLabel: '前往首頁',
    link: '/',
    variant: 'home',
  },
  {
    label: '2025',
    ariaLabel: '前往 demo 2025 年的作品集區塊',
    link: '/homepage-animated-demo#year-2025',
    variant: 'year',
  },
  {
    label: 'Taipei',
    ariaLabel: '瀏覽 demo 2025 Taipei 地點',
    link: '/homepage-animated-demo/2025/taipei-25',
    variant: 'location-first',
  },
  {
    label: 'Kyoto',
    ariaLabel: '瀏覽 demo 2025 Kyoto 地點',
    link: '/homepage-animated-demo/2025/kyoto-25',
    variant: 'location',
  },
  {
    label: 'Seoul',
    ariaLabel: '瀏覽 demo 2025 Seoul 地點',
    link: '/homepage-animated-demo/2025/seoul-25',
    variant: 'location',
  },
  {
    label: '2024',
    ariaLabel: '前往 demo 2024 年的作品集區塊',
    link: '/homepage-animated-demo#year-2024',
    variant: 'year',
  },
  {
    label: 'Kinmen',
    ariaLabel: '瀏覽 demo 2024 Kinmen 地點',
    link: '/homepage-animated-demo/2024/kinmen-24',
    variant: 'location-first',
  },
  {
    label: 'Tainan',
    ariaLabel: '瀏覽 demo 2024 Tainan 地點',
    link: '/homepage-animated-demo/2024/tainan-24',
    variant: 'location',
  },
  {
    label: '2023',
    ariaLabel: '前往 demo 2023 年的作品集區塊',
    link: '/homepage-animated-demo#year-2023',
    variant: 'year',
  },
  {
    label: 'Yilan',
    ariaLabel: '瀏覽 demo 2023 Yilan 地點',
    link: '/homepage-animated-demo/2023/yilan-23',
    variant: 'location-first',
  },
];

export default function HomepageAnimatedDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="homepage-animated-demo-shell">
      {children}
      <MenuWrapper menuItems={demoMenuItems} />
      <style>{`
        .homepage-animated-demo-shell {
          --demo-shell-gutter: max(1.5rem, calc((100vw - 80rem) / 2));
        }

        .homepage-animated-demo-shell .sm-scope .sm-toggle {
          right: var(--demo-shell-gutter);
        }

        .homepage-animated-demo-shell .sm-scope .sm-toggle .sm-toggle-line {
          font-family: Georgia, 'Times New Roman', Times, serif;
          font-weight: 600;
          letter-spacing: 0.04em;
        }

        @media (min-width: 640px) {
          .homepage-animated-demo-shell {
            --demo-shell-gutter: max(2rem, calc((100vw - 80rem) / 2));
          }
        }

        @media (min-width: 768px) {
          .homepage-animated-demo-shell {
            --demo-shell-gutter: max(3rem, calc((100vw - 80rem) / 2));
          }
        }
      `}</style>
    </div>
  );
}
