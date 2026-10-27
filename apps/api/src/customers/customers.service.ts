import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

const customerInclude = {
  assignedTo: { select: { id: true, name: true, avatar: true } },
  tags: { include: { tag: true } },
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryCustomerDto, userId: string, role: string) {
    const page = Math.max(parseInt(query.page ?? '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize ?? '20', 10), 1), 100);

    const where: Prisma.CustomerWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
      ...(role === 'AGENT'
        ? { assignedToId: userId }
        : query.assignedToId
        ? query.assignedToId === 'unassigned'
          ? { assignedToId: null }
          : { assignedToId: query.assignedToId }
        : {}),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: customerInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string, userId?: string, role?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        ...customerInclude,
        deals: true,
        appointments: { orderBy: { startAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng');
    if (role === 'AGENT' && customer.assignedToId !== userId) throw new NotFoundException('Không tìm thấy khách hàng');
    return customer;
  }

  async create(dto: CreateCustomerDto, userId: string, role: string) {
    const customer = await this.prisma.customer.create({
      data: { ...dto, ...(role === 'AGENT' ? { assignedToId: userId } : {}) } as any,
      include: customerInclude,
    });
    await this.logActivity(customer.id, null, 'customer_created', `Khách hàng "${customer.name}" được tạo`);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId: string, role: string) {
    await this.findOne(id, userId, role);
    return this.prisma.customer.update({
      where: { id },
      data: { ...dto, ...(role === 'AGENT' ? { assignedToId: userId } : {}) } as any,
      include: customerInclude,
    });
  }

  async remove(id: string, userId: string, role: string) {
    await this.findOne(id, userId, role);
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }

  async checkDuplicate(phone: string | undefined, zaloUserId: string | undefined, userId: string, role: string) {
    if (!phone && !zaloUserId) return { duplicates: [] };
    const duplicates = await this.prisma.customer.findMany({
      where: {
        ...(role === 'AGENT' ? { assignedToId: userId } : {}),
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(zaloUserId ? [{ zaloUserId }] : []),
        ],
      },
      select: { id: true, name: true, phone: true, zaloUserId: true, avatar: true },
    });
    return { duplicates };
  }

  async addTag(customerId: string, tagId: string, userId: string, role: string) {
    await this.findOne(customerId, userId, role);
    await this.prisma.customerTag.upsert({
      where: { customerId_tagId: { customerId, tagId } },
      update: {},
      create: { customerId, tagId },
    });
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    await this.logActivity(customerId, null, 'tag_added', `Gắn nhãn "${tag?.name}"`);
    return { success: true };
  }

  async removeTag(customerId: string, tagId: string, userId: string, role: string) {
    await this.findOne(customerId, userId, role);
    await this.prisma.customerTag.delete({
      where: { customerId_tagId: { customerId, tagId } },
    });
    return { success: true };
  }

  async listNotes(customerId: string, userId: string, role: string) {
    await this.findOne(customerId, userId, role);
    return this.prisma.note.findMany({
      where: { customerId },
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNote(customerId: string, authorId: string, content: string, role: string) {
    await this.findOne(customerId, authorId, role);
    const note = await this.prisma.note.create({
      data: { customerId, authorId, content },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
    await this.logActivity(customerId, authorId, 'note_added', content);
    return note;
  }

  async listAppointments(customerId: string, userId: string, role: string) {
    await this.findOne(customerId, userId, role);
    return this.prisma.appointment.findMany({
      where: { customerId },
      include: { staff: { select: { id: true, name: true, avatar: true } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async addAppointment(
    customerId: string,
    staffId: string,
    title: string,
    startAt: string,
    role: string,
  ) {
    await this.findOne(customerId, staffId, role);
    const appointment = await this.prisma.appointment.create({
      data: { customerId, staffId, title, startAt: new Date(startAt) },
    });
    await this.logActivity(
      customerId,
      staffId,
      'appointment_created',
      `Tạo lịch hẹn "${title}"`,
    );
    return appointment;
  }

  async listActivity(customerId: string, userId: string, role: string) {
    await this.findOne(customerId, userId, role);
    return this.prisma.activityLog.findMany({
      where: { customerId },
      include: { actor: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async logActivity(
    customerId: string,
    actorId: string | null,
    type: string,
    content: string,
  ) {
    return this.prisma.activityLog.create({
      data: { customerId, actorId, type, content },
    });
  }

  async exportCsv(userId: string, role: string) {
    const customers = await this.prisma.customer.findMany({
      where: role === 'AGENT' ? { assignedToId: userId } : undefined,
      include: { assignedTo: { select: { name: true } }, tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const rows = customers.map((c) => ({
      ten: c.name,
      sdt: c.phone ?? '',
      nguon: c.source,
      trang_thai: c.status,
      nguoi_phu_trach: c.assignedTo?.name ?? '',
      nhan: c.tags.map((t) => t.tag.name).join('|'),
      ngay_tao: c.createdAt.toISOString(),
    }));
    return stringify(rows, { header: true });
  }

  async importCsv(buffer: Buffer) {
    const rows: any[] = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
    let success = 0;
    let duplicated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = row.ten || row.name;
      const phone = row.sdt || row.phone || undefined;
      if (!name) {
        failed++;
        errors.push(`Thiếu tên ở dòng: ${JSON.stringify(row)}`);
        continue;
      }
      if (phone) {
        const existing = await this.prisma.customer.findUnique({ where: { phone } });
        if (existing) {
          duplicated++;
          continue;
        }
      }
      try {
        await this.prisma.customer.create({
          data: {
            name,
            phone,
            source: row.nguon || row.source || 'Import',
          },
        });
        success++;
      } catch (e) {
        failed++;
        errors.push(`Lỗi ở dòng "${name}": ${(e as Error).message}`);
      }
    }

    return { success, duplicated, failed, total: rows.length, errors };
  }
}
