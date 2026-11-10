import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { AiBotController } from './ai-bot.controller';
import { AiBotService } from './ai-bot.service';

@Module({
  imports: [PrismaModule, ConversationsModule],
  controllers: [AiBotController],
  providers: [AiBotService],
})
export class AiBotModule {}
