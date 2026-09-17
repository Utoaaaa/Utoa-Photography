import { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { POST as sharedPost } from '@/app/api/years/route';
import { POST } from '@/app/api/admin/years/route';
jest.mock('@/lib/auth', () => ({ isAuthenticated: jest.fn() }));
jest.mock('@/app/api/years/route', () => ({ POST: jest.fn() }));

test('admin year creation delegates to the existing audited D1/Prisma implementation', async () => {
  (isAuthenticated as jest.Mock).mockReturnValue(true);
  const result = { status: 201 };
  (sharedPost as jest.Mock).mockResolvedValue(result);
  const request = { method: 'POST' } as NextRequest;
  expect(await POST(request)).toBe(result);
  expect(sharedPost).toHaveBeenCalledWith(request);
});

test('unauthorized creation stops before accessing shared data logic', async () => {
  (sharedPost as jest.Mock).mockClear();
  (isAuthenticated as jest.Mock).mockReturnValue(false);
  expect((await POST({ method: 'POST' } as NextRequest)).status).toBe(401);
  expect(sharedPost).not.toHaveBeenCalled();
});
