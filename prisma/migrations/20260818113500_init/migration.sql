-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('coding', 'summarization', 'reasoning', 'support');

-- CreateTable
CREATE TABLE "ModelProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "contextWindow" INTEGER NOT NULL,
    "inputCostPerMTok" DOUBLE PRECISION NOT NULL,
    "outputCostPerMTok" DOUBLE PRECISION NOT NULL,
    "medianLatencyMs" INTEGER NOT NULL,
    "qualityScore" INTEGER NOT NULL,
    "taskScores" JSONB NOT NULL,
    "strengths" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptCase" (
    "id" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rubric" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalRun" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalResult" (
    "id" TEXT NOT NULL,
    "evalRunId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalCostUsd" DOUBLE PRECISION NOT NULL,
    "rubricScores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvalResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouterDecision" (
    "id" TEXT NOT NULL,
    "evalRunId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "routerScore" INTEGER NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouterDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelProfile_provider_idx" ON "ModelProfile"("provider");

-- CreateIndex
CREATE INDEX "PromptCase_dataset_idx" ON "PromptCase"("dataset");

-- CreateIndex
CREATE INDEX "PromptCase_taskType_idx" ON "PromptCase"("taskType");

-- CreateIndex
CREATE INDEX "EvalRun_promptId_idx" ON "EvalRun"("promptId");

-- CreateIndex
CREATE INDEX "EvalRun_createdAt_idx" ON "EvalRun"("createdAt");

-- CreateIndex
CREATE INDEX "EvalResult_evalRunId_idx" ON "EvalResult"("evalRunId");

-- CreateIndex
CREATE INDEX "EvalResult_modelId_idx" ON "EvalResult"("modelId");

-- CreateIndex
CREATE INDEX "EvalResult_promptId_idx" ON "EvalResult"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "RouterDecision_evalRunId_key" ON "RouterDecision"("evalRunId");

-- CreateIndex
CREATE INDEX "RouterDecision_modelId_idx" ON "RouterDecision"("modelId");

-- AddForeignKey
ALTER TABLE "EvalResult" ADD CONSTRAINT "EvalResult_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "EvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalResult" ADD CONSTRAINT "EvalResult_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ModelProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalResult" ADD CONSTRAINT "EvalResult_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouterDecision" ADD CONSTRAINT "RouterDecision_evalRunId_fkey" FOREIGN KEY ("evalRunId") REFERENCES "EvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
