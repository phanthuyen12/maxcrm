-- CreateIndex (add a plain index first so the FK constraint has something to use)
CREATE INDEX `AiBot_zaloOAId_idx` ON `AiBot`(`zaloOAId`);

-- DropIndex (remove the 1-bot-per-channel constraint, now safe since AiBot_zaloOAId_idx covers the FK)
ALTER TABLE `AiBot` DROP INDEX `AiBot_zaloOAId_key`;

-- AlterTable
ALTER TABLE `AiBot` ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Bot mới';
