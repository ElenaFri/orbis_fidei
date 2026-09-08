import { prisma } from '@orbis-fidei/database';
import { slugify } from '@orbis-fidei/validation';

export class ProposalError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ProposalError';
  }
}

const PROPOSAL_INCLUDE = {
  sourceItem: { include: { source: true } },
  reviewedBy: { select: { displayName: true } },
  article: true,
} as const;

export function listPendingProposals() {
  return prisma.articleProposal.findMany({
    where: { status: 'PENDING' },
    include: PROPOSAL_INCLUDE,
    orderBy: [{ importanceScore: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function getProposal(id: string) {
  const proposal = await prisma.articleProposal.findUnique({
    where: { id },
    include: PROPOSAL_INCLUDE,
  });
  if (!proposal) throw new ProposalError('Proposition introuvable.', 404);
  return proposal;
}

export async function acceptProposal(id: string, reviewerId: string) {
  const proposal = await getProposal(id);
  if (proposal.status !== 'PENDING') {
    throw new ProposalError('Cette proposition a déjà été traitée.', 409);
  }

  const title = proposal.suggestedTitle?.trim() || proposal.sourceItem.originalTitle;
  const summary =
    proposal.suggestedSummary?.trim() || proposal.sourceItem.originalContent.slice(0, 500);
  const baseSlug = slugify(title);

  return prisma.$transaction(async (transaction) => {
    let slug = baseSlug;
    let counter = 1;
    while (await transaction.article.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const article = await transaction.article.create({
      data: {
        slug,
        originalLang: proposal.sourceItem.originalLanguage,
        sourceId: proposal.sourceItem.sourceId,
        authorId: reviewerId,
        proposalId: proposal.id,
        translations: {
          create: {
            language: proposal.sourceItem.originalLanguage,
            title,
            summary,
            analysis: 'Analysis pending editorial review.',
          },
        },
      },
      include: { translations: true },
    });

    await transaction.articleProposal.update({
      where: { id: proposal.id },
      data: { status: 'ACCEPTED', reviewedById: reviewerId, reviewedAt: new Date() },
    });

    return article;
  });
}

export async function rejectProposal(id: string, reviewerId: string) {
  const proposal = await getProposal(id);
  if (proposal.status !== 'PENDING') {
    throw new ProposalError('Cette proposition a déjà été traitée.', 409);
  }

  return prisma.articleProposal.update({
    where: { id },
    data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date() },
    include: PROPOSAL_INCLUDE,
  });
}
