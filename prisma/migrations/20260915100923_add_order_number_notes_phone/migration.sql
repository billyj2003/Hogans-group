-- AlterTable
ALTER TABLE "Account" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "notes" TEXT,
ADD COLUMN "orderNumber" SERIAL;

-- CreateIndex
ALTER TABLE "Job" ADD CONSTRAINT "Job_orderNumber_key" UNIQUE ("orderNumber");
