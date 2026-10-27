import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() user: CurrentUserPayload) {
    return this.reportsService.overview(user.userId, user.role);
  }

  @Get('conversation-overview')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  conversationOverview() {
    return this.reportsService.conversationOverview();
  }

  @Get('engagement')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  engagement(@Query('days') days?: string) {
    return this.reportsService.engagement(days ? parseInt(days, 10) : 14);
  }

  @Get('staff-performance')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  staffPerformance() {
    return this.reportsService.staffPerformance();
  }

  @Get('pipeline-summary')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  pipelineSummary() {
    return this.reportsService.pipelineSummary();
  }

  @Get('conversation-status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  conversationStatus() {
    return this.reportsService.conversationStatus();
  }

  @Get('customer-growth')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  customerGrowth(@Query('days') days?: string) {
    return this.reportsService.customerGrowth(days ? parseInt(days, 10) : 14);
  }
}
