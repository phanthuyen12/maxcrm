import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  assignee: { select: { id: true, name: true, avatar: true } },
  customer: { select: { id: true, name: true, avatar: true } },
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: { assigneeId?: string; status?: string; overdue?: string }) {
    const where: Prisma.TaskWhereInput = {
      ...(filter.assigneeId ? { assigneeId: filter.assigneeId } : {}),
      ...(filter.status ? { status: filter.status as any } : {}),
      ...(filter.overdue === 'true'
        ? { status: 'TODO', dueAt: { lt: new Date() } }
        : {}),
    };
    return this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { dueAt: 'asc' },
    });
  }

  create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        customerId: dto.customerId,
        assigneeId: dto.assigneeId,
        dueAt: new Date(dto.dueAt),
        priority: (dto.priority as any) ?? 'MEDIUM',
      },
      include: taskInclude,
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) throw new NotFoundException('Không tìm thấy công việc');
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      } as any,
      include: taskInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }
}
