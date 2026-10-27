import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pipeline/deals')
export class PipelineController {
  constructor(private pipelineService: PipelineService) {}

  @Get()
  findAll() {
    return this.pipelineService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() user: CurrentUserPayload) {
    return this.pipelineService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.pipelineService.update(id, dto);
  }

  @Patch(':id/stage')
  updateStage(
    @Param('id') id: string,
    @Body('stage') stage: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.pipelineService.updateStage(id, stage, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pipelineService.remove(id);
  }
}
