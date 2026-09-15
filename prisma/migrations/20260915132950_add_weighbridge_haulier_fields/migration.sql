-- AlterTable
ALTER TABLE "Delivery"
ADD COLUMN "haulierName" TEXT,
ADD COLUMN "despatchedBy" TEXT,
ADD COLUMN "loadNumber" TEXT,
ADD COLUMN "grossWeight" DOUBLE PRECISION,
ADD COLUMN "tareWeight" DOUBLE PRECISION,
ADD COLUMN "temperature" DOUBLE PRECISION;
