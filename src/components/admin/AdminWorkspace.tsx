'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePhotoCandidates } from './workspace/usePhotoCandidates';
import { useSyncedDraft } from './workspace/useSyncedDraft';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
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

import type {
  DemoYear,
  DemoLocation,
  DemoCollection,
  DemoAsset,
  DemoWorkspace,
} from './workspace/types';
import {
  loadWorkspace,
  loadCollectionPhotos,
  requestAdmin,
  saveCollection as persistCollection,
  savePhotos,
  persistOrder,
} from './workspace/api';
const UploadsPage = dynamic(() => import('@/app/admin/uploads/page'), {
  loading: () => <p role="status">正在載入媒體管理…</p>,
});
const DiagnosticsPage = dynamic(() => import('@/app/admin/diagnostics/page'), {
  loading: () => <p role="status">正在載入診斷工具…</p>,
});
import AccessibleDialog from '@/components/ui/AccessibleDialog';

const LiveContext = createContext(false);

type SectionId =
  | 'dashboard'
  | 'years'
  | 'workspace'
  | 'uploads'
  | 'diagnostics'
  | 'publishing'
  | 'legacyCollections'
  | 'states';
type Status = 'published' | 'draft' | 'review';
type ToastIntent = 'success' | 'info';
type LibraryState = 'loaded' | 'loading' | 'empty' | 'success';

type ToastRecord = {
  id: number;
  intent: ToastIntent;
  text: string;
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
    description: '媒體庫與上傳佇列',
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
  {
    id: 'year-2025',
    label: '2025',
    status: 'draft',
    locations: 4,
    collections: 11,
    assets: 148,
    updatedAt: '今天 14:32',
  },
  {
    id: 'year-2024',
    label: '2024',
    status: 'published',
    locations: 7,
    collections: 24,
    assets: 386,
    updatedAt: '昨天 18:05',
  },
  {
    id: 'year-2023',
    label: '2023',
    status: 'published',
    locations: 5,
    collections: 16,
    assets: 219,
    updatedAt: '5 月 8 日',
  },
];

const initialWorkspaces: Record<string, DemoWorkspace> = {
  'year-2025': {
    locations: [
      {
        id: 'okinawa-25',
        name: '沖繩海線',
        slug: 'okinawa-25',
        summary: '面向海風、港口與珊瑚色黃昏的年度草稿。',
        coverAssetId: 'asset-25-01',
        status: 'draft',
      },
      {
        id: 'tainan-25',
        name: '台南午後',
        slug: 'tainan-25',
        summary: '老屋光線、巷弄陰影與夏季植物。',
        coverAssetId: 'asset-25-03',
        status: 'review',
      },
    ],
    collections: [
      {
        id: 'collection-25-01',
        title: '海線藍圖',
        slug: 'okinawa-blueprint',
        summary: '港邊散步與海色層次。',
        locationId: 'okinawa-25',
        status: 'draft',
        capturedAt: '2025-03-18',
        coverAssetId: 'asset-25-01',
        assetIds: ['asset-25-01', 'asset-25-02'],
      },
      {
        id: 'collection-25-02',
        title: '午後窗影',
        slug: 'tainan-window-light',
        summary: '午後室內光與街邊植物。',
        locationId: 'tainan-25',
        status: 'review',
        capturedAt: '2025-04-02',
        coverAssetId: 'asset-25-03',
        assetIds: ['asset-25-03'],
      },
    ],
    assets: [
      {
        id: 'asset-25-01',
        title: '港口藍-025',
        locationId: 'okinawa-25',
        alt: '沖繩港口的藍色海面與白色船隻',
        description: '作為 2025 草稿年份的海線封面候選。',
        status: 'draft',
        ratio: '3:2',
        tone: 'from-cyan-200 via-sky-100 to-blue-300',
        variants: ['T', 'M'],
      },
      {
        id: 'asset-25-02',
        title: '珊瑚暮色-041',
        locationId: 'okinawa-25',
        alt: '粉橘暮色下的海岸線',
        description: '保留暖色調，用於黃昏段落。',
        status: 'draft',
        ratio: '4:5',
        tone: 'from-orange-100 via-rose-100 to-sky-200',
        variants: ['T'],
      },
      {
        id: 'asset-25-03',
        title: '窗邊植物-013',
        locationId: 'tainan-25',
        alt: '台南老屋窗邊的綠色植物',
        description: '可作為地點封面或作品集封面。',
        status: 'review',
        ratio: '1:1',
        tone: 'from-lime-100 via-stone-100 to-amber-200',
        variants: ['T', 'M', 'L'],
      },
    ],
  },
  'year-2024': {
    locations: [
      {
        id: 'kyoto-24',
        name: '京都北行',
        slug: 'kyoto-24',
        summary: '清晨神社、石徑與北側街區的慢速行走。',
        coverAssetId: 'asset-01',
        status: 'published',
      },
      {
        id: 'taipei-24',
        name: '台北藍調時刻',
        slug: 'taipei-24',
        summary: '河岸、夜市與傍晚轉入夜色的城市光。',
        coverAssetId: 'asset-02',
        status: 'review',
      },
      {
        id: 'seoul-24',
        name: '首爾雨記',
        slug: 'seoul-24',
        summary: '雨窗、橋霧與濕冷街道的觀察筆記。',
        coverAssetId: 'asset-04',
        status: 'draft',
      },
    ],
    collections: [
      {
        id: 'c-01',
        title: '晨間神社',
        slug: 'morning-shrines',
        summary: '石階、木門與清晨人流前的安靜。',
        locationId: 'kyoto-24',
        status: 'published',
        capturedAt: '2024-02-12',
        coverAssetId: 'asset-01',
        assetIds: ['asset-01', 'asset-05'],
      },
      {
        id: 'c-02',
        title: '燈巷漫步',
        slug: 'lantern-alleys',
        summary: '傍晚巷弄中的燈影與店面細節。',
        locationId: 'kyoto-24',
        status: 'review',
        capturedAt: '2024-02-14',
        coverAssetId: 'asset-05',
        assetIds: ['asset-05'],
      },
      {
        id: 'c-03',
        title: '河岸構圖',
        slug: 'riverside-frames',
        summary: '藍色時刻中的橋面與河面反光。',
        locationId: 'taipei-24',
        status: 'draft',
        capturedAt: '2024-05-08',
        coverAssetId: 'asset-02',
        assetIds: ['asset-02'],
      },
      {
        id: 'c-04',
        title: '靜夜市場',
        slug: 'quiet-night-market',
        summary: '人潮間隙中的攤位、光線與等待。',
        locationId: 'taipei-24',
        status: 'published',
        capturedAt: '2024-05-09',
        coverAssetId: 'asset-03',
        assetIds: ['asset-03'],
      },
      {
        id: 'c-05',
        title: '雨中路口',
        slug: 'rain-crossings',
        summary: '雨天玻璃與路口反射的冷色調。',
        locationId: 'seoul-24',
        status: 'draft',
        capturedAt: '2024-09-21',
        coverAssetId: 'asset-04',
        assetIds: ['asset-04', 'asset-06'],
      },
    ],
    assets: [
      {
        id: 'asset-01',
        title: '石徑-024',
        locationId: 'kyoto-24',
        alt: '京都神社旁被晨光照亮的石徑',
        description: '適合作為京都地點與晨間神社封面。',
        status: 'published',
        ratio: '3:2',
        tone: 'from-slate-300 via-stone-100 to-emerald-100',
        variants: ['T', 'M', 'L'],
      },
      {
        id: 'asset-02',
        title: '河光-118',
        locationId: 'taipei-24',
        alt: '台北河岸藍色時刻的水面反光',
        description: '河岸構圖系列的主要視覺。',
        status: 'review',
        ratio: '4:5',
        tone: 'from-sky-200 via-slate-100 to-blue-300',
        variants: ['T', 'M'],
      },
      {
        id: 'asset-03',
        title: '市場靜物-044',
        locationId: 'taipei-24',
        alt: '夜市攤位旁安靜擺放的物件',
        description: '保留為夜市段落的細節照。',
        status: 'draft',
        ratio: '1:1',
        tone: 'from-amber-100 via-orange-200 to-slate-200',
        variants: ['T'],
      },
      {
        id: 'asset-04',
        title: '雨窗-031',
        locationId: 'seoul-24',
        alt: '雨滴停在首爾窗面的冷色反光',
        description: '首爾雨記的封面候選。',
        status: 'draft',
        ratio: '16:9',
        tone: 'from-gray-300 via-cyan-100 to-slate-400',
        variants: ['T', 'M', 'L'],
      },
      {
        id: 'asset-05',
        title: '杉影-087',
        locationId: 'kyoto-24',
        alt: '杉木陰影落在京都街角牆面',
        description: '可補足京都北行的綠色調。',
        status: 'published',
        ratio: '2:3',
        tone: 'from-emerald-200 via-stone-200 to-zinc-300',
        variants: ['T', 'M'],
      },
      {
        id: 'asset-06',
        title: '橋霧-072',
        locationId: 'seoul-24',
        alt: '霧氣中的首爾橋面與遠方行人',
        description: '用於雨中路口的收尾照片。',
        status: 'review',
        ratio: '3:2',
        tone: 'from-indigo-100 via-slate-200 to-gray-400',
        variants: ['T'],
      },
    ],
  },
  'year-2023': {
    locations: [
      {
        id: 'paris-23',
        name: '巴黎灰階',
        slug: 'paris-23',
        summary: '石牆、街角與陰天光線的黑白練習。',
        coverAssetId: 'asset-23-01',
        status: 'published',
      },
      {
        id: 'hokkaido-23',
        name: '北海道雪線',
        slug: 'hokkaido-23',
        summary: '雪地、低雲與遠方樹線。',
        coverAssetId: 'asset-23-03',
        status: 'published',
      },
    ],
    collections: [
      {
        id: 'collection-23-01',
        title: '石牆午後',
        slug: 'stone-wall-afternoon',
        summary: '陰天街角與牆面紋理。',
        locationId: 'paris-23',
        status: 'published',
        capturedAt: '2023-06-11',
        coverAssetId: 'asset-23-01',
        assetIds: ['asset-23-01', 'asset-23-02'],
      },
      {
        id: 'collection-23-02',
        title: '雪線遠方',
        slug: 'snow-line-distance',
        summary: '白色地景中的樹線與低對比。',
        locationId: 'hokkaido-23',
        status: 'published',
        capturedAt: '2023-12-28',
        coverAssetId: 'asset-23-03',
        assetIds: ['asset-23-03'],
      },
    ],
    assets: [
      {
        id: 'asset-23-01',
        title: '灰牆-019',
        locationId: 'paris-23',
        alt: '巴黎街角灰色石牆與窗框',
        description: '石牆午後的主要封面。',
        status: 'published',
        ratio: '3:2',
        tone: 'from-zinc-300 via-stone-200 to-neutral-100',
        variants: ['T', 'M', 'L'],
      },
      {
        id: 'asset-23-02',
        title: '街口-056',
        locationId: 'paris-23',
        alt: '陰天街口的人行道與路牌',
        description: '補充城市尺度。',
        status: 'published',
        ratio: '4:5',
        tone: 'from-neutral-200 via-slate-100 to-zinc-300',
        variants: ['T', 'M'],
      },
      {
        id: 'asset-23-03',
        title: '雪線-104',
        locationId: 'hokkaido-23',
        alt: '北海道雪地遠方的樹線',
        description: '雪線遠方的封面圖片。',
        status: 'published',
        ratio: '16:9',
        tone: 'from-slate-100 via-sky-100 to-zinc-300',
        variants: ['T', 'M', 'L'],
      },
    ],
  },
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2';
const buttonBase = `inline-flex items-center justify-center rounded-md text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
const secondaryButton = `${buttonBase} min-w-0 whitespace-nowrap border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50`;
const primaryButton = `${buttonBase} min-w-0 whitespace-nowrap border border-blue-600 bg-blue-600 px-3 py-2 text-white hover:bg-blue-700`;

export default function AdminWorkspace({ live = false }: { live?: boolean }) {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [years, setYears] = useState<DemoYear[]>(live ? [] : initialYears);
  const [workspaces, setWorkspaces] = useState<Record<string, DemoWorkspace>>(
    live ? {} : initialWorkspaces
  );
  const [selectedYearId, setSelectedYearId] = useState(live ? '' : (initialYears[1]?.id ?? ''));
  const [selectedLocationId, setSelectedLocationId] = useState(
    live ? '' : (initialWorkspaces[initialYears[1]?.id ?? '']?.locations[0]?.id ?? '')
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    () => new Set(live ? [] : ['asset-02', 'asset-05'])
  );
  const [libraryState, setLibraryState] = useState<LibraryState>('loaded');
  const [previewAsset, setPreviewAsset] = useState<DemoAsset | null>(null);
  const [isCleanupPreviewOpen, setIsCleanupPreviewOpen] = useState(false);
  const [isAuxNavOpen, setIsAuxNavOpen] = useState(false);
  const [toast, setToast] = useState<ToastRecord | null>(null);
  const toastIdRef = useRef(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(live);
  const refreshVersion = useRef(0);
  const busyRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(!live);
  const viewRef = useRef({ activeSection, selectedYearId, selectedCollectionId, workspaces });
  viewRef.current = { activeSection, selectedYearId, selectedCollectionId, workspaces };
  const refresh = useCallback(async (reuseAssets = false, scope?: typeof viewRef.current) => {
    const version = ++refreshVersion.current;
    setLoading(true);
    setLoadError(null);
    try {
      const view = scope ?? viewRef.current;
      await loadWorkspace({
        summariesOnly: true,
        selectedCollectionId: view.selectedCollectionId,
        yearsOnly: view.activeSection !== 'workspace' || !view.selectedYearId,
        yearId: view.selectedYearId || undefined,
        assets: reuseAssets ? Object.values(view.workspaces)[0]?.assets : undefined,
        onYears: (nextYears) => {
          if (version !== refreshVersion.current) return;
          setYears(nextYears);
          setWorkspaces((previous) =>
            Object.fromEntries(
              Object.entries(previous).filter(([id]) => nextYears.some((year) => year.id === id))
            )
          );
          setSelectedYearId((id) =>
            nextYears.some((year) => year.id === id) ? id : (nextYears[0]?.id ?? '')
          );
          setReady(true);
        },
        onWorkspace: (id, workspace) => {
          if (version !== refreshVersion.current) return;
          setWorkspaces((previous) => ({ ...previous, [id]: workspace }));
        },
      });
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!live) return;
    let active = true;
    void refresh().catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : '載入失敗。');
    });
    return () => {
      active = false;
      refreshVersion.current += 1;
    };
  }, [live, refresh]);
  useEffect(() => {
    if (
      !live ||
      activeSection !== 'workspace' ||
      !selectedYearId ||
      viewRef.current.workspaces[selectedYearId]
    )
      return;
    void refresh(true).catch((error: Error) => setLoadError(error.message));
  }, [activeSection, selectedYearId, live, refresh]);

  const mutate = async (
    operation: () => Promise<unknown>,
    message = '已儲存，資料已重新載入。',
    reconcile: () => Promise<unknown> = () =>
      refresh(true, { activeSection, selectedYearId, selectedCollectionId, workspaces })
  ) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setLoadError(null);
    try {
      await operation();
      await reconcile();
      showToast(message, 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失敗。';
      // Some existing endpoints update rows individually. Reconcile partial writes before the next action.
      try {
        await reconcile();
      } catch {
        setReady(false);
      }
      setLoadError(`${message} 若操作包含多筆資料，部分變更可能已儲存，請確認最新列表。`);
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const previousSection = useRef(activeSection);
  useEffect(() => {
    const wasUploads = previousSection.current === 'uploads';
    previousSection.current = activeSection;
    if (!live || !wasUploads || activeSection === 'uploads') return;
    setWorkspaces({});
    refresh().catch((error: Error) => {
      setLoadError(error.message);
    });
  }, [activeSection, live, refresh]);

  const isAuxiliaryActive = auxiliarySectionIds.has(activeSection);
  const shouldShowAuxNav = isAuxNavOpen || isAuxiliaryActive;
  const selectedYear = years.find((year) => year.id === selectedYearId) ?? years[0];
  const currentWorkspace = workspaces[selectedYear?.id ?? ''] ?? {
    locations: [],
    collections: [],
    assets: [],
  };
  const selectedLocation =
    currentWorkspace.locations.find((location) => location.id === selectedLocationId) ?? null;
  const selectedCollections = currentWorkspace.collections.filter(
    (collection) => collection.locationId === (selectedLocation?.id ?? '')
  );
  const selectedCollection =
    currentWorkspace.collections.find((collection) => collection.id === selectedCollectionId) ??
    null;

  const [confirmation, setConfirmation] = useState<{
    title: string;
    detail: string;
    apply: () => void | Promise<unknown>;
  } | null>(null);
  const displayYears = years.map((year) => ({
    ...year,
    countsLoaded: !live || !!workspaces[year.id],
    locations: workspaces[year.id]?.locations.length ?? 0,
    collections: workspaces[year.id]?.collections.length ?? 0,
    assets: workspaces[year.id]?.assets.length ?? 0,
  }));

  const totals = useMemo(() => {
    return displayYears.reduce(
      (summary, year) => ({
        locations: summary.locations + year.locations,
        collections: summary.collections + year.collections,
        assets: live
          ? (Object.values(workspaces)[0]?.assets.length ?? 0)
          : summary.assets + year.assets,
        publishedYears: summary.publishedYears + (year.status === 'published' ? 1 : 0),
      }),
      { locations: 0, collections: 0, assets: 0, publishedYears: 0 }
    );
  }, [displayYears, live, workspaces]);

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

  const updateWorkspace = (
    yearId: string,
    updater: (workspace: DemoWorkspace) => DemoWorkspace
  ) => {
    setWorkspaces((current) => {
      const workspace = current[yearId];
      if (!workspace) return current;
      return { ...current, [yearId]: updater(workspace) };
    });
  };

  const updateLocation = (location: DemoLocation) => {
    if (live) {
      void mutate(() =>
        requestAdmin(`years/${encodeURIComponent(selectedYearId)}/locations`, 'PUT', {
          id: location.id,
          name: location.name,
          slug: location.slug,
          summary: location.summary || null,
          coverAssetId: location.coverAssetId,
        })
      );
      return;
    }
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      locations: workspace.locations.map((item) => (item.id === location.id ? location : item)),
    }));
    showToast('地點資料已更新在本地模擬狀態。', 'success');
  };

  const updateCollection = (collection: DemoCollection) => {
    if (live) {
      const previous = currentWorkspace.collections.find((item) => item.id === collection.id);
      if (previous)
        void mutate(() => persistCollection(previous, collection)).then((ok) => {
          if (ok) setSelectedLocationId(collection.locationId);
        });
      return;
    }
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      collections: workspace.collections.map((item) =>
        item.id === collection.id ? collection : item
      ),
    }));
    setSelectedLocationId(collection.locationId);
    showToast('作品集資料已更新在本地模擬狀態。', 'success');
  };

  const photoRequests = useRef(new Set<string>());
  const selectCollection = useCallback(
    async (id: string | null) => {
      setSelectedCollectionId(id);
      if (
        !live ||
        !id ||
        currentWorkspace.collections.find((item) => item.id === id)?.photosLoaded !== false
      )
        return;
      const yearId = selectedYearId;
      const requestKey = `${yearId}/${id}`;
      if (photoRequests.current.has(requestKey)) return;
      photoRequests.current.add(requestKey);
      const version = refreshVersion.current;
      setLoadError(null);
      try {
        const photos = await loadCollectionPhotos(id);
        if (version !== refreshVersion.current) return;
        setWorkspaces((previous) => {
          const workspace = previous[yearId];
          if (!workspace) return previous;
          return {
            ...previous,
            [yearId]: {
              ...workspace,
              assets: [
                ...new Map(
                  [...workspace.assets, ...photos].map((asset) => [asset.id, asset])
                ).values(),
              ],
              collections: workspace.collections.map((item) =>
                item.id === id
                  ? { ...item, photosLoaded: true, assetIds: photos.map((asset) => asset.id) }
                  : item
              ),
            },
          };
        });
      } catch (error) {
        if (version === refreshVersion.current)
          setLoadError(error instanceof Error ? error.message : '照片載入失敗。');
      } finally {
        photoRequests.current.delete(requestKey);
      }
    },
    [live, selectedYearId, currentWorkspace.collections]
  );
  useEffect(() => {
    if (activeSection === 'workspace' && selectedCollectionId)
      void selectCollection(selectedCollectionId);
  }, [activeSection, selectedCollectionId, selectCollection]);

  const updateCollectionAssetIds = (collectionId: string, assetIds: string[]) => {
    if (live) {
      const collection = currentWorkspace.collections.find((item) => item.id === collectionId);
      if (collection) {
        const yearId = selectedYearId;
        void mutate(
          () => savePhotos(collection, assetIds),
          '作品集照片已儲存。',
          async () => {
            const savedPhotos = await loadCollectionPhotos(collectionId);
            const savedIds = savedPhotos.map((asset) => asset.id);
            setWorkspaces((previous) => {
              const workspace = previous[yearId];
              if (!workspace) return previous;
              return {
                ...previous,
                [yearId]: {
                  ...workspace,
                  assets: [
                    ...new Map(
                      [...workspace.assets, ...savedPhotos].map((asset) => [asset.id, asset])
                    ).values(),
                  ],
                  collections: workspace.collections.map((item) =>
                    item.id === collectionId ? { ...item, assetIds: savedIds } : item
                  ),
                },
              };
            });
          }
        );
      }
      return;
    }
    updateWorkspace(selectedYearId, (workspace) => ({
      ...workspace,
      collections: workspace.collections.map((item) =>
        item.id === collectionId ? { ...item, assetIds } : item
      ),
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
    if (live) {
      void mutate(() =>
        persistOrder(
          'years',
          reorder(years, yearId, direction).map((year) => year.id)
        )
      );
      return;
    }
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
    if (live) {
      void mutate(() =>
        requestAdmin(`years/${encodeURIComponent(yearId)}`, 'PUT', {
          status:
            years.find((year) => year.id === yearId)?.status === 'published'
              ? 'draft'
              : 'published',
        })
      );
      return;
    }
    setYears((current) =>
      current.map((year) =>
        year.id === yearId
          ? {
              ...year,
              status: year.status === 'published' ? 'draft' : 'published',
              updatedAt: '剛剛',
            }
          : year
      )
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

  const reorder = <T extends { id: string }>(items: T[], id: string, direction: number): T[] => {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };
  const requestDelete = (title: string, detail: string, apply: () => void | Promise<unknown>) =>
    setConfirmation({ title, detail, apply });
  const createRecord = async (kind: string, name: string, slug = '') => {
    if (live) {
      if (kind !== 'year' && !selectedYear) return '請先新增年份。';
      if (kind !== 'year' && !slug.trim()) return '請輸入網址 Slug。';
      const path =
        kind === 'year'
          ? 'years'
          : `years/${encodeURIComponent(selectedYearId)}/${kind === 'location' ? 'locations' : 'collections'}`;
      let createdId = '';
      const ok = await mutate(async () => {
        const created = await requestAdmin(
          path,
          'POST',
          kind === 'year'
            ? {
                label: name,
                status: 'draft',
                order_index: String(years.length + 1).padStart(4, '0'),
              }
            : kind === 'location'
              ? { name, slug }
              : {
                  title: name,
                  slug,
                  status: 'draft',
                  ...(selectedLocation ? { location_id: selectedLocation.id } : {}),
                }
        );
        if (
          !created ||
          typeof created !== 'object' ||
          !('id' in created) ||
          typeof created.id !== 'string' ||
          !created.id
        )
          throw new Error('新增回應缺少 ID，請重新載入確認結果。');
        createdId = created.id;
      }, '已新增草稿。');
      if (!ok) return '新增未完成，請查看上方錯誤訊息。';
      if (kind === 'year') {
        setSelectedYearId(createdId);
        setSelectedLocationId('');
        setSelectedCollectionId(null);
      }
      if (kind === 'location') handleSelectLocation(createdId);
      if (kind === 'collection') setSelectedCollectionId(createdId);
      return null;
    }
    const id = `demo-${crypto.randomUUID()}`;
    if (kind === 'year') {
      if (years.some((year) => year.label === name)) return '年份名稱已存在。';
      setYears((items) => [
        ...items,
        {
          id,
          label: name,
          status: 'draft',
          locations: 0,
          collections: 0,
          assets: 0,
          updatedAt: '剛剛',
        },
      ]);
      setWorkspaces((items) => ({
        ...items,
        [id]: { locations: [], collections: [], assets: [] },
      }));
      setSelectedYearId(id);
      setSelectedLocationId('');
      setSelectedCollectionId(null);
      setSelectedAssetIds(new Set());
    } else {
      if (!selectedYear) return '請先新增年份。';
      updateWorkspace(selectedYear.id, (workspace) =>
        kind === 'location'
          ? {
              ...workspace,
              locations: [
                ...workspace.locations,
                { id, name, slug: id, summary: '', coverAssetId: null, status: 'draft' },
              ],
            }
          : {
              ...workspace,
              collections: [
                ...workspace.collections,
                {
                  id,
                  title: name,
                  slug: id,
                  summary: '',
                  locationId: selectedLocation?.id ?? '',
                  status: 'draft',
                  capturedAt: '',
                  coverAssetId: null,
                  assetIds: [],
                },
              ],
            }
      );
      if (kind === 'location') {
        setSelectedLocationId(id);
        setSelectedCollectionId(null);
      } else setSelectedCollectionId(id);
    }
    showToast('已新增本地草稿，可在工作區繼續編輯。', 'success');
    return null;
  };
  const deleteAssets = (ids: Set<string>) => {
    updateWorkspace(selectedYearId, (workspace) => ({
      assets: workspace.assets.filter((asset) => !ids.has(asset.id)),
      locations: workspace.locations.map((location) => ({
        ...location,
        coverAssetId: ids.has(location.coverAssetId ?? '') ? null : location.coverAssetId,
      })),
      collections: workspace.collections.map((collection) => ({
        ...collection,
        assetIds: collection.assetIds.filter((id) => !ids.has(id)),
        coverAssetId: ids.has(collection.coverAssetId ?? '') ? null : collection.coverAssetId,
      })),
    }));
    setSelectedAssetIds(new Set());
    setPreviewAsset(null);
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
    <LiveContext.Provider value={live}>
      <div className="min-h-screen bg-slate-50/80 text-gray-900" data-testid="admin-demo-page">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:px-8">
          <aside className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] lg:w-80 lg:flex-none">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-sm ring-1 ring-gray-100/60">
              {live && (
                <Link
                  href="/admin/seo"
                  className="block border-b border-gray-100 px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  搜尋與分享設定 ↗
                </Link>
              )}
              <div className="border-b border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                    <PanelLeft className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                      {live ? '管理後台' : '展示路由'}
                    </p>
                    <h1 className="text-lg font-semibold text-gray-950">
                      {live ? '內容管理工作區' : '後台介面展示'}
                    </h1>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {live
                    ? '已連接真實資料。儲存、排序與刪除會更新網站內容。'
                    : '這是一個獨立的模擬後台介面，用來預覽新的管理方向。此頁沒有串接 API、驗證或 Prisma；新增、刪除與排序都只影響模擬資料。'}
                </p>
              </div>

              <nav className="p-2" aria-label="後台展示區段">
                <div className="space-y-1">
                  {coreSections.map((section) => (
                    <SidebarNavButton
                      key={section.id}
                      section={section}
                      activeSection={activeSection}
                      onSelect={(section) => {
                        if (!busy) setActiveSection(section);
                      }}
                    />
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
                    <ChevronRight
                      className={`h-4 w-4 text-gray-400 transition ${shouldShowAuxNav ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  {shouldShowAuxNav ? (
                    <div id="admin-demo-aux-nav" className="mt-1 space-y-1">
                      {auxiliarySections
                        .filter((section) => !live || section.id === 'diagnostics')
                        .map((section) => (
                          <SidebarNavButton
                            key={section.id}
                            section={section}
                            activeSection={activeSection}
                            onSelect={(section) => {
                              if (!busy) setActiveSection(section);
                            }}
                          />
                        ))}
                    </div>
                  ) : null}
                </div>
              </nav>

              <div className="border-t border-gray-100 p-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs leading-5 text-amber-800">
                  {live
                    ? '使用現有管理 API 與登入權限；刪除前請確認影響範圍。'
                    : '所有修改僅作用於本地模擬資料；刪除需確認，重新整理即可重設，不會呼叫任何端點。'}
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 space-y-6">
            {live && (
              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <p className="text-sm font-semibold">真實資料工作區</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    className={secondaryButton}
                    disabled={busy || loading}
                    onClick={() => {
                      refresh().catch((error: Error) => setLoadError(error.message));
                    }}
                  >
                    重新載入資料
                  </button>
                  <Link className={secondaryButton} href="/admin">
                    返回原版後台
                  </Link>
                </div>
                {(busy || loading) && (
                  <p role="status" className="mt-2 text-sm">
                    正在讀取或儲存資料…
                  </p>
                )}
                {loadError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {loadError}
                  </p>
                )}
              </div>
            )}
            <fieldset
              disabled={
                live &&
                (busy || ((activeSection === 'years' || activeSection === 'workspace') && !ready))
              }
              className="min-w-0 space-y-6 border-0 p-0"
              aria-busy={busy}
            >
              {(activeSection === 'years' || activeSection === 'workspace') && (
                <Card>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DemoCreateForm
                      label="新增年份"
                      onCreate={(name) => createRecord('year', name)}
                    />
                    {activeSection === 'workspace' &&
                      (!live || !!workspaces[selectedYear?.id ?? '']) && (
                        <>
                          <DemoCreateForm
                            label="新增地點"
                            slugHint={
                              live
                                ? `例如 kyoto-${selectedYear?.label.slice(-2) || '26'}`
                                : undefined
                            }
                            onCreate={(name, slug) => createRecord('location', name, slug)}
                          />
                          <DemoCreateForm
                            label="新增作品集"
                            slugHint={live ? '例如 morning-walk' : undefined}
                            onCreate={(name, slug) => createRecord('collection', name, slug)}
                          />
                        </>
                      )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {live
                      ? '新增後會儲存為草稿，可繼續編輯名稱、封面與發布狀態。'
                      : '本地草稿 · 重新整理即重設 · 新增後可在年份工作區編輯'}
                  </p>
                </Card>
              )}
              {activeSection === 'years' && (
                <Card>
                  <p className="mb-3 text-sm font-semibold">刪除年份</p>
                  <div className="flex flex-wrap gap-2">
                    {displayYears.map((year) => (
                      <button
                        key={year.id}
                        className={secondaryButton}
                        onClick={() =>
                          requestDelete(
                            `刪除 ${year.label}`,
                            live
                              ? '刪除此年份。若仍有作品集，伺服器將拒絕刪除；請先整理內容。'
                              : `將移除這個模擬年份及 ${year.locations} 個地點、${year.collections} 個作品集、${year.assets} 個模擬媒體。`,
                            () => {
                              if (live)
                                return mutate(() =>
                                  requestAdmin(`years/${encodeURIComponent(year.id)}`, 'DELETE')
                                );
                              setYears((items) => items.filter((item) => item.id !== year.id));
                              setWorkspaces((items) => {
                                const next = { ...items };
                                delete next[year.id];
                                return next;
                              });
                              if (selectedYearId === year.id) {
                                const next = years.find((item) => item.id !== year.id);
                                setSelectedYearId(next?.id ?? '');
                                setSelectedLocationId('');
                                setSelectedCollectionId(null);
                                setSelectedAssetIds(new Set());
                              }
                            }
                          )
                        }
                      >
                        刪除 {year.label}
                      </button>
                    ))}
                  </div>
                </Card>
              )}
              {activeSection === 'workspace' && (
                <Card>
                  <p className="mb-3 text-sm font-medium text-gray-700">
                    {selectedYear?.label ?? '尚無年份'} ／{' '}
                    {selectedLocation?.name ?? '未指派作品集'}
                    {selectedCollection ? ` ／ ${selectedCollection.title}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button className={secondaryButton} onClick={() => handleSelectLocation('')}>
                      未指派作品集（
                      {currentWorkspace.collections.filter((item) => !item.locationId).length}）
                    </button>
                    {selectedLocation && (
                      <>
                        <button
                          className={secondaryButton}
                          onClick={() =>
                            requestDelete(
                              `刪除地點「${selectedLocation.name}」`,
                              live
                                ? '刪除此地點。有作品集時必須先解除指派，否則伺服器會拒絕刪除。'
                                : '保留作品集與媒體，將其移到未指派。',
                              () => {
                                if (live)
                                  return mutate(() =>
                                    requestAdmin(
                                      `years/${encodeURIComponent(selectedYearId)}/locations`,
                                      'DELETE',
                                      { id: selectedLocation.id }
                                    )
                                  );
                                updateWorkspace(selectedYearId, (workspace) => ({
                                  ...workspace,
                                  locations: workspace.locations.filter(
                                    (item) => item.id !== selectedLocation.id
                                  ),
                                  collections: workspace.collections.map((item) =>
                                    item.locationId === selectedLocation.id
                                      ? { ...item, locationId: '' }
                                      : item
                                  ),
                                  assets: workspace.assets.map((item) =>
                                    item.locationId === selectedLocation.id
                                      ? { ...item, locationId: '' }
                                      : item
                                  ),
                                }));
                                handleSelectLocation('');
                              }
                            )
                          }
                        >
                          刪除地點
                        </button>
                      </>
                    )}
                    {selectedCollection && (
                      <>
                        <button
                          className={secondaryButton}
                          onClick={() =>
                            requestDelete(
                              `刪除作品集「${selectedCollection.title}」`,
                              live
                                ? '刪除作品集及其照片關聯，媒體庫原始照片仍會保留。'
                                : '只移除模擬作品集，保留媒體庫照片。',
                              () => {
                                if (live)
                                  return mutate(() =>
                                    requestAdmin(
                                      `collections/${encodeURIComponent(selectedCollection.id)}`,
                                      'DELETE'
                                    )
                                  );
                                updateWorkspace(selectedYearId, (workspace) => ({
                                  ...workspace,
                                  collections: workspace.collections.filter(
                                    (item) => item.id !== selectedCollection.id
                                  ),
                                }));
                                setSelectedCollectionId(null);
                              }
                            )
                          }
                        >
                          刪除作品集
                        </button>
                      </>
                    )}
                  </div>
                </Card>
              )}
              {!live && activeSection === 'uploads' && (
                <DemoBatchPanel
                  workspace={currentWorkspace}
                  selectedIds={selectedAssetIds}
                  onSelectAll={() =>
                    setSelectedAssetIds(new Set(currentWorkspace.assets.map((asset) => asset.id)))
                  }
                  onClear={() => setSelectedAssetIds(new Set())}
                  onAction={(action, target) => {
                    const ids = new Set(selectedAssetIds);
                    if (action === 'delete') {
                      requestDelete(
                        '批次刪除媒體',
                        `將移除 ${ids.size} 個模擬媒體，同時清除作品集照片關聯與封面引用。`,
                        () => deleteAssets(ids)
                      );
                      return;
                    }
                    updateWorkspace(selectedYearId, (workspace) =>
                      action === 'collection'
                        ? {
                            ...workspace,
                            collections: workspace.collections.map((item) =>
                              item.id === target
                                ? { ...item, assetIds: [...new Set([...item.assetIds, ...ids])] }
                                : item
                            ),
                          }
                        : {
                            ...workspace,
                            assets: workspace.assets.map((item) =>
                              ids.has(item.id)
                                ? action === 'variants'
                                  ? { ...item, variants: ['T', 'M', 'L'] }
                                  : { ...item, locationId: target }
                                : item
                            ),
                          }
                    );
                    showToast(`已更新 ${ids.size} 個本地媒體。`, 'success');
                  }}
                />
              )}
              {activeSection === 'dashboard' &&
                (live ? (
                  <Card>
                    <h2 className="mb-4 text-lg font-semibold">內容總覽（已載入資料）</h2>
                    {loading && (
                      <p className="mb-3 text-sm text-gray-600">
                        年份已優先顯示；統計會隨各年份資料載入更新。
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatCard label="已發布年份" value={totals.publishedYears} accent="emerald" />
                      <StatCard label="地點" value={totals.locations} accent="blue" />
                      <StatCard label="作品集" value={totals.collections} accent="slate" />
                      <StatCard label="媒體庫照片" value={totals.assets} accent="amber" />
                    </div>
                  </Card>
                ) : (
                  <DashboardSection totals={totals} />
                ))}
              {activeSection === 'years' && (
                <YearsSection
                  years={displayYears}
                  onMoveYear={moveYear}
                  onToggleStatus={toggleYearStatus}
                  onRenameYear={(id, label) => {
                    if (live) {
                      void mutate(() =>
                        requestAdmin(`years/${encodeURIComponent(id)}`, 'PUT', { label })
                      );
                      return;
                    }
                    setYears((items) =>
                      items.map((year) => (year.id === id ? { ...year, label } : year))
                    );
                  }}
                />
              )}
              {activeSection === 'workspace' && (
                <WorkspaceSection
                  key={`${selectedYearId}/${selectedLocationId}`}
                  years={displayYears}
                  workspace={currentWorkspace}
                  selectedYearId={selectedYear?.id ?? ''}
                  selectedLocationId={selectedLocation?.id ?? ''}
                  selectedLocation={selectedLocation}
                  selectedCollections={selectedCollections}
                  selectedCollection={selectedCollection}
                  onSelectYear={handleSelectYear}
                  onSelectLocation={handleSelectLocation}
                  onSelectCollection={selectCollection}
                  onPreviewAsset={setPreviewAsset}
                  onMoveLocation={(id, direction) => {
                    if (live) {
                      void mutate(() =>
                        requestAdmin(`locations/${encodeURIComponent(id)}/reorder`, 'POST', {
                          yearId: selectedYearId,
                          orderedIds: reorder(currentWorkspace.locations, id, direction).map(
                            (item) => item.id
                          ),
                        })
                      );
                      return;
                    }
                    updateWorkspace(selectedYearId, (workspace) => ({
                      ...workspace,
                      locations: reorder(workspace.locations, id, direction),
                    }));
                  }}
                  onSaveCollectionOrder={(ids) => {
                    if (live) {
                      void mutate(() => persistOrder('collections', ids));
                      return;
                    }
                    updateWorkspace(selectedYearId, (workspace) => {
                      const byId = new Map(workspace.collections.map((item) => [item.id, item]));
                      let index = 0;
                      return {
                        ...workspace,
                        collections: workspace.collections.map((item) =>
                          ids.includes(item.id) ? byId.get(ids[index++])! : item
                        ),
                      };
                    });
                  }}
                  onSaveLocation={updateLocation}
                  onSaveCollection={updateCollection}
                  onUpdateCollectionAssetIds={updateCollectionAssetIds}
                />
              )}
              {live && activeSection === 'uploads' && <UploadsPage />}
              {!live && activeSection === 'uploads' && (
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
              {activeSection === 'diagnostics' &&
                (live ? <DiagnosticsPage /> : <DiagnosticsSection />)}
              {activeSection === 'publishing' && (
                <PublishingSection
                  onPreview={() => showToast('發布中心尚未啟用，這裡只顯示預覽。', 'info')}
                />
              )}
              {activeSection === 'legacyCollections' && <LegacyCollectionsSection />}
              {activeSection === 'states' && (
                <StatesSection
                  libraryState={libraryState}
                  onSetLibraryState={setLibraryState}
                  onShowToast={showToast}
                  onPreviewCleanup={() => setIsCleanupPreviewOpen(true)}
                />
              )}
            </fieldset>
          </main>
        </div>

        <AccessibleDialog
          open={confirmation !== null}
          titleId="demo-delete-title"
          onClose={() => setConfirmation(null)}
        >
          <div className="rounded-2xl bg-white p-6">
            <h2 id="demo-delete-title" className="text-lg font-semibold">
              {confirmation?.title}
            </h2>
            <p className="my-4 text-sm text-gray-600">{confirmation?.detail}</p>
            {live && loadError && (
              <p role="alert" className="mb-4 text-sm text-red-700">
                {loadError}
              </p>
            )}
            <p className="mb-5 text-xs text-gray-500">
              {live
                ? '這項操作會刪除真實資料，重新整理不會復原。'
                : '僅修改 demo；不影響真實資料，重新整理即可重設。'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                data-autofocus
                className={secondaryButton}
                onClick={() => setConfirmation(null)}
              >
                取消
              </button>
              <button
                className={primaryButton}
                disabled={busy}
                onClick={async () => {
                  if (!live) {
                    confirmation?.apply();
                    setConfirmation(null);
                    showToast('已刪除本地模擬資料。', 'success');
                    return;
                  }
                  const result = await confirmation?.apply();
                  if (result === false) return;
                  setConfirmation(null);
                  if (!live) showToast('已刪除本地模擬資料。', 'success');
                }}
              >
                確認刪除
              </button>
            </div>
          </div>
        </AccessibleDialog>

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {toast?.text ?? ''}
        </div>
        <ToastPreview toast={toast} onDismiss={() => setToast(null)} />

        <AssetPreviewDialog asset={previewAsset} onClose={() => setPreviewAsset(null)} />
        <CleanupPreviewDialog
          open={isCleanupPreviewOpen}
          onClose={() => setIsCleanupPreviewOpen(false)}
          onConfirm={() => showToast('已確認預覽，沒有執行任何清理。', 'success')}
        />
      </div>
    </LiveContext.Provider>
  );
}

function SidebarNavButton({
  section,
  activeSection,
  onSelect,
}: {
  section: SectionConfig;
  activeSection: SectionId;
  onSelect: (sectionId: SectionId) => void;
}) {
  const isActive = activeSection === section.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${focusRing} ${
        isActive
          ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-100'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`mt-0.5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>
        {section.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{section.label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">{section.description}</span>
      </span>
      <ChevronRight
        className={`mt-1 h-4 w-4 ${isActive ? 'text-blue-500' : 'text-gray-300'}`}
        aria-hidden="true"
      />
    </button>
  );
}

function DashboardSection({
  totals,
}: {
  totals: { locations: number; collections: number; assets: number; publishedYears: number };
}) {
  return (
    <section className="space-y-6" aria-labelledby="dashboard-title">
      <SectionHeading
        id="dashboard-title"
        eyebrow="控制台"
        title="營運總覽"
        description="集中呈現內容準備度、發布狀態與媒體健康度的高階訊號。"
      />
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
            {['2025 草稿年份已整理', '12 個媒體需要指派地點', '3 個孤兒媒體候選項標示為僅預覽'].map(
              (item, index) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-xl border border-gray-100 bg-slate-50/70 p-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-700 ring-1 ring-gray-200">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-gray-700">{item}</p>
                </div>
              )
            )}
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
  onRenameYear,
}: {
  years: DemoYear[];
  onMoveYear: (yearId: string, direction: -1 | 1) => void;
  onToggleStatus: (yearId: string) => void;
  onRenameYear: (id: string, label: string) => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="years-title">
      <SectionHeading
        id="years-title"
        eyebrow="年份管理"
        title="年份與發布狀態"
        description="調整年份順序與發布狀態。"
      />
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">年份列表</h3>
            <p className="text-xs text-gray-500">使用上下移調整顯示順序。</p>
          </div>
        </div>
        <ul className="divide-y divide-gray-100">
          {years.map((year, index) => (
            <li
              key={year.id}
              className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold text-gray-950">{year.label}</h4>
                  <StatusBadge status={year.status} />
                </div>
                <dl className="mt-2 grid gap-2 text-xs text-gray-500 sm:grid-cols-4">
                  <div>
                    <dt className="sr-only">排序</dt>
                    <dd>排序 {String(index + 1).padStart(2, '0')}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">地點</dt>
                    <dd>
                      {year.countsLoaded === false ? '地點待載入' : `${year.locations} 個地點`}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">作品集</dt>
                    <dd>
                      {year.countsLoaded === false
                        ? '作品集待載入'
                        : `${year.collections} 個作品集`}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">更新時間</dt>
                    <dd>更新於 {year.updatedAt}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <YearNameForm year={year} onSave={onRenameYear} />
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => onMoveYear(year.id, -1)}
                  disabled={index === 0}
                >
                  上移
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => onMoveYear(year.id, 1)}
                  disabled={index === years.length - 1}
                >
                  下移
                </button>
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => onToggleStatus(year.id)}
                >
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
  onPreviewAsset,
  onMoveLocation,
  onSaveCollectionOrder,
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
  onPreviewAsset: (asset: DemoAsset) => void;
  onMoveLocation: (id: string, direction: number) => void;
  onSaveCollectionOrder: (ids: string[]) => void;
  onSaveLocation: (location: DemoLocation) => void;
  onSaveCollection: (collection: DemoCollection) => void;
  onUpdateCollectionAssetIds: (collectionId: string, assetIds: string[]) => void;
}) {
  const live = useContext(LiveContext);
  const collectionOrder = useSyncedDraft({
    order: JSON.stringify(selectedCollections.map((item) => item.id)),
  });
  const orderedIds: string[] = JSON.parse(collectionOrder.values.order);
  const byId = new Map(selectedCollections.map((item) => [item.id, item]));
  const orderedCollections = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is DemoCollection => !!item);
  const orderChanged =
    collectionOrder.values.order !== JSON.stringify(selectedCollections.map((item) => item.id));
  return (
    <section className="space-y-6" aria-labelledby="workspace-title">
      <SectionHeading
        id="workspace-title"
        eyebrow="年份工作區"
        title="不擠壓內容的分欄工作區"
        description="先選年份，再管理地點與作品集指派；版面只在超寬螢幕才拆成多欄，避免文字與狀態標籤重疊。"
      />
      {live && years.find((year) => year.id === selectedYearId)?.countsLoaded === false && (
        <p role="status" className="text-sm text-gray-600">
          此年份的地點與作品集尚未載入；可先切換其他年份，或查看上方讀取狀態。
        </p>
      )}
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

        <div className="grid min-w-0 gap-6">
          <Card className="min-w-0 p-0">
            <PaneHeader
              title="地點"
              description="切換年份後，這裡會換成該年份自己的地點與作品集。"
            />
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3 p-5">
              {workspace.locations.map((location) => {
                const collectionCount = workspace.collections.filter(
                  (collection) => collection.locationId === location.id
                ).length;
                return (
                  <article
                    key={location.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectLocation(location.id)}
                      className={`w-full min-w-0 p-4 text-left transition ${focusRing} ${selectedLocationId === location.id ? 'border-blue-200 bg-blue-50/80 ring-1 ring-blue-100' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <FolderOpen className="h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                        {!live && <StatusBadge status={location.status} compact />}
                      </div>
                      <h3 className="mt-3 min-w-0 break-words text-sm font-semibold text-gray-950">
                        {location.name}
                      </h3>
                      <p className="mt-1 min-w-0 break-all text-xs text-gray-500">
                        {location.slug}
                      </p>
                      <p className="mt-3 min-w-0 break-words text-xs font-medium text-gray-600">
                        已指派 {collectionCount} 個作品集
                      </p>
                    </button>
                    <DemoOrderControls
                      label={location.name}
                      items={workspace.locations}
                      id={location.id}
                      onMove={(direction) => onMoveLocation(location.id, direction)}
                    />
                  </article>
                );
              })}
            </div>

            {selectedLocation ? (
              <div className="border-t border-gray-100 p-5">
                <LocationEditPanel
                  key={selectedLocation.id}
                  location={selectedLocation}
                  assets={workspace.assets}
                  onSave={onSaveLocation}
                  onPreviewAsset={onPreviewAsset}
                />
              </div>
            ) : (
              <div className="border-t border-gray-100 p-5">
                <EmptyState
                  title="尚未選取地點"
                  description="請先選擇一個年份與地點，才能編輯地點資料。"
                />
              </div>
            )}
          </Card>

          <Card className="min-w-0 p-0">
            <PaneHeader
              title="作品集與編輯頁"
              description="依由左至右、由上至下的順序預覽；點選作品集名稱可編輯。"
            />
            <div className="space-y-2 border-b border-gray-100 p-4">
              <DraftConflict draft={collectionOrder} />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  disabled={!orderChanged || collectionOrder.hasConflict}
                  onClick={() => onSaveCollectionOrder(orderedIds)}
                >
                  儲存作品集排序
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={!orderChanged}
                  onClick={collectionOrder.useLatest}
                >
                  取消作品集排序
                </button>
              </div>
              <p role="status" className="text-xs text-gray-500">
                {orderChanged
                  ? '作品集排序尚未儲存，請在切換年份或地點前儲存。'
                  : '上下移會立即調整畫面，完成後再儲存排序。'}
              </p>
            </div>
            {selectedCollections.length === 0 ? (
              <EmptyState
                title="尚未指派作品集"
                description="可在上方新增作品集，或從其他地點解除指派。"
              />
            ) : (
              <div
                className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
                aria-label="作品集排序預覽"
              >
                {orderedCollections.map((collection, index) => {
                  const isActive = selectedCollection?.id === collection.id;
                  const cover = workspace.assets.find(
                    (asset) => asset.id === collection.coverAssetId
                  );
                  return (
                    <article
                      key={collection.id}
                      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white ${isActive ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
                    >
                      <div className="flex flex-1 flex-col">
                        {cover ? (
                          <button
                            type="button"
                            aria-label={`預覽 ${collection.title} 封面`}
                            onClick={() => onPreviewAsset(cover)}
                            className={`group relative m-3 block aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 text-left ${focusRing}`}
                          >
                            {cover.imageSrc ? (
                              <ProgressiveImage
                                assetId={cover.id}
                                alt={`${collection.title} 封面`}
                                width={cover.width}
                                height={cover.height}
                                className="h-full w-full"
                              />
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${cover.tone}`} />
                            )}
                            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-sm text-white">
                              預覽封面
                            </span>
                          </button>
                        ) : (
                          <div className="relative m-3 flex aspect-[3/4] items-center justify-center rounded-xl bg-slate-100 text-sm text-gray-500">
                            <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            未選封面
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectCollection(collection.id)}
                          className={`w-full min-w-0 p-4 text-left transition ${focusRing} ${isActive ? 'border-blue-200 bg-blue-50/80 ring-1 ring-blue-100' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                        >
                          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                            <h3 className="min-w-0 break-words text-sm font-semibold text-gray-950">
                              {collection.title}
                            </h3>
                            <StatusBadge status={collection.status} compact />
                          </div>
                          <p className="mt-1 break-all text-xs text-gray-500">{collection.slug}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            {collection.photosLoaded === false
                              ? collection.assetCount === undefined
                                ? '照片尚未載入'
                                : `已指派 ${collection.assetCount} 個媒體`
                              : `已指派 ${collection.assetIds.length} 個媒體`}
                          </p>
                        </button>
                      </div>
                      <DemoOrderControls
                        label={collection.title}
                        items={orderedCollections}
                        id={collection.id}
                        onMove={(direction) => {
                          const index = orderedIds.indexOf(collection.id);
                          const target = index + direction;
                          if (index < 0 || target < 0 || target >= orderedIds.length) return;
                          const next = [...orderedIds];
                          [next[index], next[target]] = [next[target], next[index]];
                          collectionOrder.setField('order', JSON.stringify(next));
                        }}
                      />
                    </article>
                  );
                })}
              </div>
            )}

            {selectedCollection ? (
              <div className="border-t border-gray-100 p-5">
                {selectedCollection.photosLoaded === false ? (
                  <div>
                    <p role="status">作品集照片尚未載入完成。</p>
                    <button
                      type="button"
                      className={secondaryButton}
                      onClick={() => onSelectCollection(selectedCollection.id)}
                    >
                      重試載入作品集
                    </button>
                  </div>
                ) : (
                  <CollectionDetailPanel
                    key={selectedCollection.id}
                    collection={selectedCollection}
                    locations={workspace.locations}
                    assets={workspace.assets}
                    onSave={onSaveCollection}
                    onPreviewAsset={onPreviewAsset}
                    onUpdateAssetIds={onUpdateCollectionAssetIds}
                  />
                )}
              </div>
            ) : selectedCollections.length > 0 ? (
              <div className="border-t border-gray-100 p-5">
                <EmptyState
                  title="尚未開啟作品集"
                  description="點選上方任一作品集，即可預覽編輯頁、封面圖片與管理照片區塊。"
                />
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}

function LocationEditPanel({
  location,
  assets,
  onSave,
  onPreviewAsset,
}: {
  location: DemoLocation;
  assets: DemoAsset[];
  onSave: (location: DemoLocation) => void;
  onPreviewAsset: (asset: DemoAsset) => void;
}) {
  const draft = useSyncedDraft({
    name: location.name,
    slug: location.slug,
    summary: location.summary,
    coverAssetId: location.coverAssetId,
  });
  const { name, slug, summary, coverAssetId } = draft.values;
  const setName = (value: string) => draft.setField('name', value);
  const setSlug = (value: string) => draft.setField('slug', value);
  const setSummary = (value: string) => draft.setField('summary', value);
  const setCoverAssetId = (value: string | null) => draft.setField('coverAssetId', value);

  return (
    <div className="min-w-0 space-y-4">
      <DraftConflict draft={draft} />
      <div>
        <h3 className="text-sm font-semibold text-gray-800">地點編輯</h3>
        <p className="text-xs text-gray-500">
          對應目前網站的地點表單：地點名稱、Slug、摘要與封面圖片。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id={`location-name-${location.id}`}
          label="地點名稱"
          value={name}
          onChange={setName}
        />
        <TextField
          id={`location-slug-${location.id}`}
          label="Slug"
          value={slug}
          onChange={setSlug}
        />
      </div>
      <TextAreaField
        id={`location-summary-${location.id}`}
        label="摘要"
        value={summary}
        onChange={setSummary}
      />
      <DemoCoverPicker
        label="地點封面"
        candidateLocationId={location.id}
        assets={assets.filter((asset) => asset.locationId === location.id)}
        selectedAsset={assets.find((asset) => asset.id === coverAssetId)}
        selectedAssetId={coverAssetId}
        onSelect={setCoverAssetId}
        onPreviewAsset={onPreviewAsset}
      />
      <button
        type="button"
        className={primaryButton}
        disabled={draft.hasConflict}
        onClick={() =>
          onSave({
            ...location,
            name: name.trim() || location.name,
            slug: slug.trim() || location.slug,
            summary,
            coverAssetId,
          })
        }
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
  onPreviewAsset,
}: {
  collection: DemoCollection;
  locations: DemoLocation[];
  assets: DemoAsset[];
  onSave: (collection: DemoCollection) => void;
  onUpdateAssetIds: (collectionId: string, assetIds: string[]) => void;
  onPreviewAsset: (asset: DemoAsset) => void;
}) {
  const live = useContext(LiveContext);
  const draft = useSyncedDraft({
    title: collection.title,
    slug: collection.slug,
    summary: collection.summary,
    status: collection.status,
    capturedAt: collection.capturedAt,
    locationId: collection.locationId,
    coverAssetId: collection.coverAssetId,
  });
  const { title, slug, summary, status, capturedAt, locationId, coverAssetId } = draft.values;
  const setTitle = (value: string) => draft.setField('title', value);
  const setSlug = (value: string) => draft.setField('slug', value);
  const setSummary = (value: string) => draft.setField('summary', value);
  const setStatus = (value: Status) => draft.setField('status', value);
  const setCapturedAt = (value: string) => draft.setField('capturedAt', value);
  const setLocationId = (value: string) => draft.setField('locationId', value);
  const setCoverAssetId = (value: string | null) => draft.setField('coverAssetId', value);

  const saveCollection = () => {
    if (draft.hasConflict) return;
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
      <DraftConflict draft={draft} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          作品集詳情
        </p>
        <h3 className="mt-2 break-words text-lg font-semibold text-gray-950">{collection.title}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {live ? '儲存後會更新真實作品集。' : '此區模擬作品集編輯頁，不會寫入真實資料。'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id={`collection-title-${collection.id}`}
          label="標題"
          value={title}
          onChange={setTitle}
        />
        <TextField
          id={`collection-slug-${collection.id}`}
          label="Slug"
          value={slug}
          onChange={setSlug}
        />
        <SelectField
          id={`collection-status-${collection.id}`}
          label="狀態"
          value={status}
          onChange={(value) => setStatus(value as Status)}
          options={[
            { value: 'draft', label: '草稿' },
            ...(!live ? [{ value: 'review', label: '待審核' }] : []),
            { value: 'published', label: '已發布' },
          ]}
        />
        <TextField
          id={`collection-captured-${collection.id}`}
          label="拍攝日期"
          value={capturedAt}
          onChange={setCapturedAt}
          type="date"
        />
        <SelectField
          id={`collection-location-${collection.id}`}
          label="指派地點"
          value={locationId}
          onChange={setLocationId}
          options={[
            { value: '', label: '未指派' },
            ...locations.map((location) => ({ value: location.id, label: location.name })),
          ]}
        />
      </div>
      <TextAreaField
        id={`collection-summary-${collection.id}`}
        label="摘要"
        value={summary}
        onChange={setSummary}
      />
      <DemoCoverPicker
        label="作品集封面"
        assets={assets.filter((asset) => collection.assetIds.includes(asset.id))}
        selectedAsset={assets.find((asset) => asset.id === coverAssetId)}
        selectedAssetId={coverAssetId}
        onSelect={setCoverAssetId}
        onPreviewAsset={onPreviewAsset}
      />
      {assets.find((asset) => asset.id === coverAssetId) && (
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            const cover = assets.find((asset) => asset.id === coverAssetId);
            if (cover) onPreviewAsset(cover);
          }}
        >
          預覽目前選擇的封面
        </button>
      )}
      <button
        type="button"
        className={primaryButton}
        disabled={draft.hasConflict}
        onClick={saveCollection}
      >
        儲存作品集
      </button>

      <ManagePhotosPanel
        onPreviewAsset={onPreviewAsset}
        collection={collection}
        assets={assets}
        onUpdateAssetIds={onUpdateAssetIds}
      />
    </div>
  );
}

function DemoCoverPicker({
  label,
  candidateLocationId,
  assets,
  selectedAsset,
  selectedAssetId,
  onSelect,
  onPreviewAsset,
}: {
  label: string;
  candidateLocationId?: string;
  assets: DemoAsset[];
  selectedAsset?: DemoAsset;
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
  onPreviewAsset: (asset: DemoAsset) => void;
}) {
  const [open, setOpen] = useState(false);
  const live = useContext(LiveContext);
  const lazy = live && candidateLocationId !== undefined;
  const candidates = usePhotoCandidates(open, lazy, candidateLocationId ?? '');
  const choices = lazy
    ? candidates.assets.filter((asset) => asset.locationId === candidateLocationId)
    : assets;
  const preview = selectedAsset ?? candidates.assets.find((asset) => asset.id === selectedAssetId);
  return (
    <section aria-label={label} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500">選好後仍需按儲存套用。</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={secondaryButton}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? '關閉選擇' : '選擇封面'}
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => onSelect(null)}
            disabled={!selectedAssetId}
          >
            清除選擇
          </button>
        </div>
      </div>
      {preview ? (
        <button
          type="button"
          className={`block w-40 rounded-xl border border-gray-200 p-2 text-left ${focusRing}`}
          aria-label={`預覽目前${label}`}
          onClick={() => onPreviewAsset(preview!)}
        >
          <DemoAssetThumbnail asset={preview!} />
          <span className="mt-2 block truncate text-xs">{preview!.title}</span>
        </button>
      ) : (
        <p className="text-xs text-gray-500">
          {selectedAssetId ? '目前封面暫時無法預覽' : '尚未選擇封面'}
        </p>
      )}
      {open && lazy && (
        <div>
          {candidates.loading && <p role="status">正在載入可選封面…</p>}
          {candidates.error && <p role="alert">{candidates.error}</p>}
          {(candidates.hasMore || candidates.error) && (
            <button
              type="button"
              disabled={candidates.loading}
              className={secondaryButton}
              onClick={() => void candidates.loadMore()}
            >
              {candidates.error ? '重試載入封面' : '載入更多封面'}
            </button>
          )}
        </div>
      )}
      {open &&
        (choices.length === 0 ? (
          <EmptyState
            title="沒有可選封面"
            description={
              candidates.loading ? '正在讀取候選照片。' : '請先將照片加入此作品集或地點。'
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
            {choices.map((asset) => (
              <button
                key={asset.id}
                type="button"
                aria-label={`選用 ${asset.title}`}
                aria-pressed={asset.id === selectedAssetId}
                onClick={() => {
                  onSelect(asset.id);
                  setOpen(false);
                }}
                className={`min-w-0 rounded-xl border p-2 text-left transition ${focusRing} ${asset.id === selectedAssetId ? 'border-blue-300 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-200'}`}
              >
                <DemoAssetThumbnail asset={asset} />
                <p className="mt-2 truncate text-xs font-medium text-gray-800">{asset.title}</p>
              </button>
            ))}
          </div>
        ))}
    </section>
  );
}

function ManagePhotosPanel({
  collection,
  assets,
  onUpdateAssetIds,
  onPreviewAsset,
}: {
  onPreviewAsset: (asset: DemoAsset) => void;
  collection: DemoCollection;
  assets: DemoAsset[];
  onUpdateAssetIds: (collectionId: string, assetIds: string[]) => void;
}) {
  const live = useContext(LiveContext);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const orderDraft = useSyncedDraft({ order: JSON.stringify(collection.assetIds) });
  const orderedIds: string[] = JSON.parse(orderDraft.values.order);
  const orderChanged = orderDraft.values.order !== JSON.stringify(collection.assetIds);
  const membershipChanged =
    orderedIds.length !== collection.assetIds.length ||
    orderedIds.some((id) => !collection.assetIds.includes(id));
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const moveTo = (assetId: string, targetId: string) => {
    if (assetId === targetId || !orderedIds.includes(assetId) || !orderedIds.includes(targetId))
      return;
    const next = [...orderedIds];
    next.splice(next.indexOf(assetId), 1);
    next.splice(orderedIds.indexOf(targetId), 0, assetId);
    orderDraft.setField('order', JSON.stringify(next));
  };
  const [availableOpen, setAvailableOpen] = useState(false);
  const candidates = usePhotoCandidates(availableOpen, live, collection.locationId);
  const [visibleAvailable, setVisibleAvailable] = useState(24);
  const assetsById = useMemo(
    () => new Map([...assets, ...candidates.assets].map((asset) => [asset.id, asset])),
    [assets, candidates.assets]
  );
  const assignedSet = new Set(orderedIds);
  const assignedAssets = orderedIds
    .map((assetId) => assetsById.get(assetId))
    .filter((asset): asset is DemoAsset => Boolean(asset));
  const availableAssets = availableOpen
    ? (live ? candidates.assets : assets).filter(
        (asset) =>
          !assignedSet.has(asset.id) &&
          (!live || !collection.locationId || asset.locationId === collection.locationId)
      )
    : [];

  const applyPhotos = (ids: string[]) => {
    orderDraft.setField('order', JSON.stringify(ids));
    onUpdateAssetIds(collection.id, ids);
  };
  const addAsset = (assetId: string) => applyPhotos([...orderedIds, assetId]);
  const removeAsset = (assetId: string) => applyPhotos(orderedIds.filter((id) => id !== assetId));
  const moveAsset = (assetId: string, direction: -1 | 1) => {
    const target = orderedIds.indexOf(assetId) + direction;
    if (target < 0 || target >= orderedIds.length) return;
    moveTo(assetId, orderedIds[target]);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-slate-50/70 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">管理照片</h4>
          <p className="text-xs text-gray-500">
            拖曳「拖拉排序」把手，或用上下移調整；完成後按「儲存排序」。移除只解除作品集關聯。
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-gray-200">
          已指派 {assignedAssets.length}
        </span>
      </div>
      <DraftConflict draft={orderDraft} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={primaryButton}
          disabled={!orderChanged || orderDraft.hasConflict}
          onClick={() => onUpdateAssetIds(collection.id, orderedIds)}
        >
          {membershipChanged ? '儲存照片變更' : '儲存排序'}
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={!orderChanged}
          onClick={orderDraft.useLatest}
        >
          {membershipChanged ? '取消照片變更' : '取消排序變更'}
        </button>
        <p role="status" className="text-xs text-gray-600">
          {orderChanged ? '照片變更尚未儲存；加入或移除會一併儲存目前排序。' : '排序已同步'}
        </p>
      </div>
      {availableOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className={secondaryButton}
            onClick={() => setPickedIds(new Set(availableAssets.map((asset) => asset.id)))}
          >
            全選可加入照片
          </button>
          <button className={secondaryButton} onClick={() => setPickedIds(new Set())}>
            清除照片選取
          </button>
          <button
            className={primaryButton}
            disabled={
              orderDraft.hasConflict || !availableAssets.some((asset) => pickedIds.has(asset.id))
            }
            onClick={() => {
              applyPhotos([
                ...orderedIds,
                ...availableAssets
                  .filter((asset) => pickedIds.has(asset.id))
                  .map((asset) => asset.id),
              ]);
              setPickedIds(new Set());
            }}
          >
            批次加入照片
          </button>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-700">已指派照片</p>
          <div className="mt-3 space-y-2">
            {assignedAssets.length === 0 ? (
              <p className="text-sm text-gray-500">尚未指派照片。</p>
            ) : (
              assignedAssets.map((asset, index) => (
                <div
                  key={asset.id}
                  data-testid={`assigned-photo-${asset.id}`}
                  onDragOver={(event) => {
                    if (!draggedId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetId(asset.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedId) moveTo(draggedId, asset.id);
                    setDraggedId(null);
                    setDropTargetId(null);
                  }}
                  className={`flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-2 ${dropTargetId === asset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100'} ${draggedId === asset.id ? 'opacity-50' : ''}`}
                >
                  <button
                    type="button"
                    className={`flex w-full min-w-0 items-center gap-3 rounded-lg text-left ${focusRing}`}
                    aria-label={`預覽照片 ${asset.title}`}
                    onClick={() => onPreviewAsset(asset)}
                  >
                    <span className="w-28 shrink-0 overflow-hidden rounded-lg sm:w-32">
                      <DemoAssetThumbnail asset={asset} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-gray-800">{asset.title}</span>
                      <span className="text-xs text-blue-700">點開預覽</span>
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      draggable
                      className={`cursor-grab rounded border border-gray-200 px-2 py-1 text-xs active:cursor-grabbing ${focusRing}`}
                      aria-label={`拖拉排序 ${asset.title}`}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', asset.id);
                        setDraggedId(asset.id);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDropTargetId(null);
                      }}
                    >
                      ⠿ 拖拉排序
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                      onClick={() => moveAsset(asset.id, -1)}
                      disabled={index === 0}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                      onClick={() => moveAsset(asset.id, 1)}
                      disabled={index === assignedAssets.length - 1}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700"
                      disabled={orderDraft.hasConflict}
                      onClick={() => removeAsset(asset.id)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-700">
              可加入照片{availableOpen ? `（${availableAssets.length}）` : ''}
            </p>
            <button
              type="button"
              className={secondaryButton}
              aria-expanded={availableOpen}
              onClick={() => setAvailableOpen((open) => !open)}
            >
              {availableOpen ? '收合可加入照片' : '展開可加入照片'}
            </button>
          </div>
          {!availableOpen && (
            <p className="mt-3 text-sm text-gray-500">
              需要加入照片時再展開，才會載入候選照片縮圖。
            </p>
          )}
          {availableOpen && live && (
            <div>
              {candidates.loading && <p role="status">正在載入可加入照片…</p>}
              {candidates.error && <p role="alert">{candidates.error}</p>}
              {(candidates.hasMore || candidates.error) && (
                <button
                  type="button"
                  disabled={candidates.loading}
                  className={secondaryButton}
                  onClick={() => void candidates.loadMore()}
                >
                  {candidates.error ? '重試載入照片' : '載入更多照片'}
                </button>
              )}
            </div>
          )}
          {availableOpen && (
            <>
              {!live && availableAssets.length > visibleAvailable && (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setVisibleAvailable((count) => count + 24)}
                >
                  顯示更多照片
                </button>
              )}
              <div className="mt-3 space-y-2">
                {availableAssets.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {candidates.loading ? '正在讀取候選照片。' : '目前已載入的照片沒有可加入項目。'}
                  </p>
                ) : (
                  (live ? availableAssets : availableAssets.slice(0, visibleAvailable)).map(
                    (asset) => (
                      <div
                        key={asset.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 p-2"
                      >
                        <button
                          type="button"
                          className={`flex w-full min-w-0 items-center gap-3 rounded-lg text-left ${focusRing}`}
                          aria-label={`預覽照片 ${asset.title}`}
                          onClick={() => onPreviewAsset(asset)}
                        >
                          <span className="w-28 shrink-0 overflow-hidden rounded-lg sm:w-32">
                            <DemoAssetThumbnail asset={asset} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-gray-800">
                              {asset.title}
                            </span>
                            <span className="text-xs text-blue-700">點開預覽</span>
                          </span>
                        </button>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={pickedIds.has(asset.id)}
                            onChange={() =>
                              setPickedIds((current) => {
                                const next = new Set(current);
                                if (next.has(asset.id)) next.delete(asset.id);
                                else next.add(asset.id);
                                return next;
                              })
                            }
                          />
                          選取 {asset.title}
                        </label>
                        <button
                          type="button"
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                          disabled={orderDraft.hasConflict}
                          onClick={() => addAsset(asset.id)}
                        >
                          加入
                        </button>
                      </div>
                    )
                  )
                )}
              </div>
            </>
          )}
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
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState('all');
  const filteredAssets = assets.filter(
    (asset) =>
      (folder === 'all' || asset.locationId === folder) &&
      `${asset.title} ${asset.alt} ${locations.find((location) => location.id === asset.locationId)?.name ?? '未指派'}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  return (
    <section className="space-y-6" aria-labelledby="uploads-title">
      <SectionHeading
        id="uploads-title"
        eyebrow="上傳與媒體"
        title="具備安全本地操作的媒體庫"
        description="展示卡片密度、批次選取、影像版本狀態與模擬上傳進度，不會執行真實檔案操作。"
      />
      <Card>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label
              htmlFor="demo-media-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              搜尋媒體
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                id="demo-media-search"
                className={`w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm ${focusRing}`}
                placeholder="依檔名、替代文字或地點篩選"
              />
            </div>
          </div>
          <SelectField
            id="demo-folder-filter"
            label="地點篩選"
            value={folder}
            onChange={setFolder}
            options={[
              { value: 'all', label: '全部地點' },
              { value: '', label: '未指派地點' },
              ...locations.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onSetLibraryState('empty')}
            >
              顯示空狀態
            </button>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onSetLibraryState('loaded')}
            >
              顯示媒體庫
            </button>
            <button type="button" className={primaryButton} onClick={onSimulateUpload}>
              模擬上傳
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">媒體庫</h3>
            <p className="text-xs text-gray-500">
              已選取 {selectedAssetIds.size} 個項目，所有動作都是本地預覽。
            </p>
          </div>
          <button
            type="button"
            className={`${secondaryButton} w-full sm:w-auto`}
            onClick={onPreviewCleanup}
          >
            預覽孤兒媒體清理
          </button>
        </div>
        <LibraryContent
          state={libraryState === 'loaded' && !filteredAssets.length ? 'empty' : libraryState}
          assets={filteredAssets}
          locations={locations}
          selectedAssetIds={selectedAssetIds}
          onToggleAsset={onToggleAsset}
          onPreviewAsset={onPreviewAsset}
          onSaveAsset={onSaveAsset}
        />
      </Card>
    </section>
  );
}

function DiagnosticsSection() {
  const diagnosticRows = [
    {
      label: '資料庫連線',
      value: 'D1 綁定可讀取',
      status: 'published' as const,
      icon: <Database className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: '執行環境',
      value: 'Cloudflare Pages / Worker 模式',
      status: 'review' as const,
      icon: <ServerCog className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: 'Cloudflare Access',
      value: '管理入口受保護',
      status: 'published' as const,
      icon: <Cloud className="h-5 w-5" aria-hidden="true" />,
    },
    {
      label: '媒體儲存',
      value: 'R2 版本檢查待整合',
      status: 'draft' as const,
      icon: <FileImage className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  const mockLog = `請求路徑：/admin/diagnostics
狀態：展示資料
D1：連線檢查通過
R2：僅顯示版本狀態摘要
Access：不在展示路由內讀取真實使用者
結果：沒有呼叫任何 API 或資料庫`;

  return (
    <section className="space-y-6" aria-labelledby="diagnostics-title">
      <SectionHeading
        id="diagnostics-title"
        eyebrow="診斷中心"
        title="安全的系統狀態面板"
        description="用模擬資料展示資料庫、環境、Cloudflare 與 D1 診斷資訊；此頁不讀取真實環境或伺服器狀態。"
      />
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
          <pre
            className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100"
            aria-label="診斷紀錄預覽"
          >
            <code>{mockLog}</code>
          </pre>
        </div>
      </Card>
    </section>
  );
}

function PublishingSection({ onPreview }: { onPreview: () => void }) {
  const publishingChecks: Array<{ title: string; description: string; status: Status }> = [
    {
      title: '年份與地點階層',
      description: '所有已發布地點都有正確網址代稱與排序。',
      status: 'published',
    },
    { title: '媒體替代文字', description: '仍有少量草稿圖片需要補齊替代文字。', status: 'review' },
    { title: '快取與重建策略', description: '尚未在此展示頁中啟用。', status: 'draft' },
  ];

  return (
    <section className="space-y-6" aria-labelledby="publishing-title">
      <SectionHeading
        id="publishing-title"
        eyebrow="發布中心"
        title="發布中心尚未啟用"
        description="此區展示未來發布頁的空殼與準備度檢查，不會發布、不會重新驗證，也不會觸發部署。"
      />
      <Card>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              即將推出
            </div>
            <h3 className="mt-4 break-words text-2xl font-semibold text-gray-950">
              目前只提供發布前檢查與介面方向預覽
            </h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              真實發布流程仍應保留在未來經過授權、審核與紀錄的正式功能中。這裡的按鈕只會顯示本地提示。
            </p>
          </div>
          <button type="button" className={`${primaryButton} w-full`} onClick={onPreview}>
            預覽發布流程
          </button>
        </div>
      </Card>
      <Card className="p-0">
        <PaneHeader title="發布前檢查清單" description="展示未來可以提供的準備度門檻。" />
        <div className="divide-y divide-gray-100">
          {publishingChecks.map((item) => (
            <div
              key={item.title}
              className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
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
      <SectionHeading
        id="legacy-collections-title"
        eyebrow="舊作品集路由"
        title="舊版作品集頁面已移除"
        description="`/admin/collections` 與 `/admin/collections/[id]` 是舊路由，應維持 404 找不到頁面，不要重新啟用為可操作頁面。"
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <Card>
          <FileWarning className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">不要復活舊路由</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            新管理流程應集中在年份工作區，從年份進入地點、作品集與媒體指派。舊作品集路由只保留為移除狀態說明，避免出現兩套管理入口。
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-gray-950">建議導向</h3>
          <ol className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-blue-700">1.</span>
              <span>先到「年份管理」確認年份狀態。</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-blue-700">2.</span>
              <span>進入「年份工作區」管理地點與作品集。</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-blue-700">3.</span>
              <span>在「上傳與媒體」處理素材與指派狀態。</span>
            </li>
          </ol>
        </Card>
      </div>
      <Card className="p-0">
        <PaneHeader title="路由狀態預覽" description="以純文字呈現預期行為，不建立任何功能入口。" />
        <div className="p-5">
          <pre
            className="overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100"
            aria-label="舊作品集路由狀態"
          >
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
      <SectionHeading
        id="states-title"
        eyebrow="本地狀態與對話框"
        title="安全互動模式"
        description="每個控制項都只展示前端回饋，沒有刪除、清理或發布副作用。"
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CircleDashed className="h-6 w-6 text-blue-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">狀態切換器</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            目前媒體狀態：
            <span className="font-medium text-gray-900">{getLibraryStateLabel(libraryState)}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onSetLibraryState('loading')}
            >
              載入中
            </button>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onSetLibraryState('empty')}
            >
              空狀態
            </button>
            <button
              type="button"
              className={secondaryButton}
              onClick={() => onSetLibraryState('success')}
            >
              成功狀態
            </button>
          </div>
        </Card>
        <Card>
          <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">提示訊息預覽</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            使用本地即時輔助回饋與可關閉的視覺提示。
          </p>
          <button
            type="button"
            className={`mt-4 ${primaryButton}`}
            onClick={() => onShowToast('已顯示本地提示訊息，沒有保存任何資料。', 'success')}
          >
            顯示提示
          </button>
        </Card>
        <Card>
          <ShieldCheck className="h-6 w-6 text-amber-600" aria-hidden="true" />
          <h3 className="mt-4 text-lg font-semibold text-gray-950">僅預覽對話框</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            清理、批次刪除與孤兒媒體流程都必須停在審查畫面。
          </p>
          <button type="button" className={`mt-4 ${secondaryButton}`} onClick={onPreviewCleanup}>
            開啟對話框
          </button>
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
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3"
          >
            <div className="aspect-[4/3] rounded-xl bg-gray-100" />
            <div className="mt-3 h-4 w-2/3 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <EmptyState
        title="此篩選條件沒有媒體"
        description="正式後台可以保留目前脈絡、說明篩選條件，並提供安全的上傳入口。"
      />
    );
  }

  if (state === 'success') {
    return (
      <div className="p-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-800">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold">本地上傳佇列已完成</h3>
          <p className="mt-2 text-sm leading-6">
            這是模擬成功狀態，沒有選取、上傳、儲存或索引任何檔案。
          </p>
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
            key={`${asset.id}-${asset.locationId}`}
            asset={asset}
            locationName={
              locations.find((location) => location.id === asset.locationId)?.name ?? '未指派地點'
            }
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
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-200'}`}
    >
      <div className={`aspect-[4/3] bg-gradient-to-br ${asset.tone} p-3`}>
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-white/85 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">
            {asset.ratio}
          </span>
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
              <span
                key={variant}
                className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${asset.variants.includes(variant) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
              >
                {variant}
              </span>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelected}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
            />
            選取
          </label>
        </div>
        <button type="button" className={`w-full ${secondaryButton}`} onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          預覽詳情
        </button>
        <details className="rounded-xl border border-gray-200 bg-slate-50/70 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-800">
            編輯中繼資料
          </summary>
          <div className="mt-3 space-y-3">
            <TextField
              id={`asset-alt-${asset.id}`}
              label="替代文字"
              value={alt}
              onChange={setAlt}
            />
            <TextAreaField
              id={`asset-description-${asset.id}`}
              label="說明文字"
              value={description}
              onChange={setDescription}
            />
            <SelectField
              id={`asset-location-${asset.id}`}
              label="地點資料夾"
              value={locationId}
              onChange={setLocationId}
              options={[
                { value: '', label: '未指派' },
                ...locations.map((location) => ({ value: location.id, label: location.name })),
              ]}
            />
            <button
              type="button"
              className={primaryButton}
              onClick={() => onSave({ ...asset, alt, description, locationId })}
            >
              儲存中繼資料
            </button>
          </div>
        </details>
      </div>
    </article>
  );
}

function AssetPreviewDialog({ asset, onClose }: { asset: DemoAsset | null; onClose: () => void }) {
  return (
    <AccessibleDialog
      open={asset !== null}
      titleId="asset-preview-title"
      onClose={onClose}
      dataTestId="admin-demo-asset-dialog"
    >
      {asset ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="relative">
            <DemoAssetThumbnail asset={asset} />
            <div className="absolute right-4 top-4 flex justify-end">
              <button
                data-autofocus
                type="button"
                onClick={onClose}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm ${focusRing}`}
                aria-label="關閉媒體預覽"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="asset-preview-title" className="text-xl font-semibold text-gray-950">
                  {asset.title}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  地點資料夾：{asset.locationId} · {asset.ratio}
                </p>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <InfoTerm label="媒體編號" value={asset.id} />
              <InfoTerm label="影像版本" value={asset.variants.join(', ')} />
              <InfoTerm label="行為" value={asset.imageSrc ? '真實媒體' : '模擬影像'} />
            </dl>
          </div>
        </div>
      ) : null}
    </AccessibleDialog>
  );
}

function CleanupPreviewDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AccessibleDialog
      open={open}
      titleId="cleanup-preview-title"
      onClose={onClose}
      dataTestId="admin-demo-cleanup-dialog"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="cleanup-preview-title" className="text-lg font-semibold text-gray-950">
              僅預覽的清理審查
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              這個對話框刻意不刪除、不解除關聯、不發布、不清理孤兒資料，也不呼叫任何端點；只展示確認文案與影響摘要版面。
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-gray-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-gray-800">模擬影響摘要</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <ArrowUpDown className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />
              將審查 3 個候選媒體
            </li>
            <li className="flex gap-2">
              <ImageUp className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />
              不會開始任何上傳
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-blue-600" aria-hidden="true" />
              此展示頁沒有任何可執行的破壞性操作
            </li>
          </ul>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button data-autofocus type="button" className={secondaryButton} onClick={onClose}>
            取消
          </button>
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

  const tone =
    toast.intent === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div
      className="fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div className={`rounded-xl border px-4 py-3 shadow-lg ${tone}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6">{toast.text}</p>
          <button
            type="button"
            onClick={onDismiss}
            className={`rounded-md px-2 py-1 text-xs ${focusRing}`}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm ring-1 ring-gray-100/60 ${className}`}
    >
      {children}
    </div>
  );
}

function PaneHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="break-words text-sm font-semibold text-gray-800">{title}</h3>
        <p className="break-words text-xs text-gray-500">{description}</p>
      </div>
      {action ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'emerald' | 'blue' | 'amber' | 'slate';
}) {
  const accentClasses: Record<typeof accent, string> = {
    emerald: 'border-emerald-200/70 shadow-emerald-100/40',
    blue: 'border-blue-200/70 shadow-blue-100/40',
    amber: 'border-amber-200/70 shadow-amber-100/40',
    slate: 'border-gray-200/80 shadow-gray-100/50',
  };

  return (
    <div
      className={`rounded-2xl border bg-white/95 p-6 shadow-sm ring-1 ring-gray-100/60 ${accentClasses[accent]}`}
    >
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

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} ${tone[status]}`}
    >
      {label[status]}
    </span>
  );
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

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
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

function TextAreaField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
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

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ${focusRing}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
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

function DemoCreateForm({
  label,
  onCreate,
  slugHint,
}: {
  label: string;
  slugHint?: string;
  onCreate: (name: string, slug?: string) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="min-w-0 flex-1 space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await onCreate(name.trim(), slug.trim());
        setError(result);
        if (!result) {
          setName('');
          setSlug('');
        }
      }}
    >
      <label className="block text-xs font-medium text-gray-600">
        {label}
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="輸入名稱"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      {slugHint && (
        <label className="block text-xs font-medium text-gray-600">
          {label} Slug
          <input
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder={slugHint}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
      )}
      <button disabled={!name.trim() || (!!slugHint && !slug.trim())} className={primaryButton}>
        {label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
function DemoOrderControls({
  label,
  items,
  id,
  onMove,
}: {
  label: string;
  items: { id: string }[];
  id: string;
  onMove: (direction: number) => void;
}) {
  const index = items.findIndex((item) => item.id === id);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-slate-50 px-3 py-2"
      role="group"
      aria-label={`${label}排序`}
    >
      <span className="text-xs tabular-nums text-gray-500">
        第 {index + 1} / {items.length} 項
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className={`${secondaryButton} min-h-11`}
          aria-label={`${label}上移`}
          disabled={index <= 0}
          onClick={() => onMove(-1)}
        >
          ↑ 上移
        </button>
        <button
          type="button"
          className={`${secondaryButton} min-h-11`}
          aria-label={`${label}下移`}
          disabled={index < 0 || index === items.length - 1}
          onClick={() => onMove(1)}
        >
          ↓ 下移
        </button>
      </div>
    </div>
  );
}
function DemoBatchPanel({
  workspace,
  selectedIds,
  onSelectAll,
  onClear,
  onAction,
}: {
  workspace: DemoWorkspace;
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onClear: () => void;
  onAction: (action: string, target: string) => void;
}) {
  const [location, setLocation] = useState('');
  const [collection, setCollection] = useState('');
  const validCollection = workspace.collections.some((item) => item.id === collection);
  return (
    <Card>
      <h3 className="text-sm font-semibold">批次操作 · 已選 {selectedIds.size} 張</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={secondaryButton} onClick={onSelectAll}>
          全選此年份媒體
        </button>
        <button className={secondaryButton} onClick={onClear}>
          清除選取
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <SelectField
            id="batch-location"
            label="移動至地點資料夾"
            value={location}
            onChange={setLocation}
            options={[
              { value: '', label: '未指派' },
              ...workspace.locations.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <button
            className={secondaryButton}
            disabled={!selectedIds.size}
            onClick={() =>
              onAction(
                'location',
                workspace.locations.some((item) => item.id === location) ? location : ''
              )
            }
          >
            套用地點
          </button>
        </div>
        <div className="space-y-2">
          <SelectField
            id="batch-collection"
            label="加入作品集"
            value={collection}
            onChange={setCollection}
            options={[
              { value: '', label: '選擇作品集' },
              ...workspace.collections.map((item) => ({ value: item.id, label: item.title })),
            ]}
          />
          <button
            className={secondaryButton}
            disabled={!selectedIds.size || !validCollection}
            onClick={() => onAction('collection', collection)}
          >
            加入選定作品集
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={secondaryButton}
          disabled={!selectedIds.size}
          onClick={() => onAction('variants', '')}
        >
          模擬重建 T / M / L
        </button>
        <button
          className={secondaryButton}
          disabled={!selectedIds.size}
          onClick={() => onAction('delete', '')}
        >
          批次刪除
        </button>
      </div>
    </Card>
  );
}

function DemoAssetThumbnail({ asset }: { asset: DemoAsset }) {
  if (asset.imageSrc)
    return (
      <ProgressiveImage
        assetId={asset.id}
        alt={asset.alt}
        width={asset.width}
        height={asset.height}
        fit="contain"
        className="aspect-[4/3] w-full bg-slate-100"
      />
    );
  return (
    <span
      role="img"
      aria-label={`${asset.alt}（模擬影像）`}
      className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${asset.tone}`}
    >
      <FileImage className="h-6 w-6 text-slate-600/60" aria-hidden="true" />
      <span className="rounded bg-white/70 px-2 py-1 text-[10px] text-slate-600">
        模擬影像 · {asset.ratio}
      </span>
    </span>
  );
}

function YearNameForm({
  year,
  onSave,
}: {
  year: DemoYear;
  onSave: (id: string, label: string) => void;
}) {
  const draft = useSyncedDraft({ label: year.label });
  const { label } = draft.values;
  const setLabel = (value: string) => draft.setField('label', value);
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (label.trim() && !draft.hasConflict) onSave(year.id, label.trim());
      }}
    >
      <DraftConflict draft={draft} />
      <input
        aria-label={`年份 ${year.label} 名稱`}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        required
        maxLength={200}
        className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        className={secondaryButton}
        disabled={draft.hasConflict || !label.trim() || label === year.label}
      >
        儲存名稱
      </button>
    </form>
  );
}

function DraftConflict({
  draft,
}: {
  draft: { hasConflict: boolean; useLatest: () => void; keepEdits: () => void };
}) {
  if (!draft.hasConflict) return null;
  return (
    <div
      role="alert"
      className="w-full rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p>這筆資料已有更新，與尚未儲存的修改衝突。請先選擇要保留的內容。</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={draft.useLatest}>
          套用最新資料
        </button>
        <button type="button" className={secondaryButton} onClick={draft.keepEdits}>
          保留我的修改
        </button>
      </div>
    </div>
  );
}
