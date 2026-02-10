import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '@org/data';

// Mock bcrypt — must be hoisted before AuthService import resolves
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockOrgRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockJwtService: Record<string, ReturnType<typeof vi.fn>>;
  let mockConfigService: Record<string, ReturnType<typeof vi.fn>>;
  let mockAuditService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: vi.fn(),
      create: vi.fn((data: Record<string, unknown>) => ({
        id: 'user-1',
        ...data,
      })),
      save: vi.fn((user: Record<string, unknown>) =>
        Promise.resolve({ ...user, id: user['id'] || 'user-1' }),
      ),
    };

    mockOrgRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('jwt-token'),
    };

    mockConfigService = {
      getOrThrow: vi.fn().mockReturnValue('test-secret'),
      get: vi.fn().mockReturnValue('7d'),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue({}),
    };

    // Construct directly — no NestJS DI needed
    service = new (AuthService as any)(
      mockUserRepo,
      mockOrgRepo,
      mockJwtService,
      mockConfigService,
      mockAuditService,
    );
  });

  // ── signup ────────────────────────────────────────────────

  describe('signup', () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      organizationId: 'org-1',
      role: Role.Viewer,
    };

    it('should create user and return access_token + user info', async () => {
      mockUserRepo.findOne.mockResolvedValue(null); // no existing user
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        parentId: 'org-root',
      });

      const result = await service.signup(dto);

      expect(result.access_token).toBe('jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe(Role.Viewer);
      expect(result.user.organizationId).toBe('org-1');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          role: Role.Viewer,
          organizationId: 'org-1',
        }),
      );
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'user:signup',
        'user',
        'user-1',
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when organization not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockOrgRepo.findOne.mockResolvedValue(null);

      await expect(service.signup(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Admin signs up to root org', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', parentId: null }); // root org

      await expect(
        service.signup({ ...dto, role: Role.Admin }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default role to Viewer when not provided', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockOrgRepo.findOne.mockResolvedValue({
        id: 'org-1',
        parentId: 'org-root',
      });

      const { role, ...dtoNoRole } = dto;
      await service.signup(dtoNoRole as any);

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.Viewer }),
      );
    });
  });

  // ── validateUser ──────────────────────────────────────────

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const bcrypt = await import('bcrypt');
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hash',
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser(
        'test@example.com',
        'password',
      );
      expect(result).toEqual(user);
    });

    it('should return null for wrong password', async () => {
      const bcrypt = await import('bcrypt');
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
      });

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );
      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser(
        'nobody@example.com',
        'password',
      );
      expect(result).toBeNull();
    });
  });

  // ── login ─────────────────────────────────────────────────

  describe('login', () => {
    it('should return a signed JWT access token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.Owner,
        organizationId: 'org-1',
      } as any;

      const result = await service.login(user);

      expect(result.access_token).toBe('jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@example.com',
          role: Role.Owner,
          organizationId: 'org-1',
        }),
        expect.objectContaining({
          secret: 'test-secret',
          expiresIn: '7d',
        }),
      );
    });

    it('should log a user:login audit entry', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.Owner,
        organizationId: 'org-1',
      } as any;

      await service.login(user);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'user:login',
        'user',
        'user-1',
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });
  });

  // ── getOrganisationsForSignup ─────────────────────────────

  describe('getOrganisationsForSignup', () => {
    it('should return all orgs when role is Owner', async () => {
      const orgs = [
        { id: 'org-1', name: 'Root', parentId: null },
        { id: 'org-2', name: 'Child', parentId: 'org-1' },
      ];
      mockOrgRepo.find.mockResolvedValue(orgs);

      const result = await service.getOrganisationsForSignup(Role.Owner);

      expect(result).toEqual(orgs);
    });

    it('should filter to child orgs only for Admin role', async () => {
      const childOrgs = [{ id: 'org-2', name: 'Child', parentId: 'org-1' }];
      mockOrgRepo.find.mockResolvedValue(childOrgs);

      const result = await service.getOrganisationsForSignup(Role.Admin);

      expect(result).toEqual(childOrgs);
      // The where clause should filter for parentId IS NOT NULL
      expect(mockOrgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parentId: expect.anything() }),
        }),
      );
    });

    it('should filter to child orgs only for Viewer role', async () => {
      mockOrgRepo.find.mockResolvedValue([]);

      await service.getOrganisationsForSignup(Role.Viewer);

      expect(mockOrgRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parentId: expect.anything() }),
        }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────────

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.findById('user-1');

      expect(result).toEqual(user);
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
