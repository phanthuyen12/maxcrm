-- CreateTable
CREATE TABLE `AiBot` (
    `id` VARCHAR(191) NOT NULL,
    `zaloOAId` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `provider` ENUM('ANTHROPIC', 'OPENAI', 'GOOGLE') NOT NULL DEFAULT 'ANTHROPIC',
    `apiKey` TEXT NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `systemPrompt` TEXT NOT NULL,
    `knowledgeBase` TEXT NULL,
    `temperature` DOUBLE NOT NULL DEFAULT 0.4,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiBot_zaloOAId_key`(`zaloOAId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AiBot` ADD CONSTRAINT `AiBot_zaloOAId_fkey` FOREIGN KEY (`zaloOAId`) REFERENCES `ZaloOA`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
