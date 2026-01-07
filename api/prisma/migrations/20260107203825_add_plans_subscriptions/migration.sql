/*
  Warnings:

  - You are about to drop the column `displayName` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `maxLeads` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `maxMessages` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `maxSearches` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `maxUsers` on the `plans` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `plans` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - The `features` column on the `plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `nameAr` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearlyPrice` to the `plans` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('SEATS', 'LEADS', 'SEARCHES', 'MESSAGES');

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "displayName",
DROP COLUMN "maxLeads",
DROP COLUMN "maxMessages",
DROP COLUMN "maxSearches",
DROP COLUMN "maxUsers",
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'SAR',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadsLimit" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "messagesLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "nameAr" TEXT NOT NULL,
ADD COLUMN     "searchesLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "seatsLimit" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "yearlyPrice" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "features",
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "usage_counters_tenantId_idx" ON "usage_counters"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_tenantId_metric_period_key" ON "usage_counters"("tenantId", "metric", "period");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
