-- CreateEnum
CREATE TYPE "SearchMethod" AS ENUM ('GOOGLE_MAPS_REAL', 'GOOGLE_MAPS_API');

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platformUrl" TEXT NOT NULL DEFAULT 'http://localhost:5173',
    "apiUrl" TEXT NOT NULL DEFAULT 'http://localhost:3001',
    "searchMethod" "SearchMethod" NOT NULL DEFAULT 'GOOGLE_MAPS_REAL',
    "googleApiKey" TEXT,
    "extensionAutoLogin" BOOLEAN NOT NULL DEFAULT true,
    "extensionDebugMode" BOOLEAN NOT NULL DEFAULT false,
    "requireSubscription" BOOLEAN NOT NULL DEFAULT false,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "searchRateLimit" INTEGER NOT NULL DEFAULT 10,
    "crawlRateLimit" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
