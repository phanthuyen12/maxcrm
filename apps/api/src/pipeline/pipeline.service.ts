import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

const dealInclude = {
  customer: { select: { id: true, name: true, phone: true, avatar: true } },
  owner: { select: { id: true, name: true, avatar: true } },
};

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deal.findMany({
      include: dealInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateDealDto, ownerId: string) {
    const deal = await this.prisma.deal.create({
      data: {
        customerId: dto.customerId,
        value: dto.value,
        note: dto.note,
        stage: (dto.stage as any) ?? 'NEW',
        ownerId: dto.ownerId ?? ownerId,
      },
      include: dealInclude,
    });
    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    await this.findOne(id);
    return this.prisma.deal.update({
      where: { id },
      data: dto as any,
      include: dealInclude,
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Không tìm thấy deal');
    return deal;
  }

  async updateStage(id: string, stage: string, actorId: string) {
    const deal = await this.findOne(id);
    const updated = await this.prisma.deal.update({
      where: { id },
      data: { stage: stage as any },
      include: dealInclude,
    });
    await this.prisma.activityLog.create({
      data: {
        customerId: deal.customerId,
        actorId,
        type: 'stage_changed',
        content: `Chuyển giai đoạn từ "${deal.stage}" sang "${stage}"`,
      },
    });
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.deal.delete({ where: { id } });
    return { success: true };
  }
}
