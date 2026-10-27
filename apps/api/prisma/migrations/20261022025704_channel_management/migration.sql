-- AlterTable
ALTER TABLE `User` ADD COLUMN `isAcceptingChats` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `maxConcurrentChats` INTEGER NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE `ZaloOA` ADD COLUMN `webhookSecret` VARCHAR(191) NULL,
    ADD COLUMN `webhookVerifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `CustomerSource` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomerSource_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TemplateCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
