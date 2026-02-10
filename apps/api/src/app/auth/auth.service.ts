import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '@org/data';
import * as bcrypt from 'bcrypt';
import { IsNull, Not, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
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
    private audit: AuditService,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async signup(dto: SignupDto): Promise<{ access_token: string; user: { id: string; email: string; role: Role; organizationId: string | null } }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? Role.Viewer;

    const org = await this.orgRepo.findOne({ where: { id: dto.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    if (role === Role.Admin && org.parentId == null) {
      throw new BadRequestException(
        'Admin must belong to a child organization. Select a sub-organization instead.',
      );
    }

    const organizationId = org.id;

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role,
      organizationId,
    });
    const saved = await this.userRepo.save(user);

    await this.audit.log(
      saved.id,
      saved.organizationId,
      'user:signup',
      'user',
      saved.id,
      { email: saved.email },
    );

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

  /**
   * Returns organisations available for signup based on the selected role.
   * - Owner: all organisations
   * - Admin / Viewer: only child organisations (parentId IS NOT NULL)
   */
  async getOrganisationsForSignup(
    role?: string,
  ): Promise<Pick<Organization, 'id' | 'name' | 'parentId'>[]> {
    const where =
      role === Role.Admin || role === Role.Viewer
        ? { parentId: Not(IsNull()) }
        : {};

    const orgs = await this.orgRepo.find({
      where,
      order: { name: 'ASC' },
      select: ['id', 'name', 'parentId'],
    });

    return orgs;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(user: User): Promise<{ access_token: string }> {
    await this.audit.log(
      user.id,
      user.organizationId ?? null,
      'user:login',
      'user',
      user.id,
      { email: user.email },
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? null,
    };
    const secret = this.config.getOrThrow<string>('JWT_SECRET');
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const access_token = this.jwt.sign(payload, { secret, expiresIn });
    return { access_token };
  }
}
