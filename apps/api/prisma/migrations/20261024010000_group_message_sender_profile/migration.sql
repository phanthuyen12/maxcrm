ALTER TABLE `Message`
  ADD COLUMN `externalSenderId` VARCHAR(191) NULL,
  ADD COLUMN `externalSenderName` VARCHAR(191) NULL,
  ADD COLUMN `externalSenderAvatar` TEXT NULL;
