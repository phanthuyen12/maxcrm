import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.messageTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: CreateTemplateDto, createdById: string) {
    return this.prisma.messageTemplate.create({
      data: { ...dto, createdById },
    });
  }

  async update(id: string, dto: Partial<CreateTemplateDto>) {
    await this.findOne(id);
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }

  async findOne(id: string) {
    const template = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu tin nhắn');
    return template;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { success: true };
  }
}
