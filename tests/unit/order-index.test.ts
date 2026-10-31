import { compareOrderIndex, maxOrderIndex } from '@/lib/order-index';

describe('order index ordering', () => {
  it('sorts every stored format numerically', () => {
    const values = ['10.0', '000004', '2.0', '0001', '9.0', '2025.0'];
    expect([...values].sort(compareOrderIndex)).toEqual(['0001', '2.0', '000004', '9.0', '10.0', '2025.0']);
  });

  it('falls back to text order for non-numeric or equal values', () => {
    expect(compareOrderIndex('b', 'a')).toBeGreaterThan(0);
    expect(compareOrderIndex('1.0', '1')).toBeGreaterThan(0);
    expect(compareOrderIndex(null, '1')).toBeLessThan(0);
  });

  it('takes the numeric maximum', () => {
    expect(maxOrderIndex(['9.0', '10.0', 'x', null])).toBe(10);
    expect(maxOrderIndex([])).toBe(0);
  });
});
