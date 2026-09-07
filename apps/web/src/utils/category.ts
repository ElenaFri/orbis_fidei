export interface CategoryLabelItem {
  key: string;
  labelFr?: string;
  labelEn?: string;
  labelRu?: string;
}

export function formatCategoryLabel(category: CategoryLabelItem, locale: string): string {
  if (locale === 'ru') return category.labelRu || category.labelFr || category.key;
  if (locale === 'en') return category.labelEn || category.labelFr || category.key;
  return category.labelFr || category.key;
}
