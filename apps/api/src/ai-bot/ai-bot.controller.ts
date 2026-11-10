import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AiBotService } from './ai-bot.service';
import { UpsertAiBotDto } from './dto/upsert-ai-bot.dto';
import { TestAiBotDto } from './dto/test-ai-bot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('ai-bot')
export class AiBotController {
  constructor(private aiBotService: AiBotService) {}

  @Get('channels')
  listChannels(@CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.listChannelsWithBots(user.userId, user.role);
  }

  @Get('models/openrouter')
  listOpenRouterModels() {
    return this.aiBotService.listOpenRouterModels();
  }

  @Post('test')
  test(@Body() dto: TestAiBotDto) {
    return this.aiBotService.test(dto);
  }

  @Post(':zaloOAId/bots')
  create(@Param('zaloOAId') zaloOAId: string, @Body() dto: UpsertAiBotDto, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.create(zaloOAId, dto, user.userId, user.role);
  }

  @Get('bots/:botId')
  getBot(@Param('botId') botId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.getBot(botId, user.userId, user.role);
  }

  @Patch('bots/:botId')
  update(@Param('botId') botId: string, @Body() dto: UpsertAiBotDto, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.update(botId, dto, user.userId, user.role);
  }

  @Delete('bots/:botId')
  remove(@Param('botId') botId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.remove(botId, user.userId, user.role);
  }

  @Get('bots/:botId/documents')
  listDocuments(@Param('botId') botId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.listDocuments(botId, user.userId, user.role);
  }

  @Post('bots/:botId/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  uploadDocument(
    @Param('botId') botId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.aiBotService.uploadDocument(botId, file, user.userId, user.role);
  }

  @Delete('documents/:documentId')
  deleteDocument(@Param('documentId') documentId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.aiBotService.deleteDocument(documentId, user.userId, user.role);
  }
}
