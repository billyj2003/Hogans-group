-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "material" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "deliveredQuantity" REAL,
    "unit" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL,
    "docketNumber" TEXT,
    "vehicleReg" TEXT,
    "driverId" TEXT,
    "orderedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME,
    "dispatchedAt" DATETIME,
    "onSiteAt" DATETIME,
    "unloadingAt" DATETIME,
    "deliveredAt" DATETIME,
    "podSignedBy" TEXT,
    "podPhotoUrl" TEXT,
    "podNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Delivery" ("accountId", "createdAt", "deliveredAt", "deliveredQuantity", "dispatchedAt", "docketNumber", "driverId", "expectedDate", "id", "material", "onSiteAt", "orderedAt", "podNote", "podPhotoUrl", "podSignedBy", "quantity", "siteAddress", "status", "unit", "unloadingAt", "vehicleReg") SELECT "accountId", "createdAt", "deliveredAt", "deliveredQuantity", "dispatchedAt", "docketNumber", "driverId", "expectedDate", "id", "material", "onSiteAt", "orderedAt", "podNote", "podPhotoUrl", "podSignedBy", "quantity", "siteAddress", "status", "unit", "unloadingAt", "vehicleReg" FROM "Delivery";
DROP TABLE "Delivery";
ALTER TABLE "new_Delivery" RENAME TO "Delivery";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
