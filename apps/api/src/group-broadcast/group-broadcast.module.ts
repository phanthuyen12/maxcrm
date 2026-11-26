import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PersonalZaloModule } from '../zalo-personal/zalo-personal.module';
import { GroupBroadcastController } from './group-broadcast.controller';
import { GroupBroadcastService } from './group-broadcast.service';

@Module({
  imports: [PrismaModule, PersonalZaloModule],
  controllers: [GroupBroadcastController],
  providers: [GroupBroadcastService],
  exports: [GroupBroadcastService],
})
export class GroupBroadcastModule {}
