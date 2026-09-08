import type { PrismaClient } from '@orbis-fidei/database';

export interface SourceItemForAnalysis {
  id: string;
  originalTitle: string;
  originalContent: string;
  originalLanguage: 'FR' | 'EN' | 'RU';
}

export interface AnalysisResult {
  language: 'FR' | 'EN' | 'RU';
  suggestedTitle: string;
  suggestedSummary: string;
  suggestedCategory: string;
  confidence: number;
  importanceScore: number;
  importanceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  importanceReason: string;
}

export interface AIProvider {
  analyze(item: SourceItemForAnalysis): Promise<AnalysisResult>;
}

export interface AnalyzerDependencies {
  prisma: PrismaClient;
  provider: AIProvider;
  now?: () => Date;
  maxAttempts?: number;
}

export class AnalyzerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalyzerError';
  }
}

const SOURCE_ITEM_SELECT = {
  id: true,
  originalTitle: true,
  originalContent: true,
  originalLanguage: true,
} as const;

function normalizeResult(result: AnalysisResult): AnalysisResult {
  const confidence = Math.min(1, Math.max(0, Number(result.confidence) || 0));
  const importanceScore = Math.min(1, Math.max(0, Number(result.importanceScore) || 0));
  let importanceLevel: AnalysisResult['importanceLevel'];
  if (['HIGH', 'MEDIUM', 'LOW'].includes(result.importanceLevel)) {
    importanceLevel = result.importanceLevel;
  } else if (importanceScore >= 0.7) {
    importanceLevel = 'HIGH';
  } else if (importanceScore >= 0.4) {
    importanceLevel = 'MEDIUM';
  } else {
    importanceLevel = 'LOW';
  }
  if (!result.suggestedTitle.trim() || !result.suggestedSummary.trim()) {
    throw new AnalyzerError('AI provider returned an empty title or summary.');
  }
  return {
    language: result.language,
    suggestedTitle: result.suggestedTitle.trim(),
    suggestedSummary: result.suggestedSummary.trim(),
    suggestedCategory: result.suggestedCategory.trim() || 'other',
    confidence,
    importanceScore,
    importanceLevel,
    importanceReason: String(result.importanceReason ?? '').trim() || 'No reason provided.',
  };
}

export async function analyzeSourceItem(
  sourceItemId: string,
  dependencies: AnalyzerDependencies,
): Promise<{ proposalId: string; created: boolean }> {
  const sourceItem = await dependencies.prisma.sourceItem.findUnique({
    where: { id: sourceItemId },
    select: SOURCE_ITEM_SELECT,
  });
  if (!sourceItem) throw new AnalyzerError(`Source item not found: ${sourceItemId}`);

  const existing = await dependencies.prisma.articleProposal.findFirst({
    where: { sourceItemId },
    select: { id: true },
  });
  if (existing) return { proposalId: existing.id, created: false };

  const maxAttempts = dependencies.maxAttempts ?? 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = normalizeResult(await dependencies.provider.analyze(sourceItem));
      const proposal = await dependencies.prisma.articleProposal.create({
        data: {
          sourceItemId,
          suggestedTitle: result.suggestedTitle,
          suggestedSummary: result.suggestedSummary,
          suggestedCategory: result.suggestedCategory,
          confidence: result.confidence,
          importanceScore: result.importanceScore,
          importanceLevel: result.importanceLevel,
          importanceReason: result.importanceReason,
        },
        select: { id: true },
      });
      return { proposalId: proposal.id, created: true };
    } catch (error) {
      lastError = error;
    }
  }

  throw new AnalyzerError(
    `Analysis failed after ${maxAttempts} attempt(s): ${lastError instanceof Error ? lastError.message : 'unknown error'}`,
  );
}

export async function analyzePendingSourceItems(
  dependencies: AnalyzerDependencies,
): Promise<Array<{ proposalId: string; created: boolean }>> {
  const items = await dependencies.prisma.sourceItem.findMany({
    where: { proposals: { none: {} } },
    select: SOURCE_ITEM_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(items.map((item) => analyzeSourceItem(item.id, dependencies)));
}
