-- CreateEnum
CREATE TYPE "EvalMode" AS ENUM ('mock', 'live_openai');

-- AlterTable
ALTER TABLE "EvalRun" ADD COLUMN "mode" "EvalMode" NOT NULL DEFAULT 'mock';
