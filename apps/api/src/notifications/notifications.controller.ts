import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { conversation: { select: { id: true, customer: { select: { name: true } } } } },
    });
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.prisma.notification.updateMany({ where: { id, userId: user.userId }, data: { isRead: true } });
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.prisma.notification.updateMany({ where: { userId: user.userId, isRead: false }, data: { isRead: true } });
    return { success: true, count: result.count };
  }
}
