import { prisma } from '@orbis-fidei/database';
import type { SourceInput } from '@orbis-fidei/validation';

export class SourceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'SourceError';
  }
}

export function listSources() {
  return prisma.source.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getSource(id: string) {
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) throw new SourceError('Source introuvable.', 404);
  return source;
}

export async function createSource(input: SourceInput) {
  const existing = await prisma.source.findUnique({ where: { url: input.url } });
  if (existing) throw new SourceError('Une source avec cette URL existe déjà.', 409);
  return prisma.source.create({ data: input });
}

export async function updateSource(id: string, input: Partial<SourceInput>) {
  await getSource(id);
  return prisma.source.update({ where: { id }, data: input });
}

export async function deleteSource(id: string): Promise<void> {
  await getSource(id);
  await prisma.source.delete({ where: { id } });
}
