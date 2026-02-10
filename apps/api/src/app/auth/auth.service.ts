import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@org/data';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Organization, User } from '../entities';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async signup(dto: SignupDto): Promise<{ access_token: string; user: { id: string; email: string; role: Role; organizationId: string } }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? Role.Viewer;

    let organizationId: string;
    if (dto.organizationId) {
      const org = await this.orgRepo.findOne({ where: { id: dto.organizationId } });
      if (!org) throw new ConflictException('Organization not found');
      organizationId = org.id;
    } else {
      const org = this.orgRepo.create({ name: 'Default', parentId: null });
      const saved = await this.orgRepo.save(org);
      organizationId = saved.id;
    }

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role,
      organizationId,
    });
    const saved = await this.userRepo.save(user);

    const token = await this.login(saved);
    return {
      access_token: token.access_token,
      user: {
        id: saved.id,
        email: saved.email,
        role: saved.role as Role,
        organizationId: saved.organizationId,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(user: User): Promise<{ access_token: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const access_token = this.jwt.sign(payload, { secret, expiresIn });
    return { access_token };
  }
}
