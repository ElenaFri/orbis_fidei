import { prisma } from '@orbis-fidei/database';
import type { CategoryInput } from '@orbis-fidei/validation';

export class CategoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { key: 'asc' } });
}

export async function getCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new CategoryError('Catégorie introuvable.', 404);
  return category;
}

export async function createCategory(input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { key: input.key } });
  if (existing) throw new CategoryError('Une catégorie avec cette clé existe déjà.', 409);
  return prisma.category.create({ data: input });
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  await getCategory(id);
  return prisma.category.update({ where: { id }, data: input });
}

export async function deleteCategory(id: string): Promise<void> {
  await getCategory(id);
  await prisma.category.delete({ where: { id } });
}
