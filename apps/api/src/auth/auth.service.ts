import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? '').trim().toLowerCase();
    const user =
      (await this.prisma.user.findUnique({ where: { email: normalizedEmail } })) ??
      (normalizedEmail !== (email ?? '').trim()
        ? await this.prisma.user.findUnique({ where: { email: (email ?? '').trim() } })
        : null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const rawPassword = password ?? '';
    const trimmedPassword = rawPassword.trim();
    const matches =
      (await bcrypt.compare(rawPassword, user.passwordHash)) ||
      (trimmedPassword !== rawPassword && (await bcrypt.compare(trimmedPassword, user.passwordHash)));
    if (!matches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  }
}
