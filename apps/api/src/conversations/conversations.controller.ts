import {
  Body,
  Controller,
  Get,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ConversationsService } from './conversations.service';
import { QueryConversationDto } from './dto/query-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const directory = join(process.cwd(), 'uploads');
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!/^(image\/(jpeg|png|gif|webp)|application\/pdf|text\/plain|application\/(zip|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)))$/.test(file.mimetype)) {
        return callback(new BadRequestException('Định dạng không hỗ trợ (chỉ nhận ảnh, PDF, TXT, ZIP, Word, Excel và PowerPoint)'), false);
      }
      callback(null, true);
    },
  }))
  uploadAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp hợp lệ');
    return { url: `/uploads/${file.filename}`, name: file.originalname, mimeType: file.mimetype, size: file.size, type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE' };
  }

  @Get()
  findAll(@Query() query: QueryConversationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.findAll(query, user.userId, user.role);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.unreadCount(user.userId, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.findOne(id, user.userId, user.role);
  }

  @Get(':id/messages')
  findMessages(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.conversationsService.findMessages(
      id,
      user.userId,
      user.role,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 30,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConversationDto, @CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.update(id, dto, user.userId, user.role);
  }

  @Patch(':id/pin')
  setPinned(@Param('id') id: string, @Body('pinned') pinned: boolean, @CurrentUser() user: CurrentUserPayload) {
    if (typeof pinned !== 'boolean') throw new BadRequestException('pinned phải là true hoặc false');
    return this.conversationsService.setPinned(id, pinned, user.userId, user.role);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.conversationsService.markRead(id, user.userId, user.role);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conversationsService.sendMessage(
      id,
      user.userId,
      dto.content,
      dto.type,
      dto.attachmentUrl,
      user.role,
    );
  }
}
