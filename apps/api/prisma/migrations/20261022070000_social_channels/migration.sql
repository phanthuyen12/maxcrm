ALTER TABLE `ZaloOA`
  ADD COLUMN `provider` ENUM('ZALO', 'TELEGRAM', 'FACEBOOK') NOT NULL DEFAULT 'ZALO',
  ADD COLUMN `externalId` VARCHAR(191) NULL,
  ADD COLUMN `accessToken` TEXT NULL,
  ADD COLUMN `appSecret` TEXT NULL,
  ADD COLUMN `botUsername` VARCHAR(191) NULL,
  ADD INDEX `ZaloOA_provider_idx`(`provider`);
