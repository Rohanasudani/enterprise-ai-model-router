-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('heuristic', 'llm_judge');

-- AlterTable
ALTER TABLE "EvalResult" ADD COLUMN "scoreSource" "ScoreSource" NOT NULL DEFAULT 'heuristic',
ADD COLUMN "judgeModelId" TEXT,
ADD COLUMN "judgeExplanation" TEXT,
ADD COLUMN "judgedAt" TIMESTAMP(3);
