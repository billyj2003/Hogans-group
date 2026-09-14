/*
  Warnings:

  - You are about to drop the column `accountId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `docketNumber` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `expectedDate` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `material` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `siteAddress` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Delivery` table. All the data in the column will be lost.
  - Added the required column `jobId` to the `Delivery` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "material" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL,
    "docketNumber" TEXT,
    "expectedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Job_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "quantity" REAL NOT NULL,
    "deliveredQuantity" REAL,
    "vehicleReg" TEXT,
    "driverId" TEXT,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" DATETIME,
    "onSiteAt" DATETIME,
    "unloadingAt" DATETIME,
    "deliveredAt" DATETIME,
    "podSignedBy" TEXT,
    "podPhotoUrl" TEXT,
    "podNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Delivery" ("createdAt", "deliveredAt", "deliveredQuantity", "dispatchedAt", "driverId", "id", "onSiteAt", "orderedAt", "podNote", "podPhotoUrl", "podSignedBy", "quantity", "status", "unloadingAt", "vehicleReg") SELECT "createdAt", "deliveredAt", "deliveredQuantity", "dispatchedAt", "driverId", "id", "onSiteAt", "orderedAt", "podNote", "podPhotoUrl", "podSignedBy", "quantity", "status", "unloadingAt", "vehicleReg" FROM "Delivery";
DROP TABLE "Delivery";
ALTER TABLE "new_Delivery" RENAME TO "Delivery";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
