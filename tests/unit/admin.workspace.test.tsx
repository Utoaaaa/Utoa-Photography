import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminWorkspace from '../../src/components/admin/AdminWorkspace';
import {
  loadWorkspace,
  requestAdmin,
  persistOrder,
  saveCollection,
  savePhotos,
} from '../../src/components/admin/workspace/api';
import type { DemoCollection } from '../../src/components/admin/workspace/types';

jest.mock('../../src/app/admin/uploads/page', () => ({
  __esModule: true,
  default: () => <div>真實上傳元件</div>,
}));
jest.mock('../../src/app/admin/diagnostics/page', () => ({
  __esModule: true,
  default: () => <div>真實診斷元件</div>,
}));
const originalFetch = global.fetch;
let mockFetch: jest.Mock;
let title: string;
let rejected: boolean;
const collection = {
  id: 'c1',
  title: '實際作品',
  slug: 'real-collection',
  summary: '',
  status: 'draft',
  location_id: 'l1',
  captured_at: null,
  cover_asset_id: 'a1',
};
const response = (value: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => value,
});

beforeEach(() => {
  title = collection.title;
  rejected = false;
  mockFetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace('/api/admin/', '');
    if (method !== 'GET') {
      if (rejected) return response({ message: 'Slug 已存在' }, 409);
      if (path === 'collections/c1' && method === 'PUT')
        title = JSON.parse(String(init.body)).title ?? title;
      return response({ id: 'new-id' });
    }
    if (path === 'years?status=all&order=asc')
      return response([{ id: 'y1', label: '2026', status: 'draft' }]);
    if (path.startsWith('assets?'))
      return response({
        data: [{ id: 'a1', alt: '真實照片', width: 1200, height: 800, location_folder_id: 'l1' }],
        total: 1,
      });
    if (path === 'years/y1/locations')
      return response([{ id: 'l1', name: '實際地點', slug: 'real-26', coverAssetId: 'a1' }]);
    if (path === 'years/y1/collections?status=all') return response([{ ...collection, title }]);
    if (path === 'collections/c1?include_assets=true')
      return response({
        ...collection,
        assets: [{ id: 'a1', alt: '真實照片', width: 1200, height: 800, location_folder_id: 'l1' }],
      });
    throw new Error(`Unexpected request ${method} ${path}`);
  });
  global.fetch = mockFetch as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

async function openCollection() {
  await screen.findByText('真實資料工作區');
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /年份工作區/ }));
  fireEvent.click(await screen.findByRole('button', { name: /實際地點.*已指派/ }));
  fireEvent.click(screen.getByRole('button', { name: /實際作品.*草稿/ }));
  await screen.findByLabelText('標題');
}

test('reads real data, persists edits and loads the saved value after remount', async () => {
  const view = render(<AdminWorkspace live />);
  await openCollection();
  expect(screen.getByLabelText('標題')).toHaveValue('實際作品');
  expect(
    within(screen.getByLabelText('狀態')).queryByRole('option', { name: '待審核' })
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('標題'), { target: { value: '已儲存作品' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存作品集' }));
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  expect(title).toBe('已儲存作品');
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/admin/collections/c1',
    expect.objectContaining({ method: 'PUT', body: expect.stringContaining('已儲存作品') })
  );
  view.unmount();
  const snapshot = await loadWorkspace();
  expect(snapshot.workspaces.y1.collections[0].title).toBe('已儲存作品');
  expect(snapshot.workspaces.y1.assets[0].imageSrc).toContain('/images/a1/');
});

test('failed save keeps the draft and shows the server error instead of success', async () => {
  render(<AdminWorkspace live />);
  await openCollection();
  rejected = true;
  fireEvent.change(screen.getByLabelText('標題'), { target: { value: '尚未儲存' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存作品集' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Slug 已存在');
  expect(screen.getByLabelText('標題')).toHaveValue('尚未儲存');
  expect(title).toBe('實際作品');
  expect(screen.queryByText('已儲存，資料已重新載入。')).not.toBeInTheDocument();
});

test('authentication failure never falls back to demo records', async () => {
  mockFetch.mockResolvedValue(response({}, 401));
  render(<AdminWorkspace live />);
  expect(await screen.findByRole('alert')).toHaveTextContent('登入已失效');
  expect(screen.queryByText('京都北行')).not.toBeInTheDocument();
  expect(mockFetch.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
});

test('assignment uses the dedicated endpoint, before collection fields are saved', async () => {
  const previous: DemoCollection = {
    id: 'c1',
    title: '作品',
    slug: 'work',
    summary: '',
    status: 'draft',
    locationId: 'l1',
    capturedAt: '',
    coverAssetId: null,
    assetIds: [],
  };
  await saveCollection(previous, { ...previous, locationId: '' });
  expect(mockFetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    ['/api/admin/collections/c1/location', 'POST'],
    ['/api/admin/collections/c1', 'PUT'],
  ]);
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ locationId: null });
  mockFetch.mockClear();
  await expect(
    saveCollection(previous, { ...previous, status: 'published', locationId: '' })
  ).rejects.toThrow('請先指派地點');
  expect(mockFetch).not.toHaveBeenCalled();
});

test('photo removal does not delete the library asset, and remaining order is persisted', async () => {
  const record: DemoCollection = {
    id: 'c1',
    title: '',
    slug: '',
    summary: '',
    status: 'draft',
    locationId: 'l1',
    capturedAt: '',
    coverAssetId: null,
    assetIds: ['a1', 'a2'],
  };
  await savePhotos(record, ['a2', 'a3']);
  expect(mockFetch.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    ['/api/admin/collections/c1/assets', 'POST'],
    ['/api/admin/collections/c1/assets/a1', 'DELETE'],
    ['/api/admin/collections/c1/assets', 'PUT'],
  ]);
  expect(JSON.parse(mockFetch.mock.calls[2][1].body)).toEqual({
    reorder: [
      { asset_id: 'a2', order_index: '00000001' },
      { asset_id: 'a3', order_index: '00000002' },
    ],
  });
});

test('sorting stops on a rejected write rather than reporting complete success', async () => {
  mockFetch
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response({ message: '排序衝突' }, 409));
  await expect(persistOrder('years', ['y1', 'y2', 'y3'])).rejects.toThrow('排序衝突');
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

test('media section mounts the existing real upload workflow', async () => {
  render(<AdminWorkspace live />);
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /上傳與媒體/ }));
  expect(await screen.findByText('真實上傳元件')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '模擬上傳' })).not.toBeInTheDocument();
});

test('reload synchronizes unchanged form fields without overwriting an unrelated local draft', async () => {
  render(<AdminWorkspace live />);
  await openCollection();
  fireEvent.change(screen.getAllByLabelText('摘要').at(-1)!, { target: { value: '我的摘要草稿' } });
  title = '外部更新的新名稱';
  fireEvent.click(screen.getByRole('button', { name: '重新載入資料' }));
  await waitFor(() => expect(screen.getByLabelText('標題')).toHaveValue('外部更新的新名稱'));
  expect(screen.getAllByLabelText('摘要').at(-1)).toHaveValue('我的摘要草稿');
  fireEvent.click(screen.getByRole('button', { name: '儲存作品集' }));
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  expect(title).toBe('外部更新的新名稱');
  const write = mockFetch.mock.calls.find(
    ([path, init]) => path === '/api/admin/collections/c1' && init.method === 'PUT'
  );
  expect(JSON.parse(write![1].body)).toMatchObject({
    title: '外部更新的新名稱',
    summary: '我的摘要草稿',
  });
});

test('conflicting refresh preserves the local draft and blocks saving until resolved', async () => {
  render(<AdminWorkspace live />);
  await openCollection();
  fireEvent.change(screen.getByLabelText('標題'), { target: { value: '本地修改' } });
  title = '遠端修改';
  fireEvent.click(screen.getByRole('button', { name: '重新載入資料' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('衝突');
  expect(screen.getByLabelText('標題')).toHaveValue('本地修改');
  expect(screen.getByRole('button', { name: '儲存作品集' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '套用最新資料' }));
  expect(screen.getByLabelText('標題')).toHaveValue('遠端修改');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('twelve-photo ordering survives lexical storage order and loading legacy rows', async () => {
  const ids = Array.from({ length: 12 }, (_, index) => `a${index + 1}`);
  const record: DemoCollection = {
    id: 'c1',
    title: '',
    slug: '',
    summary: '',
    status: 'draft',
    locationId: 'l1',
    capturedAt: '',
    coverAssetId: null,
    assetIds: ids,
  };
  await savePhotos(record, ids);
  const sent = JSON.parse(mockFetch.mock.calls[0][1].body).reorder as {
    asset_id: string;
    order_index: string;
  }[];
  expect(
    [...sent]
      .sort((a, b) => a.order_index.localeCompare(b.order_index))
      .map((item) => item.asset_id)
  ).toEqual(ids);
  const baseFetch = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes('include_assets=true'))
      return response({
        assets: ids
          .map((id, index) => ({
            id,
            alt: id === 'a1' ? '照片一' : '照片二',
            location_folder_id: 'l1',
            order_index: String(index + 1),
          }))
          .sort((a, b) => a.order_index.localeCompare(b.order_index)),
      });
    return baseFetch(url, init);
  });
  const reloaded = await loadWorkspace();
  expect(reloaded.workspaces.y1.collections[0].assetIds).toEqual(ids);
});

test('years remain editable while the media library is still loading', async () => {
  const original = mockFetch.getMockImplementation()!;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes('/assets?')) await pending;
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  fireEvent.click(screen.getByRole('button', { name: /年份管理/ }));
  expect(await screen.findByRole('heading', { name: '2026', exact: true })).toBeInTheDocument();
  expect(screen.getByLabelText('年份 2026 名稱')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('新增年份'), { target: { value: '2027' } });
  expect(screen.getByRole('button', { name: '新增年份', exact: true })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /年份工作區/ }));
  expect(screen.getByRole('button', { name: /2026/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /上傳與媒體/ }));
  expect(await screen.findByText('真實上傳元件')).toBeInTheDocument();
  await act(async () => {
    release();
    await pending;
  });
});

test('a failed media request does not lock year management', async () => {
  const original = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) =>
    url.includes('/assets?') ? response({ message: '媒體暫時無法讀取' }, 503) : original(url, init)
  );
  render(<AdminWorkspace live />);
  await openCollection();
  fireEvent.click(screen.getByRole('button', { name: '展開可加入照片' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('媒體暫時無法讀取');
  fireEvent.click(screen.getByRole('button', { name: /年份管理/ }));
  expect(screen.getByLabelText('年份 2026 名稱')).toBeEnabled();
});

test('collection reads overlap, remain bounded and preserve list order', async () => {
  const original = mockFetch.getMockImplementation()!;
  let active = 0;
  let peak = 0;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith('/collections?status=all'))
      return response(Array.from({ length: 9 }, (_, i) => ({ ...collection, id: `c${i}` })));
    if (url.includes('?include_assets=true')) {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return response({ assets: [] });
    }
    return original(url, init);
  });
  const snapshot = await loadWorkspace();
  expect(peak).toBe(4);
  expect(snapshot.workspaces.y1.collections.map((item) => item.id)).toEqual(
    Array.from({ length: 9 }, (_, i) => `c${i}`)
  );
});

test('a stalled request aborts and reports a retryable timeout', async () => {
  jest.useFakeTimers();
  try {
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    const result = expect(requestAdmin('years')).rejects.toThrow('請求逾時');
    await jest.advanceTimersByTimeAsync(20000);
    await result;
  } finally {
    jest.useRealTimers();
  }
});

test('one failed year does not prevent another year from becoming available', async () => {
  const original = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes('years?'))
      return response([
        { id: 'bad', label: '2025', status: 'draft' },
        { id: 'y1', label: '2026', status: 'draft' },
      ]);
    if (url.includes('/years/bad/')) return response({ message: '讀取失敗' }, 500);
    return original(url, init);
  });
  const onWorkspace = jest.fn();
  await expect(loadWorkspace({ onWorkspace })).rejects.toThrow('2025');
  expect(onWorkspace).toHaveBeenCalledWith(
    'y1',
    expect.objectContaining({ collections: expect.any(Array) })
  );
});

test('cover choices stay within the collection or location and collapse after selection', async () => {
  const original = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith('collections/c1?include_assets=true'))
      return response({ assets: [{ id: 'a1', alt: '作品集內照片', location_folder_id: 'l1' }] });
    if (url.includes('/assets?'))
      return response({
        data: [
          { id: 'a1', alt: '作品集內照片', location_folder_id: 'l1' },
          { id: 'a2', alt: '其他地點照片', location_folder_id: 'elsewhere' },
          { id: 'a3', alt: '地點內其他照片', location_folder_id: 'l1' },
        ],
        total: 3,
      });
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  await openCollection();
  const collectionPicker = within(screen.getByRole('region', { name: '作品集封面' }));
  expect(collectionPicker.queryByRole('button', { name: /^選用 / })).not.toBeInTheDocument();
  fireEvent.click(collectionPicker.getByRole('button', { name: '選擇封面' }));
  expect(collectionPicker.getAllByRole('button', { name: /^選用 / })).toHaveLength(1);
  fireEvent.click(collectionPicker.getByRole('button', { name: '選用 作品集內照片' }));
  expect(collectionPicker.getByRole('button', { name: '選擇封面' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  expect(collectionPicker.getByRole('button', { name: '預覽目前作品集封面' })).toBeInTheDocument();
  const locationPicker = within(screen.getByRole('region', { name: '地點封面' }));
  fireEvent.click(locationPicker.getByRole('button', { name: '選擇封面' }));
  await locationPicker.findByRole('button', { name: '選用 地點內其他照片' });
  expect(locationPicker.getAllByRole('button', { name: /^選用 / })).toHaveLength(2);
  expect(
    locationPicker.queryByRole('button', { name: '選用 其他地點照片' })
  ).not.toBeInTheDocument();
  fireEvent.click(locationPicker.getByRole('button', { name: '選用 地點內其他照片' }));
  expect(locationPicker.getByRole('button', { name: '選擇封面' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
  fireEvent.click(locationPicker.getByRole('button', { name: '選擇封面' }));
  fireEvent.click(locationPicker.getByRole('button', { name: '關閉選擇' }));
  expect(locationPicker.getByRole('button', { name: '預覽目前地點封面' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '儲存地點' }));
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/years/y1/locations',
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('a3') })
    )
  );
});

test('dragging and buttons reorder immediately, save once, and preserve a rejected draft for retry', async () => {
  const original = mockFetch.getMockImplementation()!;
  let serverOrder = ['a1', 'a2'];
  let failOrder = true;
  mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (url.includes('/assets?'))
      return response({
        data: [
          { id: 'a1', alt: '照片一', location_folder_id: 'l1' },
          { id: 'a2', alt: '照片二', location_folder_id: 'l1' },
        ],
        total: 2,
      });
    if (url.endsWith('collections/c1?include_assets=true'))
      return response({
        assets: serverOrder.map((id, index) => ({
          id,
          alt: id === 'a1' ? '照片一' : '照片二',
          location_folder_id: 'l1',
          order_index: String(index + 1),
        })),
      });
    if (url.endsWith('collections/c1/assets') && init.method === 'PUT') {
      if (failOrder) return response({ message: '排序暫時無法儲存' }, 503);
      serverOrder = JSON.parse(String(init.body)).reorder.map(
        (item: { asset_id: string }) => item.asset_id
      );
      return response({});
    }
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  await openCollection();
  mockFetch.mockClear();
  const order = () =>
    screen.getAllByTestId(/^assigned-photo-/).map((element) => element.getAttribute('data-testid'));
  const dataTransfer = { setData: jest.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.dragStart(screen.getByRole('button', { name: '拖拉排序 照片一' }), { dataTransfer });
  fireEvent.dragOver(screen.getByTestId('assigned-photo-a2'), { dataTransfer });
  fireEvent.drop(screen.getByTestId('assigned-photo-a2'), { dataTransfer });
  expect(order()).toEqual(['assigned-photo-a2', 'assigned-photo-a1']);
  expect(mockFetch).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByTestId('assigned-photo-a1')).getByRole('button', { name: '上移' })
  );
  expect(order()).toEqual(['assigned-photo-a1', 'assigned-photo-a2']);
  expect(mockFetch).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByTestId('assigned-photo-a1')).getByRole('button', { name: '下移' })
  );
  fireEvent.click(screen.getByRole('button', { name: '儲存排序' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('排序暫時無法儲存');
  expect(order()).toEqual(['assigned-photo-a2', 'assigned-photo-a1']);
  expect(screen.getByRole('button', { name: '儲存排序' })).toBeEnabled();
  failOrder = false;
  mockFetch.mockClear();
  fireEvent.click(screen.getByRole('button', { name: '儲存排序' }));
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  expect(serverOrder).toEqual(['a2', 'a1']);
  expect(mockFetch.mock.calls.filter(([, init]) => init.method === 'PUT')).toHaveLength(1);
  expect(screen.getByRole('button', { name: '儲存排序' })).toBeDisabled();
  fireEvent.click(
    within(screen.getByTestId('assigned-photo-a1')).getByRole('button', { name: '上移' })
  );
  fireEvent.click(screen.getByRole('button', { name: '取消排序變更' }));
  expect(order()).toEqual(['assigned-photo-a2', 'assigned-photo-a1']);
});

test('initial navigation reads only years; a selected year never loads other year details', async () => {
  render(<AdminWorkspace live />);
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/admin/years?status=all&order=asc',
  ]);
  const original = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes('years?'))
      return response([
        { id: 'y1', label: '2026', status: 'draft' },
        { id: 'y2', label: '2027', status: 'draft' },
      ]);
    return original(url, init);
  });
  mockFetch.mockClear();
  await loadWorkspace({ yearId: 'y1', assets: [] });
  expect(
    mockFetch.mock.calls.some(([url]) => url.includes('/y2/') || url.includes('/assets?'))
  ).toBe(false);
});

test('remove works with an unsaved order and only reconciles that collection', async () => {
  const original = mockFetch.getMockImplementation()!;
  let serverOrder = ['a1', 'a2'];
  mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (url.includes('/assets?'))
      return response({
        data: [
          { id: 'a1', alt: '照片一', location_folder_id: 'l1' },
          { id: 'a2', alt: '照片二', location_folder_id: 'l1' },
        ],
        total: 2,
      });
    if (url.endsWith('collections/c1?include_assets=true'))
      return response({
        assets: serverOrder.map((id, index) => ({
          id,
          alt: id === 'a1' ? '照片一' : '照片二',
          location_folder_id: 'l1',
          order_index: String(index + 1),
        })),
      });
    if (url.endsWith('/assets/a1') && init.method === 'DELETE') {
      serverOrder = serverOrder.filter((id) => id !== 'a1');
      return response(null, 204);
    }
    if (url.endsWith('collections/c1/assets') && init.method === 'PUT') {
      serverOrder = JSON.parse(String(init.body)).reorder.map(
        (item: { asset_id: string }) => item.asset_id
      );
      return response({});
    }
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  await openCollection();
  mockFetch.mockClear();
  fireEvent.click(
    within(screen.getByTestId('assigned-photo-a1')).getByRole('button', { name: '下移' })
  );
  const remove = within(screen.getByTestId('assigned-photo-a1')).getByRole('button', {
    name: '移除',
  });
  expect(remove).toBeEnabled();
  fireEvent.click(remove);
  expect(screen.queryByTestId('assigned-photo-a1')).not.toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  expect(serverOrder).toEqual(['a2']);
  expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/admin/collections/c1/assets/a1',
    '/api/admin/collections/c1/assets',
    '/api/admin/collections/c1?include_assets=true',
  ]);
  expect(screen.getByRole('button', { name: '儲存排序' })).toBeDisabled();
});

test('failed removal stays retryable and cancelling restores the confirmed photo list', async () => {
  const original = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url: string, init: RequestInit = {}) => {
    if (init.method === 'DELETE') return response({ message: '移除失敗' }, 503);
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  await openCollection();
  fireEvent.click(
    within(screen.getByTestId('assigned-photo-a1')).getByRole('button', { name: '移除' })
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('移除失敗');
  expect(screen.getByRole('button', { name: '儲存照片變更' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '取消照片變更' }));
  expect(screen.getByTestId('assigned-photo-a1')).toBeInTheDocument();
});

test('workspace lists do not fetch photo details or candidate pages until opened', async () => {
  render(<AdminWorkspace live />);
  await waitFor(() => expect(screen.queryByText('正在讀取或儲存資料…')).not.toBeInTheDocument());
  mockFetch.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /年份工作區/ }));
  fireEvent.click(await screen.findByRole('button', { name: /實際地點.*已指派/ }));
  expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/admin/years?status=all&order=asc',
    '/api/admin/years/y1/locations',
    '/api/admin/years/y1/collections?status=all',
  ]);
  mockFetch.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /實際作品.*草稿/ }));
  await screen.findByLabelText('標題');
  expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/admin/collections/c1?include_assets=true',
  ]);
  fireEvent.click(screen.getByRole('button', { name: '展開可加入照片' }));
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/assets?limit=24&offset=0&location_id=l1',
      expect.anything()
    )
  );
});

test('candidate pages load on expansion, retry failures, and retain pages across collapse', async () => {
  const original = mockFetch.getMockImplementation()!;
  let fail = true;
  mockFetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes('/assets?')) {
      if (fail) return response({ message: '候選照片讀取失敗' }, 503);
      const offset = new URL(url, 'http://localhost').searchParams.get('offset');
      return response({
        data: Array.from({ length: offset === '0' ? 24 : 1 }, (_, index) => ({
          id: `b${Number(offset) + index}`,
          alt: `候選${Number(offset) + index}`,
          location_folder_id: 'l1',
        })),
        total: 25,
      });
    }
    return original(url, init);
  });
  render(<AdminWorkspace live />);
  await openCollection();
  expect(mockFetch.mock.calls.some(([url]) => url.includes('/assets?'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '展開可加入照片' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('候選照片讀取失敗');
  fail = false;
  fireEvent.click(screen.getByRole('button', { name: '重試載入照片' }));
  await screen.findByRole('checkbox', { name: '選取 候選0' });
  expect(screen.getAllByRole('checkbox', { name: /選取 候選/ })).toHaveLength(24);
  mockFetch.mockClear();
  fireEvent.click(screen.getByRole('button', { name: '收合可加入照片' }));
  fireEvent.click(screen.getByRole('button', { name: '展開可加入照片' }));
  expect(mockFetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '載入更多照片' }));
  await screen.findByRole('checkbox', { name: '選取 候選24' });
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/admin/assets?limit=24&offset=24&location_id=l1',
    expect.anything()
  );
});
