import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RequestWithUser, Roles, RolesGuard } from '@org/auth';
import { Role } from '@org/data';
import { AuditService } from './audit.service';

@Controller('audit-log')
@UseGuards(RolesGuard)
@Roles(Role.Owner, Role.Admin)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return this.audit.findAll(req.user!);
  }
}
