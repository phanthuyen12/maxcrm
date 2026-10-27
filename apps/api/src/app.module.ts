import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { TagsModule } from './tags/tags.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ZaloOaModule } from './zalo-oa/zalo-oa.module';
import { ZaloMockModule } from './zalo-mock/zalo-mock.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { TasksModule } from './tasks/tasks.module';
import { TemplatesModule } from './templates/templates.module';
import { ReportsModule } from './reports/reports.module';
import { GatewayModule } from './gateway/gateway.module';
import { JobsModule } from './jobs/jobs.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CatalogModule } from './catalog/catalog.module';
import { SocialChannelsModule } from './social-channels/social-channels.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GatewayModule,
    JobsModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    TagsModule,
    ConversationsModule,
    ZaloOaModule,
    ZaloMockModule,
    PipelineModule,
    TasksModule,
    TemplatesModule,
    ReportsModule,
    WebhooksModule,
    CatalogModule,
    SocialChannelsModule,
    BackupModule,
  ],
})
export class AppModule {}
