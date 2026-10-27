import { Module } from '@nestjs/common';
import { PersonalZaloController } from './zalo-personal.controller';
import { PersonalZaloService } from './zalo-personal.service';
import { PersonalZaloAccountsService } from './personal-zalo-accounts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  controllers: [PersonalZaloController],
  imports: [PrismaModule, GatewayModule],
  providers: [PersonalZaloService, PersonalZaloAccountsService],
  exports: [PersonalZaloService, PersonalZaloAccountsService],
})
export class PersonalZaloModule {}
