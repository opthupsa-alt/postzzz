-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "defaultCountry" TEXT NOT NULL DEFAULT 'SA',
ADD COLUMN     "maxSearchResults" INTEGER NOT NULL DEFAULT 30;
