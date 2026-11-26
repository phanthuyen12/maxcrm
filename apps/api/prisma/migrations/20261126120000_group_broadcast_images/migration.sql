-- CreateTable
CREATE TABLE `GroupBroadcastImage` (
  `id` VARCHAR(191) NOT NULL,
  `broadcastId` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `order` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `GroupBroadcastImage_broadcastId_order_idx` (`broadcastId`, `order`),
  CONSTRAINT `GroupBroadcastImage_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `GroupBroadcast` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
