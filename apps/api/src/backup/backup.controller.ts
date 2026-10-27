import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BackupService } from './backup.service';

@Controller('admin/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  @Get()
  async download(@Res() response: Response) {
    const backup = await this.backup.createBackup();
    const date = new Date().toISOString().slice(0, 10);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="maxcrm-backup-${date}.json"`);
    response.json(backup);
  }
}
