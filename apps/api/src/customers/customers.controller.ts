import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(@Query() query: QueryCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.findAll(query, user.userId, user.role);
  }

  @Get('check-duplicate')
  checkDuplicate(@Query('phone') phone: string | undefined, @Query('zaloUserId') zaloUserId: string | undefined, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.checkDuplicate(phone, zaloUserId, user.userId, user.role);
  }

  @Get('export')
  async export(@Res() res: Response, @CurrentUser() user: CurrentUserPayload) {
    const csv = await this.customersService.exportCsv(user.userId, user.role);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="khach-hang.csv"');
    res.send(csv);
  }

  @Post('import')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    return this.customersService.importCsv(file.buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.findOne(id, user.userId, user.role);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.create(dto, user.userId, user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.update(id, dto, user.userId, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.remove(id, user.userId, user.role);
  }

  @Post(':id/tags/:tagId')
  addTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.addTag(id, tagId, user.userId, user.role);
  }

  @Delete(':id/tags/:tagId')
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.removeTag(id, tagId, user.userId, user.role);
  }

  @Get(':id/notes')
  listNotes(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.listNotes(id, user.userId, user.role);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.addNote(id, user.userId, content, user.role);
  }

  @Get(':id/appointments')
  listAppointments(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.listAppointments(id, user.userId, user.role);
  }

  @Post(':id/appointments')
  addAppointment(
    @Param('id') id: string,
    @Body('title') title: string,
    @Body('startAt') startAt: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.customersService.addAppointment(id, user.userId, title, startAt, user.role);
  }

  @Get(':id/activity')
  listActivity(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.customersService.listActivity(id, user.userId, user.role);
  }
}
