import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { Role } from '@org/data';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockAuthService = {
      signup: vi.fn(),
      validateUser: vi.fn(),
      login: vi.fn(),
      getOrganisationsForSignup: vi.fn(),
    };

    controller = new (AuthController as any)(mockAuthService);
  });

  describe('signup', () => {
    it('should delegate to AuthService.signup and return the result', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        organizationId: 'org-1',
      };
      const expected = {
        access_token: 'jwt-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.Viewer,
          organizationId: 'org-1',
        },
      };
      mockAuthService.signup.mockResolvedValue(expected);

      const result = await controller.signup(dto as any);

      expect(result).toEqual(expected);
      expect(mockAuthService.signup).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should return access_token for valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = { id: 'user-1', email: 'test@example.com' };

      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue({
        access_token: 'jwt-token',
      });

      const result = await controller.login(dto);

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'wrong' };
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('getOrganisationsForSignup', () => {
    it('should delegate to AuthService.getOrganisationsForSignup', async () => {
      const orgs = [
        { id: 'org-1', name: 'Org One', parentId: null },
        { id: 'org-2', name: 'Org Two', parentId: 'org-1' },
      ];
      mockAuthService.getOrganisationsForSignup.mockResolvedValue(orgs);

      const result =
        await controller.getOrganisationsForSignup(Role.Owner);

      expect(result).toEqual(orgs);
      expect(mockAuthService.getOrganisationsForSignup).toHaveBeenCalledWith(
        Role.Owner,
      );
    });

    it('should pass undefined when role is not provided', async () => {
      mockAuthService.getOrganisationsForSignup.mockResolvedValue([]);

      await controller.getOrganisationsForSignup(undefined);

      expect(mockAuthService.getOrganisationsForSignup).toHaveBeenCalledWith(
        undefined,
      );
    });
  });
});
