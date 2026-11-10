-- CreateTable
CREATE TABLE `AiBotDocument` (
    `id` VARCHAR(191) NOT NULL,
    `aiBotId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `charCount` INTEGER NOT NULL,
    `chunkCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiBotDocument_aiBotId_idx`(`aiBotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiBotChunk` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `vector` TEXT NOT NULL,
    `order` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiBotChunk_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiBotDocument` ADD CONSTRAINT `AiBotDocument_aiBotId_fkey` FOREIGN KEY (`aiBotId`) REFERENCES `AiBot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiBotChunk` ADD CONSTRAINT `AiBotChunk_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `AiBotDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
