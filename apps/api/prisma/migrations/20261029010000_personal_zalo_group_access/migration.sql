CREATE TABLE `PersonalZaloGroupAccess` (
  `id` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `groupName` VARCHAR(191) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `PersonalZaloGroupAccess_accountId_groupId_userId_key` (`accountId`, `groupId`, `userId`),
  INDEX `PersonalZaloGroupAccess_accountId_groupId_idx` (`accountId`, `groupId`),
  INDEX `PersonalZaloGroupAccess_userId_idx` (`userId`),
  CONSTRAINT `PersonalZaloGroupAccess_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `PersonalZaloAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PersonalZaloGroupAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

