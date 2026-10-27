-- Bring databases created before the social-channel migration up to the Prisma schema.
ALTER TABLE `ZaloOA`
  ADD COLUMN IF NOT EXISTS `provider` ENUM('ZALO', 'TELEGRAM', 'FACEBOOK') NOT NULL DEFAULT 'ZALO',
  ADD COLUMN IF NOT EXISTS `externalId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `accessToken` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `appSecret` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `botUsername` VARCHAR(191) NULL;

CREATE INDEX IF NOT EXISTS `ZaloOA_provider_idx` ON `ZaloOA`(`provider`);
