import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('sources')
  listSources() {
    return this.catalogService.listSources();
  }

  @Post('sources')
  createSource(@Body() dto: CreateCatalogItemDto) {
    return this.catalogService.createSource(dto.name);
  }

  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalogService.updateSource(id, dto.name);
  }

  @Delete('sources/:id')
  removeSource(@Param('id') id: string) {
    return this.catalogService.removeSource(id);
  }

  @Get('template-categories')
  listTemplateCategories() {
    return this.catalogService.listTemplateCategories();
  }

  @Post('template-categories')
  createTemplateCategory(@Body() dto: CreateCatalogItemDto) {
    return this.catalogService.createTemplateCategory(dto.name);
  }

  @Patch('template-categories/:id')
  updateTemplateCategory(@Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.catalogService.updateTemplateCategory(id, dto.name);
  }

  @Delete('template-categories/:id')
  removeTemplateCategory(@Param('id') id: string) {
    return this.catalogService.removeTemplateCategory(id);
  }
}
