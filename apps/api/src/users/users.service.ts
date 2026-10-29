import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

const baseSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  isAcceptingChats: true,
  maxConcurrentChats: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: baseSelect,
      orderBy: { name: 'asc' },
    });

    const loads = await this.prisma.conversation.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { not: null }, status: { not: 'RESOLVED' } },
      _count: true,
    });
    const loadByUser = new Map(loads.map((l) => [l.assignedToId as string, l._count]));

    return users.map((u) => ({
      ...u,
      activeConversationCount: loadByUser.get(u.id) ?? 0,
    }));
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: baseSelect });
  }

  findAllForManagement(actorRole: Role = Role.ADMIN) {
    return this.prisma.user.findMany({
      where: actorRole === Role.MANAGER ? { role: Role.AGENT } : {},
      select: { ...baseSelect, isActive: true, createdAt: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createMember(input: { name: string; email: string; password: string; role: Role }, actorRole: Role = Role.ADMIN) {
    if (actorRole === Role.MANAGER && input.role !== Role.AGENT) throw new BadRequestException('Quản lý chỉ được tạo tài khoản nhân viên');
    const normalizedEmail = (input.email ?? '').trim().toLowerCase();
    const cleanPassword = (input.password ?? '').trim();
    if (!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || cleanPassword.length < 6 || !Object.values(Role).includes(input.role)) {
      throw new BadRequestException('Vui lòng nhập họ tên, email hợp lệ, mật khẩu tối thiểu 6 ký tự và vai trò');
    }
    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw new ConflictException('Email này đã được sử dụng');
    return this.prisma.user.create({
      data: { name: input.name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(cleanPassword, 10), role: input.role },
      select: { ...baseSelect, isActive: true, createdAt: true },
    });
  }

  async setMemberActive(id: string, isActive: boolean, actorId: string, actorRole: Role = Role.ADMIN) {
    if (id === actorId && !isActive) throw new ConflictException('Không thể vô hiệu hóa tài khoản đang đăng nhập');
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!exists) throw new NotFoundException('Không tìm thấy thành viên');
    if (actorRole === Role.MANAGER && exists.role !== Role.AGENT) throw new BadRequestException('Quản lý chỉ được quản lý tài khoản nhân viên');
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: { ...baseSelect, isActive: true, createdAt: true } });
  }

  async updateMember(
    id: string,
    input: { name?: string; email?: string; password?: string; role?: Role },
    actorId: string,
    actorRole: Role = Role.ADMIN,
  ) {
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!exists) throw new NotFoundException('Không tìm thấy thành viên');

    if (id !== actorId && actorRole === Role.MANAGER && exists.role !== Role.AGENT) {
      throw new BadRequestException('Quản lý chỉ được cập nhật tài khoản nhân viên');
    }

    const data: { name?: string; email?: string; passwordHash?: string; role?: Role } = {};

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      if (!trimmedName) throw new BadRequestException('Vui lòng nhập họ tên');
      data.name = trimmedName;
    }

    if (input.email !== undefined) {
      const trimmedEmail = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new BadRequestException('Email không hợp lệ');
      }
      const conflict = await this.prisma.user.findFirst({
        where: { email: trimmedEmail, NOT: { id } },
        select: { id: true },
      });
      if (conflict) throw new ConflictException('Email này đã được sử dụng');
      data.email = trimmedEmail;
    }

    if (input.password !== undefined && input.password.trim() !== '') {
      const cleanPassword = input.password.trim();
      if (cleanPassword.length < 6) {
        throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
      }
      data.passwordHash = await bcrypt.hash(cleanPassword, 10);
    }

    if (input.role !== undefined && input.role !== exists.role) {
      if (id === actorId) {
        throw new BadRequestException('Không thể tự thay đổi vai trò của tài khoản đang đăng nhập');
      }
      if (!Object.values(Role).includes(input.role)) {
        throw new BadRequestException('Vai trò không hợp lệ');
      }
      if (actorRole === Role.MANAGER && input.role !== Role.AGENT) {
        throw new BadRequestException('Quản lý chỉ được gán vai trò nhân viên');
      }
      data.role = input.role;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: { ...baseSelect, isActive: true, createdAt: true },
    });
  }

  async deleteMember(id: string, actorId: string, actorRole: Role = Role.ADMIN) {
    if (id === actorId) throw new ConflictException('Không thể xóa tài khoản đang đăng nhập');
    const exists = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!exists) throw new NotFoundException('Không tìm thấy thành viên');
    if (actorRole === Role.MANAGER && exists.role !== Role.AGENT) {
      throw new BadRequestException('Quản lý chỉ được xóa tài khoản nhân viên');
    }

    await this.prisma.$transaction([
      this.prisma.customer.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      this.prisma.conversation.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
      this.prisma.message.updateMany({ where: { senderId: id }, data: { senderId: null } }),
      this.prisma.activityLog.updateMany({ where: { actorId: id }, data: { actorId: null } }),
      this.prisma.note.updateMany({ where: { authorId: id }, data: { authorId: actorId } }),
      this.prisma.appointment.updateMany({ where: { staffId: id }, data: { staffId: actorId } }),
      this.prisma.deal.updateMany({ where: { ownerId: id }, data: { ownerId: actorId } }),
      this.prisma.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: actorId } }),
      this.prisma.messageTemplate.updateMany({ where: { createdById: id }, data: { createdById: actorId } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  updateAvailability(id: string, dto: UpdateAvailabilityDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: baseSelect });
  }
}
