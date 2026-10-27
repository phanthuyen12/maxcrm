import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InboxGateway } from './inbox.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me',
    }),
  ],
  providers: [InboxGateway],
  exports: [InboxGateway],
})
export class GatewayModule {}
