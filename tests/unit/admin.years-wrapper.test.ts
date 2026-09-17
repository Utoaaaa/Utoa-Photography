import { NextRequest } from 'next/server';
import { adminAuthError } from '@/lib/auth';
import { POST as sharedPost } from '@/lib/api-handlers/years';
import { POST } from '@/app/api/admin/years/route';
jest.mock('@/lib/auth', () => ({ adminAuthError: jest.fn() }));
jest.mock('@/lib/api-handlers/years', () => ({ POST: jest.fn() }));

test('admin year creation delegates to the existing audited D1/Prisma implementation', async () => {
  (adminAuthError as jest.Mock).mockResolvedValue(null);
  const result = { status: 201 };
  (sharedPost as jest.Mock).mockResolvedValue(result);
  const request = { method: 'POST' } as NextRequest;
  expect(await POST(request)).toBe(result);
  expect(sharedPost).toHaveBeenCalledWith(request);
});

test('unauthorized creation stops before accessing shared data logic', async () => {
  (sharedPost as jest.Mock).mockClear();
  const denied = { status: 401 };
  (adminAuthError as jest.Mock).mockResolvedValue(denied);
  expect(await POST({ method: 'POST' } as NextRequest)).toBe(denied);
  expect(sharedPost).not.toHaveBeenCalled();
});
