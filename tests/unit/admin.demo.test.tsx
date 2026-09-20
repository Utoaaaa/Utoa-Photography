import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import AdminDemoPage from '../../src/app/admin/demo/page';

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const openWorkspace = () => click(/年份工作區/);

beforeEach(() => {
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => `test-${Math.random()}` });
});

test('creates a year, location and collection in an empty workspace without requests', async () => {
  const fetchSpy = jest.spyOn(global, 'fetch');
  render(<AdminDemoPage />);
  openWorkspace();
  fireEvent.change(screen.getByLabelText('新增年份'), { target: { value: '2030' } });
  click('新增年份');
  await waitFor(() => expect(screen.getByLabelText('新增年份')).toHaveValue(''));
  fireEvent.change(screen.getByLabelText('新增地點'), { target: { value: '新地點' } });
  click('新增地點');
  await waitFor(() => expect(screen.getByLabelText('新增地點')).toHaveValue(''));
  expect(screen.getByLabelText('地點名稱')).toHaveValue('新地點');
  fireEvent.change(screen.getByLabelText('新增作品集'), { target: { value: '新作品集' } });
  click('新增作品集');
  await waitFor(() => expect(screen.getByLabelText('新增作品集')).toHaveValue(''));
  expect(screen.getByLabelText('標題')).toHaveValue('新作品集');
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

test('location deletion can be cancelled and preserves collections as unassigned on confirmation', () => {
  render(<AdminDemoPage />);
  openWorkspace();
  click('刪除地點');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
  expect(screen.getByLabelText('地點名稱')).toHaveValue('京都北行');
  click('刪除地點'); click('確認刪除');
  expect(screen.getByRole('button', { name: '未指派作品集（2）' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /晨間神社 已發布/ })).toBeInTheDocument();
});

test('collection can be unassigned and still opened', () => {
  render(<AdminDemoPage />);
  openWorkspace(); click(/晨間神社 已發布/);
  fireEvent.change(screen.getByLabelText('指派地點'), { target: { value: '' } });
  click('儲存作品集');
  expect(screen.getByRole('button', { name: '未指派作品集（1）' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /晨間神社 已發布/ })).toBeInTheDocument();
});

test('bulk deletion clears selection and shows an empty library', () => {
  render(<AdminDemoPage />);
  click(/上傳與媒體/);
  click('全選此年份媒體'); click('批次刪除');
  expect(screen.getByRole('dialog')).toHaveTextContent('6 個模擬媒體');
  click('確認刪除');
  expect(screen.getByText('批次操作 · 已選 0 張')).toBeInTheDocument();
  expect(screen.getByText('此篩選條件沒有媒體')).toBeInTheDocument();
});

test('reorders locations and collections without losing the selected record', () => {
  render(<AdminDemoPage />);
  openWorkspace();
  click('京都北行下移');
  const locationButtons = screen.getAllByRole('button', { name: /已指派 \d 個作品集/ });
  expect(locationButtons[0]).toHaveTextContent('台北藍調時刻');
  expect(locationButtons[1]).toHaveTextContent('京都北行');
  click(/晨間神社 已發布/); click('晨間神社下移');
  const collectionButtons = screen.getAllByRole('button', { name: /已指派 \d 個媒體/ });
  expect(collectionButtons[0]).toHaveTextContent('燈巷漫步');
  expect(collectionButtons[1]).toHaveTextContent('晨間神社');
  expect(screen.getByLabelText('標題')).toHaveValue('晨間神社');
});

test('previews assigned photos, available photos and the selected collection cover', () => {
  render(<AdminDemoPage />);
  openWorkspace();
  click('預覽 晨間神社 封面');
  expect(screen.getByRole('dialog')).toHaveTextContent('石徑-024');
  click('關閉媒體預覽');
  click(/晨間神社 已發布/);
  click('預覽照片 石徑-024');
  expect(screen.getByRole('dialog')).toHaveTextContent('石徑-024');
  click('關閉媒體預覽');
  expect(screen.queryByRole('button', { name: '預覽照片 河光-118' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '批次加入照片' })).not.toBeInTheDocument();
  click('展開可加入照片');
  click('預覽照片 河光-118');
  expect(screen.getByRole('dialog')).toHaveTextContent('河光-118');
  click('關閉媒體預覽');
  click('收合可加入照片');
  expect(screen.queryByRole('button', { name: '預覽照片 河光-118' })).not.toBeInTheDocument();
  click('展開可加入照片');
  expect(screen.getByRole('checkbox', { name: '選取 河光-118' })).toBeEnabled();
  click('預覽目前選擇的封面');
  expect(screen.getByRole('dialog')).toHaveTextContent('石徑-024');
});
