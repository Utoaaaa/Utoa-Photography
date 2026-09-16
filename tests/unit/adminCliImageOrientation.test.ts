jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));
import sharp from 'sharp';
import { getImageSize } from '../../tools/admin-cli/src/core/files';

it.each([5, 6, 7, 8])('registers the rendered dimensions for EXIF orientation %i', async orientation => {
  (sharp as unknown as jest.Mock).mockReturnValue({ metadata: async () => ({ width: 7008, height: 4672, orientation }) });
  expect(await getImageSize('/test/photo.jpg')).toEqual({ width: 4672, height: 7008 });
});

it.each([undefined, 1, 2, 3, 4])('preserves dimensions for EXIF orientation %s', async orientation => {
  (sharp as unknown as jest.Mock).mockReturnValue({ metadata: async () => ({ width: 4672, height: 7008, orientation }) });
  expect(await getImageSize('/test/photo.jpg')).toEqual({ width: 4672, height: 7008 });
});
