import { Module } from '@nestjs/common';
import { SocialChannelsController } from './social-channels.controller';
import { SocialChannelsService } from './social-channels.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({ imports: [WebhooksModule], controllers: [SocialChannelsController], providers: [SocialChannelsService] })
export class SocialChannelsModule {}
