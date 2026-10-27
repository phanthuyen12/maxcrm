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
    if (!input.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email ?? '') || !input.password || input.password.length < 6 || !Object.values(Role).includes(input.role)) {
      throw new BadRequestException('Vui lòng nhập họ tên, email hợp lệ, mật khẩu tối thiểu 6 ký tự và vai trò');
    }
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Email này đã được sử dụng');
    return this.prisma.user.create({
      data: { name: input.name.trim(), email: input.email.trim().toLowerCase(), passwordHash: await bcrypt.hash(input.password, 10), role: input.role },
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

  updateAvailability(id: string, dto: UpdateAvailabilityDto) {
    return this.prisma.user.update({ where: { id }, data: dto, select: baseSelect });
  }
}
