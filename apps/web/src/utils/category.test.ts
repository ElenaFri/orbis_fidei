import { describe, expect, it } from 'vitest';

import { formatCategoryLabel } from './category.js';

describe('formatCategoryLabel', () => {
  const category = {
    key: 'theology',
    labelFr: 'Théologie',
    labelEn: 'Theology',
    labelRu: 'Богословие',
  };

  it('returns French label when locale is fr', () => {
    expect(formatCategoryLabel(category, 'fr')).toBe('Théologie');
  });

  it('returns English label when locale is en', () => {
    expect(formatCategoryLabel(category, 'en')).toBe('Theology');
  });

  it('returns Russian label when locale is ru', () => {
    expect(formatCategoryLabel(category, 'ru')).toBe('Богословие');
  });

  it('falls back to French or key when translation is missing', () => {
    expect(formatCategoryLabel({ key: 'news', labelFr: 'Actualités' }, 'en')).toBe('Actualités');
    expect(formatCategoryLabel({ key: 'custom' }, 'en')).toBe('custom');
  });
});
