import { validateData, ValidationRules } from '../../src/lib/validation';
import { ValidationError } from '../../src/lib/errors';

describe('validation helpers', () => {
  it('validates required string with min/max length', () => {
    const rules = [ValidationRules.string('title', true, 3, 10)];
    expect(() => validateData({ title: 'okay' }, rules)).not.toThrow();
    expect(() => validateData({ title: 'no' }, rules)).toThrow(ValidationError);
    expect(() => validateData({ title: 'this title is too long' }, rules)).toThrow(ValidationError);
  });

  it('validates uuid, url and email', () => {
    const rules = [
      ValidationRules.uuid('id'),
      ValidationRules.url('link'),
      { field: 'email', type: 'email', required: true } as const,
    ];
    expect(() => validateData({ id: '550e8400-e29b-41d4-a716-446655440000', link: 'https://example.com', email: 'a@b.co' }, rules)).not.toThrow();
    expect(() => validateData({ id: 'not-uuid', link: 'ftp://bad', email: 'nope' }, rules)).toThrow(ValidationError);
  });

  it('validates orderIndex pattern', () => {
    const rules = [ValidationRules.orderIndex('order')];
    expect(() => validateData({ order: '2024-12-31T23:59:59Z' }, rules)).not.toThrow();
    expect(() => validateData({ order: 'abc-123' }, rules)).not.toThrow();
    expect(() => validateData({ order: 'bad value' }, rules)).toThrow(ValidationError);
  });
});
