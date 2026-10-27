import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SocialChannelsService } from './social-channels.service';

@Controller()
export class SocialChannelsController {
  constructor(private service: SocialChannelsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('social-channels')
  list() { return this.service.list(); }

  @UseGuards(JwtAuthGuard)
  @Get('social-channels/options')
  options() { return this.service.options(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('social-channels')
  create(@Body() body: { provider: 'TELEGRAM' | 'FACEBOOK'; name: string; accessToken: string; externalId?: string; appSecret?: string }) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Delete('social-channels/:id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('webhooks/telegram/:id')
  telegram(@Param('id') id: string, @Headers('x-telegram-bot-api-secret-token') secret: string, @Body() body: any) {
    return this.service.receiveTelegram(id, secret, body);
  }

  @Get('webhooks/facebook')
  verifyFacebook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    return this.service.verifyFacebook(mode, token, challenge);
  }

  @Post('webhooks/facebook')
  facebook(@Body() body: any, @Headers('x-hub-signature-256') signature: string, @Req() req: Request & { rawBody?: Buffer }) { return this.service.receiveFacebook(body, signature, req.rawBody); }
}
