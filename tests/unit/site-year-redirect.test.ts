import { buildYearHref } from '../../src/lib/site-paths';

const mockRedirect = jest.fn((href: string) => {
  throw new Error(`redirect:${href}`);
});
const mockNotFound = jest.fn(() => {
  throw new Error('not-found');
});
const mockGetYearByLabel = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (href: string) => mockRedirect(href),
  notFound: () => mockNotFound(),
}));

jest.mock('@/lib/queries/years', () => ({
  getYearByLabel: (label: string) => mockGetYearByLabel(label),
}));

describe('site year redirect route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to the canonical year anchor helper for the resolved year label', async () => {
    mockGetYearByLabel.mockResolvedValue({ id: 'year-2025', label: '2025 Published' });
    const YearPage = (await import('../../src/app/(site)/[year]/page')).default;

    await expect(
      YearPage({
        params: Promise.resolve({ year: '2025%20draft' }),
      })
    ).rejects.toThrow(`redirect:${buildYearHref('2025 Published')}`);

    expect(mockGetYearByLabel).toHaveBeenCalledWith('2025 draft');
    expect(mockRedirect).toHaveBeenCalledWith(buildYearHref('2025 Published'));
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
