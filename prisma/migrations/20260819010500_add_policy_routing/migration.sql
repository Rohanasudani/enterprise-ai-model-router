-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('allow', 'block', 'downgrade', 'escalate');

-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('work_coding', 'work_support', 'work_summary', 'business_reasoning', 'personal', 'sensitive', 'unknown');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL,
    "currentSpendUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyDecision" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "requestedModelId" TEXT NOT NULL,
    "selectedModelId" TEXT,
    "action" "PolicyAction" NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "complexityScore" INTEGER NOT NULL,
    "workRelated" BOOLEAN NOT NULL,
    "estimatedRequestedCostUsd" DOUBLE PRECISION NOT NULL,
    "estimatedRoutedCostUsd" DOUBLE PRECISION NOT NULL,
    "savingsUsd" DOUBLE PRECISION NOT NULL,
    "budgetRemainingUsd" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_teamId_idx" ON "AppUser"("teamId");

-- CreateIndex
CREATE INDEX "PolicyDecision_promptId_idx" ON "PolicyDecision"("promptId");

-- CreateIndex
CREATE INDEX "PolicyDecision_userId_idx" ON "PolicyDecision"("userId");

-- CreateIndex
CREATE INDEX "PolicyDecision_teamId_idx" ON "PolicyDecision"("teamId");

-- CreateIndex
CREATE INDEX "PolicyDecision_action_idx" ON "PolicyDecision"("action");

-- CreateIndex
CREATE INDEX "PolicyDecision_createdAt_idx" ON "PolicyDecision"("createdAt");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDecision" ADD CONSTRAINT "PolicyDecision_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDecision" ADD CONSTRAINT "PolicyDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyDecision" ADD CONSTRAINT "PolicyDecision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
