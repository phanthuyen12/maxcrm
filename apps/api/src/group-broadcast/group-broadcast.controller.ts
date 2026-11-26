import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GroupBroadcastService } from './group-broadcast.service';
import { UpsertGroupBroadcastDto } from './dto/upsert-group-broadcast.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('group-broadcasts')
export class GroupBroadcastController {
  constructor(private readonly broadcasts: GroupBroadcastService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.list(user.userId, user.role);
  }

  @Get('accounts/:accountId/groups')
  groups(@Param('accountId') accountId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.groups(accountId, user.userId, user.role);
  }

  /** Tải ảnh gửi kèm — nhận nhiều ảnh trong một lượt. */
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
        const directory = join(process.cwd(), 'uploads');
        mkdirSync(directory, { recursive: true });
        callback(null, directory);
      },
      filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 10 },
    fileFilter: (_req, file, callback) => {
      if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
        return callback(new BadRequestException('Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF'), false);
      }
      callback(null, true);
    },
  }))
  uploadImages(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('Vui lòng chọn ít nhất một ảnh');
    return files.map((file) => ({ url: `/uploads/${file.filename}`, name: file.originalname, size: file.size }));
  }

  @Post('preview')
  preview(@Body() body: { contentHtml: string }) {
    return this.broadcasts.preview(body?.contentHtml ?? '');
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.get(id, user.userId, user.role);
  }

  @Get(':id/runs')
  runs(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.runs(id, user.userId, user.role);
  }

  @Post()
  create(@Body() dto: UpsertGroupBroadcastDto, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.create(dto, user.userId, user.role);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpsertGroupBroadcastDto, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.update(id, dto, user.userId, user.role);
  }

  @Post(':id/pause')
  pause(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.pause(id, user.userId, user.role);
  }

  @Post(':id/resume')
  resume(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.resume(id, user.userId, user.role);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.cancel(id, user.userId, user.role);
  }

  @Post(':id/run-now')
  runNow(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.runNow(id, user.userId, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.broadcasts.remove(id, user.userId, user.role);
  }
}
