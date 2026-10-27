import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** CRUD danh mục nhỏ dùng chung cho CustomerSource và TemplateCategory. */
@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  listSources() {
    return this.prisma.customerSource.findMany({ orderBy: { name: 'asc' } });
  }

  createSource(name: string) {
    return this.prisma.customerSource.create({ data: { name } });
  }

  updateSource(id: string, name: string) {
    return this.prisma.customerSource.update({ where: { id }, data: { name } });
  }

  removeSource(id: string) {
    return this.prisma.customerSource.delete({ where: { id } });
  }

  listTemplateCategories() {
    return this.prisma.templateCategory.findMany({ orderBy: { name: 'asc' } });
  }

  createTemplateCategory(name: string) {
    return this.prisma.templateCategory.create({ data: { name } });
  }

  updateTemplateCategory(id: string, name: string) {
    return this.prisma.templateCategory.update({ where: { id }, data: { name } });
  }

  removeTemplateCategory(id: string) {
    return this.prisma.templateCategory.delete({ where: { id } });
  }
}
