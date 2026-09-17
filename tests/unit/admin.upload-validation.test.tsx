import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadsPage from '@/app/admin/uploads/page';

const originalFetch = global.fetch;
const originalCreateUrl = URL.createObjectURL;
let mockFetch: jest.Mock;
let uploadResult: unknown;
let uploadOk: boolean;
beforeEach(() => {
  uploadResult = {};
  uploadOk = true;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  URL.createObjectURL = undefined as unknown as typeof URL.createObjectURL;

  mockFetch = jest.fn(async (path: string) => {
    const isUpload = path === '/api/admin/uploads/r2';
    const value = isUpload ? uploadResult : path.includes('/years') ? [] : { data: [], total: 0 };
    return {
      headers: new Headers({ 'content-type': 'application/json' }),
      ok: isUpload ? uploadOk : true,
      status: isUpload && !uploadOk ? 500 : 200,
      json: async () => value,
      text: async () => JSON.stringify(value),
    };
  });
  global.fetch = mockFetch as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
  URL.createObjectURL = originalCreateUrl;
  jest.restoreAllMocks();
});
const writes = () => mockFetch.mock.calls.filter(([, init]) => init?.method === 'POST');
function start(files = true) {
  render(<UploadsPage />);
  fireEvent.change(screen.getByTestId('asset-alt-input'), { target: { value: '測試照片' } });
  if (files)
    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['photo'], 'sample.jpg', { type: 'image/jpeg' })] },
    });
  fireEvent.click(screen.getByTestId('save-asset-btn'));
}

test('no selected file cannot create a library asset', async () => {
  start(false);
  expect(screen.getByTestId('save-asset-btn')).toBeDisabled();
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  expect(writes()).toHaveLength(0);
});

test.each([
  {},
  { image_id: '' },
  { image_id: '   ' },
  { image_id: 123 },
  { image_id: ' test-uploaded-image-id-123 ' },
  { image_id: 'test-uploaded-image-id-123' },
])(
  'invalid upload response %j never creates an asset and retains the file for retry',
  async (payload) => {
    uploadResult = payload;
    start();
    expect(await screen.findByTestId('error-message')).toHaveTextContent('上傳失敗，請稍後再試。');
    expect(writes().map(([path]) => path)).toEqual(['/api/admin/uploads/r2']);
    expect(screen.getByTestId('selected-files-list')).toHaveTextContent('sample.jpg');
  }
);

test('failed R2 upload never creates an asset', async () => {
  uploadOk = false;
  start();
  expect(await screen.findByTestId('error-message')).toHaveTextContent('上傳失敗，請稍後再試。');
  expect(writes().map(([path]) => path)).toEqual(['/api/admin/uploads/r2']);
});

test('successful upload creates only the server-returned asset ID', async () => {
  uploadResult = { image_id: 'real-r2-id' };
  start();
  await screen.findAllByText('檔案上傳完成（1/1）');
  expect(writes().map(([path]) => path)).toEqual(['/api/admin/uploads/r2', '/api/admin/assets']);
  expect(JSON.parse(writes()[1][1].body)).toMatchObject({ id: 'real-r2-id', alt: '測試照片' });
});
