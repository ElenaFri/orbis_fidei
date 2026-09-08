-- Add transparent AI preselection metadata without changing moderation status.
ALTER TABLE "ArticleProposal"
ADD COLUMN "importanceScore" DOUBLE PRECISION,
ADD COLUMN "importanceLevel" TEXT,
ADD COLUMN "importanceReason" TEXT;

CREATE INDEX "ArticleProposal_importanceScore_createdAt_idx"
ON "ArticleProposal"("importanceScore", "createdAt");
