-- CreateTable
CREATE TABLE `GroupBroadcast` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contentHtml` TEXT NOT NULL,
  `contentText` TEXT NOT NULL,
  `styles` JSON NULL,
  `repeat` ENUM('NONE', 'DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'NONE',
  `repeatDays` VARCHAR(191) NULL,
  `scheduledAt` DATETIME(3) NOT NULL,
  `nextRunAt` DATETIME(3) NULL,
  `lastRunAt` DATETIME(3) NULL,
  `status` ENUM('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELED') NOT NULL DEFAULT 'SCHEDULED',
  `intervalMs` INTEGER NOT NULL DEFAULT 2000,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `GroupBroadcast_accountId_idx` (`accountId`),
  INDEX `GroupBroadcast_status_nextRunAt_idx` (`status`, `nextRunAt`),
  INDEX `GroupBroadcast_createdById_idx` (`createdById`),
  CONSTRAINT `GroupBroadcast_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `PersonalZaloAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `GroupBroadcast_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupBroadcastTarget` (
  `id` VARCHAR(191) NOT NULL,
  `broadcastId` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `groupName` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `GroupBroadcastTarget_broadcastId_groupId_key` (`broadcastId`, `groupId`),
  INDEX `GroupBroadcastTarget_broadcastId_idx` (`broadcastId`),
  CONSTRAINT `GroupBroadcastTarget_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `GroupBroadcast` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupBroadcastRun` (
  `id` VARCHAR(191) NOT NULL,
  `broadcastId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'running',
  `total` INTEGER NOT NULL DEFAULT 0,
  `sent` INTEGER NOT NULL DEFAULT 0,
  `failed` INTEGER NOT NULL DEFAULT 0,
  `results` JSON NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finishedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `GroupBroadcastRun_broadcastId_startedAt_idx` (`broadcastId`, `startedAt`),
  CONSTRAINT `GroupBroadcastRun_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `GroupBroadcast` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
