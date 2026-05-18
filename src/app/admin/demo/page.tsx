"use client";

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Cloud,
  Database,
  Eye,
  FileWarning,
  FileImage,
  FolderOpen,
  Globe2,
  ImageUp,
  LayoutDashboard,
  Layers3,
  PanelLeft,
  Search,
  ServerCog,
  ShieldCheck,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';

import AccessibleDialog from '@/components/ui/AccessibleDialog';

type SectionId = 'dashboard' | 'years' | 'workspace' | 'uploads' | 'diagnostics' | 'publishing' | 'legacyCollections' | 'states';
type Status = 'published' | 'draft' | 'review';
type ToastIntent = 'success' | 'info';
type LibraryState = 'loaded' | 'loading' | 'empty' | 'success';

type DemoYear = {
  id: string;
  label: string;
  status: Extract<Status, 'published' | 'draft'>;
  locations: number;
  collections: number;
  assets: number;
  updatedAt: string;
};

type DemoLocation = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  coverAssetId: string | null;
  status: Status;
};

type DemoCollection = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  locationId: string;
  status: Status;
  capturedAt: string;
  coverAssetId: string | null;
  assetIds: string[];
};

type DemoAsset = {
  id: string;
  title: string;
  locationId: string;
  alt: string;
  description: string;
  status: Status;
  ratio: string;
  tone: string;
  variants: Array<'T' | 'M' | 'L'>;
  selected?: boolean;
};

type ToastRecord = {
  id: number;
  intent: ToastIntent;
  text: string;
};

type DemoWorkspace = {
  locations: DemoLocation[];
  collections: DemoCollection[];
  assets: DemoAsset[];
};

type SectionConfig = { id: SectionId; label: string; description: string; icon: ReactNode };

const coreSections: SectionConfig[] = [
  {
    id: 'dashboard',
    label: '控制台',
    description: '總覽、品質門檻與發布準備度',
    icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'years',
    label: '年份管理',
    description: '排序、狀態與年度範圍',
    icon: <Archive className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'workspace',
    label: '年份工作區',
    description: '地點、作品集與指派關係',
    icon: <Layers3 className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'uploads',
    label: '上傳與媒體',
    description: '媒體庫與本地上傳佇列',
    icon: <UploadCloud className="h-4 w-4" aria-hidden="true" />,
  },
];

const auxiliarySections: SectionConfig[] = [
  {
    id: 'diagnostics',
    label: '診斷中心',
    description: '資料庫、環境與 Cloudflare 狀態',
    icon: <Wrench className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'publishing',
    label: '發布中心',
    description: '尚未啟用的發布預覽頁',
    icon: <Globe2 className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'legacyCollections',
    label: '舊作品集路由',
    description: '已移除並返回 404 的說明',
    icon: <FileWarning className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: 'states',
    label: '本地狀態',
    description: '對話框、提示、空狀態與成功狀態',
    icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" />,
  },
];

const auxiliarySectionIds = new Set<SectionId>(auxiliarySections.map((section) => section.id));

const initialYears: DemoYear[] = [
  { id: 'year-2025', label: '2025', status: 'draft', locations: 4, collections: 11, assets: 148, updatedAt: '今天 14:32' },
  { id: 'year-2024', label: '2024', status: 'published', locations: 7, collections: 24, assets: 386, updatedAt: '昨天 18:05' },
  { id: 'year-2023', label: '2023', status: 'published', locations: 5, collections: 16, assets: 219, updatedAt: '5 月 8 日' },
];

const initialWorkspaces: Record<string, DemoWorkspace> = {
  'year-2025': {
    locations: [
      { id: 'okinawa-25', name: '沖繩海線', slug: 'okinawa-25', summary: '面向海風、港口與珊瑚色黃昏的年度草稿。', coverAssetId: 'asset-25-01', status: 'draft' },
      { id: 'tainan-25', name: '台南午後', slug: 'tainan-25', summary: '老屋光線、巷弄陰影與夏季植物。', coverAssetId: 'asset-25-03', status: 'review' },
    ],
    collections: [
      { id: 'collection-25-01', title: '海線藍圖', slug: 'okinawa-blueprint', summary: '港邊散步與海色層次。', locationId: 'okinawa-25', status: 'draft', capturedAt: '2025-03-18', coverAssetId: 'asset-25-01', assetIds: ['asset-25-01', 'asset-25-02'] },
      { id: 'collection-25-02', title: '午後窗影', slug: 'tainan-window-light', summary: '午後室內光與街邊植物。', locationId: 'tainan-25', status: 'review', capturedAt: '2025-04-02', coverAssetId: 'asset-25-03', assetIds: ['asset-25-03'] },
    ],
    assets: [
      { id: 'asset-25-01', title: '港口藍-025', locationId: 'okinawa-25', alt: '沖繩港口的藍色海面與白色船隻', description: '作為 2025 草稿年份的海線封面候選。', status: 'draft', ratio: '3:2', tone: 'from-cyan-200 via-sky-100 to-blue-300', variants: ['T', 'M'] },
      { id: 'asset-25-02', title: '珊瑚暮色-041', locationId: 'okinawa-25', alt: '粉橘暮色下的海岸線', description: '保留暖色調，用於黃昏段落。', status: 'draft', ratio: '4:5', tone: 'from-orange-100 via-rose-100 to-sky-200', variants: ['T'] },
      { id: 'asset-25-03', title: '窗邊植物-013', locationId: 'tainan-25', alt: '台南老屋窗邊的綠色植物', description: '可作為地點封面或作品集封面。', status: 'review', ratio: '1:1', tone: 'from-lime-100 via-stone-100 to-amber-200', variants: ['T', 'M', 'L'] },
    ],
  },
  'year-2024': {
    locations: [
      { id: 'kyoto-24', name: '京都北行', slug: 'kyoto-24', summary: '清晨神社、石徑與北側街區的慢速行走。', coverAssetId: 'asset-01', status: 'published' },
      { id: 'taipei-24', name: '台北藍調時刻', slug: 'taipei-24', summary: '河岸、夜市與傍晚轉入夜色的城市光。', coverAssetId: 'asset-02', status: 'review' },
      { id: 'seoul-24', name: '首爾雨記', slug: 'seoul-24', summary: '雨窗、橋霧與濕冷街道的觀察筆記。', coverAssetId: 'asset-04', status: 'draft' },
    ],
    collections: [
      { id: 'c-01', title: '晨間神社', slug: 'morning-shrines', summary: '石階、木門與清晨人流前的安靜。', locationId: 'kyoto-24', status: 'published', capturedAt: '2024-02-12', coverAssetId: 'asset-01', assetIds: ['asset-01', 'asset-05'] },
      { id: 'c-02', title: '燈巷漫步', slug: 'lantern-alleys', summary: '傍晚巷弄中的燈影與店面細節。', locationId: 'kyoto-24', status: 'review', capturedAt: '2024-02-14', coverAssetId: 'asset-05', assetIds: ['asset-05'] },
      { id: 'c-03', title: '河岸構圖', slug: 'riverside-frames', summary: '藍色時刻中的橋面與河面反光。', locationId: 'taipei-24', status: 'draft', capturedAt: '2024-05-08', coverAssetId: 'asset-02', assetIds: ['asset-02'] },
      { id: 'c-04', title: '靜夜市場', slug: 'quiet-night-market', summary: '人潮間隙中的攤位、光線與等待。', locationId: 'taipei-24', status: 'published', capturedAt: '2024-05-09', coverAssetId: 'asset-03', assetIds: ['asset-03'] },
      { id: 'c-05', title: '雨中路口', slug: 'rain-crossings', summary: '雨天玻璃與路口反射的冷色調。', locationId: 'seoul-24', status: 'draft', capturedAt: '2024-09-21', coverAssetId: 'asset-04', assetIds: ['asset-04', 'asset-06'] },
    ],
    assets: [
      { id: 'asset-01', title: '石徑-024', locationId: 'kyoto-24', alt: '京都神社旁被晨光照亮的石徑', description: '適合作為京都地點與晨間神社封面。', status: 'published', ratio: '3:2', tone: 'from-slate-300 via-stone-100 to-emerald-100', variants: ['T', 'M', 'L'] },
      { id: 'asset-02', title: '河光-118', locationId: 'taipei-24', alt: '台北河岸藍色時刻的水面反光', description: '河岸構圖系列的主要視覺。', status: 'review', ratio: '4:5', tone: 'from-sky-200 via-slate-100 to-blue-300', variants: ['T', 'M'] },
      { id: 'asset-03', title: '市場靜物-044', locationId: 'taipei-24', alt: '夜市攤位旁安靜擺放的物件', description: '保留為夜市段落的細節照。', status: 'draft', ratio: '1:1', tone: 'from-amber-100 via-orange-200 to-slate-200', variants: ['T'] },
      { id: 'asset-04', title: '雨窗-031', locationId: 'seoul-24', alt: '雨滴停在首爾窗面的冷色反光', description: '首爾雨記的封面候選。', status: 'draft', ratio: '16:9', tone: 'from-gray-300 via-cyan-100 to-slate-400', variants: ['T', 'M', 'L'] },
      { id: 'asset-05', title: '杉影-087', locationId: 'kyoto-24', alt: '杉木陰影落在京都街角牆面', description: '可補足京都北行的綠色調。', status: 'published', ratio: '2:3', tone: 'from-emerald-200 via-stone-200 to-zinc-300', variants: ['T', 'M'] },
      { id: 'asset-06', title: '橋霧-072', locationId: 'seoul-24', alt: '霧氣中的首爾橋面與遠方行人', description: '用於雨中路口的收尾照片。', status: 'review', ratio: '3:2', tone: 'from-indigo-100 via-slate-200 to-gray-400', variants: ['T'] },
    ],
  },
  'year-2023': {
    locations: [
      { id: 'paris-23', name: '巴黎灰階', slug: 'paris-23', summary: '石牆、街角與陰天光線的黑白練習。', coverAssetId: 'asset-23-01', status: 'published' },
      { id: 'hokkaido-23', name: '北海道雪線', slug: 'hokkaido-23', summary: '雪地、低雲與遠方樹線。', coverAssetId: 'asset-23-03', status: 'published' },
    ],
    collections: [
      { id: 'collection-23-01', title: '石牆午後', slug: 'stone-wall-afternoon', summary: '陰天街角與牆面紋理。', locationId: 'paris-23', status: 'published', capturedAt: '2023-06-11', coverAssetId: 'asset-23-01', assetIds: ['asset-23-01', 'asset-23-02'] },
      { id: 'collection-23-02', title: '雪線遠方', slug: 'snow-line-distance', summary: '白色地景中的樹線與低對比。', locationId: 'hokkaido-23', status: 'published', capturedAt: '2023-12-28', coverAssetId: 'asset-23-03', assetIds: ['asset-23-03'] },
    ],
    assets: [
      { id: 'asset-23-01', title: '灰牆-019', locationId: 'paris-23', alt: '巴黎街角灰色石牆與窗框', description: '石牆午後的主要封面。', status: 'published', ratio: '3:2', tone: 'from-zinc-300 via-stone-200 to-neutral-100', variants: ['T', 'M', 'L'] },
      { id: 'asset-23-02', title: '街口-056', locationId: 'paris-23', alt: '陰天街口的人行道與路牌', description: '補充城市尺度。', status: 'published', ratio: '4:5', tone: 'from-neutral-200 via-slate-100 to-zinc-300', variants: ['T', 'M'] },
      { id: 'asset-23-03', title: '雪線-104', locationId: 'hokkaido-23', alt: '北海道雪地遠方的樹線', description: '雪線遠方的封面圖片。', status: 'published', ratio: '16:9', tone: 'from-slate-100 via-sky-100 to-zinc-300', variants: ['T', 'M', 'L'] },
    ],
  },
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2';
const buttonBase = `inline-flex items-center justify-center rounded-md text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const secondaryButton = `${buttonBase} min-w-0 whitespace-nowrap border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50`;
const primaryButton = `${buttonBase} min-w-0 whitespace-nowrap border border-blue-600 bg-blue-600 px-3 py-2 text-white hover:bg-blue-700`;

export default function AdminDemoPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [years, setYears] = useState<DemoYear[]>(initialYears);
  const [workspaces, setWorkspaces] = useState<Record<string, DemoWorkspace>>(initialWorkspaces);
  const [selectedYearId, setSelectedYearId] = useState(initialYears[1]?.id ?? '');
  const [selectedLocationId, setSelectedLocationId] = useState(initialWorkspaces[initialYears[1]?.id ?? '']?.locations[0]?.id ?? '');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set(['asset-02', 'asset-05']));
  const [libraryState, setLibraryState] = useState<LibraryState>('loaded');
  const [previewAsset, setPreviewAsset] = useState<DemoAsset | null>(null);
  const [isCleanupPreviewOpen, setIsCleanupPreviewOpen] = useState(false);
  const [isAuxNavOpen, setIsAuxNavOpen] = useState(false);
  const [toast, setToast] = useState<ToastRecord | null>(null);
  const toastIdRef = useRef(0);

  const isAuxiliaryActive = auxiliarySectionIds.has(activeSection);
  const shouldShowAuxNav = isAuxNavOpen || isAuxiliaryActive;
  const selectedYear = years.find((year) => year.id === selectedYearId) ?? years[0];
  const currentWorkspace = workspaces[selectedYear?.id ?? ''] ?? { locations: [], collections: [], assets: [] };
  const selectedLocation = currentWorkspace.locations.find((location) => location.id === selectedLocationId) ?? currentWorkspace.locations[0] ?? null;
  const selectedCollections = currentWorkspace.collections.filter((collection) => collection.locationId === selectedLocation?.id);
  const selectedCollection = currentWorkspace.collections.find((collection) => collection.id === selectedCollectionId) ?? null;

  const totals = useMemo(() => {
    return years.reduce(
      (summary, year) => ({
        locations: summary.locations + year.locations,
        collections: summary.collections + year.collections,
        assets: summary.assets + year.assets,
        publishedYears: summary.publishedYears + (year.status === 'published' ? 1 : 0),
      }),
      { locations: 0, collections: 0, assets: 0, publishedYears: 0 },
    );
  }, [years]);

  const showToast = (text: string, intent: ToastIntent = 'info') => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, intent, text });
  };

  const handleSelectYear = (yearId: string) => {
    const year = years.find((item) => item.id === yearId);
    const nextWorkspace = workspaces[yearId];
    setSelectedYearId(yearId);
    setSelectedLocationId(nextWorkspace?.locations[0]?.id ?? '');
    setSelectedCollectionId(null);
    setSelectedAssetIds(new Set());
    setPreviewAsset(null);
    showToast(`已切換到 ${year?.label ?? '所選年份'} 的工作區。`, 'info');
  };

  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedCollectionId(null);
  };

  const updateWorkspace = (yearId: string, updater: (workspace: DemoWorkspace) => DemoWorkspace) => {
    setWorkspaces((current) => {
      const workspace = current[yearId];
      if (!workspace) return current;
      return { ...current, [yearId]: updater(workspace) };
    });
  };

  const updateLocation = (location: DemoLocation) => {
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      locations: workspace.locations.map((item) => (item.id === location.id ? location : item)),
    }));
    showToast('地點資料已更新在本地模擬狀態。', 'success');
  };

  const updateCollection = (collection: DemoCollection) => {
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      collections: workspace.collections.map((item) => (item.id === collection.id ? collection : item)),
    }));
    showToast('作品集資料已更新在本地模擬狀態。', 'success');
  };

  const updateCollectionAssetIds = (collectionId: string, assetIds: string[]) => {
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      collections: workspace.collections.map((item) => (item.id === collectionId ? { ...item, assetIds } : item)),
    }));
    showToast('作品集照片清單已在本地更新。', 'success');
  };

  const updateAsset = (asset: DemoAsset) => {
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      assets: workspace.assets.map((item) => (item.id === asset.id ? asset : item)),
    }));
    showToast('媒體中繼資料已儲存在本地模擬狀態。', 'success');
  };

  const moveYear = (yearId: string, direction: -1 | 1) => {
    setYears((current) => {
      const index = current.findIndex((year) => year.id === yearId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    showToast('展示用：年份排序已在本地狀態更新。', 'success');
  };

  const toggleYearStatus = (yearId: string) => {
    setYears((current) =>
      current.map((year) =>
        year.id === yearId
          ? { ...year, status: year.status === 'published' ? 'draft' : 'published', updatedAt: '剛剛' }
          : year,
      ),
    );
    showToast('狀態只在本地模擬狀態中切換。', 'success');
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const simulateUpload = () => {
    setLibraryState('loading');
    showToast('正在模擬本地上傳佇列，沒有檔案會被送出。', 'info');
    window.setTimeout(() => {
      setLibraryState('success');
      showToast('展示用上傳佇列已在本地完成。', 'success');
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-gray-900" data-testid="admin-demo-page">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:px-8">
        <aside className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-80 lg:flex-none">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                  <PanelLeft className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">展示路由</p>
                  <h1 className="text-lg font-semibold text-gray-950">後台介面展示</h1>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                這是一個獨立的模擬後台介面，用來預覽新的管理方向。此頁沒有串接 API、驗證、Prisma、上傳或刪除行為。
              </p>
            </div>

            <nav className="p-2" aria-label="後台展示區段">
              <div className="space-y-1">
                {coreSections.map((section) => (
                  <SidebarNavButton key={section.id} section={section} activeSection={activeSection} onSelect={setActiveSection} />
                ))}
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  aria-expanded={shouldShowAuxNav}
                  aria-controls="admin-demo-aux-nav"
                  onClick={() => setIsAuxNavOpen((current) => !current)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-50 ${focusRing}`}
                >
                  <span>系統與輔助頁面</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition ${shouldShowAuxNav ? 'rotate-90' : ''}`} aria-hidden="true" />
                </button>
                {shouldShowAuxNav ? (
                  <div id="admin-demo-aux-nav" className="mt-1 space-y-1">
                    {auxiliarySections.map((section) => (
                      <SidebarNavButton key={section.id} section={section} activeSection={activeSection} onSelect={setActiveSection} />
                    ))}
                  </div>
                ) : null}
              </div>
            </nav>

            <div className="border-t border-gray-100 p-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-800">
                所有刪除、清理、發布類控制都只做預覽，僅開啟本地對話框，不會呼叫任何端點。
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {activeSection === 'dashboard' && <DashboardSection totals={totals} />}
          {activeSection === 'years' && (
            <YearsSection years={years} onMoveYear={moveYear} onToggleStatus={toggleYearStatus} onPreviewCleanup={() => setIsCleanupPreviewOpen(true)} />
          )}
          {activeSection === 'workspace' && (
            <WorkspaceSection
              years={years}
              workspace={currentWorkspace}
              selectedYearId={selectedYear?.id ?? ''}
              selectedLocationId={selectedLocation?.id ?? ''}
              selectedLocation={selectedLocation}
              selectedCollections={selectedCollections}
              selectedCollection={selectedCollection}
              onSelectYear={handleSelectYear}
              onSelectLocation={handleSelectLocation}
              onSelectCollection={setSelectedCollectionId}
              onSaveLocation={updateLocation}
              onSaveCollection={updateCollection}
              onUpdateCollectionAssetIds={updateCollectionAssetIds}
            />
          )}
          {activeSection === 'uploads' && (
            <UploadsSection
              libraryState={libraryState}
              assets={currentWorkspace.assets}
              locations={currentWorkspace.locations}
              selectedAssetIds={selectedAssetIds}
              onSetLibraryState={setLibraryState}
              onSimulateUpload={simulateUpload}
              onToggleAsset={toggleAsset}
              onPreviewAsset={setPreviewAsset}
              onSaveAsset={updateAsset}
              onPreviewCleanup={() => setIsCleanupPreviewOpen(true)}
            />
          )}
          {activeSection === 'diagnostics' && <DiagnosticsSection />}
          {activeSection === 'publishing' && <PublishingSection onPreview={() => showToast('發布中心尚未啟用，這裡只顯示預覽。', 'info')} />}
          {activeSection === 'legacyCollections' && <LegacyCollectionsSection />}
          {activeSection === 'states' && (
            <StatesSection
              libraryState={libraryState}
              onSetLibraryState={setLibraryState}
              onShowToast={showToast}
              onPreviewCleanup={() => setIsCleanupPreviewOpen(true)}
            />
          )}
        </main>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {toast?.text ?? ''}
      </div>
      <ToastPreview toast={toast} onDismiss={() => setToast(null)} />

      <AssetPreviewDialog asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      <CleanupPreviewDialog open={isCleanupPreviewOpen} onClose={() => setIsCleanupPreviewOpen(false)} onConfirm={() => showToast('已確認預覽，沒有執行任何清理。', 'success')} />
    </div>
  );
}

function SidebarNavButton({ section, activeSection, onSelect }: { section: SectionConfig; activeSection: SectionId; onSelect: (sectionId: SectionId) => void }) {
  const isActive = activeSection === section.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${focusRing} ${
        isActive ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-100' : 'text-gray-700 hover:bg-gray-50'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`mt-0.5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{section.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{section.label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">{section.description}</span>
      </span>
      <ChevronRight className={`mt-1 h-4 w-4 ${isActive ? 'text-blue-500' : 'text-gray-300'}`} aria-hidden="true" />
    </button>
  );
}

function DashboardSection({ totals }: { totals: { locations: number; collections: number; assets: number; publishedYears: number } }) {
  return (
    <section className="space-y-6" aria-labelledby="dashboard-title">
      <SectionHeading id="dashboard-title" eyebrow="控制台" title="營運總覽" description="集中呈現內容準備度、發布狀態與媒體健康度的高階訊號。" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="已發布年份" value={totals.publishedYears} accent="emerald" />
        <StatCard label="地點數" value={totals.locations} accent="blue" />
        <StatCard label="作品集數" value={totals.collections} accent="amber" />
        <StatCard label="已索引媒體" value={totals.assets} accent="slate" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <Card>
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">發布準備度</h3>
              <p className="text-sm text-gray-600">未來後台在發布前可顯示的模擬檢查清單。</p>
            </div>
            <StatusBadge status="review" />
          </div>
          <div className="mt-5 space-y-4">
            {[
              ['中繼資料覆蓋率', 92, '仍有 8 張草稿照片缺少說明文字'],
              ['影像版本產生', 81, '部分大尺寸版本仍在審核佇列中'],
              ['路由階層', 100, '所有已發布地點都有有效網址代稱'],
            ].map(([label, value, detail]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{label}</span>
                  <span className="text-gray-500">{value}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-950">今日後台摘要</h3>
          <div className="mt-4 space-y-3">
            {['2025 草稿年份已整理', '12 個媒體需要指派地點', '3 個孤兒媒體候選項標示為僅預覽'].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-xl border border-gray-100 bg-slate-50/70 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-700 ring-1 ring-gray-200">{index + 1}</span>
                <p className="text-sm leading-6 text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function YearsSection({
  years,
  onMoveYear,
  onToggleStatus,
  onPreviewCleanup,
}: {
  years: DemoYear[];
  onMoveYear: (yearId: string, direction: -1 | 1) => void;
  onToggleStatus: (yearId: string) => void;
  onPreviewCleanup: () => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="years-title">
      <SectionHeading id="years-title" eyebrow="年份管理" title="以本地草稿調整時間軸" description="排序與狀態切換只會改變此路由內的模擬狀態。" />
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">年份列表</h3>
            <p className="text-xs text-gray-500">鍵盤可操作的排序控制、清楚的狀態標籤，且不會寫入真實資料。</p>
          </div>
          <button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={onPreviewCleanup}>
            預覽清理影響
          </button>
        </div>
        <ul className="divide-y divide-gray-100">
          {years.map((year, index) => (
            <li key={year.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold text-gray-950">{year.label}</h4>
                  <StatusBadge status={year.status} />
                </div>
                <dl className="mt-2 grid gap-2 text-xs text-gray-500 sm:grid-cols-4">
                  <div><dt className="sr-only">排序</dt><dd>排序 {String(index + 1).padStart(2, '0')}</dd></div>
                  <div><dt className="sr-only">地點</dt><dd>{year.locations} 個地點</dd></div>
                  <div><dt className="sr-only">作品集</dt><dd>{year.collections} 個作品集</dd></div>
                  <div><dt className="sr-only">更新時間</dt><dd>更新於 {year.updatedAt}</dd></div>
                </dl>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={secondaryButton} onClick={() => onMoveYear(year.id, -1)} disabled={index === 0}>
                  上移
                </button>
                <button type="button" className={secondaryButton} onClick={() => onMoveYear(year.id, 1)} disabled={index === years.length - 1}>
                  下移
                </button>
                <button type="button" className={primaryButton} onClick={() => onToggleStatus(year.id)}>
                  切換狀態
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function WorkspaceSection({
  years,
  workspace,
  selectedYearId,
  selectedLocationId,
  selectedLocation,
  selectedCollections,
  selectedCollection,
  onSelectYear,
  onSelectLocation,
  onSelectCollection,
  onSaveLocation,
  onSaveCollection,
  onUpdateCollectionAssetIds,
}: {
  years: DemoYear[];
  workspace: DemoWorkspace;
  selectedYearId: string;
  selectedLocationId: string;
  selectedLocation: DemoLocation | null;
  selectedCollections: DemoCollection[];
  selectedCollection: DemoCollection | null;
  onSelectYear: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onSelectCollection: (id: string | null) => void;
  onSaveLocation: (location: DemoLocation) => void;
  onSaveCollection: (collection: DemoCollection) => void;
  onUpdateCollectionAssetIds: (collectionId: string, assetIds: string[]) => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="workspace-title">
      <SectionHeading id="workspace-title" eyebrow="年份工作區" title="不擠壓內容的分欄工作區" description="先選年份，再管理地點與作品集指派；版面只在超寬螢幕才拆成多欄，避免文字與狀態標籤重疊。" />
      <div className="grid min-w-0 gap-4 2xl:grid-cols-[17rem_minmax(0,1fr)]">
        <Card className="p-0">
          <PaneHeader title="年份" description="切換管理脈絡" />
          <div className="divide-y divide-gray-100">
            {years.map((year) => (
              <button
                key={year.id}
                type="button"
                onClick={() => onSelectYear(year.id)}
                className={`flex w-full min-w-0 items-center justify-between gap-3 px-5 py-4 text-left text-sm transition ${focusRing} ${selectedYearId === year.id ? 'bg-blue-50 text-blue-800' : 'hover:bg-gray-50'}`}
              >
                <span className="min-w-0 font-medium">{year.label}</span>
                <StatusBadge status={year.status} compact />
              </button>
            ))}
          </div>
        </Card>

        <div className="grid min-w-0 gap-4 [@media(min-width:1500px)]:grid-cols-[minmax(0,1fr)_minmax(24rem,0.55fr)]">
          <Card className="min-w-0 p-0">
            <PaneHeader title="地點" description="切換年份後，這裡會換成該年份自己的地點與作品集。" />
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3 p-5">
              {workspace.locations.map((location) => {
                const collectionCount = workspace.collections.filter((collection) => collection.locationId === location.id).length;
                return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => onSelectLocation(location.id)}
                  className={`min-w-0 rounded-xl border p-4 text-left transition ${focusRing} ${selectedLocationId === location.id ? 'border-blue-200 bg-blue-50/80 ring-1 ring-blue-100' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                    <StatusBadge status={location.status} compact />
                  </div>
                  <h3 className="mt-3 min-w-0 break-words text-sm font-semibold text-gray-950">{location.name}</h3>
                  <p className="mt-1 min-w-0 break-all text-xs text-gray-500">{location.slug}</p>
                  <p className="mt-3 min-w-0 break-words text-xs font-medium text-gray-600">已指派 {collectionCount} 個作品集</p>
                </button>
                );
              })}
            </div>

            {selectedLocation ? (
              <div className="border-t border-gray-100 p-5">
                <LocationEditPanel key={selectedLocation.id} location={selectedLocation} assets={workspace.assets} onSave={onSaveLocation} />
              </div>
            ) : (
              <div className="border-t border-gray-100 p-5">
                <EmptyState title="尚未選取地點" description="請先選擇一個年份與地點，才能編輯地點資料。" />
              </div>
            )}
          </Card>

          <Card className="min-w-0 p-0">
            <PaneHeader title="作品集與編輯頁" description="點選作品集會開啟右側同區塊的模擬詳情與編輯面板。" />
            {selectedCollections.length === 0 ? (
              <EmptyState title="尚未指派作品集" description="請選擇其他地點，或在未來流程中建立本地草稿。" />
            ) : (
              <div className="space-y-3 p-5">
                {selectedCollections.map((collection) => {
                  const isActive = selectedCollection?.id === collection.id;
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => onSelectCollection(collection.id)}
                      className={`w-full min-w-0 rounded-xl border p-4 text-left transition ${focusRing} ${isActive ? 'border-blue-200 bg-blue-50/80 ring-1 ring-blue-100' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <h3 className="min-w-0 break-words text-sm font-semibold text-gray-950">{collection.title}</h3>
                        <StatusBadge status={collection.status} compact />
                      </div>
                      <p className="mt-1 break-all text-xs text-gray-500">{collection.slug}</p>
                      <p className="mt-2 text-xs text-gray-500">已指派 {collection.assetIds.length} 個媒體</p>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCollection ? (
              <div className="border-t border-gray-100 p-5">
                <CollectionDetailPanel
                  key={selectedCollection.id}
                  collection={selectedCollection}
                  locations={workspace.locations}
                  assets={workspace.assets}
                  onSave={onSaveCollection}
                  onUpdateAssetIds={onUpdateCollectionAssetIds}
                />
              </div>
            ) : selectedCollections.length > 0 ? (
              <div className="border-t border-gray-100 p-5">
                <EmptyState title="尚未開啟作品集" description="點選上方任一作品集，即可預覽編輯頁、封面圖片與管理照片區塊。" />
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}

function LocationEditPanel({ location, assets, onSave }: { location: DemoLocation; assets: DemoAsset[]; onSave: (location: DemoLocation) => void }) {
  const [name, setName] = useState(location.name);
  const [slug, setSlug] = useState(location.slug);
  const [summary, setSummary] = useState(location.summary);
  const [coverAssetId, setCoverAssetId] = useState<string | null>(location.coverAssetId);

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">地點編輯</h3>
        <p className="text-xs text-gray-500">對應目前網站的地點表單：地點名稱、Slug、摘要與封面圖片。</p>
      </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField id={`location-name-${location.id}`} label="地點名稱" value={name} onChange={setName} />
          <TextField id={`location-slug-${location.id}`} label="Slug" value={slug} onChange={setSlug} />
        </div>
        <TextAreaField id={`location-summary-${location.id}`} label="摘要" value={summary} onChange={setSummary} />
        <DemoCoverPicker assets={assets} selectedAssetId={coverAssetId} onSelect={setCoverAssetId} />
        <button
          type="button"
          className={primaryButton}
          onClick={() => onSave({ ...location, name: name.trim() || location.name, slug: slug.trim() || location.slug, summary, coverAssetId })}
        >
          儲存地點
        </button>
    </div>
  );
}

function CollectionDetailPanel({
  collection,
  locations,
  assets,
  onSave,
  onUpdateAssetIds,
}: {
  collection: DemoCollection;
  locations: DemoLocation[];
  assets: DemoAsset[];
  onSave: (collection: DemoCollection) => void;
  onUpdateAssetIds: (collectionId: string, assetIds: string[]) => void;
}) {
  const [title, setTitle] = useState(collection.title);
  const [slug, setSlug] = useState(collection.slug);
  const [summary, setSummary] = useState(collection.summary);
  const [status, setStatus] = useState<Status>(collection.status);
  const [capturedAt, setCapturedAt] = useState(collection.capturedAt);
  const [locationId, setLocationId] = useState(collection.locationId);
  const [coverAssetId, setCoverAssetId] = useState<string | null>(collection.coverAssetId);

  const saveCollection = () => {
    onSave({
      ...collection,
      title: title.trim() || collection.title,
      slug: slug.trim() || collection.slug,
      summary,
      status,
      capturedAt,
      locationId,
      coverAssetId,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">作品集詳情</p>
        <h3 className="mt-2 break-words text-lg font-semibold text-gray-950">{collection.title}</h3>
        <p className="mt-1 text-sm text-gray-600">此區模擬作品集編輯頁，不會寫入真實資料。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField id={`collection-title-${collection.id}`} label="標題" value={title} onChange={setTitle} />
        <TextField id={`collection-slug-${collection.id}`} label="Slug" value={slug} onChange={setSlug} />
        <SelectField id={`collection-status-${collection.id}`} label="狀態" value={status} onChange={(value) => setStatus(value as Status)} options={[{ value: 'draft', label: '草稿' }, { value: 'review', label: '待審核' }, { value: 'published', label: '已發布' }]} />
        <TextField id={`collection-captured-${collection.id}`} label="拍攝日期" value={capturedAt} onChange={setCapturedAt} type="date" />
        <SelectField id={`collection-location-${collection.id}`} label="指派地點" value={locationId} onChange={setLocationId} options={locations.map((location) => ({ value: location.id, label: location.name }))} />
      </div>
      <TextAreaField id={`collection-summary-${collection.id}`} label="摘要" value={summary} onChange={setSummary} />
      <DemoCoverPicker assets={assets} selectedAssetId={coverAssetId} onSelect={setCoverAssetId} />
      <button type="button" className={primaryButton} onClick={saveCollection}>儲存作品集</button>

      <ManagePhotosPanel collection={collection} assets={assets} onUpdateAssetIds={onUpdateAssetIds} />
    </div>
  );
}

function DemoCoverPicker({ assets, selectedAssetId, onSelect }: { assets: DemoAsset[]; selectedAssetId: string | null; onSelect: (assetId: string | null) => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">封面圖片</p>
          <p className="text-xs text-gray-500">從目前年份的媒體中選擇封面；此處只切換本地狀態。</p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => onSelect(null)} disabled={!selectedAssetId}>清除選擇</button>
      </div>
      {assets.length === 0 ? (
        <EmptyState title="沒有可選封面" description="目前年份沒有任何 mock 媒體可用。" />
      ) : (
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          {assets.map((asset) => {
            const selected = asset.id === selectedAssetId;
            return (
              <button
                key={asset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(asset.id)}
                className={`min-w-0 rounded-xl border p-2 text-left transition ${focusRing} ${selected ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-200'}`}
              >
                <div className={`aspect-[4/3] rounded-lg bg-gradient-to-br ${asset.tone}`} />
                <p className="mt-2 truncate text-xs font-medium text-gray-800">{asset.title}</p>
                <p className="truncate text-[11px] text-gray-500">{asset.id}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManagePhotosPanel({ collection, assets, onUpdateAssetIds }: { collection: DemoCollection; assets: DemoAsset[]; onUpdateAssetIds: (collectionId: string, assetIds: string[]) => void }) {
  const assignedAssets = collection.assetIds.map((assetId) => assets.find((asset) => asset.id === assetId)).filter((asset): asset is DemoAsset => Boolean(asset));
  const availableAssets = assets.filter((asset) => !collection.assetIds.includes(asset.id));

  const addAsset = (assetId: string) => onUpdateAssetIds(collection.id, [...collection.assetIds, assetId]);
  const removeAsset = (assetId: string) => onUpdateAssetIds(collection.id, collection.assetIds.filter((id) => id !== assetId));
  const moveAsset = (assetId: string, direction: -1 | 1) => {
    const index = collection.assetIds.indexOf(assetId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= collection.assetIds.length) return;
    const next = [...collection.assetIds];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onUpdateAssetIds(collection.id, next);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-slate-50/70 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">管理照片</h4>
          <p className="text-xs text-gray-500">模擬 Manage Photos：可加入、移除與排序，但只改本地狀態。</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-gray-200">已指派 {assignedAssets.length}</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-700">已指派照片</p>
          <div className="mt-3 space-y-2">
            {assignedAssets.length === 0 ? <p className="text-sm text-gray-500">尚未指派照片。</p> : assignedAssets.map((asset, index) => (
              <div key={asset.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-2">
                <span className="min-w-0 truncate text-sm text-gray-800">{asset.title}</span>
                <div className="flex shrink-0 gap-1">
                  <button type="button" className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40" onClick={() => moveAsset(asset.id, -1)} disabled={index === 0}>上移</button>
                  <button type="button" className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40" onClick={() => moveAsset(asset.id, 1)} disabled={index === assignedAssets.length - 1}>下移</button>
                  <button type="button" className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700" onClick={() => removeAsset(asset.id)}>移除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-700">可加入照片</p>
          <div className="mt-3 space-y-2">
            {availableAssets.length === 0 ? <p className="text-sm text-gray-500">沒有未指派照片。</p> : availableAssets.map((asset) => (
              <div key={asset.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-2">
                <span className="min-w-0 truncate text-sm text-gray-800">{asset.title}</span>
                <button type="button" className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700" onClick={() => addAsset(asset.id)}>加入</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadsSection({
  libraryState,
  assets,
  locations,
  selectedAssetIds,
  onSetLibraryState,
  onSimulateUpload,
  onToggleAsset,
  onPreviewAsset,
  onSaveAsset,
  onPreviewCleanup,
}: {
  libraryState: LibraryState;
  assets: DemoAsset[];
  locations: DemoLocation[];
  selectedAssetIds: Set<string>;
  onSetLibraryState: (state: LibraryState) => void;
  onSimulateUpload: () => void;
  onToggleAsset: (assetId: string) => void;
  onPreviewAsset: (asset: DemoAsset) => void;
  onSaveAsset: (asset: DemoAsset) => void;
  onPreviewCleanup: () => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="uploads-title">
      <SectionHeading id="uploads-title" eyebrow="上傳與媒體" title="具備安全本地操作的媒體庫" description="展示卡片密度、批次選取、影像版本狀態與模擬上傳進度，不會執行真實檔案操作。" />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label htmlFor="demo-media-search" className="mb-1 block text-sm font-medium text-gray-700">搜尋媒體</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input id="demo-media-search" className={`w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm ${focusRing}`} placeholder="依檔名、地點或狀態篩選" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButton} onClick={() => onSetLibraryState('empty')}>顯示空狀態</button>
            <button type="button" className={secondaryButton} onClick={() => onSetLibraryState('loaded')}>顯示媒體庫</button>
            <button type="button" className={primaryButton} onClick={onSimulateUpload}>模擬上傳</button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">媒體庫</h3>
            <p className="text-xs text-gray-500">已選取 {selectedAssetIds.size} 個項目，所有動作都是本地預覽。</p>
          </div>
          <button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={onPreviewCleanup}>
            預覽孤兒媒體清理
          </button>
        </div>
        <LibraryContent state={libraryState} assets={assets} locations={locations} selectedAssetIds={selectedAssetIds} onToggleAsset={onToggleAsset} onPreviewAsset={onPreviewAsset} onSaveAsset={onSaveAsset} />
      </Card>
    </section>
  );
}

function DiagnosticsSection() {
  const diagnosticRows = [
    { label: '資料庫連線', value: 'D1 綁定可讀取', status: 'published' as const, icon: <Database className="h-5 w-5" aria-hidden="true" /> },
    { label: '執行環境', value: 'Cloudflare Pages / Worker 模式', status: 'review' as const, icon: <ServerCog className="h-5 w-5" aria-hidden="true" /> },
    { label: 'Cloudflare Access', value: '管理入口受保護', status: 'published' as const, icon: <Cloud className="h-5 w-5" aria-hidden="true" /> },
    { label: '媒體儲存', value: 'R2 版本檢查待整合', status: 'draft' as const, icon: <FileImage className="h-5 w-5" aria-hidden="true" /> },
  ];

  const mockLog = `請求路徑：/admin/diagnostics
狀態：展示資料
D1：連線檢查通過
R2：僅顯示版本狀態摘要
Access：不在展示路由內讀取真實使用者
結果：沒有呼叫任何 API 或資料庫`;

  return (
    <section className="space-y-6" aria-labelledby="diagnostics-title">
      <SectionHeading id="diagnostics-title" eyebrow="診斷中心" title="安全的系統狀態面板" description="用模擬資料展示資料庫、環境、Cloudflare 與 D1 診斷資訊；此頁不讀取真實環境或伺服器狀態。" />
      <div className="grid gap-4 lg:grid-cols-2">
        {diagnosticRows.map((row) => (
          <Card key={row.label}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-gray-950">{row.label}</h3>
                  <p className="mt-1 break-words text-sm text-gray-600">{row.value}</p>
                </div>
              </div>
              <StatusBadge status={row.status} compact />
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-0">
        <PaneHeader title="診斷輸出預覽" description="使用可水平捲動的區塊，避免長文字撐破版面。" />
        <div className="p-5">
          <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100" aria-label="診斷紀錄預覽">
            <code>{mockLog}</code>
          </pre>
        </div>
      </Card>
    </section>
  );
}

function PublishingSection({ onPreview }: { onPreview: () => void }) {
  const publishingChecks: Array<{ title: string; description: string; status: Status }> = [
    { title: '年份與地點階層', description: '所有已發布地點都有正確網址代稱與排序。', status: 'published' },
    { title: '媒體替代文字', description: '仍有少量草稿圖片需要補齊替代文字。', status: 'review' },
    { title: '快取與重建策略', description: '尚未在此展示頁中啟用。', status: 'draft' },
  ];

  return (
    <section className="space-y-6" aria-labelledby="publishing-title">
      <SectionHeading id="publishing-title" eyebrow="發布中心" title="發布中心尚未啟用" description="此區展示未來發布頁的空殼與準備度檢查，不會發布、不會重新驗證，也不會觸發部署。" />
      <Card>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              即將推出
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold text-gray-950">目前只提供發布前檢查與介面方向預覽</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">真實發布流程仍應保留在未來經過授權、審核與紀錄的正式功能中。這裡的按鈕只會顯示本地提示。</p>
          </div>
          <button type="button" className={`${primaryButton} w-full`} onClick={onPreview}>預覽發布流程</button>
        </div>
      </Card>
      <Card className="p-0">
        <PaneHeader title="發布前檢查清單" description="展示未來可以提供的準備度門檻。" />
        <div className="divide-y divide-gray-100">
          {publishingChecks.map((item) => (
            <div key={item.title} className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-gray-950">{item.title}</h3>
                <p className="mt-1 break-words text-sm text-gray-600">{item.description}</p>
              </div>
              <StatusBadge status={item.status} compact />
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function LegacyCollectionsSection() {
  return (
    <section className="space-y-6" aria-labelledby="legacy-collections-title">
      <SectionHeading id="legacy-collections-title" eyebrow="舊作品集路由" title="舊版作品集頁面已移除" description="`/admin/collections` 與 `/admin/collections/[id]` 是舊路由，應維持 404 找不到頁面，不要重新啟用為可操作頁面。" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <Card>
          <FileWarning className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">不要復活舊路由</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">新管理流程應集中在年份工作區，從年份進入地點、作品集與媒體指派。舊作品集路由只保留為移除狀態說明，避免出現兩套管理入口。</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-gray-950">建議導向</h3>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex gap-3"><span className="shrink-0 font-semibold text-blue-700">1.</span><span>先到「年份管理」確認年份狀態。</span></li>
            <li className="flex gap-3"><span className="shrink-0 font-semibold text-blue-700">2.</span><span>進入「年份工作區」管理地點與作品集。</span></li>
            <li className="flex gap-3"><span className="shrink-0 font-semibold text-blue-700">3.</span><span>在「上傳與媒體」處理素材與指派狀態。</span></li>
          </ol>
        </Card>
      </div>
      <Card className="p-0">
        <PaneHeader title="路由狀態預覽" description="以純文字呈現預期行為，不建立任何功能入口。" />
        <div className="p-5">
          <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100" aria-label="舊作品集路由狀態">
            <code>{`/admin/collections        → 404 找不到頁面
/admin/collections/[id]   → 404 找不到頁面
替代入口                 → /admin/years/[yearId] 的年份工作區
展示行為                 → 只說明，不復活功能`}</code>
          </pre>
        </div>
      </Card>
    </section>
  );
}

function StatesSection({
  libraryState,
  onSetLibraryState,
  onShowToast,
  onPreviewCleanup,
}: {
  libraryState: LibraryState;
  onSetLibraryState: (state: LibraryState) => void;
  onShowToast: (text: string, intent?: ToastIntent) => void;
  onPreviewCleanup: () => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="states-title">
      <SectionHeading id="states-title" eyebrow="本地狀態與對話框" title="安全互動模式" description="每個控制項都只展示前端回饋，沒有刪除、清理或發布副作用。" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CircleDashed className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">狀態切換器</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">目前媒體狀態：<span className="font-medium text-gray-900">{getLibraryStateLabel(libraryState)}</span></p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={secondaryButton} onClick={() => onSetLibraryState('loading')}>載入中</button>
            <button type="button" className={secondaryButton} onClick={() => onSetLibraryState('empty')}>空狀態</button>
            <button type="button" className={secondaryButton} onClick={() => onSetLibraryState('success')}>成功狀態</button>
          </div>
        </Card>
        <Card>
          <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">提示訊息預覽</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">使用本地即時輔助回饋與可關閉的視覺提示。</p>
          <button type="button" className={`mt-4 ${primaryButton}`} onClick={() => onShowToast('已顯示本地提示訊息，沒有保存任何資料。', 'success')}>顯示提示</button>
        </Card>
        <Card>
          <ShieldCheck className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">僅預覽對話框</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">清理、批次刪除與孤兒媒體流程都必須停在審查畫面。</p>
          <button type="button" className={`mt-4 ${secondaryButton}`} onClick={onPreviewCleanup}>開啟對話框</button>
        </Card>
      </div>
    </section>
  );
}

function LibraryContent({
  state,
  assets,
  locations,
  selectedAssetIds,
  onToggleAsset,
  onPreviewAsset,
  onSaveAsset,
}: {
  state: LibraryState;
  assets: DemoAsset[];
  locations: DemoLocation[];
  selectedAssetIds: Set<string>;
  onToggleAsset: (assetId: string) => void;
  onPreviewAsset: (asset: DemoAsset) => void;
  onSaveAsset: (asset: DemoAsset) => void;
}) {
  if (state === 'loading') {
    return (
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3">
            <div className="aspect-[4/3] rounded-xl bg-gray-100" />
            <div className="mt-3 h-4 w-2/3 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (state === 'empty') {
    return <EmptyState title="此篩選條件沒有媒體" description="正式後台可以保留目前脈絡、說明篩選條件，並提供安全的上傳入口。" />;
  }

  if (state === 'success') {
    return (
      <div className="p-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-800">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold">本地上傳佇列已完成</h3>
          <p className="mt-2 text-sm leading-6">這是模擬成功狀態，沒有選取、上傳、儲存或索引任何檔案。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        const selected = selectedAssetIds.has(asset.id);
        return (
          <AssetCard
            key={asset.id}
            asset={asset}
            locationName={locations.find((location) => location.id === asset.locationId)?.name ?? '未指派地點'}
            locations={locations}
            selected={selected}
            onToggleSelected={() => onToggleAsset(asset.id)}
            onPreview={() => onPreviewAsset(asset)}
            onSave={onSaveAsset}
          />
        );
      })}
    </div>
  );
}

function AssetCard({
  asset,
  locationName,
  locations,
  selected,
  onToggleSelected,
  onPreview,
  onSave,
}: {
  asset: DemoAsset;
  locationName: string;
  locations: DemoLocation[];
  selected: boolean;
  onToggleSelected: () => void;
  onPreview: () => void;
  onSave: (asset: DemoAsset) => void;
}) {
  const [alt, setAlt] = useState(asset.alt);
  const [description, setDescription] = useState(asset.description);
  const [locationId, setLocationId] = useState(asset.locationId);

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-200'}`}>
      <div className={`aspect-[4/3] bg-gradient-to-br ${asset.tone} p-3`}>
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/85 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">{asset.ratio}</span>
          <FileImage className="h-5 w-5 text-white drop-shadow" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-950">{asset.title}</h3>
            <p className="mt-1 truncate text-xs text-gray-500">{locationName}</p>
          </div>
          <StatusBadge status={asset.status} compact />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1" aria-label="可用影像版本">
            {(['T', 'M', 'L'] as const).map((variant) => (
              <span key={variant} className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${asset.variants.includes(variant) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>{variant}</span>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
            <input type="checkbox" checked={selected} onChange={onToggleSelected} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
            選取
          </label>
        </div>
        <button type="button" className={`w-full ${secondaryButton}`} onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          預覽詳情
        </button>
        <details className="rounded-xl border border-gray-200 bg-slate-50/70 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">編輯中繼資料</summary>
          <div className="mt-3 space-y-3">
            <TextField id={`asset-alt-${asset.id}`} label="替代文字" value={alt} onChange={setAlt} />
            <TextAreaField id={`asset-description-${asset.id}`} label="說明文字" value={description} onChange={setDescription} />
            <SelectField id={`asset-location-${asset.id}`} label="地點資料夾" value={locationId} onChange={setLocationId} options={locations.map((location) => ({ value: location.id, label: location.name }))} />
            <button type="button" className={primaryButton} onClick={() => onSave({ ...asset, alt, description, locationId })}>儲存中繼資料</button>
          </div>
        </details>
      </div>
    </article>
  );
}

function AssetPreviewDialog({ asset, onClose }: { asset: DemoAsset | null; onClose: () => void }) {
  return (
    <AccessibleDialog open={asset !== null} titleId="asset-preview-title" onClose={onClose} dataTestId="admin-demo-asset-dialog">
      {asset ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className={`aspect-[16/9] bg-gradient-to-br ${asset.tone} p-5`}>
            <div className="flex justify-end">
              <button data-autofocus type="button" onClick={onClose} className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm ${focusRing}`} aria-label="關閉媒體預覽">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="asset-preview-title" className="text-xl font-semibold text-gray-950">{asset.title}</h2>
                <p className="mt-1 text-sm text-gray-600">地點資料夾：{asset.locationId} · {asset.ratio}</p>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <InfoTerm label="媒體編號" value={asset.id} />
              <InfoTerm label="影像版本" value={asset.variants.join(', ')} />
              <InfoTerm label="行為" value="僅供預覽" />
            </dl>
          </div>
        </div>
      ) : null}
    </AccessibleDialog>
  );
}

function CleanupPreviewDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <AccessibleDialog open={open} titleId="cleanup-preview-title" onClose={onClose} dataTestId="admin-demo-cleanup-dialog">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="cleanup-preview-title" className="text-lg font-semibold text-gray-950">僅預覽的清理審查</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              這個對話框刻意不刪除、不解除關聯、不發布、不清理孤兒資料，也不呼叫任何端點；只展示確認文案與影響摘要版面。
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-gray-800">模擬影響摘要</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><ArrowUpDown className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />將審查 3 個候選媒體</li>
            <li className="flex gap-2"><ImageUp className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />不會開始任何上傳</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />此展示頁沒有任何可執行的破壞性操作</li>
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button data-autofocus type="button" className={secondaryButton} onClick={onClose}>取消</button>
          <button
            type="button"
            className={primaryButton}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            確認預覽
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}

function ToastPreview({ toast, onDismiss }: { toast: ToastRecord | null; onDismiss: () => void }) {
  if (!toast) return null;

  const tone = toast.intent === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div className="fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-sm" role="status" aria-live="polite">
      <div className={`rounded-xl border px-4 py-3 shadow-lg ${tone}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6">{toast.text}</p>
          <button type="button" onClick={onDismiss} className={`rounded-md px-2 py-1 text-xs ${focusRing}`}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, description }: { id: string; eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm ring-1 ring-gray-100/60 ${className}`}>{children}</div>;
}

function PaneHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-semibold text-gray-800">{title}</h3>
        <p className="break-words text-xs text-gray-500">{description}</p>
      </div>
      {action ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{action}</div> : null}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const accentClasses: Record<typeof accent, string> = {
    emerald: 'border-emerald-200/70 shadow-emerald-100/40',
    blue: 'border-blue-200/70 shadow-blue-100/40',
    amber: 'border-amber-200/70 shadow-amber-100/40',
    slate: 'border-gray-200/80 shadow-gray-100/50',
  };

  return (
    <div className={`rounded-2xl border bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60 ${accentClasses[accent]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status, compact = false }: { status: Status; compact?: boolean }) {
  const label: Record<Status, string> = {
    published: '已發布',
    draft: '草稿',
    review: '待審核',
  };
  const tone: Record<Status, string> = {
    published: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-gray-100 text-gray-600',
    review: 'bg-amber-100 text-amber-700',
  };

  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${tone[status]}`}>{label[status]}</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-slate-50 text-gray-500">
        <FolderOpen className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-slate-50 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function TextField({ id, label, value, onChange, type = 'text' }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: 'text' | 'date' }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`}
      />
    </div>
  );
}

function TextAreaField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className={`w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`}
      />
    </div>
  );
}

function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function getLibraryStateLabel(state: LibraryState) {
  const labels: Record<LibraryState, string> = {
    loaded: '已載入',
    loading: '載入中',
    empty: '空狀態',
    success: '成功狀態',
  };

  return labels[state];
}
